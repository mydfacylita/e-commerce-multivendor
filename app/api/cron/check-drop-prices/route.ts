import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * CRON: Verificar e desativar produtos dropshipping com preço abaixo do mínimo
 * Roda periodicamente para garantir integridade dos preços
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Verificar secret key (para segurança em produção)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log('[DROP-PRICE-CRON] ⚠️ Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('\n[DROP-PRICE-CRON] 🔍 Verificando preços de produtos dropshipping...');
  console.log(`⏰ ${new Date().toLocaleString('pt-BR')}`);

  try {
    // Buscar produtos dropshipping ativos dos vendedores
    const dropProducts = await prisma.product.findMany({
      where: {
        isDropshipping: true,
        sellerId: { not: null },
        supplierSku: { not: null },
        active: true
      },
      select: {
        id: true,
        name: true,
        price: true,
        supplierSku: true,
        seller: { select: { id: true, storeName: true } }
      }
    });

    console.log(`[DROP-PRICE-CRON] 📋 ${dropProducts.length} produtos dropshipping ativos`);

    let inactivated = 0;
    let orphaned = 0;
    const details: any[] = [];

    for (const product of dropProducts) {
      // Buscar produto original
      const sourceProduct = await prisma.product.findUnique({
        where: { id: product.supplierSku! },
        select: { price: true, active: true, availableForDropship: true }
      });

      // Produto original não existe mais
      if (!sourceProduct) {
        console.log(`[DROP-PRICE-CRON] ⚠️ Produto original não encontrado: ${product.name}`);
        await prisma.product.update({
          where: { id: product.id },
          data: { active: false }
        });
        orphaned++;
        details.push({
          productId: product.id,
          name: product.name,
          seller: product.seller?.storeName,
          reason: 'original_not_found'
        });
        continue;
      }

      // Produto original inativo ou não disponível para drop
      if (!sourceProduct.active || !sourceProduct.availableForDropship) {
        console.log(`[DROP-PRICE-CRON] ⚠️ Produto original inativo: ${product.name}`);
        await prisma.product.update({
          where: { id: product.id },
          data: { active: false }
        });
        inactivated++;
        details.push({
          productId: product.id,
          name: product.name,
          seller: product.seller?.storeName,
          reason: 'original_inactive'
        });
        continue;
      }

      // Preço abaixo do mínimo
      if (product.price < sourceProduct.price) {
        console.log(`[DROP-PRICE-CRON] ❌ Preço abaixo do mínimo: ${product.name}`);
        console.log(`   Vendedor: ${product.seller?.storeName}`);
        console.log(`   Preço: R$ ${product.price.toFixed(2)} < Mínimo: R$ ${sourceProduct.price.toFixed(2)}`);
        
        await prisma.product.update({
          where: { id: product.id },
          data: { active: false }
        });
        inactivated++;
        details.push({
          productId: product.id,
          name: product.name,
          seller: product.seller?.storeName,
          vendorPrice: product.price,
          minPrice: sourceProduct.price,
          reason: 'price_below_minimum'
        });
      }
    }

    const duration = Date.now() - startTime;
    
    console.log(`\n[DROP-PRICE-CRON] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[DROP-PRICE-CRON] 📊 RESUMO:`);
    console.log(`[DROP-PRICE-CRON]    Total verificados: ${dropProducts.length}`);
    console.log(`[DROP-PRICE-CRON]    Desativados (preço): ${inactivated}`);
    console.log(`[DROP-PRICE-CRON]    Órfãos removidos: ${orphaned}`);
    console.log(`[DROP-PRICE-CRON]    Tempo: ${duration}ms`);
    console.log(`[DROP-PRICE-CRON] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    return NextResponse.json({
      success: true,
      checked: dropProducts.length,
      inactivated,
      orphaned,
      duration,
      details
    });

  } catch (error: any) {
    console.error('[DROP-PRICE-CRON] ❌ Erro:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
