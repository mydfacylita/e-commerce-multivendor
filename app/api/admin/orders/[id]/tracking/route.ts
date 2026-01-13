import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('\n📦 [INÍCIO] PUT /api/admin/orders/[id]/tracking')
    
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SELLER') {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    let sellerId = null
    if (session.user.role === 'SELLER') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          seller: {
            include: { subscription: true }
          },
          workForSeller: {
            include: { subscription: true }
          }
        }
      })

      const seller = user?.seller || user?.workForSeller
      if (!seller || seller.status !== 'ACTIVE') {
        return NextResponse.json({ message: 'Vendedor inválido' }, { status: 403 })
      }

      if (!seller.subscription || !['ACTIVE', 'TRIAL'].includes(seller.subscription.status)) {
        return NextResponse.json({ message: 'Plano inválido' }, { status: 403 })
      }

      if (seller.subscription.endDate < new Date()) {
        return NextResponse.json({ message: 'Plano expirado' }, { status: 403 })
      }

      sellerId = seller.id
    }

    const { trackingCode } = await req.json()
    console.log('   📝 Código de rastreio:', trackingCode)

    if (!trackingCode || trackingCode.length < 10) {
      return NextResponse.json({ message: 'Código de rastreio inválido' }, { status: 400 })
    }

    const whereCondition: any = { id: params.id }
    if (sellerId) {
      whereCondition.items = {
        some: {
          sellerId: sellerId
        }
      }
    }

    const order = await prisma.order.update({
      where: whereCondition,
      data: {
        trackingCode: trackingCode.toUpperCase(),
        status: 'SHIPPED'
      }
    })

    console.log('✅ Rastreio adicionado:', order.orderNumber)
    return NextResponse.json({ success: true, order })
  } catch (error: any) {
    console.error('💥 Erro ao adicionar rastreio:', error.message)
    return NextResponse.json({ message: 'Erro ao adicionar rastreio' }, { status: 500 })
  }
}
