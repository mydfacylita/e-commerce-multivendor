import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/analytics/ip-investigation
// ?ip=1.2.3.4  → detalhes de um IP específico
// sem parâmetro → lista resumida de todos os IPs
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const targetIp = searchParams.get('ip')
  const days = parseInt(searchParams.get('days') || '30')

  try {
    if (targetIp) {
      // ── Detalhe de um IP específico ──────────────────────────────────────
      const rows: any[] = await prisma.$queryRaw`
        SELECT
          id,
          name,
          data,
          createdAt
        FROM analytics_table
        WHERE JSON_EXTRACT(data, '$.ip') = ${targetIp}
          AND createdAt >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
        ORDER BY createdAt ASC
        LIMIT 2000
      `

      const events = rows.map(r => {
        const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
        return {
          id: r.id,
          event: r.name,
          url: d.url || d.page || '',
          page: d.page || '',
          referrer: d.referrer || '',
          userAgent: d.userAgent || '',
          visitorId: d.visitorId || '',
          sessionId: d.sessionId || '',
          timestamp: r.createdAt,
        }
      })

      // Cálculo de score de bot
      const pageViews = events.filter(e => e.event === 'page_view').length
      const sessions = new Set(events.map(e => e.sessionId)).size
      const uniquePages = new Set(events.map(e => e.url)).size
      const firstSeen = events[0]?.timestamp || null
      const lastSeen = events[events.length - 1]?.timestamp || null
      const firstMs = firstSeen ? new Date(firstSeen).getTime() : 0
      const lastMs = lastSeen ? new Date(lastSeen).getTime() : 0
      const durationMin = firstMs && lastMs ? (lastMs - firstMs) / 60000 : 0
      const pagesPerMin = durationMin > 0 ? pageViews / durationMin : pageViews

      // Score de suspeita: >10 páginas/min = 100, escala linear
      const botScore = Math.min(100, Math.round((pagesPerMin / 10) * 100))

      // Sequência de navegação (jornada)
      const journey = events
        .filter(e => e.event === 'page_view')
        .map(e => ({ url: e.url, timestamp: e.timestamp }))

      const userAgents = [...new Set(events.map(e => e.userAgent).filter(Boolean))]

      return NextResponse.json({
        ip: targetIp,
        summary: {
          totalEvents: events.length,
          pageViews,
          sessions,
          uniquePages,
          firstSeen,
          lastSeen,
          durationMin: Math.round(durationMin),
          pagesPerMin: Math.round(pagesPerMin * 10) / 10,
          botScore,
          userAgents,
        },
        journey,
        events,
      })
    }

    // ── Lista resumida de todos os IPs ──────────────────────────────────────
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        JSON_UNQUOTE(JSON_EXTRACT(data, '$.ip'))             AS ip,
        COUNT(*)                                              AS totalEvents,
        SUM(name = 'page_view')                              AS pageViews,
        COUNT(DISTINCT JSON_EXTRACT(data, '$.sessionId'))    AS sessions,
        COUNT(DISTINCT JSON_EXTRACT(data, '$.url'))          AS uniquePages,
        MIN(createdAt)                                        AS firstSeen,
        MAX(createdAt)                                        AS lastSeen,
        MIN(JSON_UNQUOTE(JSON_EXTRACT(data, '$.userAgent'))) AS userAgent
      FROM analytics_table
      WHERE JSON_EXTRACT(data, '$.ip') IS NOT NULL
        AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.ip')) != 'null'
        AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.ip')) != '0.0.0.0'
        AND createdAt >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
      GROUP BY ip
      ORDER BY totalEvents DESC
      LIMIT 500
    `

    const ips = rows.map(r => {
      const pv = Number(r.pageViews) || 0
      const first = r.firstSeen ? new Date(r.firstSeen).getTime() : 0
      const last = r.lastSeen ? new Date(r.lastSeen).getTime() : 0
      const dur = first && last ? (last - first) / 60000 : 0
      const ppm = dur > 0 ? pv / dur : pv
      const botScore = Math.min(100, Math.round((ppm / 10) * 100))

      // Detectar se é bot pelo user agent
      const ua = (r.userAgent || '').toLowerCase()
      const knownBot = /bot|crawl|spider|scrape|headless|python|curl|wget|go-http|java\/|okhttp/i.test(ua)

      return {
        ip: r.ip,
        totalEvents: Number(r.totalEvents),
        pageViews: pv,
        sessions: Number(r.sessions),
        uniquePages: Number(r.uniquePages),
        firstSeen: r.firstSeen,
        lastSeen: r.lastSeen,
        durationMin: Math.round(dur),
        pagesPerMin: Math.round(ppm * 10) / 10,
        botScore,
        knownBot,
        userAgent: r.userAgent || '',
        suspicious: botScore >= 40 || knownBot,
      }
    })

    const suspicious = ips.filter(i => i.suspicious)
    const clean = ips.filter(i => !i.suspicious)

    return NextResponse.json({ suspicious, clean, total: ips.length, days })
  } catch (error) {
    console.error('[IP Investigation]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
