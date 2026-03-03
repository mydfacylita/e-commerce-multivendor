import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * Retorna o status do AliExpress direto do banco (já armazenado no supplierStatus do item)
 */
function getAliExpressStatus(order: any): string {
  // O banco já armazena o status raw do AliExpress no supplierStatus do item
  // Ex: FINISH, WAIT_BUYER_ACCEPT_GOODS, PLACE_ORDER_SUCCESS, CANCELLED, ERROR
  const itemStatus = order.items?.[0]?.supplierStatus
  if (itemStatus) return itemStatus

  // Se não tiver status do item mas tiver supplierOrderId = pedido criado aguardando
  if (order.supplierOrderId) return 'PLACE_ORDER_SUCCESS'

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
          in: ['PAID', 'approved', 'APPROVED', 'FINANCING', 'financing', 'PARCELADO', 'parcelado', 'CARNE', 'carne']
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
