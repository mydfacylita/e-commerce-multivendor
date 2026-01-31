/**
 * API: Listar Estados do Brasil
 * GET /api/location/states
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const states = await prisma.$queryRaw<{id: number, name: string, uf: string}[]>`
      SELECT id, name, uf FROM states ORDER BY name ASC
    `

    return NextResponse.json(states)
  } catch (error: any) {
    console.error('Erro ao buscar estados:', error)
    return NextResponse.json({ error: 'Erro ao buscar estados' }, { status: 500 })
  }
}
