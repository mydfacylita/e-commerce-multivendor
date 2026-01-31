import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Trocar o produto de um item do pedido por um equivalente de outro fornecedor
 * POST /api/admin/orders/swap-product
 * 
 * Body:
 * {
 *   orderItemId: string,      // ID do item do pedido
 *   newProductId: string,     // ID do novo produto
 *   keepPrice?: boolean       // Manter o preço original de venda (default: true)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { orderItemId, newProductId, keepPrice = true } = body

    if (!orderItemId || !newProductId) {
      return NextResponse.json(
        { error: 'orderItemId e newProductId são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar o item do pedido atual
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            supplierOrderId: true,
            sentToSupplierAt: true,
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            costPrice: true,
            supplierId: true,
            supplier: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      }
    })

    if (!orderItem) {
      return NextResponse.json(
        { error: 'Item do pedido não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o pedido já foi enviado ao fornecedor
    if (orderItem.order.sentToSupplierAt || orderItem.order.supplierOrderId) {
      return NextResponse.json(
        { error: 'Não é possível trocar produto de um pedido já enviado ao fornecedor' },
        { status: 400 }
      )
    }

    // Verificar se o status permite alteração
    const allowedStatuses = ['PENDING', 'PROCESSING', 'CONFIRMED', 'PAID']
    if (!allowedStatuses.includes(orderItem.order.status)) {
      return NextResponse.json(
        { error: `Não é possível trocar produto com status ${orderItem.order.status}` },
        { status: 400 }
      )
    }

    // Buscar o novo produto
    const newProduct = await prisma.product.findUnique({
      where: { id: newProductId },
      select: {
        id: true,
        name: true,
        price: true,
        costPrice: true,
        stock: true,
        supplierId: true,
        supplierSku: true,
        isDropshipping: true,
        isChoiceProduct: true,
        supplier: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    if (!newProduct) {
      return NextResponse.json(
        { error: 'Novo produto não encontrado' },
        { status: 404 }
      )
    }

    // Verificar estoque
    if (newProduct.stock < orderItem.quantity) {
      return NextResponse.json(
        { error: `Estoque insuficiente. Disponível: ${newProduct.stock}, Necessário: ${orderItem.quantity}` },
        { status: 400 }
      )
    }

    // Calcular novo custo
    const newCostPrice = newProduct.costPrice || newProduct.price
    const oldCostPrice = orderItem.costPrice || orderItem.product.costPrice || orderItem.product.price

    // Atualizar o item do pedido
    const updatedItem = await prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        productId: newProductId,
        costPrice: newCostPrice,
        // Se não manter preço, usar o preço do novo produto
        ...(keepPrice ? {} : { price: newProduct.price }),
        // Resetar campos do fornecedor anterior
        supplierOrderId: null,
        supplierStatus: null,
        supplierCost: newCostPrice,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            costPrice: true,
            images: true,
            supplierId: true,
            supplierSku: true,
            supplier: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      }
    })

    // Log da troca
    console.log(`[Swap Product] Pedido ${orderItem.order.id}:`)
    console.log(`  - Item: ${orderItemId}`)
    console.log(`  - De: ${orderItem.product.name} (${orderItem.product.supplier?.name || 'Sem fornecedor'})`)
    console.log(`  - Para: ${newProduct.name} (${newProduct.supplier?.name || 'Sem fornecedor'})`)
    console.log(`  - Custo anterior: R$ ${oldCostPrice}`)
    console.log(`  - Novo custo: R$ ${newCostPrice}`)
    console.log(`  - Diferença: R$ ${(Number(newCostPrice) - Number(oldCostPrice)).toFixed(2)}`)

    // Buscar imagem do novo produto
    let newProductImage = '/placeholder.png'
    try {
      const images = JSON.parse(updatedItem.product.images || '[]')
      newProductImage = Array.isArray(images) && images.length > 0 ? images[0] : '/placeholder.png'
    } catch {
      newProductImage = updatedItem.product.images || '/placeholder.png'
    }

    return NextResponse.json({
      success: true,
      message: 'Produto trocado com sucesso',
      swap: {
        orderItemId,
        orderId: orderItem.order.id,
        previous: {
          productId: orderItem.product.id,
          name: orderItem.product.name,
          costPrice: oldCostPrice,
          supplierId: orderItem.product.supplierId,
          supplierName: orderItem.product.supplier?.name || 'Sem fornecedor',
        },
        new: {
          productId: newProduct.id,
          name: newProduct.name,
          costPrice: newCostPrice,
          supplierId: newProduct.supplierId,
          supplierName: newProduct.supplier?.name || 'Sem fornecedor',
          image: newProductImage,
          isChoiceProduct: newProduct.isChoiceProduct,
        },
        costDifference: Number(newCostPrice) - Number(oldCostPrice),
        priceKept: keepPrice,
      }
    })

  } catch (error: any) {
    console.error('[Swap Product] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao trocar produto', details: error.message },
      { status: 500 }
    )
  }
}
