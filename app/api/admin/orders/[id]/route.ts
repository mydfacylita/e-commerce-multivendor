import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logApi } from '@/lib/api-logger'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()
  
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📦 [INÍCIO] GET /api/admin/orders/[id]')
    console.log('   🆔 Order ID:', params.id)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // 1. AUTENTICAÇÃO
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      console.log('❌ Não autenticado')
      return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
    }
    console.log('✅ Usuário autenticado:', session.user.email, '- Role:', session.user.role)

    // 2. AUTORIZAÇÃO
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SELLER') {
      console.log('❌ Role não autorizado:', session.user.role)
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    // 3. SE FOR SELLER, VALIDAR PLANO E STATUS
    let seller = null
    if (session.user.role === 'SELLER') {
      console.log('\n📍 Validando vendedor...')
      
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { 
          seller: {
            include: {
              subscription: {
                include: {
                  plan: true
                }
              }
            }
          },
          workForSeller: {
            include: {
              subscription: {
                include: {
                  plan: true
                }
              }
            }
          }
        }
      })

      seller = user?.seller || user?.workForSeller

      if (!seller) {
        console.log('❌ Vendedor não encontrado')
        return NextResponse.json({ message: 'Vendedor não encontrado' }, { status: 404 })
      }

      console.log('✅ Vendedor:', seller.storeName, '- Status:', seller.status)

      if (seller.status !== 'ACTIVE') {
        console.log('❌ Vendedor não está ativo')
        return NextResponse.json({ message: 'Vendedor não está ativo' }, { status: 403 })
      }

      if (!seller.subscription) {
        console.log('❌ Sem assinatura')
        return NextResponse.json({ message: 'Assinatura necessária' }, { status: 403 })
      }

      const validStatuses = ['ACTIVE', 'TRIAL']
      if (!validStatuses.includes(seller.subscription.status)) {
        console.log('❌ Plano inválido:', seller.subscription.status)
        return NextResponse.json({ message: 'Plano inválido' }, { status: 403 })
      }

      if (seller.subscription.endDate < new Date()) {
        console.log('❌ Plano expirado')
        return NextResponse.json({ message: 'Plano expirado' }, { status: 403 })
      }

      console.log('✅ Plano válido:', seller.subscription.plan.name)
    }

    // 4. BUSCAR PEDIDO COM FILTRO DE SEGURANÇA
    console.log('\n📍 Buscando pedido...')
    
    const whereCondition: any = { id: params.id }
    
    // SELLER só vê pedidos que contêm produtos dele
    if (session.user.role === 'SELLER') {
      whereCondition.items = {
        some: {
          sellerId: seller!.id
        }
      }
      console.log('🔒 Filtro de segurança: items.sellerId =', seller!.id)
    } else {
      console.log('🔓 ADMIN: sem filtro de segurança')
    }

    const order = await prisma.order.findFirst({
      where: whereCondition,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        items: {
          where: session.user.role === 'SELLER' ? {
            sellerId: seller!.id
          } : undefined,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                supplierSku: true,
                costPrice: true,
                isDropshipping: true
              }
            }
          }
        },
        seller: {
          select: {
            id: true,
            storeName: true,
            commission: true
          }
        }
      }
    })

    if (!order) {
      console.log('❌ Pedido não encontrado ou sem permissão')
      return NextResponse.json({ message: 'Pedido não encontrado' }, { status: 404 })
    }

    console.log('✅ Pedido encontrado:', order.orderNumber)

    // 5. CALCULAR VALORES
    let totalVendedor = 0
    let commissionVendedor = 0

    order.items.forEach(item => {
      const itemTotal = item.price * item.quantity
      totalVendedor += itemTotal
      if (order.seller) {
        commissionVendedor += itemTotal * (order.seller.commission / 100)
      }
    })

    const sellerRevenue = totalVendedor - commissionVendedor

    console.log('   💰 Total:', totalVendedor)
    console.log('   💸 Comissão:', commissionVendedor)
    console.log('   💵 Receita vendedor:', sellerRevenue)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ [SUCESSO] Pedido retornado\n')

    await logApi({
      method: 'GET',
      endpoint: `/api/admin/orders/${params.id}`,
      statusCode: 200,
      userId: session.user.id,
      userRole: session.user.role,
      sellerId: seller?.id,
      sellerName: seller?.storeName,
      responseBody: { orderNumber: order.orderNumber, total: totalVendedor },
      duration: Date.now() - startTime
    })

    return NextResponse.json({
      ...order,
      total: totalVendedor,
      commission: commissionVendedor,
      sellerRevenue
    })
  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('💥 [ERRO] Erro ao buscar pedido')
    console.error('❌ Mensagem:', error.message)
    console.error('❌ Stack:', error.stack)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    await logApi({
      method: 'GET',
      endpoint: `/api/admin/orders/${params.id}`,
      statusCode: 500,
      errorMessage: error.message,
      duration: Date.now() - startTime
    })
    
    return NextResponse.json({ message: 'Erro ao buscar pedido' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()
  
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      await logApi({
        method: 'PATCH',
        endpoint: `/api/admin/orders/${params.id}`,
        statusCode: 403,
        errorMessage: 'Não autorizado',
        duration: Date.now() - startTime
      })
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { status } = await req.json()

    const order = await prisma.order.update({
      where: { id: params.id },
      data: { status },
    })

    await logApi({
      method: 'PATCH',
      endpoint: `/api/admin/orders/${params.id}`,
      statusCode: 200,
      userId: session.user.id,
      userRole: session.user.role,
      requestBody: { status },
      responseBody: { orderNumber: order.orderNumber, status: order.status },
      duration: Date.now() - startTime
    })

    return NextResponse.json(order)
  } catch (error: any) {
    console.error('Erro ao atualizar pedido:', error)
    
    await logApi({
      method: 'PATCH',
      endpoint: `/api/admin/orders/${params.id}`,
      statusCode: 500,
      errorMessage: error.message,
      duration: Date.now() - startTime
    })
    
    return NextResponse.json(
      { message: 'Erro ao atualizar pedido' },
      { status: 500 }
    )
  }
}
