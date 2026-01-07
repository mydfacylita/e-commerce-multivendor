import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar vendedor
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        seller: true,
        workForSeller: true 
      }
    });

    const seller = user?.seller || user?.workForSeller;

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 });
    }

    // Buscar pedido deste vendedor
    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        sellerId: seller.id
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                supplierSku: true,
                costPrice: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Calcular valores do vendedor
    let totalVendedor = 0;
    let commissionVendedor = 0;

    order.items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      totalVendedor += itemTotal;
      commissionVendedor += itemTotal * (seller.commission / 100);
    });

    const sellerRevenue = totalVendedor - commissionVendedor;

    return NextResponse.json({
      ...order,
      total: totalVendedor,
      commission: commissionVendedor,
      sellerRevenue
    });
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    return NextResponse.json({ error: 'Erro ao buscar pedido' }, { status: 500 });
  }
}
