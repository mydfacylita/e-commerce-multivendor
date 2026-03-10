import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

    const campaign = await prisma.affiliateCampaign.findUnique({
      where: { id: params.id }
    });

    if (!campaign || !campaign.isActive) {
      return NextResponse.json({ error: 'Campanha não encontrada ou inativa' }, { status: 404 });
    }

    const now = new Date();
    if (now < campaign.startDate || now > campaign.endDate) {
      return NextResponse.json({ error: 'Campanha fora do período ativo' }, { status: 400 });
    }

    const data = await req.json();
    const { postUrl, postType, postId } = data;
    const type = ['REEL', 'POST', 'STORY'].includes(postType) ? postType : 'POST';

    if (!postUrl?.trim()) {
      return NextResponse.json({ error: 'URL do post é obrigatória' }, { status: 400 });
    }
    try { new URL(postUrl.trim()); } catch {
      return NextResponse.json({ error: 'URL do post inválida' }, { status: 400 });
    }

    // Check participant
    const participation = await prisma.affiliateCampaignParticipant.findUnique({
      where: { campaignId_affiliateId: { campaignId: params.id, affiliateId: affiliate.id } }
    });
    if (!participation) {
      return NextResponse.json({ error: 'Você não está inscrito nesta campanha' }, { status: 403 });
    }

    let post;

    if (postId) {
      // RESUBMIT: update a specific rejected post
      const existing = await prisma.affiliateCampaignPost.findUnique({ where: { id: postId } });
      if (!existing || existing.affiliateId !== affiliate.id || existing.campaignId !== params.id) {
        return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 });
      }
      if (existing.status !== 'REJECTED') {
        return NextResponse.json({ error: 'Apenas posts rejeitados podem ser reenviados' }, { status: 409 });
      }
      post = await prisma.affiliateCampaignPost.update({
        where: { id: postId },
        data: { postUrl: postUrl.trim(), status: 'PENDING', adminNotes: null, reviewedAt: null, submittedAt: new Date() }
      });
    } else {
      // NEW: check quota (count non-rejected)
      const target = type === 'REEL' ? (campaign.reelsCount ?? 0)
                   : type === 'POST' ? (campaign.postsCount ?? 0)
                   : (campaign.storiesCount ?? 0);
      const submitted = await prisma.affiliateCampaignPost.count({
        where: { campaignId: params.id, affiliateId: affiliate.id, postType: type, status: { not: 'REJECTED' } }
      });
      if (target > 0 && submitted >= target) {
        return NextResponse.json({ error: `Meta de ${type === 'REEL' ? 'Reels' : type === 'POST' ? 'Posts' : 'Stories'} já atingida (${target})` }, { status: 409 });
      }
      post = await prisma.affiliateCampaignPost.create({
        data: {
          campaignId: params.id,
          affiliateId: affiliate.id,
          postUrl: postUrl.trim(),
          postType: type,
          platform: 'INSTAGRAM',
          status: 'PENDING'
        }
      });
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Erro ao enviar post:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
