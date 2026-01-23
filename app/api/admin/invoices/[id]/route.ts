import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/admin/invoices/[id]
 * Retorna detalhes de uma nota fiscal específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const invoiceId = params.id

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }
      }
    }) as any

    if (!invoice) {
      return NextResponse.json({ error: 'Nota fiscal não encontrada' }, { status: 404 })
    }

    // Buscar eventos da nota fiscal (tabela InvoiceEvent se existir)
    let events: any[] = []
    try {
      const rawEvents = await prisma.$queryRaw`
        SELECT 
          id, 
          type, 
          description, 
          protocol, 
          xml_url as xmlUrl, 
          created_at as createdAt, 
          created_by as createdBy
        FROM invoice_event 
        WHERE invoice_id = ${invoiceId}
        ORDER BY created_at DESC
      ` as any[]
      events = rawEvents
    } catch {
      // Tabela pode não existir ainda
      console.log('Tabela invoice_event não encontrada, retornando eventos vazios')
    }

    // Formatar resposta
    const response = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      accessKey: invoice.accessKey,
      series: invoice.series,
      type: invoice.type,
      status: invoice.status,
      cfop: invoice.cfop,
      naturezaOperacao: invoice.naturezaOperacao,
      valorTotal: invoice.valorTotal,
      valorProdutos: invoice.valorProdutos,
      valorFrete: invoice.valorFrete,
      valorDesconto: invoice.valorDesconto,
      valorIcms: invoice.valorIcms,
      valorPis: invoice.valorPis,
      valorCofins: invoice.valorCofins,
      issuedAt: invoice.issuedAt,
      cancelledAt: invoice.cancelledAt,
      cancelReason: invoice.cancelReason,
      errorMessage: invoice.errorMessage,
      protocol: invoice.protocol,
      xmlUrl: invoice.xmlUrl,
      pdfUrl: invoice.pdfUrl,
      danfeUrl: invoice.danfeUrl,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      // Emitente
      emitenteCnpj: invoice.emitenteCnpj,
      emitenteNome: invoice.emitenteNome,
      emitenteIE: invoice.emitenteIE,
      emitenteCRT: invoice.emitenteCRT,
      emitenteLogradouro: invoice.emitenteLogradouro,
      emitenteNumero: invoice.emitenteNumero,
      emitenteComplemento: invoice.emitenteComplemento,
      emitenteBairro: invoice.emitenteBairro,
      emitenteMunicipio: invoice.emitenteMunicipio,
      emitenteUF: invoice.emitenteUF,
      emitenteCEP: invoice.emitenteCEP,
      // Destinatário
      destinatarioCpf: invoice.destinatarioCpf,
      destinatarioCnpj: invoice.destinatarioCnpj,
      destinatarioNome: invoice.destinatarioNome,
      destinatarioLogradouro: invoice.destinatarioLogradouro,
      destinatarioNumero: invoice.destinatarioNumero,
      destinatarioComplemento: invoice.destinatarioComplemento,
      destinatarioBairro: invoice.destinatarioBairro,
      destinatarioMunicipio: invoice.destinatarioMunicipio,
      destinatarioUF: invoice.destinatarioUF,
      destinatarioCEP: invoice.destinatarioCEP,
      // Pedido
      order: {
        id: invoice.order.id,
        buyerName: invoice.order.buyerName,
        buyerEmail: invoice.order.buyerEmail,
        buyerPhone: invoice.order.buyerPhone,
        status: invoice.order.status,
        total: invoice.order.total,
        items: invoice.order.items.map((item: any) => ({
          id: item.id,
          productName: item.product?.name || item.productName || 'Produto',
          quantity: item.quantity,
          price: item.price
        }))
      },
      // Eventos
      events
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Erro ao buscar nota fiscal:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar nota fiscal', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/invoices/[id]
 * Cancela uma nota fiscal (chamada pela página de listagem)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const invoiceId = params.id
    const body = await request.json()
    const { cancelReason } = body

    if (!cancelReason || cancelReason.trim().length < 10) {
      return NextResponse.json(
        { error: 'Motivo do cancelamento é obrigatório (mínimo 10 caracteres)' },
        { status: 400 }
      )
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Nota fiscal não encontrada' }, { status: 404 })
    }

    if (invoice.status !== 'ISSUED') {
      return NextResponse.json(
        { error: 'Apenas notas fiscais emitidas podem ser canceladas' },
        { status: 400 }
      )
    }

    // Tentar cancelar na SEFAZ se tiver chave de acesso
    if (invoice.accessKey) {
      try {
        const { cancelarNFeSefaz } = await import('@/lib/sefaz-events')
        const cancelResult = await cancelarNFeSefaz(invoiceId, cancelReason)
        
        if (!cancelResult.success) {
          // Se falhar na SEFAZ, ainda marca como cancelada no banco mas registra o erro
          console.warn('Erro ao cancelar na SEFAZ:', cancelResult.error)
        }
      } catch (sefazError: any) {
        console.warn('Módulo SEFAZ não disponível:', sefazError.message)
      }
    }

    // Atualizar no banco
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: cancelReason.trim()
      }
    })

    return NextResponse.json({ success: true, message: 'Nota fiscal cancelada' })
  } catch (error: any) {
    console.error('Erro ao cancelar nota fiscal:', error)
    return NextResponse.json(
      { error: 'Erro ao cancelar nota fiscal', details: error.message },
      { status: 500 }
    )
  }
}
