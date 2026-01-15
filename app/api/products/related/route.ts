import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Buscar categorias baseado na última compra do usuário
    let categoryIds: string[] = []
    
    if (session?.user?.id) {
      // Buscar última compra do usuário
      const lastOrder = await prisma.order.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: {
                select: { categoryId: true }
              }
            }
          }
        }
      })
      
      if (lastOrder?.items) {
        categoryIds = lastOrder.items
          .map(item => item.product?.categoryId)
          .filter(Boolean) as string[]
      }
    }
    
    // Se não há categorias da última compra, buscar produtos populares
    let products
    
    if (categoryIds.length > 0) {
      // Buscar produtos das mesmas categorias
      products = await prisma.product.findMany({
        where: {
          active: true,
          categoryId: { in: categoryIds }
        },
        include: {
          category: { select: { name: true } }
        },
        take: 12,
        orderBy: { createdAt: 'desc' }
      })
    } else {
      // Buscar produtos aleatórios como fallback
      products = await prisma.product.findMany({
        where: { active: true },
        include: {
          category: { select: { name: true } },
          images: { take: 1 }
        },
        take: 12,
        orderBy: { createdAt: 'desc' }
      })
    }
    
    // Formatar resposta
    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      originalPrice: product.originalPrice,
      images: product.images.map(img => img.url),
      category: product.category,
      stock: product.stock
    }))
    
    return NextResponse.json({
      products: formattedProducts,
      basedOnLastPurchase: categoryIds.length > 0
    })
    
  } catch (error) {
    console.error('Erro ao buscar produtos relacionados:', error)
    return NextResponse.json({ products: [] })
  }
}
