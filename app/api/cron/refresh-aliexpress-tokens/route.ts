import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

/**
 * CRON: Renovar tokens AliExpress prestes a expirar
 *
 * Agende para rodar diariamente.
 * Renova tokens que expiram nos próximos 7 dias.
 * Requer header: Authorization: Bearer <CRON_SECRET>
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const threshold = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const expiring = await prisma.aliExpressAuth.findMany({
    where: {
      expiresAt: { lte: threshold },
      refreshToken: { not: null },
    },
  })

  const results = { renewed: 0, failed: 0, errors: [] as string[] }

  for (const auth of expiring) {
    if (!auth.refreshToken) continue
    try {
      const timestamp = Date.now().toString()
      const params: Record<string, string> = {
        app_key: auth.appKey,
        refresh_token: auth.refreshToken,
        sign_method: 'sha256',
        timestamp,
      }
      const sortedKeys = Object.keys(params).sort()
      const signString = '/auth/token/refresh' + sortedKeys.map(k => `${k}${params[k]}`).join('')
      const sign = crypto
        .createHmac('sha256', auth.appSecret)
        .update(signString)
        .digest('hex')
        .toUpperCase()

      const qs = sortedKeys.map(k => `${k}=${encodeURIComponent(params[k])}`).join('&') + `&sign=${sign}`
      const res = await fetch(`https://api-sg.aliexpress.com/rest/auth/token/refresh?${qs}`, {
        headers: { Accept: 'application/json' },
      })
      const data = await res.json()

      const tokenData = data.aliexpress_system_oauth_access_token_get_response || data
      if (!tokenData.access_token) {
        results.failed++
        results.errors.push(`userId=${auth.userId}: ${JSON.stringify(data)}`)
        continue
      }

      const expiresAt = new Date(Date.now() + parseInt(tokenData.expires_in || '0') * 1000)
      await prisma.aliExpressAuth.update({
        where: { id: auth.id },
        data: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || auth.refreshToken,
          expiresAt,
        },
      })

      results.renewed++
    } catch (err: any) {
      results.failed++
      results.errors.push(`userId=${auth.userId}: ${err.message}`)
    }
  }

  return NextResponse.json({ ok: true, checked: expiring.length, ...results })
}
