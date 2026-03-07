import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WhatsAppService } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/sac/[id]/messages/[msgId]/media
 * Proxy que baixa a mídia do WhatsApp e entrega ao admin com Content-Disposition para download
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; msgId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const msg = await prisma.ticketMessage.findFirst({
    where: { id: params.msgId, ticketId: params.id },
  })

  if (!msg) {
    return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 })
  }

  if (!msg.attachments) {
    return NextResponse.json({ error: 'Mensagem sem anexo' }, { status: 400 })
  }

  let mediaId: string
  let mimeType: string
  let filename: string

  try {
    const parsed = JSON.parse(msg.attachments)
    mediaId  = parsed.mediaId
    mimeType = parsed.mimeType || 'application/octet-stream'
    filename = parsed.filename || 'arquivo'
  } catch {
    return NextResponse.json({ error: 'Dados de anexo inválidos' }, { status: 400 })
  }

  if (!mediaId) {
    return NextResponse.json({ error: 'mediaId ausente' }, { status: 400 })
  }

  const config = await WhatsAppService.getConfig()
  if (!config.accessToken) {
    return NextResponse.json({ error: 'Token do WhatsApp não configurado' }, { status: 503 })
  }

  // 1. Buscar URL temporária da mídia na API do Meta
  const metaUrlRes = await fetch(
    `https://graph.facebook.com/v18.0/${mediaId}`,
    { headers: { Authorization: `Bearer ${config.accessToken}` } }
  )

  if (!metaUrlRes.ok) {
    const err = await metaUrlRes.text()
    console.error('[SAC Media] Meta API error:', err)
    return NextResponse.json({ error: 'Erro ao obter URL da mídia no Meta' }, { status: 502 })
  }

  const metaData = await metaUrlRes.json()
  const mediaUrl: string = metaData.url

  if (!mediaUrl) {
    return NextResponse.json({ error: 'URL da mídia não retornada pelo Meta' }, { status: 502 })
  }

  // 2. Baixar o arquivo usando o token
  const fileRes = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${config.accessToken}` },
  })

  if (!fileRes.ok || !fileRes.body) {
    return NextResponse.json({ error: 'Erro ao baixar arquivo do Meta' }, { status: 502 })
  }

  // 3. Stream para o admin com nome de arquivo correto
  const safeFilename = encodeURIComponent(filename)
  return new NextResponse(fileRes.body, {
    status: 200,
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`,
      'Cache-Control': 'private, no-store',
    },
  })
}
