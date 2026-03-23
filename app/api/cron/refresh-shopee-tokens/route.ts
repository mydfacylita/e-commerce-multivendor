import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

/**
 * CRON: Renovar tokens Shopee que vão expirar em breve
 *
 * Roda diariamente. Renova tokens que expiram em menos de 7 dias
 * usando o refresh_token (válido ~365 dias).
 *
 * Segurança: requer header Authorization: Bearer <CRON_SECRET>
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

const SHOPEE_API = 'https://partner.shopeemobile.com'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      include: { shopeeAuth: true },
    })

    if (!adminUser?.shopeeAuth?.partnerId || !adminUser?.shopeeAuth?.partnerKey) {
      return NextResponse.json({ error: 'Shopee não configurada' }, { status: 400 })
    }

    const { partnerId, partnerKey } = adminUser.shopeeAuth

    // Buscar todos os ShopeeAuth que expiram em menos de 7 dias
    const threshold = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const expiring = await prisma.shopeeAuth.findMany({
      where: {
        expiresAt: { lte: threshold },
        refreshToken: { not: '' },
      },
    })

    const results = { renewed: 0, failed: 0, errors: [] as string[] }

    for (const auth of expiring) {
      try {
        const timestamp = Math.floor(Date.now() / 1000)
        const endpoint  = '/api/v2/auth/access_token/get'
        const sign = crypto
          .createHmac('sha256', partnerKey)
          .update(`${partnerId}${endpoint}${timestamp}`)
          .digest('hex')

        const res = await fetch(
          `${SHOPEE_API}${endpoint}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              refresh_token: auth.refreshToken,
              partner_id: partnerId,
              shop_id: auth.shopId,
            }),
          }
        )

        const data = await res.json()

        if (data.error || !data.access_token) {
          results.failed++
          results.errors.push(`userId=${auth.userId}: ${data.message || data.error}`)
          continue
        }

        await prisma.shopeeAuth.update({
          where: { id: auth.id },
          data: {
            accessToken:  data.access_token,
            refreshToken: data.refresh_token || auth.refreshToken,
            expiresAt:    new Date(Date.now() + data.expire_in * 1000),
          },
        })

        results.renewed++
      } catch (err: any) {
        results.failed++
        results.errors.push(`userId=${auth.userId}: ${err.message}`)
      }
    }

    return NextResponse.json({
      ok: true,
      checked: expiring.length,
      ...results,
    })
  } catch (err) {
    console.error('Erro no cron refresh-shopee-tokens:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
