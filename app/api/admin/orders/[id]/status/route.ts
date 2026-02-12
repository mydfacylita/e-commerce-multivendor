import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { processAffiliateCommission, cancelAffiliateCommission } from '@/lib/affiliate-commission'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    // Verificar autenticação e permissão de admin
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status é obrigatório' },
        { status: 400 }
      )
    }

    const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status inválido. Use: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Buscar pedido atual
    const currentOrder = await prisma.order.findUnique({
      where: { id: params.id },
      select: { status: true }
    })

    if (!currentOrder) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar status do pedido
    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        status,
        updatedAt: new Date()
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Processar comissão de afiliado se aplicável
    let affiliateResult = null

    if (status === 'DELIVERED') {
      // Quando entregue, liberar comissão
      affiliateResult = await processAffiliateCommission(params.id)
      console.log('📦 [STATUS UPDATE] Pedido marcado como DELIVERED')
      console.log('💰 [AFILIADO] Resultado:', affiliateResult)
    } else if (status === 'CANCELLED') {
      // Quando cancelado, cancelar comissão
      affiliateResult = await cancelAffiliateCommission(params.id)
      console.log('❌ [STATUS UPDATE] Pedido marcado como CANCELLED')
      console.log('💸 [AFILIADO] Resultado:', affiliateResult)
    }

    return NextResponse.json({
      message: 'Status atualizado com sucesso',
      order,
      affiliate: affiliateResult
    })
  } catch (error: any) {
    console.error('[ADMIN] Erro ao atualizar status:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao atualizar status' },
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        buyerName: true,
        total: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(order)
  } catch (error: any) {
    console.error('[ADMIN] Erro ao buscar status:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao buscar status' },
      { status: 500 }
    )
  }
}
