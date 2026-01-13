import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

interface SelectedProduct {
  productId: string;
  title: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  rating?: number;
  orders?: number;
  nicho?: string;
}

// Gerar slug único
function generateSlug(title: string): string {
  const baseSlug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 80);
  
  const uniqueId = crypto.randomBytes(4).toString('hex');
  return `${baseSlug}-${uniqueId}`;
}

// Gerar assinatura AliExpress
function generateSign(appSecret: string, params: Record<string, any>): string {
  const sortedKeys = Object.keys(params)
    .filter(key => key !== 'sign')
    .sort();
  
  const signString = sortedKeys.map(key => `${key}${params[key]}`).join('');
  
  return crypto.createHmac('sha256', appSecret)
    .update(signString)
    .digest('hex')
    .toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { products, supplierId, active = false } = await request.json();

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'Nenhum produto selecionado' }, { status: 400 });
    }

    if (!supplierId) {
      return NextResponse.json({ error: 'Fornecedor não informado' }, { status: 400 });
    }

    // Verificar fornecedor
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId }
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 });
    }

    // Buscar categoria padrão (ou criar uma)
    let defaultCategory = await prisma.category.findFirst({
      where: { slug: 'importados' }
    });

    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: {
          name: 'Importados',
          slug: 'importados',
          description: 'Produtos importados do AliExpress'
        }
      });
    }

    console.log(`📦 Importando ${products.length} produtos...`);

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const product of products as SelectedProduct[]) {
      try {
        // Verificar se já existe pelo productId do AliExpress
        const existing = await prisma.product.findFirst({
          where: {
            OR: [
              { supplierSku: product.productId },
              { supplierSku: `ali_${product.productId}` }
            ]
          }
        });

        if (existing) {
          console.log(`⏭️ Produto ${product.productId} já existe`);
          skipped++;
          continue;
        }

        // Calcular preços
        const costPrice = product.price;
        const margin = 0.5; // 50% de margem
        const sellingPrice = costPrice * (1 + margin);
        const comparePrice = product.originalPrice 
          ? product.originalPrice * (1 + margin) 
          : sellingPrice * 1.2;

        // Criar produto
        await prisma.product.create({
          data: {
            name: product.title.substring(0, 200),
            slug: generateSlug(product.title),
            description: `Produto importado - ${product.nicho || 'AliExpress'}`,
            price: parseFloat(sellingPrice.toFixed(2)),
            comparePrice: parseFloat(comparePrice.toFixed(2)),
            costPrice: parseFloat(costPrice.toFixed(2)),
            images: product.imageUrl,
            stock: 9999, // Dropshipping
            categoryId: defaultCategory.id,
            supplierId: supplierId,
            supplierSku: `ali_${product.productId}`,
            supplierUrl: `https://www.aliexpress.com/item/${product.productId}.html`,
            active: active, // Sempre false conforme solicitado
            isDropshipping: true,
            availableForDropship: true,
            featured: false,
            specifications: JSON.stringify({
              rating: product.rating,
              orders: product.orders,
              nicho: product.nicho,
              importedAt: new Date().toISOString()
            }),
            // Custo total
            shippingCost: 0, // Pode ser calculado depois
            taxCost: 0,
            totalCost: parseFloat(costPrice.toFixed(2)),
            margin: margin * 100 // Armazenar como porcentagem
          }
        });

        console.log(`✅ Importado: ${product.title.substring(0, 40)}...`);
        imported++;

      } catch (err: any) {
        console.error(`❌ Erro ao importar ${product.productId}:`, err.message);
        errors.push(`${product.productId}: ${err.message}`);
      }
    }

    console.log('\n📊 RESULTADO DA IMPORTAÇÃO:');
    console.log(`   ✅ Importados: ${imported}`);
    console.log(`   ⏭️ Já existiam: ${skipped}`);
    console.log(`   ❌ Erros: ${errors.length}`);

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `${imported} produtos importados com sucesso (desativados)`
    });

  } catch (error: any) {
    console.error('❌ Erro ao importar produtos:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Erro ao importar produtos' 
    }, { status: 500 });
  }
}
