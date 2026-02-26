import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// ─── helpers ────────────────────────────────────────────────────────────────

async function getMLAuth() {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    include: { mercadoLivreAuth: true },
  })
  if (!admin?.mercadoLivreAuth) {
    throw new Error('Autenticação Mercado Livre não encontrada')
  }
  if (admin.mercadoLivreAuth.expiresAt < new Date()) {
    throw new Error('Token Mercado Livre expirado. Reautentique em Integrações.')
  }
  return admin.mercadoLivreAuth
}

function mlOrderUrl(mlOrderId: string) {
  return `https://www.mercadolivre.com.br/vendas/${mlOrderId}/detail`
}

// ─── GET  – Sincronizar status do pedido no ML ───────────────────────────────

export const GET = withAuth(async (req: NextRequest, { session }: any) => {
  const id = req.nextUrl.pathname.split('/').at(-2)!
  try {
    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) return NextResponse.json({ message: 'Pedido não encontrado' }, { status: 404 })
    if (!order.marketplaceOrderId) {
      return NextResponse.json({ message: 'Pedido não possui ID de marketplace' }, { status: 400 })
    }

    const mlAuth = await getMLAuth()

    // Buscar pedido no ML
    const res = await fetch(
      `https://api.mercadolibre.com/orders/${order.marketplaceOrderId}`,
      { headers: { Authorization: `Bearer ${mlAuth.accessToken}` } }
    )
    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ message: `Erro ao buscar pedido no ML: ${err}` }, { status: 502 })
    }

    const mlOrder = await res.json()

    // Buscar informações do envio
    let shipmentInfo: any = null
    const shipmentId = mlOrder.shipping?.id || mlOrder.shipments?.[0]?.id
    if (shipmentId) {
      const sRes = await fetch(
        `https://api.mercadolibre.com/shipments/${shipmentId}`,
        { headers: { Authorization: `Bearer ${mlAuth.accessToken}` } }
      )
      if (sRes.ok) {
        shipmentInfo = await sRes.json()
      }
    }

    // Mapear status ML → local
    const statusMap: Record<string, string> = {
      confirmed: 'PROCESSING',
      payment_required: 'PENDING',
      payment_in_process: 'PENDING',
      partially_refunded: 'PROCESSING',
      paid: 'PROCESSING',
      cancelled: 'CANCELLED',
    }
    const newStatus = statusMap[mlOrder.status] || null

    // Atualizar status local se mudou
    let updated = false
    if (newStatus && newStatus !== order.status) {
      await prisma.order.update({
        where: { id },
        data: { status: newStatus as any },
      })
      updated = true
    }

    // Tracking code do envio ML
    const mlTrackingCode =
      shipmentInfo?.tracking_number ||
      shipmentInfo?.tracking_method ||
      null

    // Atualizar trackingCode local se ML tiver um novo
    if (mlTrackingCode && mlTrackingCode !== order.trackingCode) {
      await prisma.order.update({
        where: { id },
        data: { trackingCode: mlTrackingCode },
      })
      updated = true
    }

    return NextResponse.json({
      ok: true,
      updated,
      mlOrder: {
        id: mlOrder.id,
        status: mlOrder.status,
        statusDetail: mlOrder.status_detail,
        dateCreated: mlOrder.date_created,
        dateClosed: mlOrder.date_closed,
        buyer: {
          id: mlOrder.buyer?.id,
          nickname: mlOrder.buyer?.nickname,
        },
        totalAmount: mlOrder.total_amount,
        paidAmount: mlOrder.paid_amount,
        shippingId: shipmentId,
        shipping: shipmentInfo
          ? {
              id: shipmentInfo.id,
              status: shipmentInfo.status,
              substatus: shipmentInfo.substatus,
              trackingNumber: shipmentInfo.tracking_number,
              carrier: shipmentInfo.shipping_option?.name,
              mode: shipmentInfo.mode,
              estimatedDelivery: shipmentInfo.estimated_delivery_time?.date,
            }
          : null,
        items: mlOrder.order_items?.map((i: any) => ({
          id: i.item?.id,
          title: i.item?.title,
          quantity: i.quantity,
          unitPrice: i.unit_price,
        })),
        viewUrl: mlOrderUrl(String(mlOrder.id)),
      },
    })
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Erro inesperado' }, { status: 500 })
  }
})

