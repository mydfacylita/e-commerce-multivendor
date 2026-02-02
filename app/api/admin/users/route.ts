import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Listar usuários
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const role = searchParams.get('role') || 'all'

    const where: any = {}

    // Filtro de busca
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { cpf: { contains: search } },
        { phone: { contains: search } }
      ]
    }

    // Filtro de status
    if (status === 'active') {
      where.isActive = true
    } else if (status === 'blocked') {
      where.isActive = false
    }

    // Filtro de role
    if (role !== 'all') {
      where.role = role
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        role: true,
        isActive: true,
        blockedAt: true,
        blockedReason: true,
        createdAt: true,
        _count: {
          select: { orders: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Erro ao listar usuários:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Ações em usuários (bloquear, desbloquear, excluir)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { action, userId, reason } = body

    if (!userId || !action) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: { orders: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Não pode alterar o próprio usuário admin
    if (user.id === session.user.id) {
      return NextResponse.json({ error: 'Você não pode alterar seu próprio usuário' }, { status: 400 })
    }

    // Não pode excluir/bloquear admins
    if (user.role === 'ADMIN' && (action === 'delete' || action === 'block')) {
      return NextResponse.json({ error: 'Não é possível bloquear ou excluir administradores' }, { status: 400 })
    }

    switch (action) {
      case 'block':
        await prisma.user.update({
          where: { id: userId },
          data: {
            isActive: false,
            blockedAt: new Date(),
            blockedReason: reason || 'Bloqueado pelo administrador'
          }
        })
        return NextResponse.json({ success: true, message: 'Usuário bloqueado com sucesso' })

      case 'unblock':
        await prisma.user.update({
          where: { id: userId },
          data: {
            isActive: true,
            blockedAt: null,
            blockedReason: null
          }
        })
        return NextResponse.json({ success: true, message: 'Usuário desbloqueado com sucesso' })

      case 'delete':
        // Só pode excluir se não tiver pedidos
        if (user._count.orders > 0) {
          return NextResponse.json({ 
            error: `Não é possível excluir este usuário pois ele possui ${user._count.orders} pedido(s). Use a opção de bloquear.` 
          }, { status: 400 })
        }

        // Excluir dados relacionados primeiro
        await prisma.$transaction([
          prisma.cartItem.deleteMany({ where: { userId } }),
          prisma.address.deleteMany({ where: { userId } }),
          prisma.customerCashback.deleteMany({ where: { userId } }),
          prisma.reviewHelpful.deleteMany({ where: { userId } }),
          prisma.productQuestion.deleteMany({ where: { userId } }),
          prisma.productReview.deleteMany({ where: { userId } }),
          prisma.user.delete({ where: { id: userId } })
        ])
        
        return NextResponse.json({ success: true, message: 'Usuário excluído com sucesso' })

      case 'makeAdmin':
        await prisma.user.update({
          where: { id: userId },
          data: { role: 'ADMIN' }
        })
        return NextResponse.json({ success: true, message: 'Usuário promovido a administrador' })

      case 'removeAdmin':
        // Verificar se é o único admin
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
        if (adminCount <= 1) {
          return NextResponse.json({ error: 'Não é possível remover o único administrador' }, { status: 400 })
        }
        
        await prisma.user.update({
          where: { id: userId },
          data: { role: 'USER' }
        })
        return NextResponse.json({ success: true, message: 'Privilégios de administrador removidos' })

      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }
  } catch (error) {
    console.error('Erro ao processar ação:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
