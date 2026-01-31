import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateEANBatch } from '@/lib/ean-generator'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * POST /api/admin/ean/generate
 * Admin gera códigos EAN após aprovação do pagamento
 */
export async function POST(request: NextRequest) {
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

    const { purchaseId } = await request.json()

    if (!purchaseId) {
      return NextResponse.json({ error: 'ID da compra obrigatório' }, { status: 400 })
    }

    // Buscar compra
    const purchase = await prisma.$queryRaw<any[]>`
      SELECT * FROM EANPurchase WHERE id = ${purchaseId} LIMIT 1
    `

    if (!purchase || purchase.length === 0) {
      return NextResponse.json({ error: 'Compra não encontrada' }, { status: 404 })
    }

    const purchaseData = purchase[0]

    // Verificar se já foi gerado
    if (purchaseData.status === 'GENERATED') {
      return NextResponse.json({ error: 'Códigos já foram gerados' }, { status: 400 })
    }

    // Verificar se foi pago (ou é grátis)
    if (purchaseData.status !== 'PAID' && purchaseData.price > 0) {
      return NextResponse.json({ error: 'Pagamento não confirmado' }, { status: 400 })
    }

    // Gerar códigos EAN
    const prefix = purchaseData.type === 'OFFICIAL' ? '789' : '200'
    const eans = generateEANBatch(Number(purchaseData.quantity), prefix)

    // Inserir códigos no banco
    const values = eans.map(ean => 
      `('${crypto.randomUUID()}', '${purchaseData.sellerId}', '${ean}', '${purchaseData.type}', NOW())`
    ).join(', ')

    await prisma.$executeRawUnsafe(`
      INSERT INTO EANCode (id, sellerId, code, type, createdAt)
      VALUES ${values}
    `)

    // Atualizar status da compra
    await prisma.$executeRaw`
      UPDATE EANPurchase 
      SET status = 'GENERATED'
      WHERE id = ${purchaseId}
    `

    // Criar crédito para o vendedor
    await prisma.$executeRaw`
      INSERT INTO EANCredit (id, sellerId, quantity, used, type, purchaseId, createdAt)
      VALUES (
        ${crypto.randomUUID()},
        ${purchaseData.sellerId},
        ${purchaseData.quantity},
        0,
        ${purchaseData.type},
        ${purchaseId},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      quantity: eans.length,
      purchaseId
    })
  } catch (error: any) {
    console.error('Erro ao gerar EANs:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar códigos EAN' },
      { status: 500 }
    )
  }
}
