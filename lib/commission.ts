import { prisma } from '@/lib/prisma';

/**
 * Calcula e registra as comissões de um pedido
 */
export async function calculateOrderCommissions(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                seller: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error('Pedido não encontrado');
    }

    let totalCommission = 0;
    let totalSellerRevenue = 0;

    // Atualizar cada item do pedido com informações de comissão
    for (const item of order.items) {
      if (item.product.seller) {
        const itemTotal = item.price * item.quantity;
        const commissionRate = item.product.seller.commission;
        const commissionAmount = itemTotal * (commissionRate / 100);
        const sellerRevenue = itemTotal - commissionAmount;

        // Atualizar o item com as informações de comissão
        await prisma.orderItem.update({
          where: { id: item.id },
          data: {
            sellerId: item.product.seller.id,
            commissionRate,
            commissionAmount,
            sellerRevenue,
          },
        });

        totalCommission += commissionAmount;
        totalSellerRevenue += sellerRevenue;
      }
    }

    // Atualizar o pedido com o total de comissões
    await prisma.order.update({
      where: { id: orderId },
      data: {
        commissionAmount: totalCommission,
        sellerRevenue: totalSellerRevenue,
        commissionRate: order.items[0]?.product.seller?.commission || 0,
      },
    });

    return {
      totalCommission,
      totalSellerRevenue,
    };
  } catch (error) {
    console.error('Erro ao calcular comissões:', error);
    throw error;
  }
}

/**
 * Obtém relatório financeiro de um vendedor
 */
export async function getSellerFinancialReport(sellerId: string, startDate?: Date, endDate?: Date) {
  try {
    const whereClause: any = {
      sellerId,
    };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const orderItems = await prisma.orderItem.findMany({
      where: whereClause,
      include: {
        order: true,
        product: true,
      },
    });

    let totalGross = 0;
    let totalCommission = 0;
    let totalRevenue = 0;
    let totalSales = new Set();

    orderItems.forEach(item => {
      const itemTotal = item.price * item.quantity;
      totalGross += itemTotal;
      totalCommission += item.commissionAmount || 0;
      totalRevenue += item.sellerRevenue || 0;
      totalSales.add(item.orderId);
    });

    return {
      totalGross,
      totalCommission,
      totalRevenue,
      totalSales: totalSales.size,
      averageTicket: totalSales.size > 0 ? totalGross / totalSales.size : 0,
      items: orderItems,
    };
  } catch (error) {
    console.error('Erro ao gerar relatório financeiro:', error);
    throw error;
  }
}

/**
 * Marca comissões como pagas para um vendedor
 */
export async function markCommissionsAsPaid(sellerId: string, orderIds: string[]) {
  try {
    // Aqui você pode adicionar um modelo Payment ou adicionar campo paidAt no OrderItem
    // Por enquanto, vamos apenas retornar os dados
    const items = await prisma.orderItem.findMany({
      where: {
        sellerId,
        orderId: {
          in: orderIds,
        },
      },
      include: {
        order: true,
      },
    });

    const totalPaid = items.reduce((sum, item) => sum + (item.sellerRevenue || 0), 0);

    return {
      totalPaid,
      itemsCount: items.length,
      orders: orderIds,
    };
  } catch (error) {
    console.error('Erro ao marcar comissões como pagas:', error);
    throw error;
  }
}
