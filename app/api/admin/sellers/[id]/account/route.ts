import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Função para gerar número de conta único
function generateAccountNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `MYD${timestamp}${random}`;
}

// POST - Criar conta digital para o vendedor
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const sellerId = params.id;

    // Verificar se vendedor existe
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      include: {
        account: true,
        user: {
          select: { name: true, email: true }
        }
      }
    });

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 });
    }

    // Verificar se já tem conta
    if (seller.account) {
      return NextResponse.json({ 
        error: 'Este vendedor já possui uma conta digital',
        account: seller.account
      }, { status: 400 });
    }

    // Gerar número de conta único
    let accountNumber = generateAccountNumber();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.sellerAccount.findUnique({
        where: { accountNumber }
      });
      if (!existing) break;
      accountNumber = generateAccountNumber();
      attempts++;
    }

    // Criar conta digital
    const account = await prisma.sellerAccount.create({
      data: {
        sellerId: sellerId,
        accountNumber: accountNumber,
        status: 'ACTIVE', // Admin cria já ativa
        kycStatus: 'APPROVED', // Admin já verificou
        balance: 0,
        blockedBalance: 0,
        totalReceived: 0,
        totalWithdrawn: 0,
        minWithdrawalAmount: 50,
        autoWithdrawal: false,
      }
    });

    // Criar transação de abertura
    await prisma.sellerAccountTransaction.create({
      data: {
        accountId: account.id,
        type: 'ADJUSTMENT_CREDIT',
        amount: 0,
        description: 'Conta digital criada pelo administrador',
        status: 'COMPLETED',
        balanceBefore: 0,
        balanceAfter: 0
      }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Conta digital criada com sucesso',
      account
    });
  } catch (error) {
    console.error('Erro ao criar conta:', error);
    return NextResponse.json({ error: 'Erro ao criar conta digital' }, { status: 500 });
  }
}

// GET - Verificar se vendedor tem conta
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const sellerId = params.id;

    const account = await prisma.sellerAccount.findUnique({
      where: { sellerId },
      include: {
        transactions: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return NextResponse.json({ 
      hasAccount: !!account,
      account
    });
  } catch (error) {
    console.error('Erro ao buscar conta:', error);
    return NextResponse.json({ error: 'Erro ao buscar conta' }, { status: 500 });
  }
}
