/**
 * POST /api/admin/carne/[id]/parcela/[parcelaId]/pagar
 * Admin gera Pix ou Boleto para uma parcela do carnê e envia ao cliente
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PaymentService } from '@/lib/payment'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; parcelaId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { method } = await request.json()
  if (!method || !['pix', 'boleto'].includes(method)) {
    return NextResponse.json({ error: 'Método inválido. Use pix ou boleto.' }, { status: 400 })
  }

  // Buscar carnê + parcela + pedido + comprador
  const carne = await prisma.carne.findUnique({
    where: { id: params.id },
    include: {
      parcelas: { where: { id: params.parcelaId } },
      order: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, cpf: true } },
        },
      },
    },
  })

  if (!carne) return NextResponse.json({ error: 'Carnê não encontrado' }, { status: 404 })

  const parcela = carne.parcelas[0]
  if (!parcela) return NextResponse.json({ error: 'Parcela não encontrada' }, { status: 404 })
  if (parcela.status === 'PAID') return NextResponse.json({ error: 'Parcela já paga' }, { status: 400 })
  if (parcela.status === 'CANCELLED') return NextResponse.json({ error: 'Parcela cancelada' }, { status: 400 })

  const order = carne.order
  const payerName  = carne.buyerName || order.user?.name || 'Cliente'
  const payerEmail = order.user?.email || `carne+${order.id}@placeholder.com`
  const payerDocument = carne.buyerCpf || order.user?.cpf || undefined
  const payerPhone    = carne.buyerPhone || order.user?.phone || undefined

  let payerAddress: any
  if (order.shippingAddress) {
    try {
      const addr = typeof order.shippingAddress === 'string'
        ? JSON.parse(order.shippingAddress)
        : order.shippingAddress
      if (addr.zipCode && addr.city) {
        payerAddress = {
          street:       addr.street       || 'Rua',
          number:       addr.number       || 'SN',
          complement:   addr.complement   || undefined,
          neighborhood: addr.neighborhood || 'Centro',
          city:         addr.city,
          state:        addr.state,
          zipCode:      addr.zipCode.replace(/\D/g, ''),
        }
      }
    } catch {}
  }

  const externalReference = `CARNE_PARCELA_${parcela.id}`
  const totalParcelas = await prisma.carneParcela.count({ where: { carneId: carne.id } })

  const result = await PaymentService.createPayment({
    amount: parcela.valor,
    description: `Carnê ${order.id.slice(-8).toUpperCase()} – Parcela ${parcela.numero}/${totalParcelas}`,
    payerEmail,
    payerName,
    payerDocument,
    payerPhone,
    payerAddress,
    externalReference,
    notificationUrl: `${process.env.WEBHOOK_URL || process.env.NEXTAUTH_URL}/api/payment/webhook`,
    paymentMethod: method as 'pix' | 'boleto',
    metadata: {
      type: 'CARNE_PARCELA',
      parcelaId: parcela.id,
      carneId: carne.id,
      orderId: order.id,
      userId: order.userId,
      parcela: parcela.numero,
      generatedByAdmin: true,
    },
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Erro ao gerar pagamento' }, { status: 400 })
  }

  // Salva paymentId na parcela (sobrescreve se já existia)
  if (result.paymentId) {
    await prisma.carneParcela.update({
      where: { id: parcela.id },
      data: { paymentId: String(result.paymentId) },
    })
  }

  return NextResponse.json({
    success: true,
    method,
    paymentId:    result.paymentId,
    qrCode:       result.qrCode,
    qrCodeBase64: result.qrCodeBase64,
    boletoUrl:    result.boletoUrl,
    paymentUrl:   result.paymentUrl,
    valor:        parcela.valor,
    numero:       parcela.numero,
    dueDate:      new Date(parcela.dueDate).toLocaleDateString('pt-BR'),
    buyerName:    payerName,
    buyerPhone:   payerPhone,
  })
}
