import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'
import {
  getShopeeAuth,
  getOrderDetail,
  getOrderEscrowDetail,
  extractEscrowAddress,
  uploadInvoice,
  initShipment,
  createShippingDocument,
  downloadShippingDocument,
  getTrackingNumber,
  shipOrder,
  getShipmentList,
  getLogisticsChannelList,
  assertShopeeSuccess,
} from '@/lib/shopee'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

function orderId(req: NextRequest) {
  return req.nextUrl.pathname.split('/').at(-2)!
}

// ─── GET — busca dados do pedido na Shopee ────────────────────────────────────

export const GET = withAuth(async (req: NextRequest) => {
  const id = orderId(req)
  const { searchParams } = req.nextUrl
  const action = searchParams.get('action') ?? 'escrow'

  try {
    const order = await prisma.order.findUnique({ where: { id } })
    if (!order?.marketplaceOrderId) {
      return NextResponse.json({ message: 'Pedido não possui ID Shopee' }, { status: 404 })
    }
    const auth = await getShopeeAuth()

    // ── Endereço real via escrow / order detail ─────────────────────────────
    if (action === 'escrow') {
      let address: any = null

      // Tenta escrow (funciona para pedidos pagos)
      try {
        const data = await getOrderEscrowDetail(auth, order.marketplaceOrderId)
        if (!data?.error || data.error === '') {
          address = extractEscrowAddress(data)
        }
      } catch { /* ignora, tenta fallback */ }

      // Fallback: get_order_detail (READY_TO_SHIP)
      if (!address) {
        try {
          const detailData = await getOrderDetail(auth, [order.marketplaceOrderId], 'recipient_address,buyer_username')
          const orderDetail = detailData?.response?.order_list?.[0]
          const addr = orderDetail?.recipient_address
          if (addr) {
            address = {
              name: addr.name ?? orderDetail?.buyer_username ?? '',
              phone: addr.phone ?? '',
              street: [addr.full_address, addr.address, addr.district, addr.town].filter(Boolean).join(', ') || '',
              city: addr.city ?? '',
              state: addr.state ?? '',
              zipCode: addr.zipcode ?? '',
              country: addr.region ?? 'BR',
            }
          }
        } catch { /* ignora */ }
      }

      if (!address) {
        return NextResponse.json({ message: 'Endereço não disponível na API Shopee' }, { status: 422 })
      }

      // Salva no DB (substitui dados mascarados por qualquer coisa melhor)
      const current = JSON.parse(order.shippingAddress || '{}')
      const currentMasked = Object.values(current).some((v) => v === '****')
      if (currentMasked) {
        await prisma.order.update({
          where: { id },
          data: { shippingAddress: JSON.stringify(address) },
        })
      }

      return NextResponse.json({ ok: true, address, saved: currentMasked })
    }

    // ── Tracking number ───────────────────────────────────────────────────────
    if (action === 'tracking') {
      const data = await getTrackingNumber(auth, order.marketplaceOrderId)
      assertShopeeSuccess(data, 'get_tracking_number')
      const trackingNumber = data?.response?.tracking_number
      if (trackingNumber && trackingNumber !== order.trackingCode) {
        await prisma.order.update({ where: { id }, data: { trackingCode: trackingNumber } })
      }
      return NextResponse.json({ ok: true, trackingNumber })
    }

    // ── Canais logísticos disponíveis ─────────────────────────────────────────
    if (action === 'channels') {
      const data = await getLogisticsChannelList(auth)
      assertShopeeSuccess(data, 'get_channel_list')
      return NextResponse.json({ ok: true, channels: data?.response?.logistics_channel_list ?? [] })
    }

    // ── Parâmetros para etiqueta ──────────────────────────────────────────────
    if (action === 'shipment_list') {
      const data = await getShipmentList(auth)
      assertShopeeSuccess(data, 'get_shipment_list')
      return NextResponse.json({ ok: true, ...data?.response })
    }

    return NextResponse.json({ message: `Ação GET desconhecida: ${action}` }, { status: 400 })

  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Erro inesperado' }, { status: 500 })
  }
})

