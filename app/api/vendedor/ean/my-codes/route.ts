import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET /api/vendedor/ean/my-codes
 * Retorna os códigos EAN do vendedor
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar seller
    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id }
    })

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 })
    }

    // Buscar códigos EAN do vendedor com info de produtos
    const codes = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        e.*,
        p.id as productId,
        p.name as productName,
        p.slug as productSlug,
        p.active as productActive
      FROM EANCode e
      LEFT JOIN product p ON e.code = p.gtin AND p.sellerId = '${seller.id}'
      WHERE e.sellerId = '${seller.id}'
      ORDER BY e.createdAt DESC
    `)

    return NextResponse.json({ codes })
  } catch (error: any) {
    console.error('Erro ao buscar códigos EAN:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar códigos' },
      { status: 500 }
    )
  }
}
