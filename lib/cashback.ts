import { prisma } from '@/lib/prisma';

interface CashbackResult {
  amount: number;
  ruleId: string;
  ruleName: string;
}

/**
 * Calcula o cashback aplicável para um pedido
 */
export async function calculateCashback(
  userId: string,
  orderTotal: number,
  items: Array<{
    productId: string;
    categoryId: string;
    sellerId?: string | null;
    price: number;
    quantity: number;
  }>
): Promise<CashbackResult | null> {
  try {
    const now = new Date();

    // Buscar todas as regras ativas e válidas
    const rules = await prisma.cashbackRule.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        OR: [
          { validUntil: null },
          { validUntil: { gte: now } }
        ]
      },
      orderBy: { priority: 'desc' }
    });

    if (rules.length === 0) {
      return null;
    }

    // Verificar se é primeira compra do cliente
    const orderCount = await prisma.order.count({
      where: {
        userId,
        status: { notIn: ['CANCELLED'] }
      }
    });
    const isFirstPurchase = orderCount === 0;

    // Verificar se é cliente novo (30 dias)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true }
    });
    const isNewCustomer = user && 
      (now.getTime() - user.createdAt.getTime()) < 30 * 24 * 60 * 60 * 1000;

    // Mapear IDs dos itens
    const productIds = items.map(i => i.productId);
    const categoryIds = [...new Set(items.map(i => i.categoryId))];
    const sellerIds = [...new Set(items.filter(i => i.sellerId).map(i => i.sellerId!))];

    // Encontrar a melhor regra aplicável
    for (const rule of rules) {
      // Verificar primeira compra
      if (rule.firstPurchaseOnly && !isFirstPurchase) {
        continue;
      }

      // Verificar cliente novo
      if (rule.forNewCustomers && !isNewCustomer) {
        continue;
      }

      // Verificar valor mínimo
      if (rule.minOrderValue && orderTotal < rule.minOrderValue) {
        continue;
      }

      // Verificar categorias (se especificado)
      if (rule.categoryIds) {
        const allowedCategories = JSON.parse(rule.categoryIds) as string[];
        if (!categoryIds.some(c => allowedCategories.includes(c))) {
          continue;
        }
      }

      // Verificar produtos específicos (se especificado)
      if (rule.productIds) {
        const allowedProducts = JSON.parse(rule.productIds) as string[];
        if (!productIds.some(p => allowedProducts.includes(p))) {
          continue;
        }
      }

      // Verificar vendedores (se especificado)
      if (rule.sellerIds) {
        const allowedSellers = JSON.parse(rule.sellerIds) as string[];
        if (!sellerIds.some(s => allowedSellers.includes(s))) {
          continue;
        }
      }

      // Verificar produtos excluídos
      if (rule.excludedProducts) {
        const excluded = JSON.parse(rule.excludedProducts) as string[];
        // Se todos os produtos estão excluídos, pular
        if (productIds.every(p => excluded.includes(p))) {
          continue;
        }
      }

      // Calcular cashback
      let cashbackAmount = 0;
      
      if (rule.type === 'PERCENTAGE') {
        cashbackAmount = orderTotal * (rule.value / 100);
      } else {
        cashbackAmount = rule.value;
      }

      // Aplicar limite máximo
      if (rule.maxCashback && cashbackAmount > rule.maxCashback) {
        cashbackAmount = rule.maxCashback;
      }

      // Arredondar para 2 casas decimais
      cashbackAmount = Math.round(cashbackAmount * 100) / 100;

      if (cashbackAmount > 0) {
        return {
          amount: cashbackAmount,
          ruleId: rule.id,
          ruleName: rule.name
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Erro ao calcular cashback:', error);
    return null;
  }
}

/**
 * Credita cashback para o cliente (chamado após entrega do pedido)
 */
export async function creditCashback(
  userId: string,
  orderId: string,
  amount: number,
  ruleId: string,
  releaseImmediately: boolean = false
): Promise<boolean> {
  try {
    // Buscar ou criar registro de cashback
    let cashback = await prisma.customerCashback.findUnique({
      where: { userId }
    });

    if (!cashback) {
      cashback = await prisma.customerCashback.create({
        data: { userId }
      });
    }

    const expirationDays = cashback.expirationDays || 90;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // Se libera imediatamente ou após entrega
    const availableAt = releaseImmediately ? new Date() : null;
    const status = releaseImmediately ? 'AVAILABLE' : 'PENDING';

    // Calcular novo saldo
    const newBalance = releaseImmediately 
      ? cashback.balance + amount 
      : cashback.balance;
    const newPending = releaseImmediately 
      ? cashback.pendingBalance 
      : cashback.pendingBalance + amount;

    await prisma.$transaction([
      prisma.customerCashback.update({
        where: { id: cashback.id },
        data: {
          balance: newBalance,
          pendingBalance: newPending,
          totalEarned: { increment: amount }
        }
      }),
      prisma.cashbackTransaction.create({
        data: {
          cashbackId: cashback.id,
          type: 'CREDIT',
          amount,
          balanceBefore: cashback.balance,
          balanceAfter: newBalance,
          description: `Cashback do pedido #${orderId.slice(-8).toUpperCase()}`,
          orderId,
          ruleId,
          status,
          expiresAt,
          availableAt
        }
      })
    ]);

    return true;
  } catch (error) {
    console.error('Erro ao creditar cashback:', error);
    return false;
  }
}

/**
 * Libera cashback pendente (chamado após entrega confirmada)
 */
export async function releasePendingCashback(orderId: string): Promise<boolean> {
  try {
    const transaction = await prisma.cashbackTransaction.findFirst({
      where: {
        orderId,
        status: 'PENDING',
        type: 'CREDIT'
      },
      include: { cashback: true }
    });

    if (!transaction) {
      return false;
    }

    const cashback = transaction.cashback;
    const newBalance = cashback.balance + transaction.amount;
    const newPending = cashback.pendingBalance - transaction.amount;

    await prisma.$transaction([
      prisma.cashbackTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'AVAILABLE',
          availableAt: new Date(),
          releasedAt: new Date(),
          balanceAfter: newBalance
        }
      }),
      prisma.customerCashback.update({
        where: { id: cashback.id },
        data: {
          balance: newBalance,
          pendingBalance: Math.max(0, newPending)
        }
      })
    ]);

    return true;
  } catch (error) {
    console.error('Erro ao liberar cashback:', error);
    return false;
  }
}

