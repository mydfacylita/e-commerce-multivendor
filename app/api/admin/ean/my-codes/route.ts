import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/ean/my-codes
 * Retorna códigos EAN do admin (vinculados ao seller do usuário admin)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar seller vinculado ao admin (se existir)
    const adminSeller = await prisma.seller.findFirst({
      where: { userId: user.id }
    })

    if (!adminSeller) {
      return NextResponse.json({ codes: [] })
    }

    // Buscar códigos do admin com informações do produto
    const codesRaw = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        ec.code,
        ec.type,
        ec.used,
        ec.productId,
        ec.createdAt,
        ec.usedAt,
        p.name as productName,
        p.slug as productSlug,
        p.active as productActive
      FROM eancode ec
      LEFT JOIN product p ON ec.productId = p.id
      WHERE ec.sellerId = '${adminSeller.id}'
      ORDER BY ec.createdAt DESC
    `)

    // Serializar dados
    const codes = codesRaw.map(c => ({
      code: c.code,
      type: c.type,
      used: Boolean(c.used),
      productId: c.productId || null,
      productName: c.productName || null,
      productSlug: c.productSlug || null,
      productActive: c.productActive ? Boolean(c.productActive) : null,
      createdAt: new Date(c.createdAt).toISOString(),
      usedAt: c.usedAt ? new Date(c.usedAt).toISOString() : null
    }))

    return NextResponse.json({ codes })
  } catch (error: any) {
    console.error('Erro ao buscar códigos do admin:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar códigos' },
      { status: 500 }
    )
  }
}
