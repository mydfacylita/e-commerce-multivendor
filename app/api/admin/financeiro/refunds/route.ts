import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET /api/admin/financeiro/refunds
 * Lista todos os estornos
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: any = {}
    
    if (status && status !== 'all') {
      where.status = status
    }

    if (search) {
      where.OR = [
        { orderId: { contains: search } },
        { paymentId: { contains: search } },
        { refundId: { contains: search } },
        { reason: { contains: search } }
      ]
    }

    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              total: true,
              buyerName: true,
              buyerEmail: true,
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.refund.count({ where })
    ])

    // Calcular totais
    const stats = await prisma.refund.groupBy({
      by: ['status'],
      _sum: { amount: true },
      _count: true
    })

    const totals = {
      approved: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      rejected: { count: 0, amount: 0 },
      total: { count: total, amount: 0 }
    }

    stats.forEach(s => {
      const key = s.status.toLowerCase() as keyof typeof totals
      if (totals[key]) {
        totals[key].count = s._count
        totals[key].amount = s._sum.amount || 0
      }
      totals.total.amount += s._sum.amount || 0
    })

    return NextResponse.json({
      refunds,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      totals
    })

  } catch (error) {
    console.error('Erro ao listar estornos:', error)
    return NextResponse.json({ error: 'Erro ao listar estornos' }, { status: 500 })
  }
}

