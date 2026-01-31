import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    // Buscar produtos importados do AliExpress
    const products = await prisma.product.findMany({
      where: {
        supplierSku: { not: null },
        OR: [
          { supplierUrl: { contains: 'aliexpress.com' } },
          { category: { slug: 'importados' } },
          { supplier: { name: { contains: 'aliexpress' } } },
          { supplier: { type: 'aliexpress' } }
        ]
      },
      select: {
        id: true,
        name: true,
        supplierSku: true,
        supplierStock: true,
        stock: true,
        lastSyncAt: true,
        active: true,
        costPrice: true,
        price: true
      },
      orderBy: { lastSyncAt: 'desc' },
      take: 100
    })

    // Calcular estatísticas
    const total = products.length
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Sincronizados = produtos que foram sincronizados nas últimas 24h
    const synced = products.filter(p => 
      p.lastSyncAt && new Date(p.lastSyncAt) > oneDayAgo
    ).length

    // Pendentes = produtos que nunca foram sincronizados ou há mais de 24h
    const pendingSync = products.filter(p => 
      !p.lastSyncAt || new Date(p.lastSyncAt) <= oneDayAgo
    ).length

    // Sem estoque = produtos com estoque do fornecedor = 0 (não null, que significa não sincronizado ainda)
    const outOfStock = products.filter(p => 
      p.supplierStock !== null && p.supplierStock === 0
    ).length

    return NextResponse.json({
      products: products.map(p => ({
        ...p,
        costPrice: typeof p.costPrice === 'object' ? Number(p.costPrice) : (p.costPrice || 0),
        price: typeof p.price === 'object' ? Number(p.price) : (p.price || 0)
      })),
      stats: {
        total,
        synced,
        pendingSync,
        outOfStock
      }
    })

  } catch (error: any) {
    console.error('Erro ao buscar status dos produtos:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar status', error: error.message },
      { status: 500 }
    )
  }
}
