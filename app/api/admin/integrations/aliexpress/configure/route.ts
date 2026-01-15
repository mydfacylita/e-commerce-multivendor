import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { appKey, appSecret, trackingId } = await req.json();

    // Remover espaços extras
    const cleanAppKey = appKey?.trim();
    const cleanAppSecret = appSecret?.trim();
    const cleanTrackingId = trackingId?.trim();

    if (!cleanAppKey || !cleanAppSecret) {
      return NextResponse.json({ 
        message: 'App Key e App Secret são obrigatórios' 
      }, { status: 400 });
    }

    // Salvar ou atualizar credenciais
    // IMPORTANTE: Limpar accessToken para forçar nova autorização
    await prisma.aliExpressAuth.upsert({
      where: { userId: session.user.id },
      update: {
        appKey: cleanAppKey,
        appSecret: cleanAppSecret,
        trackingId: cleanTrackingId || null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null
      },
      create: {
        userId: session.user.id,
        appKey: cleanAppKey,
        appSecret: cleanAppSecret,
        trackingId: cleanTrackingId || null
      }
    });

    console.log('AliExpress configurado com sucesso para usuário:', session.user.id);

    return NextResponse.json({ 
      message: 'Credenciais salvas com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao configurar AliExpress:', error);
    return NextResponse.json({ 
      message: 'Erro ao salvar credenciais' 
    }, { status: 500 });
  }
}