/**
 * POST /api/admin/financeiro/refunds
 * Processa um novo estorno (total ou parcial)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { paymentId, orderId, amount, reason, items } = await request.json()

    if (!paymentId || !orderId) {
      return NextResponse.json({ error: 'PaymentId e OrderId são obrigatórios' }, { status: 400 })
    }

    // Verificar se é um pedido híbrido (parentOrderId começa com HYB)
    const isHybridOrder = orderId.startsWith('HYB')
    
    let orderTotal = 0
    let primaryOrderId = orderId

    if (isHybridOrder) {
      // Buscar todos os sub-pedidos do grupo híbrido
      const subOrders = await prisma.order.findMany({
        where: { parentOrderId: orderId },
        select: { id: true, total: true }
      })
      
      if (subOrders.length === 0) {
        return NextResponse.json({ error: 'Pedido híbrido não encontrado' }, { status: 404 })
      }
      
      // Somar total de todos os sub-pedidos
      orderTotal = subOrders.reduce((sum, o) => sum + o.total, 0)
      // Usar o primeiro sub-pedido como referência para o registro do estorno
      primaryOrderId = subOrders[0].id
    } else {
      // Buscar o pedido normal
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { total: true }
      })

      if (!order) {
        return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
      }
      
      orderTotal = order.total
    }

    // Verificar total já estornado
    const existingRefunds = await prisma.refund.findMany({
      where: { 
        paymentId,
        status: { in: ['approved', 'pending'] }
      },
      select: { amount: true }
    })

    const totalRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0)
    const refundAmount = amount || orderTotal

    // Verificar se o valor do estorno é válido
    if (totalRefunded + refundAmount > orderTotal) {
      return NextResponse.json({ 
        error: `Valor máximo disponível para estorno: R$ ${(orderTotal - totalRefunded).toFixed(2)}`,
        availableAmount: orderTotal - totalRefunded
      }, { status: 400 })
    }

    // É estorno total?
    const isFullRefund = !amount || (totalRefunded + refundAmount >= orderTotal)

    // Buscar gateway
    const gateway = await prisma.paymentGateway.findFirst({
      where: { gateway: 'MERCADOPAGO', isActive: true }
    })

    if (!gateway) {
      return NextResponse.json({ error: 'Gateway não encontrado' }, { status: 404 })
    }

    // Parse config - pode ser string ou objeto
    let config: any = gateway.config
    if (typeof config === 'string') {
      try {
        config = JSON.parse(config)
      } catch (e) {
        console.error('Erro ao fazer parse do config do gateway:', e)
        return NextResponse.json({ error: 'Configuração do gateway inválida' }, { status: 500 })
      }
    }
    
    const { accessToken } = config
    
    if (!accessToken) {
      console.error('Access Token não encontrado na configuração do gateway')
      return NextResponse.json({ error: 'Access Token do Mercado Pago não configurado' }, { status: 500 })
    }
    
    const apiUrl = 'https://api.mercadopago.com'

    // Gerar chave de idempotência
    const idempotencyKey = `refund-${paymentId}-${Date.now()}`

    console.log('🔄 Processando estorno:', {
      paymentId,
      orderId,
      amount: refundAmount,
      isFullRefund,
      totalRefunded,
      apiUrl: `${apiUrl}/v1/payments/${paymentId}/refunds`
    })

    // Montar headers
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'X-Idempotency-Key': idempotencyKey
    }

    // Configurar fetch options
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers
    }

    // Para estorno parcial, enviar o amount no body
    // Para estorno total, enviar body vazio {}
    if (amount && !isFullRefund) {
      headers['Content-Type'] = 'application/json'
      fetchOptions.body = JSON.stringify({ amount: parseFloat(refundAmount.toFixed(2)) })
    } else {
      // Estorno total - enviar body vazio
      headers['Content-Type'] = 'application/json'
      fetchOptions.body = JSON.stringify({})
    }

    console.log('📤 Enviando para MP:', {
      url: `${apiUrl}/v1/payments/${paymentId}/refunds`,
      headers: { ...headers, Authorization: 'Bearer ***' },
      body: fetchOptions.body
    })

    // Processar estorno no Mercado Pago
    const refundResponse = await fetch(`${apiUrl}/v1/payments/${paymentId}/refunds`, fetchOptions)

    const refundData = await refundResponse.json()

    console.log('📥 Resposta do Mercado Pago:', {
      status: refundResponse.status,
      ok: refundResponse.ok,
      data: refundData
    })

    if (!refundResponse.ok) {
      console.error('❌ Erro ao processar estorno:', refundData)
      
      // Mensagens de erro mais amigáveis
      let errorMessage = 'Erro ao processar estorno no gateway'
      
      if (refundData.message) {
        errorMessage = refundData.message
      } else if (refundData.error) {
        errorMessage = refundData.error
      } else if (refundData.cause) {
        // Mercado Pago retorna causa detalhada
        if (Array.isArray(refundData.cause) && refundData.cause.length > 0) {
          errorMessage = refundData.cause.map((c: any) => c.description || c.code).join(', ')
        }
      }
      
      // Erros conhecidos do Mercado Pago
      if (refundResponse.status === 400) {
        if (refundData.message?.includes('already refunded')) {
          errorMessage = 'Este pagamento já foi estornado anteriormente'
        } else if (refundData.message?.includes('insufficient')) {
          errorMessage = 'Saldo insuficiente para processar o estorno'
        }
      } else if (refundResponse.status === 404) {
        errorMessage = 'Pagamento não encontrado no Mercado Pago'
      } else if (refundResponse.status === 401) {
        errorMessage = 'Credenciais do Mercado Pago inválidas'
      } else if (refundResponse.status === 403) {
        if (refundData.code === 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES') {
          errorMessage = 'Sem permissão para estornar: verifique se o Access Token do Mercado Pago está correto e tem permissões de estorno. Se o pagamento foi feito com credenciais de teste/sandbox, use as mesmas credenciais.'
        } else {
          errorMessage = 'Acesso negado: verifique as credenciais do Mercado Pago'
        }
      }
      
      // Registrar estorno como rejeitado
      await prisma.refund.create({
        data: {
          orderId: primaryOrderId,
          paymentId,
          amount: refundAmount,
          reason: `${reason || (isFullRefund ? 'Estorno total' : 'Estorno parcial')} - ERRO: ${errorMessage}`,
          gateway: 'MERCADOPAGO',
          status: 'rejected',
          processedBy: session.user.email || session.user.name || 'admin'
        }
      })
      
      return NextResponse.json({ 
        error: errorMessage,
        details: refundData
      }, { status: refundResponse.status })
    }

    // Registrar estorno no banco
    const refund = await prisma.refund.create({
      data: {
        orderId: primaryOrderId,
        paymentId,
        refundId: String(refundData.id),
        amount: refundData.amount || refundAmount,
        reason: reason || (isFullRefund ? 'Estorno total' : 'Estorno parcial'),
        gateway: 'MERCADOPAGO',
        status: refundData.status || 'approved',
        processedBy: session.user.email || session.user.name || 'admin'
      }
    })

    // Registrar quais itens foram estornados
    if (items && Array.isArray(items) && items.length > 0) {
      // Estorno parcial - registrar itens específicos
      for (const itemId of items) {
        // Buscar o item para calcular o valor
        const orderItem = await prisma.orderItem.findUnique({
          where: { id: itemId },
          select: { id: true, price: true, quantity: true }
        })
        
        if (orderItem) {
          await prisma.refundItem.create({
            data: {
              refundId: refund.id,
              orderItemId: itemId,
              amount: orderItem.price * orderItem.quantity
            }
          })
          
          // Marcar o item como estornado
          await prisma.orderItem.update({
            where: { id: itemId },
            data: { refundedAt: new Date() }
          })
        }
      }
    } else if (isFullRefund) {
      // Estorno total - registrar todos os itens do pedido
      let allItems: { id: string; price: number; quantity: number }[] = []
      
      if (isHybridOrder) {
        // Buscar todos os itens de todos os sub-pedidos
        const subOrders = await prisma.order.findMany({
          where: { parentOrderId: orderId },
          select: {
            items: {
              select: { id: true, price: true, quantity: true }
            }
          }
        })
        allItems = subOrders.flatMap(o => o.items)
      } else {
        const order = await prisma.order.findUnique({
          where: { id: primaryOrderId },
          select: {
            items: {
              select: { id: true, price: true, quantity: true }
            }
          }
        })
        allItems = order?.items || []
      }
      
      for (const item of allItems) {
        await prisma.refundItem.create({
          data: {
            refundId: refund.id,
            orderItemId: item.id,
            amount: item.price * item.quantity
          }
        })
        
        // Marcar o item como estornado
        await prisma.orderItem.update({
          where: { id: item.id },
          data: { refundedAt: new Date() }
        })
      }
    }

    // Verificar se todos os itens do pedido foram estornados
    let allItemsRefunded = false
    
    if (isHybridOrder) {
      const subOrders = await prisma.order.findMany({
        where: { parentOrderId: orderId },
        select: {
          items: {
            select: { id: true, refundedAt: true }
          }
        }
      })
      const allItems = subOrders.flatMap(o => o.items)
      allItemsRefunded = allItems.length > 0 && allItems.every(item => item.refundedAt !== null)
    } else {
      const order = await prisma.order.findUnique({
        where: { id: primaryOrderId },
        select: {
          items: {
            select: { id: true, refundedAt: true }
          }
        }
      })
      const orderItems = order?.items || []
      allItemsRefunded = orderItems.length > 0 && orderItems.every(item => item.refundedAt !== null)
    }

    // Atualizar status do pedido baseado no tipo de estorno
    if (isHybridOrder) {
      // Para pedidos híbridos, atualizar TODOS os sub-pedidos
      const updateData = allItemsRefunded 
        ? {
            paymentStatus: 'refunded',
            status: 'CANCELLED' as const,
            cancelReason: reason || 'Estorno total processado'
          }
        : {
            paymentStatus: 'partial_refunded'
          }
      
      await prisma.order.updateMany({
        where: { parentOrderId: orderId },
        data: updateData
      })
    } else if (allItemsRefunded) {
      // Estorno total - cancelar pedido
      await prisma.order.update({
        where: { id: primaryOrderId },
        data: {
          paymentStatus: 'refunded',
          status: 'CANCELLED',
          cancelReason: reason || 'Estorno total processado'
        }
      })
    } else {
      // Estorno parcial - atualizar para indicar estorno parcial
      await prisma.order.update({
        where: { id: primaryOrderId },
        data: {
          paymentStatus: 'partial_refunded'
        }
      })
    }

    console.log('✅ Estorno processado:', {
      refundId: refund.id,
      paymentId,
      amount: refund.amount,
      allItemsRefunded,
      itemsRefunded: items?.length || 'todos',
      status: refund.status
    })

    return NextResponse.json({
      success: true,
      refund,
      allItemsRefunded,
      orderStatus: allItemsRefunded ? 'CANCELLED' : 'PARTIAL_REFUND'
    })

  } catch (error) {
    console.error('Erro ao processar estorno:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ 
      error: `Erro ao processar estorno: ${errorMessage}` 
    }, { status: 500 })
  }
}