// ─── POST — ações no pedido Shopee ───────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest) => {
  const id = orderId(req)

  try {
    const body = await req.json()
    const { action } = body

    const order = await prisma.order.findUnique({ where: { id } })
    if (!order?.marketplaceOrderId) {
      return NextResponse.json({ message: 'Pedido não possui ID Shopee' }, { status: 404 })
    }
    const auth = await getShopeeAuth()
    const orderSn = order.marketplaceOrderId

    // ── Enviar NF-e ───────────────────────────────────────────────────────────
    if (action === 'upload_invoice') {
      const { invoiceKey } = body
      if (!invoiceKey || String(invoiceKey).replace(/\D/g, '').length !== 44) {
        return NextResponse.json({ message: 'Chave de acesso NF-e deve ter 44 dígitos numéricos' }, { status: 400 })
      }
      const data = await uploadInvoice(auth, orderSn, String(invoiceKey).replace(/\D/g, ''))
      assertShopeeSuccess(data, 'upload_invoice')
      return NextResponse.json({ ok: true, message: 'NF-e enviada à Shopee com sucesso!' })
    }

    // ── Inicializar envio ─────────────────────────────────────────────────────
    if (action === 'init_shipment') {
      const { tracking_number, branch_id, pickup_type } = body
      // pickup_type: 'dropoff' | 'pickup' | 'non_integrated'
      let params: any = {}
      if (pickup_type === 'dropoff') {
        params = { dropoff: { tracking_number, ...(branch_id ? { branch_id } : {}) } }
      } else if (pickup_type === 'pickup') {
        params = { pickup: { tracking_number, ...(branch_id ? { address_id: branch_id, pickup_time_id: '' } : {}) } }
      } else {
        // non_integrated (ex: Correios por fora)
        params = { non_integrated: { tracking_number: tracking_number || '' } }
      }
      const data = await initShipment(auth, orderSn, params)
      assertShopeeSuccess(data, 'init_shipment')
      return NextResponse.json({ ok: true, message: 'Envio inicializado na Shopee!' })
    }

    // ── Criar etiqueta ────────────────────────────────────────────────────────
    if (action === 'create_label') {
      const { shipping_document_type } = body
      const data = await createShippingDocument(auth, [{
        order_sn: orderSn,
        shipping_document_type: shipping_document_type ?? 'NORMAL_AIR_WAYBILL',
      }])
      assertShopeeSuccess(data, 'create_shipping_document')
      return NextResponse.json({ ok: true, message: 'Etiqueta criada! Use "Baixar Etiqueta" para obter o PDF.' })
    }

    // ── Baixar etiqueta (retorna PDF base64) ──────────────────────────────────
    if (action === 'download_label') {
      const { shipping_document_type } = body
      const data = await downloadShippingDocument(auth, [{
        order_sn: orderSn,
        shipping_document_type: shipping_document_type ?? 'NORMAL_AIR_WAYBILL',
      }])
      assertShopeeSuccess(data, 'download_shipping_document')

      // A Shopee retorna URL de download do PDF
      const result = data?.response?.result_list?.[0]
      const fileUrl = result?.file_path ?? result?.url ?? null
      const status = result?.status

      if (!fileUrl && status === 'READY') {
        return NextResponse.json({ ok: false, message: 'Etiqueta ainda não está pronta. Aguarde e tente novamente.' }, { status: 202 })
      }

      return NextResponse.json({ ok: true, fileUrl, status })
    }

    // ── Confirmar envio ───────────────────────────────────────────────────────
    if (action === 'ship_order') {
      const { tracking_number, pickup_type } = body
      let params: any = {}
      if (pickup_type === 'non_integrated') {
        params = { non_integrated: { tracking_number } }
      }
      const data = await shipOrder(auth, orderSn, params)
      assertShopeeSuccess(data, 'ship_order')

      // Busca tracking se não informado
      let finalTracking = tracking_number
      if (!finalTracking) {
        try {
          const tk = await getTrackingNumber(auth, orderSn)
          finalTracking = tk?.response?.tracking_number ?? null
        } catch { /* ignora se não disponível ainda */ }
      }

      await prisma.order.update({
        where: { id },
        data: {
          status: 'SHIPPED',
          shippedAt: new Date(),
          ...(finalTracking ? { trackingCode: finalTracking } : {}),
        },
      })

      return NextResponse.json({
        ok: true,
        message: 'Pedido marcado como enviado na Shopee!',
        trackingNumber: finalTracking,
      })
    }

    return NextResponse.json({ message: `Ação desconhecida: ${action}` }, { status: 400 })

  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Erro inesperado' }, { status: 500 })
  }
})
