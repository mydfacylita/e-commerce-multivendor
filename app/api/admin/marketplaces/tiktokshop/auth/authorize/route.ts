import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAuthorizationUrl } from '@/lib/tiktokshop';
import crypto from 'crypto';

// GET - Gerar URL de autorização OAuth
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { tiktokShopAuth: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (!user.tiktokShopAuth?.appKey) {
      return NextResponse.json(
        { error: 'Configure as credenciais primeiro' },
        { status: 400 }
      );
    }

    // Gerar state para proteção CSRF
    const state = crypto.randomBytes(32).toString('hex');
    
    // Armazenar state no banco para validação no callback
    // Usando o campo openId temporariamente para armazenar o state
    await prisma.tikTokShopAuth.update({
      where: { userId: user.id },
      data: { openId: state },
    });

    // Gerar URL de autorização
    const authUrl = getAuthorizationUrl(user.tiktokShopAuth.appKey, state);

    return NextResponse.json({ 
      authUrl,
      state 
    });
  } catch (error) {
    console.error('Erro ao gerar URL de autorização TikTok Shop:', error);
    return NextResponse.json({ error: 'Erro ao gerar URL de autorização' }, { status: 500 });
  }
}
