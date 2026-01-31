import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * Verifica se um produto com o supplierSku já existe no banco
 * GET /api/admin/products/check-sku?sku=1005008496972052
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !['ADMIN', 'SELLER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const sku = searchParams.get('sku')

    if (!sku) {
      return NextResponse.json({ error: 'SKU não informado' }, { status: 400 })
    }

    // Buscar produto pelo supplierSku
    const existingProduct = await prisma.product.findFirst({
      where: { supplierSku: sku },
      select: {
        id: true,
        name: true,
        supplierSku: true,
        active: true
      }
    })

    if (existingProduct) {
      return NextResponse.json({
        exists: true,
        product: {
          id: existingProduct.id,
          name: existingProduct.name,
          supplierSku: existingProduct.supplierSku,
          active: existingProduct.active
        }
      })
    }

    return NextResponse.json({ exists: false })

  } catch (error) {
    console.error('Erro ao verificar SKU:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
