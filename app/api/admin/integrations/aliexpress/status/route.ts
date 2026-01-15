import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se há credenciais configuradas (buscar primeiro por userId, depois qualquer)
    let auth = await prisma.aliExpressAuth.findUnique({
      where: { userId: session.user.id }
    });

    // Se não encontrou por userId, buscar qualquer configuração existente
    if (!auth) {
      auth = await prisma.aliExpressAuth.findFirst();
    }

    if (!auth) {
      return NextResponse.json({
        configured: false,
        authorized: false,
        message: 'AliExpress não configurado'
      });
    }

    // Verificar se tem access token (OAuth autorizado)
    const hasAccessToken = !!auth.accessToken;

    return NextResponse.json({
      configured: true,
      authorized: hasAccessToken,
      trackingId: auth.trackingId,
      message: hasAccessToken 
        ? 'AliExpress configurado e autorizado' 
        : 'AliExpress configurado. Autorização OAuth pendente.'
    });
  } catch (error) {
    console.error('Erro ao verificar status AliExpress:', error);
    return NextResponse.json({ 
      configured: false,
      message: 'Erro ao verificar status',
      error: true
    }, { status: 500 });
  }
}
