import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// POST - Marcar pedido como embalado
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { packagingBoxId } = body

    if (!packagingBoxId) {
      return NextResponse.json({ message: 'Embalagem é obrigatória' }, { status: 400 })
    }

    // Verificar se pedido existe
    const order = await prisma.order.findUnique({
      where: { id }
    })

    if (!order) {
      return NextResponse.json({ message: 'Pedido não encontrado' }, { status: 404 })
    }

    if (!order.separatedAt) {
      return NextResponse.json({ message: 'Pedido precisa ser separado primeiro' }, { status: 400 })
    }

    if (order.packedAt) {
      return NextResponse.json({ message: 'Pedido já foi embalado' }, { status: 400 })
    }

    // Verificar se embalagem existe
    const packaging = await prisma.packagingBox.findUnique({
      where: { id: packagingBoxId }
    })

    if (!packaging) {
      return NextResponse.json({ message: 'Embalagem não encontrada' }, { status: 404 })
    }

    // Atualizar pedido
    await prisma.order.update({
      where: { id },
      data: {
        packedAt: new Date(),
        packedBy: session.user.email || session.user.name || 'admin',
        packagingBoxId: packagingBoxId
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Pedido embalado com sucesso',
      packaging: {
        code: packaging.code,
        name: packaging.name
      }
    })
  } catch (error) {
    console.error('Erro ao embalar pedido:', error)
    return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 })
  }
}
