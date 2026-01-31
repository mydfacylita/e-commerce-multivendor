import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Gerar número de conta único
function generateAccountNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `MYD${timestamp}${random}`;
}

// GET: Obter dados da conta do vendedor
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar seller do usuário
    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id },
      include: {
        user: true,
        account: {
          include: {
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 20
            }
          }
        }
      }
    });

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 });
    }

    if (!seller.account) {
      return NextResponse.json({ 
        hasAccount: false,
        message: 'Conta digital não criada ainda'
      });
    }

    return NextResponse.json({
      hasAccount: true,
      account: {
        id: seller.account.id,
        accountNumber: seller.account.accountNumber,
        status: seller.account.status,
        balance: seller.account.balance,
        blockedBalance: seller.account.blockedBalance,
        totalReceived: seller.account.totalReceived,
        totalWithdrawn: seller.account.totalWithdrawn,
        kycStatus: seller.account.kycStatus,
        pixKeyType: seller.account.pixKeyType,
        pixKey: seller.account.pixKey ? `***${seller.account.pixKey.slice(-4)}` : null,
        bankName: seller.account.bankName,
        autoWithdrawal: seller.account.autoWithdrawal,
        autoWithdrawalDay: seller.account.autoWithdrawalDay,
        minWithdrawalAmount: seller.account.minWithdrawalAmount,
        createdAt: seller.account.createdAt,
        transactions: seller.account.transactions.map(t => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          description: t.description,
          status: t.status,
          createdAt: t.createdAt
        }))
      },
      // Dados bancários do cadastro do vendedor (para saque)
      bankData: {
        sellerType: seller.sellerType,
        cpf: seller.cpf,
        cnpj: seller.cnpj,
        razaoSocial: seller.razaoSocial,
        nomeFantasia: seller.nomeFantasia,
        nomeCompleto: seller.user?.name,
        banco: seller.banco,
        agencia: seller.agencia,
        conta: seller.conta,
        tipoConta: seller.tipoConta,
        chavePix: seller.chavePix
      }
    });
  } catch (error) {
    console.error('Erro ao buscar conta:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST: Criar/ativar conta digital do vendedor
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar seller
    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id },
      include: { account: true }
    });

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 });
    }

    // Verificar se já tem conta
    if (seller.account) {
      return NextResponse.json({ 
        error: 'Conta digital já existe',
        accountNumber: seller.account.accountNumber
      }, { status: 400 });
    }

    const body = await req.json();
    const { pixKeyType, pixKey, bankCode, bankName, agencia, conta, contaTipo } = body;

    // Gerar número de conta único
    let accountNumber = generateAccountNumber();
    
    // Verificar se já existe (raro, mas possível)
    const existing = await prisma.sellerAccount.findUnique({
      where: { accountNumber }
    });
    if (existing) {
      accountNumber = generateAccountNumber();
    }

    // Criar conta digital
    const account = await prisma.sellerAccount.create({
      data: {
        sellerId: seller.id,
        accountNumber,
        status: 'PENDING',
        kycStatus: 'PENDING',
        pixKeyType,
        pixKey,
        bankCode,
        bankName,
        agencia,
        conta,
        contaTipo,
        minWithdrawalAmount: 50
      }
    });

    // Registrar transação inicial (abertura de conta)
    await prisma.sellerAccountTransaction.create({
      data: {
        accountId: account.id,
        type: 'BONUS',
        amount: 0,
        balanceBefore: 0,
        balanceAfter: 0,
        description: 'Conta digital criada com sucesso',
        referenceType: 'ACCOUNT_OPENING',
        status: 'COMPLETED'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Conta digital criada com sucesso!',
      account: {
        id: account.id,
        accountNumber: account.accountNumber,
        status: account.status,
        kycStatus: account.kycStatus
      }
    });
  } catch (error) {
    console.error('Erro ao criar conta:', error);
    return NextResponse.json({ error: 'Erro ao criar conta digital' }, { status: 500 });
  }
}

// PUT: Atualizar dados da conta (dados bancários, configurações)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id },
      include: { account: true }
    });

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 });
    }

    if (!seller.account) {
      return NextResponse.json({ error: 'Conta digital não encontrada' }, { status: 404 });
    }

    const body = await req.json();
    const { 
      pixKeyType, 
      pixKey, 
      bankCode, 
      bankName, 
      agencia, 
      conta, 
      contaTipo,
      autoWithdrawal,
      autoWithdrawalDay,
      minWithdrawalAmount
    } = body;

    const account = await prisma.sellerAccount.update({
      where: { id: seller.account.id },
      data: {
        ...(pixKeyType && { pixKeyType }),
        ...(pixKey && { pixKey }),
        ...(bankCode && { bankCode }),
        ...(bankName && { bankName }),
        ...(agencia && { agencia }),
        ...(conta && { conta }),
        ...(contaTipo && { contaTipo }),
        ...(typeof autoWithdrawal === 'boolean' && { autoWithdrawal }),
        ...(autoWithdrawalDay && { autoWithdrawalDay }),
        ...(minWithdrawalAmount && { minWithdrawalAmount })
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Dados atualizados com sucesso!',
      account: {
        id: account.id,
        pixKeyType: account.pixKeyType,
        bankName: account.bankName,
        autoWithdrawal: account.autoWithdrawal
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar conta:', error);
    return NextResponse.json({ error: 'Erro ao atualizar conta' }, { status: 500 });
  }
}
