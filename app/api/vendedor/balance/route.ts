import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET /api/vendedor/balance
 * Retorna saldo disponível do vendedor
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        storeName: true,
        balance: true,
        totalEarned: true,
        totalWithdrawn: true
      }
    })

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 })
    }

    return NextResponse.json(seller)
  } catch (error: any) {
    console.error('Erro ao buscar saldo:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar saldo' },
      { status: 500 }
    )
  }
}
