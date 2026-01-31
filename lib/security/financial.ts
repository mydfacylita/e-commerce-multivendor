import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

// Rate limiting em memória (em produção usar Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Configurações de rate limit por tipo de operação
 */
export const RATE_LIMITS = {
  TRANSFER: { maxRequests: 5, windowMs: 60000 },      // 5 transferências por minuto
  WITHDRAWAL: { maxRequests: 3, windowMs: 300000 },   // 3 saques a cada 5 min
  ADJUSTMENT: { maxRequests: 10, windowMs: 60000 },   // 10 ajustes por minuto (admin)
  ACCOUNT_LOOKUP: { maxRequests: 20, windowMs: 60000 } // 20 buscas por minuto
};

/**
 * Verifica rate limit
 */
export function checkRateLimit(
  key: string, 
  type: keyof typeof RATE_LIMITS
): { allowed: boolean; remaining: number; resetIn: number } {
  const config = RATE_LIMITS[type];
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowMs };
  }
  
  if (record.count >= config.maxRequests) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetIn: record.resetTime - now 
    };
  }
  
  record.count++;
  return { 
    allowed: true, 
    remaining: config.maxRequests - record.count, 
    resetIn: record.resetTime - now 
  };
}

/**
 * Obtém informações do cliente para auditoria
 */
export function getClientInfo(): {
  ip: string;
  userAgent: string;
  timestamp: number;
} {
  const headersList = headers();
  
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || headersList.get('x-real-ip') 
    || 'unknown';
  
  const userAgent = headersList.get('user-agent') || 'unknown';
  
  return {
    ip,
    userAgent,
    timestamp: Date.now()
  };
}

/**
 * Registra log de auditoria de transação financeira
 */
export async function logFinancialAudit(data: {
  userId: string;
  accountId?: string;
  action: string;
  amount?: number;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'SUSPICIOUS';
  details?: any;
  errorMessage?: string;
}): Promise<void> {
  const clientInfo = getClientInfo();
  
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: `FINANCIAL_${data.action}`,
        resource: 'SellerAccount',
        resourceId: data.accountId || null,
        ipAddress: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        status: data.status,
        details: JSON.stringify({
          amount: data.amount,
          ...data.details,
          error: data.errorMessage
        }),
        createdAt: new Date()
      }
    });
  } catch (error) {
    // Log para console em caso de falha no banco (não deve impedir operação)
    console.error('[AUDIT ERROR]', {
      ...data,
      clientInfo,
      error: error instanceof Error ? error.message : 'Unknown'
    });
  }
}

/**
 * Valida limites de transação
 */
export const TRANSACTION_LIMITS = {
  TRANSFER: {
    minAmount: 1.00,
    maxAmount: 50000.00,
    dailyLimit: 100000.00
  },
  WITHDRAWAL: {
    minAmount: 10.00,
    maxAmount: 100000.00,
    dailyLimit: 100000.00
  }
};

/**
 * Verifica limite diário de transações
 */
export async function checkDailyLimit(
  accountId: string,
  type: 'TRANSFER' | 'WITHDRAWAL',
  amount: number
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const transactionTypes = type === 'TRANSFER' 
    ? ['TRANSFER_OUT'] as const
    : ['WITHDRAWAL'] as const;
  
  const dailyTotal = await prisma.sellerAccountTransaction.aggregate({
    where: {
      accountId,
      type: { in: [...transactionTypes] },
      status: { in: ['COMPLETED', 'PROCESSING', 'PENDING'] },
      createdAt: { gte: startOfDay }
    },
    _sum: {
      amount: true
    }
  });
  
  const used = Math.abs(dailyTotal._sum?.amount || 0);
  const limit = TRANSACTION_LIMITS[type].dailyLimit;
  
  return {
    allowed: (used + amount) <= limit,
    used,
    limit
  };
}

/**
 * Detecta comportamento suspeito
 */
export async function detectSuspiciousActivity(
  accountId: string,
  userId: string
): Promise<{ suspicious: boolean; reasons: string[] }> {
  const reasons: string[] = [];
  const oneHourAgo = new Date(Date.now() - 3600000);
  
  // Muitas transações em curto período
  const recentTransactions = await prisma.sellerAccountTransaction.count({
    where: {
      accountId,
      type: { in: ['TRANSFER_OUT', 'WITHDRAWAL'] },
      createdAt: { gte: oneHourAgo }
    }
  });
  
  if (recentTransactions > 10) {
    reasons.push('HIGH_FREQUENCY_TRANSACTIONS');
  }
  
  // Verificar se conta é nova (menos de 24h)
  const account = await prisma.sellerAccount.findUnique({
    where: { id: accountId },
    select: { createdAt: true, kycStatus: true }
  });
  
  if (account) {
    const accountAge = Date.now() - new Date(account.createdAt).getTime();
    if (accountAge < 86400000) { // 24 horas
      reasons.push('NEW_ACCOUNT');
    }
    
    if (account.kycStatus !== 'APPROVED') {
      reasons.push('UNVERIFIED_KYC');
    }
  }
  
  // Verificar tentativas falhas recentes
  const failedAttempts = await prisma.auditLog.count({
    where: {
      userId,
      action: { startsWith: 'FINANCIAL_' },
      status: 'FAILED',
      createdAt: { gte: oneHourAgo }
    }
  });
  
  if (failedAttempts > 5) {
    reasons.push('MULTIPLE_FAILED_ATTEMPTS');
  }
  
  return {
    suspicious: reasons.length > 0,
    reasons
  };
}

/**
 * Bloqueia conta temporariamente por atividade suspeita
 */
export async function temporaryAccountLock(
  accountId: string,
  reason: string,
  durationMinutes: number = 30
): Promise<void> {
  await prisma.sellerAccount.update({
    where: { id: accountId },
    data: {
      status: 'BLOCKED',
      metadata: JSON.stringify({
        blockedAt: new Date().toISOString(),
        blockReason: reason,
        autoUnlockAt: new Date(Date.now() + durationMinutes * 60000).toISOString(),
        isTemporaryLock: true
      })
    }
  });
}

/**
 * Valida integridade da requisição
 */
export function validateRequestIntegrity(
  body: any,
  requiredFields: string[]
): { valid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];
  
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missingFields.push(field);
    }
  }
  
  return {
    valid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Sanitiza input para prevenir injection
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>\"'`]/g, '') // Remove caracteres perigosos
    .trim()
    .slice(0, 500); // Limita tamanho
}
