import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateSecureTransactionId, signData } from '@/lib/security/crypto';
import { checkRateLimit, logFinancialAudit, sanitizeInput } from '@/lib/security/financial';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// GET: Obter detalhes de uma conta específica
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const account = await prisma.sellerAccount.findUnique({
      where: { id: params.id },
      include: {
        seller: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true, cpf: true }
            }
          }
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    });

    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      account: {
        id: account.id,
        accountNumber: account.accountNumber,
        status: account.status,
        kycStatus: account.kycStatus,
        balance: account.balance,
        blockedBalance: account.blockedBalance,
        totalReceived: account.totalReceived,
        totalWithdrawn: account.totalWithdrawn,
        // Dados bancários completos para admin
        pixKeyType: account.pixKeyType,
        pixKey: account.pixKey,
        bankCode: account.bankCode,
        bankName: account.bankName,
        agencia: account.agencia,
        conta: account.conta,
        contaTipo: account.contaTipo,
        // Configurações
        autoWithdrawal: account.autoWithdrawal,
        autoWithdrawalDay: account.autoWithdrawalDay,
        minWithdrawalAmount: account.minWithdrawalAmount,
        // Verificação
        verifiedAt: account.verifiedAt,
        verifiedBy: account.verifiedBy,
        kycDocuments: account.kycDocuments ? JSON.parse(account.kycDocuments) : null,
        // Vendedor
        seller: {
          id: account.seller.id,
          storeName: account.seller.storeName,
          storeSlug: account.seller.storeSlug,
          sellerType: account.seller.sellerType,
          cpf: account.seller.cpf,
          cnpj: account.seller.cnpj,
          razaoSocial: account.seller.razaoSocial,
          cidade: account.seller.cidade,
          estado: account.seller.estado,
          user: account.seller.user
        },
        transactions: account.transactions,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      }
    });
  } catch (error) {
    console.error('Erro ao buscar conta:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT: Atualizar status da conta, KYC, etc
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { status, kycStatus, adminNote } = body;

    const account = await prisma.sellerAccount.findUnique({
      where: { id: params.id }
    });

    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    const updateData: any = {};

    // Atualizar status da conta
    if (status && ['PENDING', 'ACTIVE', 'BLOCKED', 'SUSPENDED', 'CLOSED'].includes(status)) {
      updateData.status = status;
    }

    // Atualizar status do KYC
    if (kycStatus && ['PENDING', 'SUBMITTED', 'REVIEWING', 'APPROVED', 'REJECTED', 'NEEDS_UPDATE'].includes(kycStatus)) {
      updateData.kycStatus = kycStatus;
      
      if (kycStatus === 'APPROVED') {
        updateData.verifiedAt = new Date();
        updateData.verifiedBy = session.user.id;
        // Se KYC aprovado e status pendente, ativar conta
        if (account.status === 'PENDING') {
          updateData.status = 'ACTIVE';
        }
      }
    }

    const updatedAccount = await prisma.sellerAccount.update({
      where: { id: params.id },
      data: updateData
    });

    // Registrar transação de log
    if (status || kycStatus) {
      await prisma.sellerAccountTransaction.create({
        data: {
          accountId: account.id,
          type: 'ADJUSTMENT_CREDIT',
          amount: 0,
          balanceBefore: account.balance,
          balanceAfter: account.balance,
          description: `Status atualizado: ${status || ''} ${kycStatus ? `KYC: ${kycStatus}` : ''}`.trim(),
          referenceType: 'ADMIN_ACTION',
          reference: session.user.id,
          status: 'COMPLETED',
          processedBy: session.user.id,
          processedAt: new Date(),
          metadata: JSON.stringify({ adminNote, previousStatus: account.status, previousKyc: account.kycStatus })
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Conta atualizada com sucesso',
      account: {
        id: updatedAccount.id,
        status: updatedAccount.status,
        kycStatus: updatedAccount.kycStatus
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar conta:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST: Fazer ajuste manual no saldo (com segurança reforçada)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const startTime = Date.now();
  
  // 1. VERIFICAÇÃO DE AUTENTICAÇÃO ADMIN
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const adminId = session.user.id;
  const accountId = params.id;

  try {
    // 2. RATE LIMITING PARA ADMIN
    const rateLimitKey = `admin_adjustment:${adminId}`;
    const rateCheck = checkRateLimit(rateLimitKey, 'ADJUSTMENT');
    
    if (!rateCheck.allowed) {
      await logFinancialAudit({
        userId: adminId,
        accountId,
        action: 'ADMIN_ADJUSTMENT_RATE_LIMITED',
        status: 'BLOCKED'
      });
      
      return NextResponse.json({ 
        error: 'Muitas operações. Aguarde um momento.' 
      }, { status: 429 });
    }

    const body = await req.json();
    const { type, amount, description, reason } = body;

    // 3. VALIDAÇÃO DE DADOS
    if (!type || !amount || !description) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    if (!['ADJUSTMENT_CREDIT', 'ADJUSTMENT_DEBIT', 'BONUS', 'FEE', 'CHARGEBACK', 'MIGRATION'].includes(type)) {
      return NextResponse.json({ error: 'Tipo de ajuste inválido' }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
    }

    // 4. BUSCAR CONTA
    const account = await prisma.sellerAccount.findUnique({
      where: { id: accountId },
      include: {
        seller: {
          include: { user: { select: { name: true, email: true } } }
        }
      }
    });

    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    const isCredit = ['ADJUSTMENT_CREDIT', 'BONUS', 'MIGRATION'].includes(type);
    const adjustAmount = Math.abs(numAmount);
    const newBalance = isCredit 
      ? account.balance + adjustAmount 
      : account.balance - adjustAmount;

    if (newBalance < 0) {
      await logFinancialAudit({
        userId: adminId,
        accountId,
        action: 'ADMIN_ADJUSTMENT_INSUFFICIENT_BALANCE',
        amount: numAmount,
        status: 'FAILED',
        details: { type, balance: account.balance }
      });
      
      return NextResponse.json({ error: 'Saldo insuficiente para débito' }, { status: 400 });
    }

    // 5. GERAR ID SEGURO DA TRANSAÇÃO
    const transactionId = generateSecureTransactionId();

    // 6. CRIAR ASSINATURA DA TRANSAÇÃO
    const transactionData = {
      id: transactionId,
      accountId,
      type,
      amount: numAmount,
      adminId,
      timestamp: Date.now()
    };
    const signature = signData(transactionData);

    // 7. EXECUTAR AJUSTE EM TRANSAÇÃO ATÔMICA
    await prisma.$transaction([
      prisma.sellerAccount.update({
        where: { id: accountId },
        data: {
          balance: newBalance,
          ...(isCredit && { totalReceived: { increment: adjustAmount } })
        }
      }),
      prisma.sellerAccountTransaction.create({
        data: {
          accountId: account.id,
          type,
          amount: isCredit ? adjustAmount : -adjustAmount,
          balanceBefore: account.balance,
          balanceAfter: newBalance,
          description: sanitizeInput(description),
          referenceType: 'ADMIN_ADJUSTMENT',
          reference: transactionId,
          status: 'COMPLETED',
          processedBy: adminId,
          processedAt: new Date(),
          metadata: JSON.stringify({ 
            reason: reason ? sanitizeInput(reason) : null, 
            adminId,
            signature,
            sellerName: account.seller.storeName
          })
        }
      })
    ]);

    // 8. LOG DE AUDITORIA
    await logFinancialAudit({
      userId: adminId,
      accountId,
      action: `ADMIN_${type}`,
      amount: numAmount,
      status: 'SUCCESS',
      details: {
        transactionId,
        type,
        previousBalance: account.balance,
        newBalance,
        sellerName: account.seller.storeName,
        processingTime: Date.now() - startTime
      }
    });

    return NextResponse.json({
      success: true,
      message: `Ajuste de ${isCredit ? 'crédito' : 'débito'} realizado com sucesso`,
      transactionId,
      newBalance
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await logFinancialAudit({
      userId: adminId,
      accountId,
      action: 'ADMIN_ADJUSTMENT_ERROR',
      status: 'FAILED',
      errorMessage
    });

    console.error('[ADMIN ADJUSTMENT ERROR]', { error: errorMessage, adminId, accountId });
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
