import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// POST - Selecionar embalagem para o pedido (sem marcar como embalado)
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

    // Verificar se embalagem existe
    const packaging = await prisma.packagingBox.findUnique({
      where: { id: packagingBoxId }
    })

    if (!packaging) {
      return NextResponse.json({ message: 'Embalagem não encontrada' }, { status: 404 })
    }

    // Atualizar pedido - apenas salva a embalagem selecionada
    await prisma.order.update({
      where: { id },
      data: {
        packagingBoxId: packagingBoxId
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Embalagem selecionada',
      packaging: {
        id: packaging.id,
        code: packaging.code,
        name: packaging.name,
        outerLength: packaging.outerLength,
        outerWidth: packaging.outerWidth,
        outerHeight: packaging.outerHeight,
        emptyWeight: packaging.emptyWeight
      }
    })
  } catch (error) {
    console.error('Erro ao selecionar embalagem:', error)
    return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 })
  }
}
