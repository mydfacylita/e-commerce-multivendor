import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PaymentService } from '@/lib/payment'

export const dynamic = 'force-dynamic'

/**
 * POST /api/orders/[id]/carne/parcelas/[parcelaId]/pagar
 * Gera Pix ou Boleto para pagamento de uma parcela do carnê
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; parcelaId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { method } = await request.json() // 'pix' | 'boleto'
    if (!method || !['pix', 'boleto'].includes(method)) {
      return NextResponse.json({ error: 'Método inválido. Use pix ou boleto.' }, { status: 400 })
    }

    // Buscar pedido + carnê + parcela
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, cpf: true } },
        carne: {
          include: {
            parcelas: { where: { id: params.parcelaId } }
          }
        }
      }
    })

    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })

    // Verificar dono
    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const carne = order.carne
    if (!carne) return NextResponse.json({ error: 'Este pedido não tem carnê' }, { status: 404 })

    const parcela = carne.parcelas[0]
    if (!parcela) return NextResponse.json({ error: 'Parcela não encontrada' }, { status: 404 })

    if (parcela.status === 'PAID') {
      return NextResponse.json({ error: 'Esta parcela já foi paga' }, { status: 400 })
    }
    if (parcela.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Esta parcela foi cancelada' }, { status: 400 })
    }
    if (!carne.financingAcceptedAt) {
      return NextResponse.json({ error: 'O contrato de financiamento ainda não foi aceito' }, { status: 400 })
    }

    // Montar dados do pagador
    const payerDocument = carne.buyerCpf || order.user?.cpf || undefined
    const payerPhone = carne.buyerPhone || order.user?.phone || undefined
    const payerName = carne.buyerName || order.user?.name || 'Cliente'
    const payerEmail = session.user.email!

    // Tentar parsear endereço para boleto
    let payerAddress: any
    if (order.shippingAddress) {
      try {
        const addr = JSON.parse(order.shippingAddress)
        if (addr.zipCode && addr.city) {
          payerAddress = {
            street: addr.street || 'Rua',
            number: addr.number || 'SN',
            complement: addr.complement || undefined,
            neighborhood: addr.neighborhood || 'Centro',
            city: addr.city,
            state: addr.state,
            zipCode: addr.zipCode.replace(/\D/g, '')
          }
        }
      } catch {}
    }

    // externalReference único por parcela para identificação no webhook
    const externalReference = `CARNE_PARCELA_${parcela.id}`

    const result = await PaymentService.createPayment({
      amount: parcela.valor,
      description: `Carnê ${order.id.slice(-8).toUpperCase()} – Parcela ${parcela.numero}/${carne.parcelas.length > 0 ? carne.parcelas.length : '?'}`,
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
        userId: session.user.id,
        parcela: parcela.numero,
      }
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Erro ao gerar pagamento' }, { status: 400 })
    }

    // Salva (ou atualiza) o ID da transação na parcela para que check-status
    // possa consultar o MP diretamente pelo ID, sem depender de external_reference.
    // Se o cliente gerar um novo pagamento, o paymentId antigo é substituído pelo novo.
    if (result.paymentId) {
      await prisma.carneParcela.update({
        where: { id: parcela.id },
        data: { paymentId: String(result.paymentId) }
      })
    }

    return NextResponse.json({
      success: true,
      method,
      paymentId: result.paymentId,
      // Pix
      qrCode: result.qrCode,
      qrCodeBase64: result.qrCodeBase64,
      // Boleto
      boletoUrl: result.boletoUrl,
      paymentUrl: result.paymentUrl,
      // Info da parcela
      valor: parcela.valor,
      numero: parcela.numero,
      dueDate: new Date(parcela.dueDate).toLocaleDateString('pt-BR'),
    })
  } catch (error: any) {
    console.error('[CARNE PAGAR]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
