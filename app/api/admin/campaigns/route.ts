import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const campaigns = await prisma.affiliateCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { posts: true } }
      }
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Erro ao buscar campanhas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const data = await req.json();
    if (!data.title?.trim() || !data.startDate || !data.endDate) {
      return NextResponse.json({ error: 'Título, data início e data fim são obrigatórios' }, { status: 400 });
    }

    const campaign = await prisma.affiliateCampaign.create({
      data: {
        title: data.title.trim(),
        description: data.description?.trim() || null,
        hashtags: data.hashtags?.trim() || null,
        contentGuide: data.contentGuide?.trim() || null,
        products: data.products ? JSON.stringify(data.products) : null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isActive: data.isActive !== false
      }
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar campanha:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
