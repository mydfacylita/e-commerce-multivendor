/**
 * API Route: Baixar Etiqueta PDF dos Correios
 * 
 * GET /api/admin/expedicao/[id]/etiqueta-pdf
 * 
 * Gera e retorna o PDF da etiqueta usando o fluxo assíncrono da API CWS
 * Redimensiona para 100x150mm (tamanho padrão de etiquetadoras)
 */

import { NextRequest, NextResponse } from 'next/server'
import { correiosCWS } from '@/lib/correios-cws'
import { prisma } from '@/lib/prisma'
import { PDFDocument } from 'pdf-lib'


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

    // Redimensionar PDF para 100x150mm (283x425 pontos) — tamanho de etiquetadora
    const srcDoc = await PDFDocument.load(resultado.pdfBuffer)
    const srcPage = srcDoc.getPages()[0]
    const { width: srcW, height: srcH } = srcPage.getSize()

    // Tamanho alvo: 100mm x 150mm em pontos (1mm = 2.835pt)
    const targetW = 283.46  // 100mm
    const targetH = 425.20  // 150mm

    const newDoc = await PDFDocument.create()
    const [embedded] = await newDoc.embedPages([srcPage])

    const page = newDoc.addPage([targetW, targetH])
    // Escalar para caber na etiqueta mantendo proporção
    const scale = Math.min(targetW / srcW, targetH / srcH)
    const xOffset = (targetW - srcW * scale) / 2
    const yOffset = (targetH - srcH * scale) / 2
    page.drawPage(embedded, {
      x: xOffset,
      y: yOffset,
      width: srcW * scale,
      height: srcH * scale,
    })

    const pdfBytes = await newDoc.save()

    return new NextResponse(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="etiqueta-${order.trackingCode || id}.pdf"`,
        'Content-Length': pdfBytes.length.toString()
      }
    })

  } catch (error: any) {
    console.error('[EtiquetaPDF] Erro:', error)
    return NextResponse.json({ 
      error: error.message || 'Erro interno' 
    }, { status: 500 })
  }
}
