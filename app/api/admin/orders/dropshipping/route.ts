import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Mapeia o status do pedido/item para status do AliExpress
 */
function getAliExpressStatus(order: any): string {
  // Primeiro, verificar status do item (mais preciso)
  const itemStatus = order.items?.[0]?.supplierStatus
  if (itemStatus) {
    // Mapear status do item para status AliExpress
    switch (itemStatus) {
      case 'PLACED':
        return 'PLACE_ORDER_SUCCESS' // Pedido criado, aguardando pagamento
      case 'PAID':
        return 'WAIT_SELLER_SEND_GOODS' // Pago, aguardando envio
      case 'SHIPPED':
        return 'WAIT_BUYER_ACCEPT_GOODS' // Em trânsito
      case 'DELIVERED':
        return 'FINISH' // Entregue
      case 'CANCELLED':
        return 'IN_CANCEL'
      case 'ERROR':
        return 'ERROR'
      default:
        return itemStatus
    }
  }
  
  // Se não tiver status do item, verificar se tem supplierOrderId
  if (order.supplierOrderId) {
    return 'PLACE_ORDER_SUCCESS' // Pedido criado no AliExpress
  }
  
  // Sem pedido criado = Aguardando envio
  return 'PENDING'
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar pedidos dropshipping OU de importação direta (AliExpress)
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          // Pedidos com produtos dropshipping
          {
            items: {
              some: {
                product: {
                  isDropshipping: true
                }
              }
            }
          },
          // Pedidos com produtos de fornecedor AliExpress
          {
            items: {
              some: {
                product: {
                  supplier: {
                    type: 'aliexpress'
                  }
                }
              }
            }
          },
          // Pedidos de importação direta (AliExpress)
          { shippingMethod: 'international' },
          { shippingCarrier: 'Importação Direta' }
        ],
        paymentStatus: {
          in: ['PAID', 'approved', 'APPROVED']
        },
        // Excluir pedidos cancelados
        status: {
          notIn: ['CANCELLED']
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
                costPrice: true,
                supplier: {
                  select: {
                    id: true,
                    name: true,
                    type: true
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
      shippingCost: order.shippingCost || 0,
      shippingAddress: order.shippingAddress,
      buyerPhone: order.buyerPhone,
      buyerCpf: order.buyerCpf,
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
          supplierSku: item.product.supplierSku,
          supplierUrl: item.product.supplierUrl,
          costPrice: typeof item.product.costPrice === 'object' ? Number(item.product.costPrice) : (item.product.costPrice || 0),
          aliexpressProductId: item.product.supplierSku,
          supplier: item.product.supplier
        }
      })),
      // Campos de dropshipping
      aliexpressOrderId: order.supplierOrderId || order.items[0]?.supplierOrderId,
      // Usar o status do item (supplierStatus) ou mapear status do pedido
      aliexpressStatus: getAliExpressStatus(order),
      supplierTrackingNumber: order.trackingCode,
      supplierOrderData: null,
      sentToSupplierAt: order.sentToSupplierAt?.toISOString() || null,
      // Impostos de importação
      importTax: order.importTax || 0,
      icmsTax: order.icmsTax || 0
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
