import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/payment/order-payments/[orderId]
 * Lista TODOS os pagamentos relacionados a um pedido
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const orderId = params.orderId

    // Buscar pedido
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        total: true,
        paymentId: true,
        paymentStatus: true,
        paymentType: true,
        paymentApprovedAt: true,
        buyerEmail: true,
        buyerName: true,
        createdAt: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

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

    // Buscar TODOS os pagamentos com a referência deste pedido
    const searchResponse = await fetch(
      `${apiUrl}/v1/payments/search?external_reference=${orderId}&sort=date_created&criteria=desc`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!searchResponse.ok) {
      const error = await searchResponse.json()
      return NextResponse.json({ 
        error: 'Erro ao buscar pagamentos',
        details: error 
      }, { status: searchResponse.status })
    }

    const searchData = await searchResponse.json()

    return NextResponse.json({
      success: true,
      order,
      totalPayments: searchData.paging?.total || 0,
      payments: searchData.results || [],
      summary: (searchData.results || []).map((p: any) => ({
        id: p.id,
        status: p.status,
        status_detail: p.status_detail,
        amount: p.transaction_amount,
        payment_method: p.payment_method_id,
        date_created: p.date_created,
        date_approved: p.date_approved,
        is_duplicate: searchData.results.filter((x: any) => x.status === 'approved').length > 1
      }))
    })

  } catch (error) {
    console.error('Erro ao buscar pagamentos do pedido:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição', details: String(error) },
      { status: 500 }
    )
  }
}
