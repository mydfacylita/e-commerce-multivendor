import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Busca o pedido
    const order = await prisma.order.findUnique({
      where: { id: params.id }
    })

    if (!order) {
      return NextResponse.json(
        { message: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    // Se o pedido não tem marketplaceId, não tem etiqueta do ML
    if (!order.marketplaceOrderId) {
      return NextResponse.json(
        { message: 'Pedido não é de marketplace' },
        { status: 400 }
      )
    }

    // Busca as credenciais do Mercado Livre
    const mlAuth = await prisma.mercadoLivreAuth.findFirst({
      where: {
        expiresAt: { gt: new Date() }
      }
    })

    if (!mlAuth) {
      return NextResponse.json(
        { message: 'Credenciais do Mercado Livre não encontradas' },
        { status: 400 }
      )
    }

    let accessToken = mlAuth.accessToken

    // Verifica se o token está próximo de expirar
    const expiresIn = mlAuth.expiresAt.getTime() - Date.now()
    if (expiresIn < 3600000) {
      console.log('[Shipping Label] Token expirando, renovando...')

      const refreshResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: process.env.ML_CLIENT_ID!,
          client_secret: process.env.ML_CLIENT_SECRET!,
          refresh_token: mlAuth.refreshToken
        })
      })

      const refreshData = await refreshResponse.json()

      if (!refreshResponse.ok) {
        return NextResponse.json(
          { message: 'Erro ao renovar token' },
          { status: 400 }
        )
      }

      const newExpiresAt = new Date(Date.now() + (refreshData.expires_in * 1000))

      await prisma.mercadoLivreAuth.update({
        where: { id: mlAuth.id },
        data: {
          accessToken: refreshData.access_token,
          refreshToken: refreshData.refresh_token,
          expiresAt: newExpiresAt,
        }
      })

      accessToken = refreshData.access_token
    }

    // Busca informações de envio do pedido no ML
    const mlOrderId = order.marketplaceOrderId
    const shippingResponse = await fetch(
      `https://api.mercadolibre.com/orders/${mlOrderId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      }
    )

    if (!shippingResponse.ok) {
      return NextResponse.json(
        { message: 'Erro ao buscar informações de envio' },
        { status: 400 }
      )
    }

    const mlOrder = await shippingResponse.json()

    // Busca a etiqueta de envio
    let labelUrl = null
    
    if (mlOrder.shipping && mlOrder.shipping.id) {
      const labelResponse = await fetch(
        `https://api.mercadolibre.com/shipments/${mlOrder.shipping.id}/label`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      )

      if (labelResponse.ok) {
        const labelData = await labelResponse.json()
        labelUrl = labelData.url || labelData.label_url
      }
    }

    return NextResponse.json({
      success: true,
      labelUrl,
      shippingId: mlOrder.shipping?.id,
      trackingNumber: mlOrder.shipping?.tracking_number,
      carrier: mlOrder.shipping?.logistic_type
    })

  } catch (error) {
    console.error('[Shipping Label] Erro:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar etiqueta de envio' },
      { status: 500 }
    )
  }
}