// ─── POST – Ações no pedido ML ───────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { session }: any) => {
  const id = req.nextUrl.pathname.split('/').at(-2)!
  try {
    const body = await req.json()
    const { action } = body

    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) return NextResponse.json({ message: 'Pedido não encontrado' }, { status: 404 })
    if (!order.marketplaceOrderId) {
      return NextResponse.json({ message: 'Pedido não possui ID de marketplace' }, { status: 400 })
    }

    const mlAuth = await getMLAuth()

    // ── Ação: enviar código de rastreio ──────────────────────────────────────
    if (action === 'send_tracking') {
      const { trackingCode, carrier } = body
      if (!trackingCode) {
        return NextResponse.json({ message: 'Código de rastreio é obrigatório' }, { status: 400 })
      }

      // Buscar pedido ML para obter shipment_id
      const mlRes = await fetch(
        `https://api.mercadolibre.com/orders/${order.marketplaceOrderId}`,
        { headers: { Authorization: `Bearer ${mlAuth.accessToken}` } }
      )
      if (!mlRes.ok) {
        return NextResponse.json({ message: 'Erro ao buscar pedido no ML' }, { status: 502 })
      }
      const mlOrder = await mlRes.json()
      const shipmentId = mlOrder.shipping?.id || mlOrder.shipments?.[0]?.id

      if (!shipmentId) {
        return NextResponse.json(
          { message: 'Pedido ML não possui envio associado. Pode ser envio personalizado.' },
          { status: 422 }
        )
      }

      // Enviar tracking ao ML
      const trackRes = await fetch(
        `https://api.mercadolibre.com/shipments/${shipmentId}/fulfillment/tracking`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mlAuth.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tracking_number: trackingCode,
            ...(carrier ? { tracking_method: carrier } : {}),
          }),
        }
      )

      const trackData = await trackRes.json()
      if (!trackRes.ok) {
        // Tentar atualizar via PUT caso POST falhe (modo alternativo)
        const putRes = await fetch(
          `https://api.mercadolibre.com/shipments/${shipmentId}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${mlAuth.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tracking_number: trackingCode,
              service_id: carrier || undefined,
            }),
          }
        )
        if (!putRes.ok) {
          const putErr = await putRes.json()
          return NextResponse.json(
            { message: `Erro ao enviar rastreio: ${putErr.message || JSON.stringify(putErr)}` },
            { status: 502 }
          )
        }
      }

      // Salvar tracking no banco local
      await prisma.order.update({
        where: { id },
        data: {
          trackingCode,
          shippingCarrier: carrier || order.shippingCarrier,
          status: 'SHIPPED',
          shippedAt: new Date(),
        },
      })

      return NextResponse.json({
        ok: true,
        message: 'Código de rastreio enviado ao Mercado Livre com sucesso!',
      })
    }

    // ── Ação: confirmar pronto para envio ────────────────────────────────────
    if (action === 'ready_to_ship') {
      const mlRes = await fetch(
        `https://api.mercadolibre.com/orders/${order.marketplaceOrderId}`,
        { headers: { Authorization: `Bearer ${mlAuth.accessToken}` } }
      )
      if (!mlRes.ok) {
        return NextResponse.json({ message: 'Erro ao buscar pedido no ML' }, { status: 502 })
      }
      const mlOrder = await mlRes.json()
      const shipmentId = mlOrder.shipping?.id || mlOrder.shipments?.[0]?.id

      if (!shipmentId) {
        return NextResponse.json({ message: 'Pedido ML não possui envio associado' }, { status: 422 })
      }

      const putRes = await fetch(
        `https://api.mercadolibre.com/shipments/${shipmentId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${mlAuth.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'ready_to_ship' }),
        }
      )

      if (!putRes.ok) {
        const err = await putRes.json()
        return NextResponse.json(
          { message: `Erro: ${err.message || JSON.stringify(err)}` },
          { status: 502 }
        )
      }

      await prisma.order.update({
        where: { id },
        data: { status: 'PROCESSING' },
      })

      return NextResponse.json({
        ok: true,
        message: 'Pedido marcado como pronto para envio no Mercado Livre!',
      })
    }

    // ── Ação: cancelar pedido ────────────────────────────────────────────────
    if (action === 'cancel') {
      const { reason } = body
      const putRes = await fetch(
        `https://api.mercadolibre.com/orders/${order.marketplaceOrderId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${mlAuth.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'cancelled' }),
        }
      )
      if (!putRes.ok) {
        const err = await putRes.json()
        return NextResponse.json(
          { message: `Erro ao cancelar no ML: ${err.message || JSON.stringify(err)}` },
          { status: 502 }
        )
      }
      await prisma.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelReason: reason || 'Cancelado pelo administrador via sistema',
        },
      })
      return NextResponse.json({ ok: true, message: 'Pedido cancelado no Mercado Livre.' })
    }

    return NextResponse.json({ message: `Ação desconhecida: ${action}` }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Erro inesperado' }, { status: 500 })
  }
})
