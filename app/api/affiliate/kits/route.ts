import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId: session.user.id }
    });

    if (!affiliate) {
      return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });
    }

    const assignments = await prisma.affiliateKitAssignment.findMany({
      where: { affiliateId: affiliate.id },
      include: {
        kit: {
          include: {
            products: {
              include: {
                product: {
                  select: {
                    id: true, name: true, price: true, images: true, slug: true, description: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { assignedAt: 'desc' }
    });

    const kits = assignments
      .filter(a => a.kit.isActive)
      .map(a => ({
        ...a.kit,
        assignedAt: a.assignedAt,
        affiliateCode: affiliate.code
      }));

    return NextResponse.json({ kits });
  } catch (error) {
    console.error('Erro ao buscar kits do afiliado:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
