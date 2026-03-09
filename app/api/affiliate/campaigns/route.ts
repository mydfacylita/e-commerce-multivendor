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

    const now = new Date();

    const campaigns = await prisma.affiliateCampaign.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now }
      },
      include: {
        posts: {
          where: { affiliateId: affiliate.id },
          select: { id: true, status: true, postUrl: true, adminNotes: true, submittedAt: true }
        },
        _count: { select: { posts: true } }
      },
      orderBy: { endDate: 'asc' }
    });

    // Map post submission status per affiliate
    const result = campaigns.map((campaign) => {
      const myPost = campaign.posts[0] ?? null;
      return {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        hashtags: campaign.hashtags,
        contentGuide: campaign.contentGuide,
        products: campaign.products ? JSON.parse(campaign.products) : [],
        materials: campaign.materials ? JSON.parse(campaign.materials) : [],
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        totalPosts: campaign._count.posts,
        myPost
      };
    });

    return NextResponse.json({ campaigns: result });
  } catch (error) {
    console.error('Erro ao buscar campanhas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
