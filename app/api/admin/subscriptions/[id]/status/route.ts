import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * PATCH /api/admin/subscriptions/[id]/status
 * Atualiza o status de uma assinatura
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ error: 'Status é obrigatório' }, { status: 400 })
    }

    // Validar status
    const validStatuses = ['TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED', 'PENDING_PAYMENT']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    }

    // Buscar assinatura
    const subscription = await prisma.subscription.findUnique({
      where: { id: params.id },
      include: {
        seller: {
          include: {
            user: true
          }
        }
      }
    })

    if (!subscription) {
      return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 })
    }

    // Atualizar status da assinatura
    const updated = await prisma.subscription.update({
      where: { id: params.id },
      data: { status }
    })

    // Sincronizar status da loja com a assinatura
    const sellerStatusMap: Record<string, 'ACTIVE' | 'SUSPENDED'> = {
      ACTIVE: 'ACTIVE',
      TRIAL: 'ACTIVE',
      SUSPENDED: 'SUSPENDED',
      CANCELLED: 'SUSPENDED',
      EXPIRED: 'SUSPENDED',
      PENDING_PAYMENT: 'SUSPENDED',
    }
    const newSellerStatus = sellerStatusMap[status]
    if (newSellerStatus) {
      await prisma.seller.update({
        where: { id: subscription.seller.id },
        data: { status: newSellerStatus }
      })
      console.log(`🏪 Loja ${subscription.seller.id} atualizada para ${newSellerStatus} (assinatura ${status})`)
    }

    console.log('📝 Admin atualizou status da assinatura:', {
      subscriptionId: params.id,
      sellerId: subscription.seller.id,
      oldStatus: subscription.status,
      newStatus: status,
      adminId: user.id
    })

    return NextResponse.json({
      message: 'Status atualizado com sucesso',
      subscription: updated
    })

  } catch (error) {
    console.error('Erro ao atualizar status:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar status' },
      { status: 500 }
    )
  }
}
