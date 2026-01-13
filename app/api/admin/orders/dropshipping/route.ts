import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar pedidos que têm produtos dropshipping (excluindo cancelados)
    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            product: {
              isDropshipping: true
            }
          }
        },
        paymentStatus: {
          in: ['PAID', 'approved', 'APPROVED']
        },
        // Excluir pedidos cancelados
        status: {
          notIn: ['CANCELLED', 'CANCELED', 'REFUNDED']
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                isDropshipping: true,
                supplierSku: true,
                supplierUrl: true,
                supplier: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Formatar dados
    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.id.substring(0, 12).toUpperCase(),
      createdAt: order.createdAt.toISOString(),
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total,
      shippingAddress: order.shippingAddress,
      user: {
        name: order.user?.name || order.buyerName || 'Cliente',
        email: order.user?.email || order.buyerEmail || ''
      },
      items: order.items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        product: {
          id: item.product.id,
          name: item.product.name,
          images: item.product.images,
          isDropshipping: item.product.isDropshipping,
          aliexpressProductId: item.product.supplierSku,
          supplier: item.product.supplier
        }
      })),
      // Campos de dropshipping
      aliexpressOrderId: order.supplierOrderId,
      aliexpressStatus: order.status,
      supplierTrackingNumber: order.trackingCode,
      supplierOrderData: null,
      sentToSupplierAt: order.sentToSupplierAt?.toISOString() || null
    }))

    return NextResponse.json({
      orders: formattedOrders,
      total: formattedOrders.length
    })
  } catch (error) {
    console.error('Erro ao buscar pedidos dropshipping:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar pedidos' },
      { status: 500 }
    )
  }
}
