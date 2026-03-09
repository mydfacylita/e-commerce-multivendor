import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET all posts for a campaign
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const posts = await prisma.affiliateCampaignPost.findMany({
      where: { campaignId: params.id },
      include: {
        affiliate: {
          select: { id: true, name: true, email: true, instagram: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Erro ao buscar posts:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT review a specific post (approve or reject)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const data = await req.json();
    const { postId, status, adminNotes } = data;

    if (!postId || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'postId e status (APPROVED/REJECTED) são obrigatórios' }, { status: 400 });
    }

    const post = await prisma.affiliateCampaignPost.update({
      where: { id: postId },
      data: {
        status,
        adminNotes: adminNotes?.trim() || null,
        reviewedAt: new Date()
      }
    });

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Erro ao revisar post:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
