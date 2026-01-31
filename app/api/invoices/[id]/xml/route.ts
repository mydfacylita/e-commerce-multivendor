import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = 'then' in context.params ? await context.params : context.params
    if (!params?.id) return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 })

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
      return NextResponse.json({ error: 'Nota ou pedido não encontrado' }, { status: 404 })
    }

    // Verificar se tem token válido (orderId)
    if (!orderToken || orderToken !== invoice.order.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (invoice.status !== 'ISSUED') {
      return NextResponse.json({ 
        error: 'XML não disponível',
        message: 'A nota fiscal ainda não foi emitida'
      }, { status: 400 })
    }

    if (!invoice.xmlAssinado) {
      return NextResponse.json({ error: 'XML não encontrado' }, { status: 400 })
    }

    // Retornar o XML
    return new NextResponse(invoice.xmlAssinado, {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="nfe-${invoice.invoiceNumber}.xml"`
      },
    })

  } catch (error: any) {
    console.error('Erro ao buscar XML:', error)
    return NextResponse.json({ error: 'Erro ao buscar XML' }, { status: 500 })
  }
}
