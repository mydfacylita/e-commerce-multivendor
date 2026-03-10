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
    const { postUrl, caption, postType } = data;
    const type = ['REEL', 'POST', 'STORY'].includes(postType) ? postType : 'POST';

    if (!postUrl?.trim()) {
      return NextResponse.json({ error: 'URL do post é obrigatória' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(postUrl.trim());
    } catch {
      return NextResponse.json({ error: 'URL do post inválida' }, { status: 400 });
    }

    // Check if affiliate is a participant
    const participation = await prisma.affiliateCampaignParticipant.findUnique({
      where: { campaignId_affiliateId: { campaignId: params.id, affiliateId: affiliate.id } }
    });
    if (!participation) {
      return NextResponse.json({ error: 'Você não está inscrito nesta campanha' }, { status: 403 });
    }

    // Upsert by type: allow updating if still REJECTED
    const existing = await prisma.affiliateCampaignPost.findUnique({
      where: { campaignId_affiliateId_postType: { campaignId: params.id, affiliateId: affiliate.id, postType: type } }
    });

    if (existing && existing.status !== 'REJECTED') {
      return NextResponse.json({ error: 'Você já enviou um post deste tipo para esta campanha' }, { status: 409 });
    }

    let post;
    if (existing) {
      post = await prisma.affiliateCampaignPost.update({
        where: { id: existing.id },
        data: {
          postUrl: postUrl.trim(),
          caption: caption?.trim() || null,
          status: 'PENDING',
          adminNotes: null,
          reviewedAt: null,
          submittedAt: new Date()
        }
      });
    } else {
      post = await prisma.affiliateCampaignPost.create({
        data: {
          campaignId: params.id,
          affiliateId: affiliate.id,
          postUrl: postUrl.trim(),
          caption: caption?.trim() || null,
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
