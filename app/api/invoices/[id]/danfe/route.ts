import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { gerarDanfePDF } from '@/lib/danfe-generator'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = 'then' in context.params ? await context.params : context.params
    if (!params?.id) return new NextResponse('ID não fornecido', { status: 400 })

    // Token do pedido para autorização
    const orderToken = req.nextUrl.searchParams.get('token')
    
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        order: {
          select: {
            id: true,
            userId: true
          }
        }
      }
    })

    if (!invoice || !invoice.order) {
      return new NextResponse('Nota ou pedido não encontrado', { status: 404 })
    }

    // Verificar se tem token válido (orderId)
    if (!orderToken || orderToken !== invoice.order.id) {
      return new NextResponse('Não autorizado', { status: 401 })
    }

    if (invoice.status !== 'ISSUED') {
      return new NextResponse('Nota fiscal ainda não foi emitida', { status: 400 })
    }

    if (!invoice.xmlAssinado) {
      return new NextResponse('XML da nota fiscal não encontrado', { status: 400 })
    }

    // Gerar DANFE (Documento Auxiliar da NFe) a partir do XML
    const pdfBuffer = await gerarDanfePDF(invoice.xmlAssinado)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="danfe-nfe-${invoice.invoiceNumber}.pdf"`
      },
    })

  } catch (error: any) {
    console.error('Erro ao gerar DANFE:', error)
    return new NextResponse(`Erro ao gerar DANFE: ${error.message}`, { status: 500 })
  }
}
