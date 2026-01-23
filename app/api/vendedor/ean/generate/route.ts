import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateEANBatch } from '@/lib/ean-generator'

export const dynamic = 'force-dynamic'

/**
 * POST /api/vendedor/ean/generate
 * Gera códigos EAN para o vendedor
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { quantity, type } = await request.json()

    if (!quantity || quantity < 1 || quantity > 1000) {
      return NextResponse.json(
        { error: 'Quantidade inválida (1-1000)' },
        { status: 400 }
      )
    }

    if (!['OFFICIAL', 'INTERNAL'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo inválido' },
        { status: 400 }
      )
    }

    // Verificar se é vendedor
    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id }
    })

    if (!seller) {
      return NextResponse.json(
        { error: 'Usuário não é vendedor' },
        { status: 403 }
      )
    }

    // Se for tipo INTERNAL, permite gerar grátis
    // Se for OFFICIAL, precisa ter créditos
    if (type === 'OFFICIAL') {
      // TODO: Verificar créditos do vendedor
      // Por enquanto, bloqueia geração oficial
      return NextResponse.json(
        { error: 'Compre créditos de EAN Oficial antes de gerar' },
        { status: 403 }
      )
    }

    // Gerar códigos EAN
    const prefix = type === 'OFFICIAL' ? '789' : '200'
    const eans = generateEANBatch(quantity, prefix)

    // Salvar no banco (opcional - para histórico)
    await prisma.$executeRaw`
      INSERT INTO EANCode (sellerId, code, type, createdAt)
      VALUES ${eans.map(ean => `('${seller.id}', '${ean}', '${type}', NOW())`).join(', ')}
    `

    return NextResponse.json({
      success: true,
      eans,
      quantity: eans.length,
      type
    })
  } catch (error: any) {
    console.error('Erro ao gerar EANs:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar códigos EAN' },
      { status: 500 }
    )
  }
}
