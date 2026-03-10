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
        endDate: { gte: now },
        participants: {
          some: { affiliateId: affiliate.id }
        }
      },
      include: {
        posts: {
          where: { affiliateId: affiliate.id },
          select: { id: true, postType: true, status: true, postUrl: true, adminNotes: true, submittedAt: true }
        },
        _count: { select: { participants: true } }
      },
      orderBy: { endDate: 'asc' }
    });

    // Map posts per type as arrays
    const result = campaigns.map((campaign) => {
      const myPosts: Record<string, Array<{ id: string; status: string; postUrl: string; adminNotes: string | null; submittedAt: string }>> = { REEL: [], POST: [], STORY: [] };
      campaign.posts.forEach((p: any) => {
        const t = p.postType ?? 'POST';
        if (!myPosts[t]) myPosts[t] = [];
        myPosts[t].push({
          id: p.id,
          status: p.status,
          postUrl: p.postUrl,
          adminNotes: p.adminNotes,
          submittedAt: p.submittedAt instanceof Date ? p.submittedAt.toISOString() : p.submittedAt
        });
      });
      return {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        hashtags: campaign.hashtags,
        contentGuide: campaign.contentGuide,
        products: campaign.products ? JSON.parse(campaign.products) : [],
        materials: campaign.materials ? JSON.parse(campaign.materials) : [],
        reelsCount: campaign.reelsCount ?? 0,
        postsCount: campaign.postsCount ?? 0,
        storiesCount: campaign.storiesCount ?? 0,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        totalParticipants: campaign._count.participants,
        myPosts
      };
    });

    return NextResponse.json({ campaigns: result });
  } catch (error) {
    console.error('Erro ao buscar campanhas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
