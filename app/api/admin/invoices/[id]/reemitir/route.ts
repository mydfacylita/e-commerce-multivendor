import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { emitirNFeSefaz } from '@/lib/sefaz-nfe'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: { order: { select: { id: true, status: true } } }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Nota não encontrada' }, { status: 404 })
    }

    if (invoice.status === 'ISSUED' && !invoice.protocol?.startsWith('SIMULATED-')) {
      return NextResponse.json({ error: 'Esta nota já está emitida e autorizada pela SEFAZ' }, { status: 400 })
    }

    if (invoice.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Nota cancelada não pode ser reemitida' }, { status: 400 })
    }

    // Resetar status para permitir reemissão
    await prisma.invoice.update({
      where: { id: params.id },
      data: {
        status: 'PENDING',
        errorMessage: null,
        protocol: null,
        accessKey: null,
        invoiceNumber: null,
      }
    })

    // Chamar emissão
    const resultado = await emitirNFeSefaz(params.id)

    if (!resultado.success) {
      return NextResponse.json({ error: resultado.error || 'Erro na reemissão' }, { status: 422 })
    }

    return NextResponse.json({
      message: 'Nota fiscal reemitida com sucesso!',
      chaveAcesso: resultado.chaveAcesso,
      numeroNota: resultado.numeroNota,
      protocolo: resultado.protocolo,
    })
  } catch (error: any) {
    console.error('[reemitir]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
