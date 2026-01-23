import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        order: {
          select: {
            userId: true,
            buyerEmail: true
          }
        }
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Nota fiscal não encontrada' }, { status: 404 })
    }

    // Verificar se o usuário tem permissão para ver esta invoice
    const isOwner = invoice.order.userId === session.user.id
    const isAdmin = session.user.role === 'ADMIN'
    const isBuyer = invoice.order.buyerEmail === session.user.email

    if (!isOwner && !isAdmin && !isBuyer) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    if (invoice.status === 'ERROR') {
      return NextResponse.json({ error: 'Nota fiscal com erro' }, { status: 400 })
    }

    // Se a nota não foi emitida ainda
    if (invoice.status !== 'ISSUED') {
      return NextResponse.json({ 
        error: 'XML não disponível',
        message: 'A nota fiscal ainda não foi emitida'
      }, { status: 404 })
    }

    // Usar o XML assinado que já está salvo no banco
    if (!invoice.xmlAssinado) {
      return NextResponse.json({ 
        error: 'XML não disponível',
        message: 'O arquivo XML da nota fiscal não está disponível para download'
      }, { status: 404 })
    }

    return new NextResponse(invoice.xmlAssinado, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="NFe_${invoice.invoiceNumber || invoice.id}.xml"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error: any) {
    console.error('Erro ao baixar XML da NF-e:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}