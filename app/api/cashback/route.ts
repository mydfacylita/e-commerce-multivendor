import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Obter saldo de cashback do cliente
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar ou criar registro de cashback do cliente
    let cashback = await prisma.customerCashback.findUnique({
      where: { userId: session.user.id },
      include: {
        transactions: {
          where: { status: { in: ['AVAILABLE', 'PENDING'] } },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!cashback) {
      // Criar registro de cashback para o cliente
      cashback = await prisma.customerCashback.create({
        data: {
          userId: session.user.id,
          balance: 0,
          pendingBalance: 0,
          totalEarned: 0,
          totalUsed: 0
        },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });
    }

    // Verificar cashback expirado
    const expiredTransactions = await prisma.cashbackTransaction.findMany({
      where: {
        cashbackId: cashback.id,
        status: 'AVAILABLE',
        expiresAt: { lt: new Date() }
      }
    });

    // Marcar como expirado e atualizar saldo
    if (expiredTransactions.length > 0) {
      const expiredAmount = expiredTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      await prisma.$transaction([
        prisma.cashbackTransaction.updateMany({
          where: {
            id: { in: expiredTransactions.map(t => t.id) }
          },
          data: { status: 'EXPIRED' }
        }),
        prisma.customerCashback.update({
          where: { id: cashback.id },
          data: {
            balance: { decrement: expiredAmount }
          }
        })
      ]);

      cashback.balance -= expiredAmount;
    }

    // Buscar próximo a expirar
    const nextToExpire = await prisma.cashbackTransaction.findFirst({
      where: {
        cashbackId: cashback.id,
        status: 'AVAILABLE',
        expiresAt: { not: null }
      },
      orderBy: { expiresAt: 'asc' }
    });

    return NextResponse.json({
      balance: cashback.balance,
      pendingBalance: cashback.pendingBalance,
      totalEarned: cashback.totalEarned,
      totalUsed: cashback.totalUsed,
      nextToExpire: nextToExpire ? {
        amount: nextToExpire.amount,
        expiresAt: nextToExpire.expiresAt
      } : null,
      recentTransactions: cashback.transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        description: t.description,
        status: t.status,
        expiresAt: t.expiresAt,
        createdAt: t.createdAt
      }))
    });
  } catch (error) {
    console.error('Erro ao buscar cashback:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
