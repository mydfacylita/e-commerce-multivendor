import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * API de sincronização de pagamentos
 * Pode ser chamada manualmente ou por um serviço de cron externo
 * 
 * Para usar:
 * - GET /api/cron/sync-payments (com header Authorization: Bearer <CRON_SECRET>)
 * - Ou configurar um cron externo (Vercel Cron, GitHub Actions, etc.)
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production'
    
    // Em desenvolvimento, permitir sem autenticação
    const isDev = process.env.NODE_ENV === 'development'
    
    if (!isDev && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 [CRON] Iniciando sincronização de pagamentos...')

    // Buscar token do Mercado Pago
    const gateway = await prisma.paymentGateway.findFirst({
      where: { gateway: 'MERCADOPAGO', isActive: true }
    })

    if (!gateway?.config) {
      return NextResponse.json({ error: 'Mercado Pago não configurado' }, { status: 500 })
    }

    let config = gateway.config
    if (typeof config === 'string') {
      config = JSON.parse(config)
    }
    
    const accessToken = (config as any).accessToken
    if (!accessToken) {
      return NextResponse.json({ error: 'Token não configurado' }, { status: 500 })
    }

    // Buscar pedidos pendentes dos últimos 2 dias
    const pedidosPendentes = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        createdAt: { gte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
      },
      select: {
        id: true,
        paymentId: true,
        total: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    if (pedidosPendentes.length === 0) {
      return NextResponse.json({ 
        message: 'Nenhum pagamento pendente',
        checked: 0,
        approved: 0,
        rejected: 0
      })
    }

    console.log(`🔄 [CRON] Verificando ${pedidosPendentes.length} pedidos...`)

    let approved = 0
    let rejected = 0
    let pending = 0
    const results: any[] = []

    for (const pedido of pedidosPendentes) {
      try {
        let paymentStatus = null
        let paymentData = null

        // Se tem paymentId, verificar diretamente
        if (pedido.paymentId && /^\d+$/.test(pedido.paymentId)) {
          const response = await fetch(`https://api.mercadopago.com/v1/payments/${pedido.paymentId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          })
          
          if (response.ok) {
            paymentData = await response.json()
            paymentStatus = paymentData.status
          }
        } else {
          // Buscar por external_reference (orderId)
          // Primeiro busca exata, depois busca em recentes
          let searchResponse = await fetch(
            `https://api.mercadopago.com/v1/payments/search?external_reference=${pedido.id}&sort=date_created&criteria=desc`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
          )
          
          if (searchResponse.ok) {
            const searchData = await searchResponse.json()
            const payments = searchData.results || []
            
            // Verificar se encontrou pelo orderId exato
            if (payments.length === 0) {
              // Buscar nos recentes que começam com o orderId
              searchResponse = await fetch(
                `https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=50`,
                { headers: { 'Authorization': `Bearer ${accessToken}` } }
              )
              
              if (searchResponse.ok) {
                const recentData = await searchResponse.json()
                const filtered = (recentData.results || []).filter((p: any) => 
                  p.external_reference && p.external_reference.startsWith(pedido.id)
                )
                
                // Procurar por aprovado primeiro
                paymentData = filtered.find((p: any) => p.status === 'approved') || 
                              filtered.find((p: any) => p.status === 'pending') ||
                              filtered[0]
                paymentStatus = paymentData?.status
              }
            } else {
              // Procurar por aprovado primeiro
              paymentData = payments.find((p: any) => p.status === 'approved') || 
                            payments.find((p: any) => p.status === 'pending') ||
                            payments[0]
              paymentStatus = paymentData?.status
            }
          }
        }

        if (!paymentStatus) {
          pending++
          continue
        }

        if (paymentStatus === 'approved') {
          // Atualizar pedido como aprovado
          await prisma.$transaction(async (tx) => {
            await tx.order.update({
              where: { id: pedido.id },
              data: {
                status: 'PROCESSING',
                paymentStatus: 'approved',
                paymentId: String(paymentData.id),
                paymentType: paymentData.payment_method_id,
                paymentApprovedAt: paymentData.date_approved ? new Date(paymentData.date_approved) : new Date()
              }
            })

            // Atualizar balance dos vendedores
            const orderItems = await tx.orderItem.findMany({
              where: { orderId: pedido.id },
              select: { sellerId: true, sellerRevenue: true }
            })

            const sellerBalances = new Map<string, number>()
            for (const item of orderItems) {
              if (item.sellerId && item.sellerRevenue) {
                const current = sellerBalances.get(item.sellerId) || 0
                sellerBalances.set(item.sellerId, current + item.sellerRevenue)
              }
            }

            for (const [sellerId, revenue] of sellerBalances.entries()) {
              // Buscar conta digital do vendedor
              const sellerAccount = await tx.sellerAccount.findUnique({
                where: { sellerId }
              })

              // Atualizar balance do seller
              await tx.seller.update({
                where: { id: sellerId },
                data: {
                  balance: { increment: revenue },
                  totalEarned: { increment: revenue }
                }
              })

              // 💳 Registrar transação na conta digital do vendedor
              if (sellerAccount) {
                const balanceBefore = Number(sellerAccount.balance) || 0
                const balanceAfter = balanceBefore + revenue

                // Atualizar saldo da conta
                await tx.sellerAccount.update({
                  where: { id: sellerAccount.id },
                  data: {
                    balance: { increment: revenue }
                  }
                })

                // Criar transação de VENDA
                await tx.sellerAccountTransaction.create({
                  data: {
                    accountId: sellerAccount.id,
                    type: 'SALE',
                    amount: revenue,
                    balanceBefore,
                    balanceAfter,
                    description: `Comissão do pedido #${pedido.id.slice(-8).toUpperCase()}`,
                    reference: pedido.id,
                    referenceType: 'ORDER',
                    orderId: pedido.id,
                    status: 'COMPLETED',
                    processedAt: new Date()
                  }
                })
              }
            }
          })

          approved++
          results.push({ orderId: pedido.id.slice(0, 10), status: 'approved' })
          console.log(`✅ [CRON] Pedido ${pedido.id.slice(0, 10)}... APROVADO!`)
        } else if (['rejected', 'cancelled', 'refunded'].includes(paymentStatus)) {
          // Marcar como rejeitado e limpar paymentId
          await prisma.order.update({
            where: { id: pedido.id },
            data: {
              paymentStatus: paymentStatus,
              paymentId: null // Limpar para permitir nova tentativa
            }
          })
          rejected++
          results.push({ orderId: pedido.id.slice(0, 10), status: paymentStatus })
          console.log(`❌ [CRON] Pedido ${pedido.id.slice(0, 10)}... ${paymentStatus.toUpperCase()}`)
        } else {
          pending++
        }
      } catch (error: any) {
        console.error(`[CRON] Erro no pedido ${pedido.id.slice(0, 10)}:`, error.message)
        pending++
      }
    }

    console.log(`🔄 [CRON] Concluído: ${approved} aprovados | ${rejected} rejeitados | ${pending} pendentes`)

    return NextResponse.json({
      message: 'Sincronização concluída',
      checked: pedidosPendentes.length,
      approved,
      rejected,
      pending,
      results
    })

  } catch (error: any) {
    console.error('[CRON] Erro na sincronização:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
