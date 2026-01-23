import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/ean/packages
 * Lista todos os pacotes EAN
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const packages = await prisma.$queryRaw`
      SELECT 
        ep.*,
        p.name as planName
      FROM EANPackage ep
      LEFT JOIN plan p ON ep.planId = p.id
      ORDER BY ep.displayOrder ASC, ep.createdAt DESC
    `

    return NextResponse.json({ packages })
  } catch (error: any) {
    console.error('Erro ao listar pacotes:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao listar pacotes' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/ean/packages
 * Cria novo pacote EAN
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, quantity, price, type, planId, active, displayOrder, popular } = body

    if (!name || !quantity || type === undefined) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const id = crypto.randomUUID()

    await prisma.$executeRaw`
      INSERT INTO EANPackage (
        id, name, description, quantity, price, type, planId, 
        active, displayOrder, popular, createdAt
      ) VALUES (
        ${id},
        ${name},
        ${description || null},
        ${quantity},
        ${price || 0},
        ${type},
        ${planId || null},
        ${active !== false},
        ${displayOrder || 0},
        ${popular || false},
        NOW()
      )
    `

    return NextResponse.json({ success: true, id })
  } catch (error: any) {
    console.error('Erro ao criar pacote:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar pacote' },
      { status: 500 }
    )
  }
}
