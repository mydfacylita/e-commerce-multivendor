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
    // Buscar todos os eventos de bots
    const results: any[] = await prisma.$queryRaw`
      SELECT
        description as botName,
        JSON_EXTRACT(data, '$.botType') as botType,
        JSON_EXTRACT(data, '$.path') as path,
        JSON_EXTRACT(data, '$.userAgent') as userAgent,
        JSON_EXTRACT(data, '$.ip') as ip,
        DATE(createdAt) as date,
        COUNT(*) as visits
      FROM analytics_table
      WHERE name = 'bot_crawl'
        AND createdAt >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
      GROUP BY description, JSON_EXTRACT(data, '$.botType'), DATE(createdAt)
      ORDER BY visits DESC
    `

    // Top páginas mais crawleadas
    const topPages: any[] = await prisma.$queryRaw`
      SELECT
        JSON_EXTRACT(data, '$.path') as path,
        description as botName,
        COUNT(*) as visits
      FROM analytics_table
      WHERE name = 'bot_crawl'
        AND createdAt >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
      GROUP BY JSON_EXTRACT(data, '$.path'), description
      ORDER BY visits DESC
      LIMIT 20
    `

    // Visitas por dia (chart)
    const byDay: any[] = await prisma.$queryRaw`
      SELECT
        DATE(createdAt) as date,
        description as botName,
        COUNT(*) as visits
      FROM analytics_table
      WHERE name = 'bot_crawl'
        AND createdAt >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
      GROUP BY DATE(createdAt), description
      ORDER BY date ASC
    `

    // Agrupar por tipo de bot
    const botSummary: Record<string, { label: string; icon: string; benefit: string; visits: number; lastSeen: string; paths: string[] }> = {}

    for (const row of results) {
      const botType = row.botType?.replace(/"/g, '') || 'unknown'
      const info = BOT_CATEGORIES[botType] || { label: row.botName || botType, icon: '🤖', benefit: 'Desconhecido' }

      if (!botSummary[botType]) {
        botSummary[botType] = { ...info, visits: 0, lastSeen: '', paths: [] }
      }
      botSummary[botType].visits += Number(row.visits)
      if (!botSummary[botType].lastSeen || row.date > botSummary[botType].lastSeen) {
        botSummary[botType].lastSeen = row.date
      }
    }

    // Top páginas por bot
    for (const row of topPages) {
      const botType = 'unknown'
      const path = row.path?.replace(/"/g, '') || '/'
      // adicionar paths ao respectivo bot
    }

    return NextResponse.json({
      summary: Object.entries(botSummary)
        .map(([type, data]) => ({ type, ...data }))
        .sort((a, b) => b.visits - a.visits),
      topPages: topPages.map(r => ({
        path: r.path?.replace(/"/g, '') || '/',
        botName: r.botName,
        visits: Number(r.visits)
      })),
      byDay: byDay.map(r => ({
        date: r.date,
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
