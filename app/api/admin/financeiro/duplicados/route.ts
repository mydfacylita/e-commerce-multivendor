import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar todos os pedidos com pagamentos
    const orders = await prisma.order.findMany({
      where: {
        paymentId: { not: null },
        status: { not: 'CANCELLED' }
      },
      select: {
        id: true,
        total: true,
        paymentId: true,
        createdAt: true
      }
    })

    // Buscar gateway
    const gateway = await prisma.paymentGateway.findFirst({
      where: {
        gateway: 'MERCADOPAGO',
        isActive: true
      }
    })

    if (!gateway) {
      return NextResponse.json({ error: 'Gateway não encontrado' }, { status: 404 })
    }

    const config = gateway.config as any
    const { accessToken } = config
    const apiUrl = 'https://api.mercadopago.com'

    const duplicates = []

    // Verificar cada pedido
    for (const order of orders) {
      try {
        // Buscar TODOS os pagamentos do pedido
        const searchResponse = await fetch(
          `${apiUrl}/v1/payments/search?external_reference=${order.id}&sort=date_created&criteria=desc`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          const payments = searchData.results || []

          // Se tem mais de 1 pagamento, é duplicado
          if (payments.length > 1) {
            duplicates.push({
              orderId: order.id,
              paymentId: order.paymentId,
              totalPayments: payments.length,
              orderTotal: order.total,
              payments: payments.map((p: any) => ({
                id: p.id,
                status: p.status,
                status_detail: p.status_detail,
                amount: p.transaction_amount,
                payment_method: p.payment_method_id,
                date_created: p.date_created,
                date_approved: p.date_approved
              }))
            })
          }
        }

        // Delay para não sobrecarregar API
        await new Promise(resolve => setTimeout(resolve, 300))

      } catch (error) {
        console.error(`Erro ao verificar pedido ${order.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      total: duplicates.length,
      duplicates
    })

  } catch (error) {
    console.error('Erro ao buscar duplicados:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}
