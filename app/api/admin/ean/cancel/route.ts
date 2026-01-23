import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/ean/cancel
 * Admin cancela solicitação de EAN
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

    // Atualizar status
    await prisma.$executeRaw`
      UPDATE EANPurchase 
      SET status = 'CANCELLED'
      WHERE id = ${purchaseId}
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao cancelar solicitação:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao cancelar' },
      { status: 500 }
    )
  }
}
