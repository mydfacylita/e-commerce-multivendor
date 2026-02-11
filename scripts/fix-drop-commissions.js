const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script para recalcular as comissões dos pedidos DROP
 * 
 * Fórmula CORRETA para DROP:
 * - Markup = Preço de venda - Custo base
 * - Comissão = Custo base × % comissão do admin
 * - Lucro do vendedor = Markup + Comissão
 * 
 * Ex: Custo R$162.50, venda R$289.20, comissão 16%
 *     Markup: 289.20 - 162.50 = 126.70
 *     Comissão: 162.50 × 16% = 26.00
 *     Lucro: 126.70 + 26.00 = 152.70
 */

async function recalculateDropCommissions() {
  console.log('=== RECALCULANDO COMISSÕES DROP ===\n');
  
  // Buscar todos os itens de pedido que são DROP
  const dropItems = await prisma.orderItem.findMany({
    where: {
      itemType: 'DROPSHIPPING',
      sellerId: { not: null }
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
          supplierSku: true,
          costPrice: true,
          totalCost: true,
          dropshippingCommission: true
        }
      },
      order: {
        select: {
          id: true,
          status: true
        }
      }
    }
  });
  
  console.log(`Encontrados ${dropItems.length} itens DROP para recalcular\n`);
  
  let updated = 0;
  let errors = 0;
  
  for (const item of dropItems) {
    try {
      const product = item.product;
      
      // Buscar produto ORIGINAL (do admin) via supplierSku
      let costPrice = 0;
      let commissionRate = 0;
      
      if (product.supplierSku) {
        const originalProduct = await prisma.product.findUnique({
          where: { id: product.supplierSku },
          select: { price: true, dropshippingCommission: true }
        });
        
        if (originalProduct) {
          costPrice = originalProduct.price || 0;  // Preço do produto original = custo base
          commissionRate = originalProduct.dropshippingCommission || 0;
        }
      }
      
      // Fallback: usar valores do próprio produto
      if (!costPrice) {
        costPrice = product.costPrice || product.totalCost || product.price || 0;
        commissionRate = product.dropshippingCommission || 0;
      }
      
      // Cálculo CORRETO
      const itemTotal = item.price * item.quantity;
      const costBase = costPrice * item.quantity;
      const markup = itemTotal - costBase;
      const commissionAmount = (costPrice * commissionRate / 100) * item.quantity;
      const sellerRevenue = markup + commissionAmount;
      
      // Valores antigos
      const oldRevenue = item.sellerRevenue || 0;
      const oldCommission = item.commissionAmount || 0;
      
      // Só atualizar se mudou
      if (Math.abs(oldRevenue - sellerRevenue) > 0.01 || Math.abs(oldCommission - commissionAmount) > 0.01) {
        console.log(`--- Pedido ${item.order.id} ---`);
        console.log(`Produto: ${product.name}`);
        console.log(`Custo base: R$ ${costPrice.toFixed(2)} | Venda: R$ ${item.price.toFixed(2)} x ${item.quantity}`);
        console.log(`Comissão: ${commissionRate}%`);
        console.log(`ANTES: Revenue: R$ ${oldRevenue.toFixed(2)} | Commission: R$ ${oldCommission.toFixed(2)}`);
        console.log(`DEPOIS: Revenue: R$ ${sellerRevenue.toFixed(2)} | Commission: R$ ${commissionAmount.toFixed(2)}`);
        console.log(`Diferença: R$ ${(sellerRevenue - oldRevenue).toFixed(2)}`);
        console.log('');
        
        await prisma.orderItem.update({
          where: { id: item.id },
          data: {
            commissionRate: commissionRate,
            commissionAmount: commissionAmount,
            sellerRevenue: sellerRevenue,
            supplierCost: costPrice // Custo base
          }
        });
        
        updated++;
      }
    } catch (error) {
      console.error(`Erro ao processar item ${item.id}:`, error.message);
      errors++;
    }
  }
  
  console.log('\n=== RESULTADO ===');
  console.log(`Itens atualizados: ${updated}`);
  console.log(`Erros: ${errors}`);
  
  await prisma.$disconnect();
}

recalculateDropCommissions();
