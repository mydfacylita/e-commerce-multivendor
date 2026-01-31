import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET /api/admin/planos
 * Lista todos os planos disponíveis
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const plans = await prisma.$queryRaw`
      SELECT id, name, description, price 
      FROM plan 
      WHERE active = TRUE
      ORDER BY price ASC
    `

    return NextResponse.json({ plans })
  } catch (error: any) {
    console.error('Erro ao listar planos:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao listar planos' },
      { status: 500 }
    )
  }
}
