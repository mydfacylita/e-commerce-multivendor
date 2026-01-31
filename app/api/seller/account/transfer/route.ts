import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateSecureTransactionId, 
  signData, 
  maskSensitiveData,
  encrypt 
} from '@/lib/security/crypto';
import {
  checkRateLimit,
  logFinancialAudit,
  checkDailyLimit,
  detectSuspiciousActivity,
  TRANSACTION_LIMITS,
  validateRequestIntegrity,
  sanitizeInput
} from '@/lib/security/financial';

// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';


// POST - Transferir para outro vendedor
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const startTime = Date.now();
  
  // 1. VERIFICAÇÃO DE AUTENTICAÇÃO
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const userId = session.user.id;
  let accountId: string | undefined;

  try {
    // 2. RATE LIMITING
    const rateLimitKey = `transfer:${userId}`;
    const rateCheck = checkRateLimit(rateLimitKey, 'TRANSFER');
    
    if (!rateCheck.allowed) {
      await logFinancialAudit({
        userId,
        action: 'TRANSFER_RATE_LIMITED',
        status: 'BLOCKED',
        details: { resetIn: rateCheck.resetIn }
      });
      
      return NextResponse.json({ 
        error: 'Muitas tentativas. Aguarde alguns minutos.',
        retryAfter: Math.ceil(rateCheck.resetIn / 1000)
      }, { 
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(rateCheck.resetIn / 1000)) }
      });
    }

    // 3. VALIDAÇÃO DO BODY
    const body = await request.json();
    const validation = validateRequestIntegrity(body, ['destinationAccountNumber', 'amount']);
    
    if (!validation.valid) {
      return NextResponse.json({ 
        error: 'Dados incompletos',
        fields: validation.missingFields 
      }, { status: 400 });
    }

    const { destinationAccountNumber, amount, description } = body;
    const sanitizedDescription = description ? sanitizeInput(description) : '';

    // 4. VALIDAÇÃO DE VALORES
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
    }

    if (numAmount < TRANSACTION_LIMITS.TRANSFER.minAmount) {
      return NextResponse.json({ 
        error: `Valor mínimo: R$ ${TRANSACTION_LIMITS.TRANSFER.minAmount.toFixed(2)}` 
      }, { status: 400 });
    }

    if (numAmount > TRANSACTION_LIMITS.TRANSFER.maxAmount) {
      return NextResponse.json({ 
        error: `Valor máximo: R$ ${TRANSACTION_LIMITS.TRANSFER.maxAmount.toFixed(2)}` 
      }, { status: 400 });
    }

    // 5. BUSCAR CONTA DO USUÁRIO LOGADO
    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id },
      include: { account: true }
    });

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 });
    }

    if (!seller.account) {
      return NextResponse.json({ error: 'Você não possui uma conta digital' }, { status: 400 });
    }

    accountId = seller.account.id;

    // 6. VERIFICAR STATUS DA CONTA
    if (seller.account.status !== 'ACTIVE') {
      await logFinancialAudit({
        userId,
        accountId,
        action: 'TRANSFER_BLOCKED_ACCOUNT',
        amount: numAmount,
        status: 'BLOCKED',
        details: { accountStatus: seller.account.status }
      });
      
      return NextResponse.json({ error: 'Sua conta não está ativa' }, { status: 400 });
    }

    // 7. VERIFICAR SE CONTA ESTÁ BLOQUEADA TEMPORARIAMENTE
    if (seller.account.lockedUntil && new Date(seller.account.lockedUntil) > new Date()) {
      return NextResponse.json({ 
        error: 'Conta bloqueada temporariamente. Tente novamente mais tarde.' 
      }, { status: 403 });
    }

    // 8. VERIFICAR SALDO
    if (seller.account.balance < numAmount) {
      await logFinancialAudit({
        userId,
        accountId,
        action: 'TRANSFER_INSUFFICIENT_BALANCE',
        amount: numAmount,
        status: 'FAILED',
        details: { balance: seller.account.balance }
      });
      
      return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 });
    }

    // 9. VERIFICAR LIMITE DIÁRIO
    const dailyCheck = await checkDailyLimit(accountId, 'TRANSFER', numAmount);
    
    if (!dailyCheck.allowed) {
      await logFinancialAudit({
        userId,
        accountId,
        action: 'TRANSFER_DAILY_LIMIT',
        amount: numAmount,
        status: 'BLOCKED',
        details: { used: dailyCheck.used, limit: dailyCheck.limit }
      });
      
      return NextResponse.json({ 
        error: `Limite diário excedido. Já transferiu: R$ ${dailyCheck.used.toFixed(2)} de R$ ${dailyCheck.limit.toFixed(2)}` 
      }, { status: 400 });
    }

    // 10. DETECTAR ATIVIDADE SUSPEITA
    const suspicionCheck = await detectSuspiciousActivity(accountId, userId);
    
    if (suspicionCheck.suspicious) {
      await logFinancialAudit({
        userId,
        accountId,
        action: 'TRANSFER_SUSPICIOUS',
        amount: numAmount,
        status: 'SUSPICIOUS',
        details: { reasons: suspicionCheck.reasons }
      });
      
      // Para atividades muito suspeitas, bloquear
      if (suspicionCheck.reasons.includes('MULTIPLE_FAILED_ATTEMPTS')) {
        return NextResponse.json({ 
          error: 'Atividade suspeita detectada. Entre em contato com o suporte.' 
        }, { status: 403 });
      }
    }

    // 11. BUSCAR CONTA DE DESTINO
    const destinationAccount = await prisma.sellerAccount.findUnique({
      where: { accountNumber: sanitizeInput(destinationAccountNumber) },
      include: {
        seller: {
          include: {
            user: { select: { name: true } }
          }
        }
      }
    });

    if (!destinationAccount) {
      return NextResponse.json({ error: 'Conta de destino não encontrada' }, { status: 404 });
    }

    if (destinationAccount.id === seller.account.id) {
      return NextResponse.json({ error: 'Não é possível transferir para sua própria conta' }, { status: 400 });
    }

    if (destinationAccount.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'A conta de destino não está ativa' }, { status: 400 });
    }

    // 12. GERAR ID SEGURO DA TRANSAÇÃO
    const transactionId = generateSecureTransactionId();

    // 13. CRIAR ASSINATURA DA TRANSAÇÃO
    const transactionData = {
      id: transactionId,
      from: seller.account.accountNumber,
      to: destinationAccountNumber,
      amount: numAmount,
      timestamp: Date.now()
    };
    const signature = signData(transactionData);

    // 14. EXECUTAR TRANSFERÊNCIA EM TRANSAÇÃO ATÔMICA
    const result = await prisma.$transaction(async (tx) => {
      // Buscar saldo atualizado dentro da transação (lock implícito)
      const currentAccount = await tx.sellerAccount.findUnique({
        where: { id: seller.account!.id }
      });

      if (!currentAccount || currentAccount.balance < numAmount) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      // Debitar conta de origem
      const sourceAccount = await tx.sellerAccount.update({
        where: { id: seller.account!.id },
        data: {
          balance: { decrement: numAmount }
        }
      });

      // Criar transação de débito na origem
      await tx.sellerAccountTransaction.create({
        data: {
          accountId: seller.account!.id,
          type: 'TRANSFER_OUT',
          amount: -numAmount,
          balanceBefore: currentAccount.balance,
          balanceAfter: sourceAccount.balance,
          description: sanitizedDescription || `Transferência para ${destinationAccount.accountNumber}`,
          status: 'COMPLETED',
          reference: transactionId,
          referenceType: 'TRANSFER',
          processedAt: new Date(),
          metadata: JSON.stringify({
            destination: destinationAccount.accountNumber,
            destinationName: destinationAccount.seller.storeName,
            signature
          })
        }
      });

      // Buscar saldo atual do destino
      const destCurrentBalance = await tx.sellerAccount.findUnique({
        where: { id: destinationAccount.id },
        select: { balance: true }
      });

      // Creditar conta de destino
      const destAccount = await tx.sellerAccount.update({
        where: { id: destinationAccount.id },
        data: {
          balance: { increment: numAmount },
          totalReceived: { increment: numAmount }
        }
      });

      // Criar transação de crédito no destino
      await tx.sellerAccountTransaction.create({
        data: {
          accountId: destinationAccount.id,
          type: 'TRANSFER_IN',
          amount: numAmount,
          balanceBefore: destCurrentBalance?.balance || 0,
          balanceAfter: destAccount.balance,
          description: sanitizedDescription || `Transferência recebida de ${seller.account!.accountNumber}`,
          status: 'COMPLETED',
          reference: transactionId,
          referenceType: 'TRANSFER',
          processedAt: new Date(),
          metadata: JSON.stringify({
            source: seller.account!.accountNumber,
            sourceName: seller.storeName,
            signature
          })
        }
      });

      return { sourceAccount, destAccount };
    });

    // 15. LOG DE SUCESSO
    await logFinancialAudit({
      userId,
      accountId,
      action: 'TRANSFER_SUCCESS',
      amount: numAmount,
      status: 'SUCCESS',
      details: {
        transactionId,
        destination: destinationAccountNumber,
        destinationName: destinationAccount.seller.storeName,
        processingTime: Date.now() - startTime
      }
    });

    // 16. RESPOSTA SEGURA (sem dados sensíveis)
    return NextResponse.json({
      success: true,
      message: 'Transferência realizada com sucesso',
      transfer: {
        id: transactionId,
        amount: numAmount,
        to: maskSensitiveData({ account: destinationAccountNumber }).account,
        toName: destinationAccount.seller.storeName,
        newBalance: result.sourceAccount.balance,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await logFinancialAudit({
      userId,
      accountId,
      action: 'TRANSFER_ERROR',
      status: 'FAILED',
      errorMessage,
      details: { processingTime: Date.now() - startTime }
    });

    if (errorMessage === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 });
    }

    console.error('[TRANSFER ERROR]', maskSensitiveData({ error: errorMessage, userId }));
    return NextResponse.json({ error: 'Erro ao realizar transferência' }, { status: 500 });
  }
}

