import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserPermissions } from '@/lib/seller';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar permissões
    const permissions = await getUserPermissions(session);
    if (!permissions || !permissions.canViewFinancial) {
      return NextResponse.json(
        { error: 'Você não tem permissão para visualizar dados financeiros' },
        { status: 403 }
      );
    }

    // Buscar vendedor
    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id },
      include: {
        subscriptions: {
          where: { status: { in: ['ACTIVE', 'TRIAL'] } },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 });
    }

    // Pegar comissão do plano ativo ou fallback para seller.commission
    const activeSubscription = seller.subscriptions?.[0]
    const activePlan = activeSubscription?.plan
    const platformCommission = activePlan?.platformCommission ?? seller.commission ?? 10

    // Buscar todos os pedidos que contêm produtos do vendedor
    const orderItems = await prisma.orderItem.findMany({
      where: {
        sellerId: seller.id,
        order: {
          status: { not: 'CANCELLED' }  // Excluir pedidos cancelados
        }
      },
      include: {
        order: true,
        product: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calcular estatísticas
    let totalGross = 0;
    let totalCommission = 0;
    let ownProductsCommission = 0; // Comissão PAGA em produtos próprios
    let dropshippingCommission = 0; // Comissão RECEBIDA em dropshipping
    let totalRevenue = 0;
    let totalSales = 0;
    let availableForWithdrawal = 0;
    let pendingPayment = 0;
    let totalPaid = 0;
    
    // Estatísticas de Dropshipping
    let dropshippingSales = 0;
    let dropshippingRevenue = 0;
    let dropshippingCost = 0;
    let dropshippingProfit = 0;

    const salesByOrder = new Map();

    orderItems.forEach(item => {
      const itemTotal = item.price * item.quantity;
      
      // USAR valores salvos no momento da venda (não recalcular)
      const commission = item.commissionAmount || 0;
      const revenue = item.sellerRevenue || 0;

      totalGross += itemTotal;
      totalCommission += commission;
      totalRevenue += revenue;
      
      // Verificar se é produto de dropshipping (tem supplierSku)
      const isDropshipping = !!item.product?.supplierSku;
      if (isDropshipping) {
        dropshippingSales += item.quantity;
        dropshippingRevenue += itemTotal;
        
        // Custo base do produto (costPrice) - usar do momento da venda
        const costBase = (item.product?.costPrice || 0) * item.quantity;
        dropshippingCost += costBase;
        
        // Lucro já foi calculado e salvo no momento da venda
        dropshippingProfit += revenue;
        
        // Comissão RECEBIDA (positiva)
        dropshippingCommission += commission;
      } else {
        // Comissão PAGA (negativa)
        ownProductsCommission += commission;
      }

      // Agrupar por pedido
      if (!salesByOrder.has(item.orderId)) {
        salesByOrder.set(item.orderId, {
          id: item.orderId,
          orderNumber: item.order.id, // Usando ID como orderNumber
          createdAt: item.order.createdAt,
          status: item.order.status,
          total: 0,
          cost: 0,
          commissionAmount: 0,
          sellerRevenue: 0,
          itemCount: 0,
          hasDropshipping: false,
          hasOwnProducts: false,
          origin: 'mixed', // 'dropshipping', 'own', 'mixed'
          transactionType: 'mixed', // 'received', 'paid', 'mixed'
        });
        totalSales++;
      }

      const orderData = salesByOrder.get(item.orderId);
      orderData.total += itemTotal;
      orderData.commissionAmount += commission;
      orderData.sellerRevenue += revenue;
      orderData.itemCount += item.quantity;
      
      if (isDropshipping) {
        orderData.hasDropshipping = true;
        const costBase = (item.product?.costPrice || 0) * item.quantity;
        orderData.cost += costBase;
      } else {
        orderData.hasOwnProducts = true;
      }
      
      // Definir origem e tipo de transação
      if (orderData.hasDropshipping && orderData.hasOwnProducts) {
        orderData.origin = 'mixed';
        orderData.transactionType = 'mixed';
      } else if (orderData.hasDropshipping) {
        orderData.origin = 'dropshipping';
        orderData.transactionType = 'received';
      } else {
        orderData.origin = 'own';
        orderData.transactionType = 'paid';
      }

      // Calcular pagamentos
      if (item.order.status === 'DELIVERED') {
        availableForWithdrawal += revenue;
      } else if (item.order.status === 'SHIPPED' || item.order.status === 'PROCESSING' || item.order.status === 'PENDING') {
        pendingPayment += revenue;
      }
    });

    // Descontar saques pendentes ou aprovados do saldo disponível
    const pendingWithdrawals = await prisma.withdrawal.findMany({
      where: {
        sellerId: seller.id,
        status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] }
      }
    });

    const totalPendingWithdrawals = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    // Usar o balance do seller ao invés de calcular dos pedidos
    availableForWithdrawal = Math.max(0, seller.balance - totalPendingWithdrawals);

    const recentSales = Array.from(salesByOrder.values()).slice(0, 20);
    const averageTicket = totalSales > 0 ? totalGross / totalSales : 0;

    return NextResponse.json({
      seller: {
        name: seller.storeName,
        commission: platformCommission,
      },
      plan: activePlan ? {
        name: activePlan.name,
        commission: activePlan.platformCommission,
        status: activeSubscription?.status,
      } : null,
      summary: {
        totalGross,
        totalCommission,
        ownProductsCommission,
        dropshippingCommission,
        totalRevenue,
        totalSales,
        averageTicket,
        availableForWithdrawal,
        pendingPayment,
        totalPaid,
      },
      dropshipping: {
        sales: dropshippingSales,
        revenue: dropshippingRevenue,
        cost: dropshippingCost,
        profit: dropshippingProfit,
        margin: dropshippingRevenue > 0 ? ((dropshippingProfit / dropshippingRevenue) * 100) : 0,
      },
      recentSales,
    });
  } catch (error) {
    console.error('Erro ao buscar dados financeiros:', error);
    return NextResponse.json({ error: 'Erro ao buscar dados financeiros' }, { status: 500 });
  }
}
