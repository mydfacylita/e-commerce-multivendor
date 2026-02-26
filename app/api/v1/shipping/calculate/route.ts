import { NextRequest, NextResponse } from 'next/server'
import { validateDevAuth, hasScope, devAuthError, logDevApiCall } from '@/lib/dev-auth'
import { prisma } from '@/lib/prisma'

interface ShippingPayload {
  origin_zip: string
  destination_zip: string
  weight_grams: number
  length_cm: number
  width_cm: number
  height_cm: number
}

export async function POST(req: NextRequest) {
  const auth = await validateDevAuth(req)
  if (!auth.valid) return devAuthError(auth.error!, auth.statusCode!)

  if (!hasScope(auth, 'shipping:calculate')) return devAuthError('Scope insuficiente: shipping:calculate', 403)

  let body: ShippingPayload
  try { body = await req.json() } catch { return devAuthError('JSON inválido', 400) }

  const { origin_zip, destination_zip, weight_grams, length_cm, width_cm, height_cm } = body

  if (!origin_zip || !destination_zip || !weight_grams || !length_cm || !width_cm || !height_cm) {
    return devAuthError('Campos obrigatórios: origin_zip, destination_zip, weight_grams, length_cm, width_cm, height_cm', 400)
  }

  // Cálculo simples de frete (estimativa)
  const volumeCm3 = length_cm * width_cm * height_cm
  const chargeableWeight = Math.max(weight_grams, volumeCm3 / 6) // fator cúbico

  const basePrice = 8.0
  const weightPrice = (chargeableWeight / 1000) * 4.5
  const estimatedDays = 5 + Math.floor(Math.random() * 5)

  await logDevApiCall({
    appId: auth.appId!, keyPrefix: auth.keyPrefix!,
    method: 'POST', path: '/api/v1/shipping/calculate',
    statusCode: 200, latencyMs: 0, ipAddress: req.headers.get('x-forwarded-for') ?? undefined
  })

  return NextResponse.json({
    data: [
      {
        service: 'PAC',
        service_code: '04510',
        price: parseFloat((basePrice + weightPrice).toFixed(2)),
        estimated_days: estimatedDays,
        max_date: new Date(Date.now() + estimatedDays * 86400000).toISOString().split('T')[0],
      },
      {
        service: 'SEDEX',
        service_code: '04014',
        price: parseFloat((basePrice + weightPrice * 2.2).toFixed(2)),
        estimated_days: Math.max(2, Math.floor(estimatedDays / 2)),
        max_date: new Date(Date.now() + Math.max(2, Math.floor(estimatedDays / 2)) * 86400000).toISOString().split('T')[0],
      }
    ]
  })
}
