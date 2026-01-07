import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { seller: true, workForSeller: true }
    });

    const seller = user?.seller || user?.workForSeller;

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 });
    }

    const { trackingCode } = await request.json();

    if (!trackingCode || trackingCode.length < 10) {
      return NextResponse.json({ error: 'Código de rastreio inválido' }, { status: 400 });
    }

    // Atualizar pedido com código de rastreio e status
    const order = await prisma.order.update({
      where: {
        id: params.id,
        sellerId: seller.id
      },
      data: {
        trackingCode: trackingCode.toUpperCase(),
        status: 'SHIPPED'
      }
    });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Erro ao adicionar rastreio:', error);
    return NextResponse.json({ error: 'Erro ao adicionar rastreio' }, { status: 500 });
  }
}
