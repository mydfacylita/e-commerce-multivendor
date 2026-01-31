import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// POST - Cancelar saque
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const withdrawalId = params.id

    // Verificar se é vendedor
    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id }
    })

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 })
    }

    // Buscar saque
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId }
    })

    if (!withdrawal) {
      return NextResponse.json({ error: 'Saque não encontrado' }, { status: 404 })
    }

    // Verificar se pertence ao vendedor
    if (withdrawal.sellerId !== seller.id) {
      return NextResponse.json({ error: 'Saque não pertence a este vendedor' }, { status: 403 })
    }

    // Verificar se pode ser cancelado (apenas PENDING)
    if (withdrawal.status !== 'PENDING') {
      return NextResponse.json({ 
        error: 'Apenas saques pendentes podem ser cancelados',
        currentStatus: withdrawal.status
      }, { status: 400 })
    }

    // Cancelar saque (não precisa devolver saldo pois ainda não foi descontado)
    const updatedWithdrawal = await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Saque cancelado com sucesso',
      withdrawal: {
        id: updatedWithdrawal.id,
        status: updatedWithdrawal.status,
        amount: updatedWithdrawal.amount
      }
    })

  } catch (error) {
    console.error('Erro ao cancelar saque:', error)
    return NextResponse.json({ 
      error: 'Erro ao cancelar saque',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
