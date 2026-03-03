import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * API de Monitoramento de Bots Aliados
 * GET /api/analytics/bot-monitor?days=7
 */

export const dynamic = 'force-dynamic'

// Categorias de bots conhecidos
const BOT_CATEGORIES: Record<string, { label: string; icon: string; benefit: string }> = {
  googlebot:     { label: 'Googlebot',          icon: '🔍', benefit: 'SEO Orgânico' },
  googlebot_img: { label: 'Google Imagens',      icon: '🖼️',  benefit: 'Google Imagens' },
  google_shop:   { label: 'Google Shopping',     icon: '🛍️',  benefit: 'Shopping Grátis' },
  googlebot_news:{ label: 'Google News',         icon: '📰', benefit: 'Google News' },
  bingbot:       { label: 'Bingbot',             icon: '🔷', benefit: 'SEO Bing' },
  bing_shop:     { label: 'Bing Shopping',       icon: '🛒', benefit: 'Bing Shopping' },
  facebook:      { label: 'Facebook/Instagram',  icon: '📘', benefit: 'Preview links FB/IG' },
  whatsapp:      { label: 'WhatsApp',            icon: '💬', benefit: 'Preview links Whats' },
  twitter:       { label: 'Twitter/X',           icon: '🐦', benefit: 'Preview links Twitter' },
  pinterest:     { label: 'Pinterest',           icon: '📌', benefit: 'Rich Pins Pinterest' },
  buscape:       { label: 'Buscapé',             icon: '💰', benefit: 'Comparador de preço' },
  zoom:          { label: 'Zoom',                icon: '🔎', benefit: 'Comparador de preço' },
  linkedin:      { label: 'LinkedIn',            icon: '💼', benefit: 'Preview LinkedIn' },
  slack:         { label: 'Slack',               icon: '⚡', benefit: 'Preview Slack' },
  telegram:      { label: 'Telegram',            icon: '📱', benefit: 'Preview Telegram' },
  semrush:       { label: 'SEMrush',             icon: '📊', benefit: 'Análise SEO' },
  ahrefs:        { label: 'Ahrefs',              icon: '📈', benefit: 'Análise SEO' },
  moz:           { label: 'Moz',                 icon: '📉', benefit: 'Análise SEO' },
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const days = parseInt(request.nextUrl.searchParams.get('days') || '7')

  try {
    // Buscar eventos de bots — apenas colunas no GROUP BY (compatible com only_full_group_by)
    const results: any[] = await prisma.$queryRaw`
      SELECT
        description                          AS botName,
        JSON_UNQUOTE(JSON_EXTRACT(data, '$.botType')) AS botType,
        MAX(DATE(createdAt))                 AS lastDate,
        COUNT(*)                             AS visits
      FROM analytics_table
      WHERE name = 'bot_crawl'
        AND createdAt >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
      GROUP BY description, JSON_UNQUOTE(JSON_EXTRACT(data, '$.botType'))
      ORDER BY visits DESC
    `

    // Top páginas mais crawleadas
    const topPages: any[] = await prisma.$queryRaw`
      SELECT
        JSON_UNQUOTE(JSON_EXTRACT(data, '$.path')) AS path,
        description                                 AS botName,
        COUNT(*)                                    AS visits
      FROM analytics_table
      WHERE name = 'bot_crawl'
        AND createdAt >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
      GROUP BY JSON_UNQUOTE(JSON_EXTRACT(data, '$.path')), description
      ORDER BY visits DESC
      LIMIT 20
    `

    // Visitas por dia
    const byDay: any[] = await prisma.$queryRaw`
      SELECT
        DATE(createdAt) AS date,
        description     AS botName,
        COUNT(*)        AS visits
      FROM analytics_table
      WHERE name = 'bot_crawl'
        AND createdAt >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
      GROUP BY DATE(createdAt), description
      ORDER BY date ASC
    `

    // Agrupar por tipo de bot
    const botSummary: Record<string, { label: string; icon: string; benefit: string; visits: number; lastSeen: string }> = {}

    for (const row of results) {
      const botType = row.botType || 'unknown'
      const info = BOT_CATEGORIES[botType] || { label: row.botName || botType, icon: '🤖', benefit: 'Desconhecido' }

      if (!botSummary[botType]) {
        botSummary[botType] = { ...info, visits: 0, lastSeen: '' }
      }
      botSummary[botType].visits += Number(row.visits)
      if (!botSummary[botType].lastSeen || String(row.lastDate) > botSummary[botType].lastSeen) {
        botSummary[botType].lastSeen = String(row.lastDate).substring(0, 10)
      }
    }

    return NextResponse.json({
      summary: Object.entries(botSummary)
        .map(([type, d]) => ({ type, ...d }))
        .sort((a, b) => b.visits - a.visits),
      topPages: topPages.map(r => ({
        path: r.path || '/',
        botName: r.botName,
        visits: Number(r.visits)
      })),
      byDay: byDay.map(r => ({
        date: String(r.date).substring(0, 10),
        botName: r.botName,
        visits: Number(r.visits)
      })),
      days,
      total: results.reduce((acc, r) => acc + Number(r.visits), 0)
    })
  } catch (error) {
    console.error('[BotMonitor]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
