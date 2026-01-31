/**
 * API: Listar Cidades por Estado
 * GET /api/location/cities/[stateId]
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stateId: string }> }
) {
  try {
    const { stateId } = await params

    let stateIdNum: number

    if (/^\d+$/.test(stateId)) {
      // É um ID numérico
      stateIdNum = parseInt(stateId)
    } else if (stateId.length === 2) {
      // É uma UF (sigla de 2 caracteres)
      const states = await prisma.$queryRaw<{id: number}[]>`
        SELECT id FROM states WHERE uf = ${stateId.toUpperCase()} LIMIT 1
      `
      if (!states.length) {
        return NextResponse.json({ error: 'Estado não encontrado' }, { status: 404 })
      }
      stateIdNum = states[0].id
    } else {
      return NextResponse.json({ error: 'ID ou UF inválido' }, { status: 400 })
    }

    const cities = await prisma.$queryRaw<{id: number, name: string, ibgeCode: number}[]>`
      SELECT id, name, ibgeCode FROM cities WHERE stateId = ${stateIdNum} ORDER BY name ASC
    `

    return NextResponse.json(cities)
  } catch (error: any) {
    console.error('Erro ao buscar cidades:', error)
    return NextResponse.json({ error: 'Erro ao buscar cidades' }, { status: 500 })
  }
}
