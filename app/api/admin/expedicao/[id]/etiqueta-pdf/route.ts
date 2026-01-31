/**
 * API Route: Baixar Etiqueta PDF dos Correios
 * 
 * GET /api/admin/expedicao/[id]/etiqueta-pdf
 * 
 * Gera e retorna o PDF da etiqueta usando o fluxo assíncrono da API CWS
 */

import { NextRequest, NextResponse } from 'next/server'
import { correiosCWS } from '@/lib/correios-cws'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Buscar pedido com idPrePostagem
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        trackingCode: true,
        correiosIdPrePostagem: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    // Verificar se tem código de rastreio ou ID da pré-postagem
    const idPrePostagem = order.correiosIdPrePostagem

    if (!idPrePostagem) {
      return NextResponse.json({ 
        error: 'ID da pré-postagem não encontrado. Gere a etiqueta primeiro.' 
      }, { status: 400 })
    }

    console.log(`[EtiquetaPDF] Gerando PDF para pedido ${id}, pré-postagem: ${idPrePostagem}`)

    // Gerar etiqueta PDF usando fluxo assíncrono
    const resultado = await correiosCWS.gerarEtiqueta(idPrePostagem, order.trackingCode || undefined)

    if (!resultado.success || !resultado.pdfBuffer) {
      return NextResponse.json({ 
        error: resultado.error || 'Erro ao gerar PDF da etiqueta' 
      }, { status: 500 })
    }

    console.log(`[EtiquetaPDF] PDF gerado: ${resultado.pdfBuffer.length} bytes`)

    // Retornar PDF diretamente (convertendo Buffer para Uint8Array)
    return new NextResponse(new Uint8Array(resultado.pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="etiqueta-${order.trackingCode || id}.pdf"`,
        'Content-Length': resultado.pdfBuffer.length.toString()
      }
    })

  } catch (error: any) {
    console.error('[EtiquetaPDF] Erro:', error)
    return NextResponse.json({ 
      error: error.message || 'Erro interno' 
    }, { status: 500 })
  }
}
