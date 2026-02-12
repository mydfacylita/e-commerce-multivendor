import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const data = await req.json();
    const {
      phone,
      instagram,
      youtube,
      tiktok,
      banco,
      agencia,
      conta,
      tipoConta,
      chavePix
    } = data;

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId: session.user.id },
      include: { account: true }
    });

    if (!affiliate) {
      return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });
    }

    // Atualizar dados do afiliado
    const updated = await prisma.affiliate.update({
      where: { id: affiliate.id },
      data: {
        phone,
        instagram,
        youtube,
        tiktok,
        banco,
        agencia,
        conta,
        tipoConta,
        chavePix,
        updatedAt: new Date()
      }
    });

    // Se tem conta MYD, atualizar dados bancários lá também
    if (affiliate.account) {
      await prisma.sellerAccount.update({
        where: { id: affiliate.account.id },
        data: {
          pixKey: chavePix,
          bankName: banco,
          agencia,
          conta,
          contaTipo: tipoConta
        }
      });
    }

    return NextResponse.json({
      success: true,
      affiliate: updated
    });
  } catch (error) {
    console.error('Erro ao atualizar afiliado:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
