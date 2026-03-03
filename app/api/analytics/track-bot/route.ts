import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

/**
 * API interna para registrar visitas de bots aliados.
 * Chamada pelo middleware de forma não-bloqueante (fire-and-forget).
 * Requer header x-internal: true
 */

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Segurança: só aceita chamadas internas
  if (req.headers.get('x-internal') !== 'true') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { botName, botType, userAgent, path, ip } = await req.json()

    await prisma.$executeRaw`
      INSERT INTO analytics_table (id, name, description, data, createdAt, updatedAt)
      VALUES (
        ${nanoid()},
        ${'bot_crawl'},
        ${botName},
        ${JSON.stringify({ botName, botType, userAgent, path, ip, serverTimestamp: new Date().toISOString() })},
        NOW(),
        NOW()
      )
    `

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao registrar bot' }, { status: 500 })
  }
}
