import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET /api/admin/ean/purchases
 * Lista todas as solicitações de EAN
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

    // Buscar todas as compras de EAN
    const purchasesRaw = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        ep.*,
        s.storeName as sellerName,
        u.email as sellerEmail
      FROM eanpurchase ep
      INNER JOIN seller s ON ep.sellerId = s.id
      INNER JOIN user u ON s.userId = u.id
      ORDER BY ep.createdAt DESC
    `)

    // Para cada compra, buscar se tem crédito (indicador de códigos gerados)
    const purchases = await Promise.all(purchasesRaw.map(async (p) => {
      // Verificar se existe crédito para esta compra
      const hasCredit = await prisma.$queryRawUnsafe<any[]>(`
        SELECT id FROM eancredit WHERE purchaseId = '${p.id}' LIMIT 1
      `)

      const hasCodesGenerated = hasCredit.length > 0
      
      // Se tem crédito, atualizar status para GENERATED
      let actualStatus = p.status
      if (hasCodesGenerated && p.status === 'PAID') {
        actualStatus = 'GENERATED'
      }
      
      return {
        id: p.id,
        sellerId: p.sellerId,
        sellerName: p.sellerName,
        sellerEmail: p.sellerEmail,
        packageId: p.packageId,
        quantity: Number(p.quantity),
        type: p.type,
        price: Number(p.price || 0),
        status: actualStatus,
        paymentId: p.paymentId || null,
        paidAt: p.paidAt ? new Date(p.paidAt).toISOString() : null,
        createdAt: new Date(p.createdAt).toISOString(),
        hasCodesGenerated,
        generatedCount: hasCodesGenerated ? Number(p.quantity) : 0,
        firstCode: null,
        lastCode: null
      }
    }))

    return NextResponse.json({ purchases })
  } catch (error: any) {
    console.error('Erro ao listar solicitações EAN:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao listar solicitações' },
      { status: 500 }
    )
  }
}
