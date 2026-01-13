import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📝 [INÍCIO] PUT /api/admin/orders/[id]/status')
    console.log('   🆔 Order ID:', params.id)

    // 1. AUTENTICAÇÃO
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      console.log('❌ Não autenticado')
      return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
    }

    // 2. AUTORIZAÇÃO
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SELLER') {
      console.log('❌ Role não autorizado:', session.user.role)
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    // 3. SE FOR SELLER, VALIDAR
    let sellerId = null
    if (session.user.role === 'SELLER') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          seller: {
            include: {
              subscription: true
            }
          },
          workForSeller: {
            include: {
              subscription: true
            }
          }
        }
      })

      const seller = user?.seller || user?.workForSeller

      if (!seller) {
        console.log('❌ Vendedor não encontrado')
        return NextResponse.json({ message: 'Vendedor não encontrado' }, { status: 404 })
      }

      if (seller.status !== 'ACTIVE') {
        return NextResponse.json({ message: 'Vendedor não está ativo' }, { status: 403 })
      }

      if (!seller.subscription || !['ACTIVE', 'TRIAL'].includes(seller.subscription.status)) {
        return NextResponse.json({ message: 'Plano inválido' }, { status: 403 })
      }

      if (seller.subscription.endDate < new Date()) {
        return NextResponse.json({ message: 'Plano expirado' }, { status: 403 })
      }

      sellerId = seller.id
      console.log('✅ Vendedor validado:', seller.storeName)
    }

    // 4. PEGAR STATUS DO BODY
    const { status } = await req.json()
    console.log('   📊 Novo status:', status)

    // 5. VALIDAR STATUS
    const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      console.log('❌ Status inválido:', status)
      return NextResponse.json({ message: 'Status inválido' }, { status: 400 })
    }

    // 6. ATUALIZAR PEDIDO COM FILTRO DE SEGURANÇA
    const whereCondition: any = { id: params.id }
    if (sellerId) {
      whereCondition.items = {
        some: {
          sellerId: sellerId
        }
      }
      console.log('🔒 Filtro: items.sellerId =', sellerId)
    }

    const order = await prisma.order.update({
      where: whereCondition,
      data: { status }
    })

    console.log('✅ Status atualizado:', order.orderNumber, '->', status)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    return NextResponse.json({ success: true, order })
  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('💥 [ERRO] Erro ao atualizar status')
    console.error('❌ Mensagem:', error.message)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    return NextResponse.json({ message: 'Erro ao atualizar status' }, { status: 500 })
  }
}
