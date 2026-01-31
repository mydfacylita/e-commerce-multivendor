import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateEANBatch } from '@/lib/ean-generator'
import { createId } from '@paralleldrive/cuid2'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * POST /api/admin/ean/generate-for-admin
 * Admin gera códigos EAN diretamente para si mesmo (sem aprovação)
 * Usa $queryRawUnsafe pois tabelas EAN não têm modelos Prisma
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

    const { packageId, type, quantity } = await request.json()

    let codeType: 'OFFICIAL' | 'INTERNAL'
    let codeQuantity: number

    if (packageId) {
      // Modo antigo: usar pacote predefinido
      const packages: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM eanpackage WHERE id = ?`,
        packageId
      )

      if (packages.length === 0) {
        return NextResponse.json({ error: 'Pacote não encontrado' }, { status: 404 })
      }

      codeType = packages[0].type
      codeQuantity = packages[0].quantity
    } else if (type && quantity) {
      // Modo novo: quantidade e tipo customizados
      if (!['OFFICIAL', 'INTERNAL'].includes(type)) {
        return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
      }

      if (quantity < 1 || quantity > 1000) {
        return NextResponse.json({ error: 'Quantidade deve estar entre 1 e 1000' }, { status: 400 })
      }

      codeType = type
      codeQuantity = quantity
    } else {
      return NextResponse.json({ error: 'Especifique packageId ou (type e quantity)' }, { status: 400 })
    }

    // Buscar ou criar seller para o admin
    let adminSeller = await prisma.seller.findFirst({
      where: { userId: user.id }
    })

    if (!adminSeller) {
      // Criar seller para o admin
      adminSeller = await prisma.seller.create({
        data: {
          userId: user.id,
          storeName: 'Admin Store',
          storeSlug: 'admin-store-' + Date.now(),
          sellerType: 'PF',
          status: 'ACTIVE',
          commission: 0,
          balance: 0,
          totalEarned: 0,
          totalWithdrawn: 0
        }
      })
    }

    // Gerar códigos diretamente
    const prefix = codeType === 'OFFICIAL' ? '789' : '200'
    const codes = generateEANBatch(codeQuantity, prefix)

    // Criar crédito EAN com ID gerado
    const creditId = createId()
    await prisma.$queryRawUnsafe(
      `INSERT INTO eancredit (id, sellerId, quantity, used, type, purchaseId, createdAt)
       VALUES (?, ?, ?, 0, ?, NULL, NOW())`,
      creditId,
      adminSeller.id,
      codeQuantity,
      codeType
    )

    // Salvar códigos no banco em lote com IDs gerados
    for (const code of codes) {
      const codeId = createId()
      await prisma.$queryRawUnsafe(
        `INSERT INTO eancode (id, sellerId, code, type, used, createdAt)
         VALUES (?, ?, ?, ?, 0, NOW())`,
        codeId,
        adminSeller.id,
        code,
        codeType
      )
    }

    return NextResponse.json({
      success: true,
      quantity: codes.length,
      type: codeType,
      message: `${codes.length} códigos gerados com sucesso`
    })

  } catch (error: any) {
    console.error('Erro ao gerar códigos para admin:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar códigos' },
      { status: 500 }
    )
  }
}
