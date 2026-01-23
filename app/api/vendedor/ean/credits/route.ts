import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/vendedor/ean/credits
 * Busca créditos de EAN do vendedor
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é vendedor
    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id }
    })

    if (!seller) {
      return NextResponse.json(
        { error: 'Usuário não é vendedor' },
        { status: 403 }
      )
    }

    // Buscar créditos (por enquanto mock - adicionar tabela depois)
    const credits = []

    // TODO: Implementar tabela EANCredit no banco
    // const credits = await prisma.eANCredit.findMany({
    //   where: { sellerId: seller.id }
    // })

    return NextResponse.json({ credits })
  } catch (error) {
    console.error('Erro ao buscar créditos:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar créditos' },
      { status: 500 }
    )
  }
}
