import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    const { orderId } = await req.json()

    if (!orderId) {
      return NextResponse.json(
        { message: 'ID do pedido não fornecido' },
        { status: 400 }
      )
    }

    // Resetar status de envio ao fornecedor
    await prisma.order.update({
      where: { id: orderId },
      data: {
        sentToSupplier: false,
        sentToSupplierAt: null,
        supplierOrderId: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Status de envio ao fornecedor resetado',
    })
  } catch (error: any) {
    console.error('Erro ao resetar status:', error)
    return NextResponse.json(
      { message: error.message || 'Erro ao resetar status' },
      { status: 500 }
    )
  }
}
