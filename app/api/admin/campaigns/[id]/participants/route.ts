import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - lista participantes da campanha com status dos posts
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const participants = await prisma.affiliateCampaignParticipant.findMany({
      where: { campaignId: params.id },
      include: {
        affiliate: {
          select: {
            id: true, name: true, email: true, instagram: true, code: true,
            campaignPosts: {
              where: { campaignId: params.id },
              select: { id: true, postType: true, postUrl: true, status: true, submittedAt: true, adminNotes: true }
            }
          }
        }
      },
      orderBy: { invitedAt: 'desc' }
    });

    return NextResponse.json({ participants });
  } catch (error) {
    console.error('Erro ao buscar participantes:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - adicionar afiliado à campanha
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { affiliateId } = await req.json();
    if (!affiliateId) {
      return NextResponse.json({ error: 'affiliateId é obrigatório' }, { status: 400 });
    }

    const campaign = await prisma.affiliateCampaign.findUnique({ where: { id: params.id } });
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });

    const affiliate = await prisma.affiliate.findUnique({ where: { id: affiliateId } });
    if (!affiliate) return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });

    const existing = await prisma.affiliateCampaignParticipant.findUnique({
      where: { campaignId_affiliateId: { campaignId: params.id, affiliateId } }
    });
    if (existing) {
      return NextResponse.json({ error: 'Afiliado já está nesta campanha' }, { status: 409 });
    }

    const participant = await prisma.affiliateCampaignParticipant.create({
      data: { campaignId: params.id, affiliateId },
      include: {
        affiliate: {
          select: {
            id: true, name: true, email: true, instagram: true, code: true,
            campaignPosts: {
              where: { campaignId: params.id },
              select: { id: true, postType: true, postUrl: true, status: true, submittedAt: true, adminNotes: true }
            }
          }
        }
      }
    });

    return NextResponse.json({ participant }, { status: 201 });
  } catch (error) {
    console.error('Erro ao adicionar participante:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE - remover afiliado da campanha
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { affiliateId } = await req.json();
    if (!affiliateId) {
      return NextResponse.json({ error: 'affiliateId é obrigatório' }, { status: 400 });
    }

    await prisma.affiliateCampaignParticipant.deleteMany({
      where: { campaignId: params.id, affiliateId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover participante:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
