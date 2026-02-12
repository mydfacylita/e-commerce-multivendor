import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar afiliado do usuário logado
    const affiliate = await prisma.affiliate.findUnique({
      where: { userId: session.user.id },
      include: {
        account: {
          select: {
            accountNumber: true,
            balance: true,
            totalReceived: true,
            totalWithdrawn: true
          }
        },
        _count: {
          select: {
            sales: true,
            clicks: true
          }
        }
      }
    });

    if (!affiliate) {
      return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });
    }

    // Buscar estatísticas
    const [salesStats, clicksCount] = await Promise.all([
      prisma.affiliateSale.aggregate({
        where: { affiliateId: affiliate.id },
        _sum: {
          orderTotal: true,
          commissionAmount: true
        },
        _count: true
      }),
      prisma.affiliateClick.count({
        where: { affiliateId: affiliate.id }
      })
    ]);

    const salesByStatus = await prisma.affiliateSale.groupBy({
      by: ['status'],
      where: { affiliateId: affiliate.id },
      _count: true
    });

    // Comissões disponíveis para saque (7 dias já passaram)
    const availableCommissions = await prisma.affiliateSale.aggregate({
      where: {
        affiliateId: affiliate.id,
        status: 'CONFIRMED',
        availableAt: {
          lte: new Date() // Menor ou igual a hoje
        }
      },
      _sum: {
        commissionAmount: true
      },
      _count: true
    });

    // Comissões bloqueadas (ainda no período de carência de 7 dias)
    const blockedCommissions = await prisma.affiliateSale.aggregate({
      where: {
        affiliateId: affiliate.id,
        status: 'CONFIRMED',
        availableAt: {
          gt: new Date() // Maior que hoje (ainda bloqueada)
        }
      },
      _sum: {
        commissionAmount: true
      },
      _count: true
    });

    const conversionRate = clicksCount > 0 
      ? ((affiliate._count.sales / clicksCount) * 100) 
      : 0;

    return NextResponse.json({
      affiliate: {
        id: affiliate.id,
        code: affiliate.code,
        name: affiliate.name,
        email: affiliate.email,
        phone: affiliate.phone,
        cpf: affiliate.cpf,
        commissionRate: affiliate.commissionRate,
        status: affiliate.status,
        instagram: affiliate.instagram,
        youtube: affiliate.youtube,
        tiktok: affiliate.tiktok,
        banco: affiliate.banco,
        agencia: affiliate.agencia,
        conta: affiliate.conta,
        tipoConta: affiliate.tipoConta,
        chavePix: affiliate.chavePix,
        account: affiliate.account
      },
      stats: {
        totalSales: affiliate._count.sales,
        totalCommission: salesStats._sum.commissionAmount || 0,
        availableCommission: availableCommissions._sum.commissionAmount || 0,
        blockedCommission: blockedCommissions._sum.commissionAmount || 0,
        availableSalesCount: availableCommissions._count || 0,
        blockedSalesCount: blockedCommissions._count || 0,
        totalWithdrawn: affiliate.account?.totalWithdrawn || 0,
        totalClicks: clicksCount,
        conversionRate: conversionRate,
        pendingSales: salesByStatus.find(s => s.status === 'PENDING')?._count || 0,
        confirmedSales: salesByStatus.find(s => s.status === 'CONFIRMED')?._count || 0,
        paidSales: salesByStatus.find(s => s.status === 'PAID')?._count || 0
      }
    });
  } catch (error) {
    console.error('Erro ao buscar dados do afiliado:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