// GET - Buscar conta por número (para validar antes de transferir)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // Rate limiting para buscas
  const rateLimitKey = `account_lookup:${session.user.id}`;
  const rateCheck = checkRateLimit(rateLimitKey, 'ACCOUNT_LOOKUP');
  
  if (!rateCheck.allowed) {
    return NextResponse.json({ 
      error: 'Muitas buscas. Aguarde um momento.' 
    }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const accountNumber = searchParams.get('account');

  if (!accountNumber || accountNumber.length < 10) {
    return NextResponse.json({ error: 'Número da conta inválido' }, { status: 400 });
  }

  try {
    const account = await prisma.sellerAccount.findUnique({
      where: { accountNumber: sanitizeInput(accountNumber) },
      include: {
        seller: {
          select: {
            storeName: true,
            user: { select: { name: true } }
          }
        }
      }
    });

    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    // Retorna apenas dados públicos
    return NextResponse.json({
      found: true,
      account: {
        accountNumber: account.accountNumber,
        storeName: account.seller.storeName,
        ownerName: account.seller.user.name?.split(' ')[0] || 'Vendedor', // Apenas primeiro nome
        status: account.status === 'ACTIVE' ? 'ACTIVE' : 'UNAVAILABLE'
      }
    });

  } catch (error) {
    console.error('[ACCOUNT LOOKUP ERROR]', error);
    return NextResponse.json({ error: 'Erro ao buscar conta' }, { status: 500 });
  }
}
