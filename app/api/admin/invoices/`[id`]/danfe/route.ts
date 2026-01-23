import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Danfe from 'danfe-pdf'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = 'then' in context.params ? await context.params : context.params
    if (!params?.id) return new NextResponse('ID não fornecido', { status: 400 })
    
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
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
    })

    if (!invoice || !invoice.order) {
      return new NextResponse('Nota ou pedido não encontrado', { status: 404 })
    }

    if (!invoice.xmlAssinado) {
      return new NextResponse('XML da nota fiscal não encontrado. Emita a nota primeiro.', { status: 400 })
    }

    // Gerar DANFE usando a biblioteca danfe-pdf (padrão oficial SEFAZ)
    const danfe = new Danfe(invoice.xmlAssinado)
    const pdfBuffer = await danfe.gerarPDF()

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="danfe-nfe-${invoice.invoiceNumber}.pdf"`
      },
    })

  } catch (error: any) {
    console.error('Erro ao gerar DANFE com biblioteca:', error)
    return new NextResponse(`Erro ao gerar DANFE: ${error.message}`, { status: 500 })
  }
}
