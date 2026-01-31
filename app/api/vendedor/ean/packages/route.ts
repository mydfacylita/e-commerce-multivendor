import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/vendedor/ean/packages
 * Retorna pacotes EAN disponíveis para o vendedor (baseado no plano)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar seller e seu plano
    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id },
      include: {
        subscriptions: {
          where: { status: { in: ['ACTIVE', 'TRIAL'] } },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 })
    }

    const activeSubscription = seller.subscriptions?.[0]
    const planId = activeSubscription?.planId

    // Buscar pacotes: sem planId (todos) OU específicos do plano do vendedor
    const packages = await prisma.$queryRaw`
      SELECT 
        id, name, description, quantity, price, type, popular, active
      FROM EANPackage
      WHERE active = TRUE
        AND (planId IS NULL OR planId = ${planId || ''})
      ORDER BY displayOrder ASC, price ASC
    `

    return NextResponse.json({ packages })
  } catch (error: any) {
    console.error('Erro ao buscar pacotes:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar pacotes' },
      { status: 500 }
    )
  }
}
