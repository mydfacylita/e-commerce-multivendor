import { NextRequest, NextResponse } from 'next/server'

/**
 * Alias para /api/feeds/facebook-catalog
 * Mantido para não quebrar catálogos e campanhas existentes do Meta/Instagram.
 */

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const destination = `${url.origin}/api/feeds/facebook-catalog${url.search}`
  return NextResponse.redirect(destination, { status: 301 })
}
