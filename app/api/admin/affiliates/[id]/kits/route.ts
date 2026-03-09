import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const assignments = await prisma.affiliateKitAssignment.findMany({
      where: { affiliateId: params.id },
      include: {
        kit: {
          include: {
            products: {
              include: { product: { select: { id: true, name: true } } }
            }
          }
        }
      },
      orderBy: { assignedAt: 'desc' }
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Erro ao buscar kits do afiliado:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
