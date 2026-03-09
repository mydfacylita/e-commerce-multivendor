import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const goals = await prisma.affiliateGoal.findMany({
      include: {
        affiliate: { select: { id: true, name: true, code: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ goals });
  } catch (error) {
    console.error('Erro ao buscar metas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { affiliateId, title, description, type, targetValue, startDate, endDate, reward } = await req.json();

    if (!title?.trim() || !type || !targetValue || !startDate || !endDate) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    const goal = await prisma.affiliateGoal.create({
      data: {
        affiliateId: affiliateId || null,
        title: title.trim(),
        description: description?.trim() || null,
        type,
        targetValue: parseFloat(targetValue),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reward: reward?.trim() || null,
      },
      include: {
        affiliate: { select: { id: true, name: true, code: true } }
      }
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar meta:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
