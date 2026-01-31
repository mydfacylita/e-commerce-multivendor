import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkSubscriptionPayment } from '@/lib/payment-sync';
import { getActiveSubscription } from '@/lib/subscription';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar seller e sua assinatura pendente
    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id },
      include: {
        subscriptions: true
      }
    });

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 });
    }

    const subscription = await getActiveSubscription(seller.id);
    if (!subscription) {
      return NextResponse.json({ error: 'Nenhuma assinatura encontrada' }, { status: 404 });
    }
    
    // Se já está ativa ou em trial
    if (subscription.status === 'ACTIVE' || subscription.status === 'TRIAL') {
      return NextResponse.json({
        paid: true,
        status: subscription.status,
        message: 'Assinatura já está ativa'
      });
    }
    
    // Se não está aguardando pagamento
    if (subscription.status !== 'PENDING_PAYMENT') {
      return NextResponse.json({ 
        error: 'Status da assinatura inválido',
        currentStatus: subscription.status
      }, { status: 400 });
    }

    // Verificar pagamento no Mercado Pago usando o sync
    const result = await checkSubscriptionPayment(subscription.id);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Erro ao verificar pagamento:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
