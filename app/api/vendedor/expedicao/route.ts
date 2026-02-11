import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'SELLER') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar vendedor
    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id }
    })

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const search = searchParams.get('search') || ''

    // Construir filtros
    let where: any = {
      // Pedidos que contêm produtos PRÓPRIOS deste vendedor (não dropshipping)
      items: {
        some: {
          product: {
            sellerId: seller.id
          },
          // ⚠️ EXCLUIR produtos dropshipping - eles são expedidos pelo ADMIN
          itemType: 'STOCK'
        }
      },
      // Pedido pago
      paymentStatus: 'APPROVED'
    }

    // Filtrar por status de expedição
    if (status === 'pending') {
      where.separatedAt = null
    } else if (status === 'separated') {
      where.separatedAt = { not: null }
      where.packedAt = null
    } else if (status === 'packed') {
      where.packedAt = { not: null }
      where.shippedAt = null
    } else if (status === 'shipped') {
      where.shippedAt = { not: null }
    }

    // Busca por número do pedido
    if (search) {
      where.id = { contains: search }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          where: {
            product: {
              sellerId: seller.id
            },
            // ⚠️ Só mostrar itens PRÓPRIOS (não dropshipping)
            itemType: 'STOCK'
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                weight: true,
                length: true,
                width: true,
                height: true,
              }
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Erro ao buscar pedidos expedição:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
