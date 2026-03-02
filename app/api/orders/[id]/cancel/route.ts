import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logApi } from '@/lib/api-logger'
import { cancelarNotaFiscal } from '@/lib/invoice'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * POST /api/orders/[id]/cancel
 * Cancela um pedido completo:
 * - Marca pedido como cancelado
 * - Restaura estoque dos produtos
 * - Processa estorno do pagamento (se aprovado)
 * - Cancela nota fiscal (se emitida)
 * 
 * Nível: Authenticated - Requer autenticação e ownership do pedido
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
    }

    const orderId = params.id
    const body = await request.json().catch(() => ({}))
    const cancelReason = body.reason || 'Solicitado pelo cliente'

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('❌ [CANCELAMENTO] Iniciando cancelamento do pedido')
    console.log('   🆔 Pedido:', orderId)
    console.log('   👤 Usuário:', session.user.email)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Buscar o pedido com todos os dados necessários
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true
          }
        },
        invoices: true,
        refunds: true,
        carne: { select: { id: true, financingAcceptedAt: true } }
      }
    })

    if (!order) {
      return NextResponse.json({ message: 'Pedido não encontrado' }, { status: 404 })
    }

    // Verificar se o pedido pertence ao usuário (ou se é admin)
    if (order.userId !== session.user.id && session.user.role !== 'ADMIN') {
      await logApi({
        method: 'POST',
        endpoint: `/api/orders/${orderId}/cancel`,
        statusCode: 403,
        userId: session.user.id,
        userRole: session.user.role,
        errorMessage: 'Tentativa de cancelar pedido de outro usuário',
        duration: Date.now() - startTime
      })
      return NextResponse.json({ message: 'Você não tem permissão para cancelar este pedido' }, { status: 403 })
    }

    // Verificar se o pedido pode ser cancelado
    const cancellableStatuses = ['PENDING', 'PROCESSING']
    if (!cancellableStatuses.includes(order.status)) {
      return NextResponse.json({ 
        message: `Não é possível cancelar pedidos com status "${order.status}". Apenas pedidos pendentes ou em processamento podem ser cancelados.`
      }, { status: 400 })
    }

    // Verificar se o pedido já foi despachado
    if (order.shippedAt) {
      return NextResponse.json({ 
        message: 'Não é possível cancelar este pedido pois já foi despachado. Solicite uma devolução após receber o produto.'
      }, { status: 400 })
    }

    // Bloquear cancelamento de pedidos com contrato de financiamento aceito
    if (order.paymentMethod === 'carne' && (order as any).carne?.financingAcceptedAt) {
      return NextResponse.json({
        message: 'Este pedido possui um contrato de financiamento vigente e não pode ser cancelado pelo cliente. Entre em contato com a loja.'
      }, { status: 400 })
    }

    // ═══════════════════════════════════════════════════════════════
    // 1️⃣ RESTAURAR ESTOQUE DOS PRODUTOS
    // ═══════════════════════════════════════════════════════════════
    console.log('\n📦 [ESTOQUE] Restaurando estoque dos produtos...')
    
    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            increment: item.quantity
          }
        }
      })
      console.log(`   ✅ ${item.product.name}: +${item.quantity} unidades`)
    }

    // ═══════════════════════════════════════════════════════════════
    // 2️⃣ CANCELAR NOTA FISCAL (SE EXISTIR)
    // ═══════════════════════════════════════════════════════════════
    let invoiceCancelled = false
    if (order.invoices && order.invoices.length > 0) {
      console.log('\n📄 [NF-e] Cancelando nota fiscal...')
      
      for (const invoice of order.invoices) {
        // ISSUED é o status válido para notas fiscais emitidas
        if (invoice.status === 'ISSUED') {
          try {
            // Cancelar NF-e via API da SEFAZ
            const cancelResult = await cancelarNotaFiscal(invoice.id, cancelReason)
            
            if (cancelResult.success) {
              console.log(`   ✅ NF-e ${invoice.invoiceNumber || invoice.id} cancelada na SEFAZ`)
              invoiceCancelled = true
            } else {
              // Se falhar na SEFAZ, apenas marca no banco (para resolver manualmente depois)
              console.warn(`   ⚠️ Erro na SEFAZ: ${cancelResult.error}. Marcando como cancelada no banco.`)
              await prisma.invoice.update({
                where: { id: invoice.id },
                data: {
                  status: 'CANCELLED',
                  cancelledAt: new Date(),
                  cancelReason: cancelReason,
                  errorMessage: `Cancelamento pendente na SEFAZ: ${cancelResult.error}`
                }
              })
              invoiceCancelled = true
            }
          } catch (invoiceError: any) {
            console.error(`   ⚠️ Erro ao cancelar NF-e ${invoice.id}:`, invoiceError.message)
          }
        }
      }
    } else {
      console.log('\n📄 [NF-e] Nenhuma nota fiscal para cancelar')
    }

    // ═══════════════════════════════════════════════════════════════
    // 3️⃣ PROCESSAR ESTORNO DO PAGAMENTO
    // ═══════════════════════════════════════════════════════════════
    let refundProcessed = false
    let refundId = null
    
    if (order.paymentStatus === 'approved' && order.paymentId) {
      console.log('\n💰 [ESTORNO] Processando estorno do pagamento...')
      console.log(`   🆔 Payment ID: ${order.paymentId}`)
      console.log(`   💵 Valor: R$ ${order.total.toFixed(2)}`)
      
      try {
        // Buscar configuração do Mercado Pago
        const gateway = await prisma.paymentGateway.findFirst({
          where: { gateway: 'MERCADOPAGO', isActive: true }
        })
        
        if (gateway?.config) {
          let config = gateway.config
          if (typeof config === 'string') {
            config = JSON.parse(config)
          }
          
          const accessToken = (config as any).accessToken
          
          if (accessToken) {
            // Usar API HTTP direta para refund
            const refundResponse = await fetch(
              `https://api.mercadopago.com/v1/payments/${order.paymentId}/refunds`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                  'X-Idempotency-Key': `cancel-${orderId}-${Date.now()}`
                },
                body: JSON.stringify({
                  amount: order.total
                })
              }
            )
            
            const refundData = await refundResponse.json()
            
            if (refundResponse.ok) {
              console.log(`   ✅ Estorno processado! Refund ID: ${refundData.id}`)
              refundProcessed = true
              refundId = refundData.id?.toString()
            } else {
              console.error('   ❌ Erro da API MP:', refundData.message || refundData.error)
            }
          } else {
            console.log('   ⚠️ Token do Mercado Pago não configurado')
          }
        } else {
          console.log('   ⚠️ Gateway Mercado Pago não configurado')
        }
      } catch (refundError: any) {
        console.error('   ❌ Erro ao processar estorno:', refundError.message)
        // Continua o cancelamento mesmo se o estorno falhar
      }
      
      // Criar registro de reembolso no banco
      try {
        await prisma.refund.create({
          data: {
            id: `refund_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            orderId: orderId,
            paymentId: order.paymentId || '',
            amount: order.total,
            reason: cancelReason,
            gateway: order.paymentType || 'mercadopago',
            status: refundProcessed ? 'APPROVED' : 'PENDING',
            processedBy: session.user.email || session.user.name || 'cliente'
          }
        })
        console.log('   ✅ Registro de reembolso criado')
      } catch (e) {
        console.log('   ⚠️ Erro ao criar registro de reembolso:', e)
      }
    } else {
      console.log('\n💰 [ESTORNO] Nenhum pagamento aprovado para estornar')
    }

    // ═══════════════════════════════════════════════════════════════
    // 4️⃣ MARCAR PEDIDO COMO CANCELADO
    // ═══════════════════════════════════════════════════════════════
    console.log('\n📝 [PEDIDO] Atualizando status para CANCELADO...')
    
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelReason: cancelReason
      }
    })
    
    // Atualizar também os OrderItems para marcar como cancelados
    await prisma.orderItem.updateMany({
      where: { orderId: orderId },
      data: {
        supplierStatus: 'CANCELLED'
      }
    })
    
    console.log('   ✅ Pedido e itens marcados como cancelados')

    // ═══════════════════════════════════════════════════════════════
    // 5️⃣ LOG E RESPOSTA
    // ═══════════════════════════════════════════════════════════════
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ [CANCELAMENTO CONCLUÍDO]')
    console.log(`   📦 Estoque restaurado: ${order.items.length} produtos`)
    console.log(`   📄 NF-e cancelada: ${invoiceCancelled ? 'Sim' : 'Não'}`)
    console.log(`   💰 Estorno processado: ${refundProcessed ? 'Sim' : order.paymentStatus === 'approved' ? 'Pendente' : 'N/A'}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    await logApi({
      method: 'POST',
      endpoint: `/api/orders/${orderId}/cancel`,
      statusCode: 200,
      userId: session.user.id,
      userRole: session.user.role,
      requestBody: { orderId, reason: cancelReason },
      responseBody: { 
        status: 'CANCELLED',
        stockRestored: order.items.length,
        invoiceCancelled,
        refundProcessed
      },
      duration: Date.now() - startTime
    })

    return NextResponse.json({ 
      success: true,
      message: 'Pedido cancelado com sucesso',
      details: {
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        stockRestored: order.items.reduce((sum, item) => sum + item.quantity, 0),
        invoiceCancelled,
        refundProcessed,
        refundStatus: refundProcessed ? 'APPROVED' : (order.paymentStatus === 'approved' ? 'PENDING' : null)
      }
    })

  } catch (error: any) {
    console.error('❌ Erro ao cancelar pedido:', error)
    
    await logApi({
      method: 'POST',
      endpoint: `/api/orders/${params.id}/cancel`,
      statusCode: 500,
      errorMessage: error.message,
      duration: Date.now() - startTime
    })

    return NextResponse.json(
      { message: 'Erro ao cancelar pedido: ' + error.message },
      { status: 500 }
    )
  }
}
