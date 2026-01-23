import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { LabelService } from '@/lib/label-service'

// GET - Gerar etiqueta de envio (multi-transportadora)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = params

    // Usar o LabelService para gerar etiqueta baseado no método de envio
    const result = await LabelService.generateLabel(id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Marcar etiqueta como impressa
    await (prisma.order as any).update({
      where: { id },
      data: { labelPrintedAt: new Date() }
    })

    // Se é uma URL, redirecionar
    if (result.type === 'url') {
      return NextResponse.redirect(result.data as string)
    }

    // Se é PDF (Buffer), converter para Uint8Array
    if (result.type === 'pdf' && Buffer.isBuffer(result.data)) {
      return new NextResponse(new Uint8Array(result.data), {
        headers: {
          'Content-Type': result.contentType,
          'Content-Disposition': 'inline; filename="etiqueta.pdf"'
        }
      })
    }

    // Retornar conteúdo HTML/ZPL
    return new NextResponse(result.data as string, {
      headers: {
        'Content-Type': result.contentType
      }
    })
  } catch (error) {
    console.error('Erro ao gerar etiqueta:', error)
    return NextResponse.json({ error: 'Erro ao gerar etiqueta' }, { status: 500 })
  }
}
