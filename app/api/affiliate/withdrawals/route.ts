import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: Listar saques do afiliado
export async function GET(req: NextRequest) {
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

    const withdrawals = await prisma.affiliateWithdrawal.findMany({
      where: { affiliateId: affiliate.id },
      orderBy: { requestedAt: 'desc' }
    });

    return NextResponse.json({ withdrawals });
  } catch (error) {
    console.error('Erro ao buscar saques:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST: Solicitar novo saque
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { amount } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
    }

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId: session.user.id },
      include: { account: true }
    });

    if (!affiliate) {
      return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });
    }

    if (affiliate.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Afiliado ainda não aprovado' }, { status: 403 });
    }

    // Verificar dados bancários
    if (!affiliate.chavePix && !affiliate.conta) {
      return NextResponse.json({ 
        error: 'Configure seus dados bancários antes de solicitar saque' 
      }, { status: 400 });
    }

    // Usar SellerAccount.balance como fonte de verdade (cobre comissões e bônus)
    const account = affiliate.account;
    if (!account) {
      return NextResponse.json({ 
        error: 'Conta MYD não encontrada. Entre em contato com o suporte.' 
      }, { status: 400 });
    }

    const availableAmount = Number(account.balance) - Number(account.blockedBalance || 0);

    // Verificar se há saldo disponível
    if (availableAmount <= 0) {
      return NextResponse.json({ 
        error: 'Você não possui saldo disponível para saque.' 
      }, { status: 400 });
    }

    // Verificar se o valor solicitado não excede o disponível
    if (amount > availableAmount) {
      return NextResponse.json({ 
        error: `Saldo disponível: R$ ${availableAmount.toFixed(2)}` 
      }, { status: 400 });
    }

    // Verificar valor mínimo (R$ 50,00)
    const minAmount = Number(account.minWithdrawalAmount) || 50;
    if (amount < minAmount) {
      return NextResponse.json({ 
        error: `Valor mínimo para saque: R$ ${minAmount.toFixed(2)}` 
      }, { status: 400 });
    }

    // Buscar vendas confirmadas disponíveis para marcar como sacadas (se houver)
    const salesToWithdraw = await prisma.affiliateSale.findMany({
      where: {
        affiliateId: affiliate.id,
        status: 'CONFIRMED',
        availableAt: { lte: new Date() }
      },
      orderBy: { availableAt: 'asc' }
    });

    let remainingAmount = amount;
    const selectedSales: string[] = [];
    for (const sale of salesToWithdraw) {
      if (remainingAmount <= 0) break;
      selectedSales.push(sale.id);
      remainingAmount -= Number(sale.commissionAmount);
    }

    const newBalance = Number(account.balance) - amount;

    // Criar solicitação de saque e deduzir saldo atomicamente
    const [withdrawal] = await prisma.$transaction([
      prisma.affiliateWithdrawal.create({
        data: {
          affiliateId: affiliate.id,
          amount: amount,
          status: 'PENDING',
          method: affiliate.chavePix ? 'PIX' : 'BANK_TRANSFER',
          pixKey: affiliate.chavePix,
          bankInfo: JSON.stringify({
            banco: affiliate.banco,
            agencia: affiliate.agencia,
            conta: affiliate.conta,
            tipoConta: affiliate.tipoConta
          }),
          requestedAt: new Date()
        }
      }),
      // Debitar do SellerAccount (que é o que a UI exibe)
      prisma.sellerAccount.update({
        where: { id: account.id },
        data: {
          balance: { decrement: amount },
          totalWithdrawn: { increment: amount }
        }
      }),
      // Registrar transação
      prisma.sellerAccountTransaction.create({
        data: {
          accountId: account.id,
          type: 'WITHDRAWAL',
          amount: amount,
          balanceBefore: Number(account.balance),
          balanceAfter: newBalance,
          description: `Saque solicitado via ${affiliate.chavePix ? 'PIX' : 'Transferência Bancária'}`,
          status: 'PENDING',
        }
      }),
      // Atualizar availableBalance do affiliate para manter consistência
      prisma.affiliate.update({
        where: { id: affiliate.id },
        data: { totalWithdrawn: { increment: amount } }
      }),
      ...(selectedSales.length > 0 ? [
        prisma.affiliateSale.updateMany({
          where: { id: { in: selectedSales } },
          data: { status: 'PAID' }
        })
      ] : [])
    ]);

    return NextResponse.json({
      success: true,
      withdrawal,
      salesProcessed: selectedSales.length,
      message: `Saque de R$ ${amount.toFixed(2)} solicitado com sucesso`
    });
  } catch (error) {
    console.error('Erro ao solicitar saque:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
