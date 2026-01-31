import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// POST - Marcar pedido como separado
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

    // Verificar se pedido existe
    const order = await prisma.order.findUnique({
      where: { id }
    })

    if (!order) {
      return NextResponse.json({ message: 'Pedido não encontrado' }, { status: 404 })
    }

    if (order.separatedAt) {
      return NextResponse.json({ message: 'Pedido já foi separado' }, { status: 400 })
    }

    // Atualizar pedido
    await prisma.order.update({
      where: { id },
      data: {
        separatedAt: new Date(),
        separatedBy: session.user.email || session.user.name || 'admin',
        status: 'PROCESSING'
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Pedido marcado como separado' 
    })
  } catch (error) {
    console.error('Erro ao separar pedido:', error)
    return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 })
  }
}