/**
 * Usa cashback no pagamento de um pedido
 */
export async function useCashback(
  userId: string,
  orderId: string,
  amount: number
): Promise<boolean> {
  try {
    const cashback = await prisma.customerCashback.findUnique({
      where: { userId }
    });

    if (!cashback || cashback.balance < amount) {
      return false;
    }

    const newBalance = cashback.balance - amount;

    await prisma.$transaction([
      prisma.customerCashback.update({
        where: { id: cashback.id },
        data: {
          balance: newBalance,
          totalUsed: { increment: amount }
        }
      }),
      prisma.cashbackTransaction.create({
        data: {
          cashbackId: cashback.id,
          type: 'DEBIT',
          amount: -amount,
          balanceBefore: cashback.balance,
          balanceAfter: newBalance,
          description: `Uso no pedido #${orderId.slice(-8).toUpperCase()}`,
          orderId,
          status: 'USED'
        }
      })
    ]);

    return true;
  } catch (error) {
    console.error('Erro ao usar cashback:', error);
    return false;
  }
}

/**
 * Cancela cashback de um pedido cancelado
 */
export async function cancelCashback(orderId: string): Promise<boolean> {
  try {
    const transactions = await prisma.cashbackTransaction.findMany({
      where: {
        orderId,
        status: { in: ['PENDING', 'AVAILABLE'] }
      },
      include: { cashback: true }
    });

    for (const transaction of transactions) {
      const cashback = transaction.cashback;
      
      if (transaction.status === 'PENDING') {
        // Apenas remover do pendente
        await prisma.$transaction([
          prisma.cashbackTransaction.update({
            where: { id: transaction.id },
            data: { status: 'CANCELLED' }
          }),
          prisma.customerCashback.update({
            where: { id: cashback.id },
            data: {
              pendingBalance: { decrement: transaction.amount },
              totalEarned: { decrement: transaction.amount }
            }
          })
        ]);
      } else if (transaction.status === 'AVAILABLE') {
        // Remover do saldo disponível
        await prisma.$transaction([
          prisma.cashbackTransaction.update({
            where: { id: transaction.id },
            data: { status: 'CANCELLED' }
          }),
          prisma.customerCashback.update({
            where: { id: cashback.id },
            data: {
              balance: { decrement: transaction.amount },
              totalEarned: { decrement: transaction.amount }
            }
          })
        ]);
      }
    }

    return true;
  } catch (error) {
    console.error('Erro ao cancelar cashback:', error);
    return false;
  }
}
