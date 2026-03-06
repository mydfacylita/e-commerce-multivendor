import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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

// Buscar detalhes completos via aliexpress.ds.product.get
async function fetchProductDetails(
  appKey: string,
  appSecret: string,
  accessToken: string,
  productId: string
): Promise<any | null> {
  const apiUrl = 'https://api-sg.aliexpress.com/sync';
  const timestamp = Date.now().toString();

  const params: Record<string, any> = {
    app_key: appKey,
    method: 'aliexpress.ds.product.get',
    session: accessToken,
    timestamp,
    format: 'json',
    v: '2.0',
    sign_method: 'sha256',
    product_id: productId,
    target_currency: 'BRL',
    target_language: 'pt',
    country: 'BR',
    ship_to_country: 'BR',
  };

  params.sign = generateSign(appSecret, params);

  const url = `${apiUrl}?${new URLSearchParams(params).toString()}`;

  try {
    const response = await fetch(url, { method: 'GET' });
    const data = await response.json();

    if (data.aliexpress_ds_product_get_response?.result) {
      return data.aliexpress_ds_product_get_response.result;
    }

    console.warn(`[import] Produto ${productId} sem resultado detalhado:`, data.error_response?.msg || 'sem dados');
    return null;
  } catch (err) {
    console.error(`[import] Erro ao buscar detalhes do produto ${productId}:`, err);
    return null;
  }
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
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 });
    }

    // Buscar credenciais AliExpress
    const auth = await prisma.aliExpressAuth.findFirst();
    if (!auth || !auth.accessToken) {
      return NextResponse.json({ error: 'Credenciais AliExpress não configuradas' }, { status: 400 });
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
          description: 'Produtos importados internacionais'
        }
      });
    }

    console.log(`📦 Importando ${products.length} produtos com dados completos...`);

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

        // ─── Buscar dados completos via aliexpress.ds.product.get ───
        console.log(`🔍 Buscando detalhes de ${product.productId}...`);
        const details = await fetchProductDetails(
          auth.appKey,
          auth.appSecret,
          auth.accessToken,
          product.productId
        );

        // Valores iniciais (fallback para dados da busca)
        let name = product.title.substring(0, 200);
        let description: string | null = null;
        let allImages = product.imageUrl;
        let brand: string | null = null;
        let model: string | null = null;
        let weight: number | null = null;
        let weightWithPackage: number | null = null;
        let height: number | null = null;
        let heightWithPackage: number | null = null;
        let width: number | null = null;
        let widthWithPackage: number | null = null;
        let length: number | null = null;
        let lengthWithPackage: number | null = null;
        let shipFromCountry: string | null = null;
        let costPrice = product.price;
        let variants: any[] = [];
        let attributes: any[] = [];
        let specifications: any = {
          rating: product.rating,
          orders: product.orders,
          nicho: product.nicho,
          importedAt: new Date().toISOString()
        };

        if (details) {
          const baseInfo = details.ae_item_base_info_dto || {};

          // Nome completo
          if (baseInfo.subject) {
            name = baseInfo.subject.substring(0, 200);
          }

          // Descrição HTML
          if (baseInfo.detail) {
            description = baseInfo.detail;
          }

          // Imagens — main_imgs: string separado por espaço/ponto-e-vírgula
          const rawImages: string[] = [];
          if (baseInfo.main_imgs) {
            const imgs = String(baseInfo.main_imgs)
              .split(/[\s,;]+/)
              .map((s: string) => s.trim())
              .filter(Boolean);
            rawImages.push(...imgs);
          }
          if (rawImages.length === 0 && product.imageUrl) {
            rawImages.push(product.imageUrl);
          }
          allImages = rawImages.join(',');

          // Peso e dimensões da embalagem
          if (baseInfo.package_weight) {
            weightWithPackage = parseFloat(String(baseInfo.package_weight)) || null;
            weight = weightWithPackage;
          }
          if (baseInfo.package_length) {
            lengthWithPackage = parseFloat(String(baseInfo.package_length)) || null;
            length = lengthWithPackage;
          }
          if (baseInfo.package_width) {
            widthWithPackage = parseFloat(String(baseInfo.package_width)) || null;
            width = widthWithPackage;
          }
          if (baseInfo.package_height) {
            heightWithPackage = parseFloat(String(baseInfo.package_height)) || null;
            height = heightWithPackage;
          }

          // País de origem
          if (baseInfo.country_of_origin) shipFromCountry = baseInfo.country_of_origin;

          // ─── SKUs / Variantes ───
          const skuRaw = details.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o;
          if (skuRaw) {
            const skuList: any[] = Array.isArray(skuRaw) ? skuRaw : [skuRaw];

            // Usar menor preço de venda como custo
            const prices = skuList
              .map((sku: any) => parseFloat(sku.offer_sale_price || sku.sku_price || '0'))
              .filter((p: number) => p > 0);
            if (prices.length > 0) {
              costPrice = Math.min(...prices);
            }

            // Construir array de variantes
            variants = skuList.map((sku: any) => {
              const propsRaw = sku.ae_sku_property_dtos?.ae_sku_property_d_t_o;
              const skuProps: any[] = propsRaw
                ? Array.isArray(propsRaw) ? propsRaw : [propsRaw]
                : [];

              return {
                skuId: sku.sku_id,
                price: parseFloat(sku.offer_sale_price || sku.sku_price || '0'),
                originalPrice: parseFloat(sku.sku_price || '0'),
                stock: sku.sku_available_stock ?? 9999,
                properties: skuProps.map((p: any) => ({
                  id: p.sku_property_id,
                  name: p.sku_property_name,
                  value: p.property_value_name,
                  image: p.sku_image || null
                }))
              };
            });
          }

          // ─── Propriedades / Atributos ───
          const propsRaw = details.ae_item_properties?.ae_item_property;
          if (propsRaw) {
            const propList: any[] = Array.isArray(propsRaw) ? propsRaw : [propsRaw];
            attributes = propList.map((p: any) => ({
              name: p.attr_name,
              value: p.attr_value
            }));

            // Extrair marca e modelo das propriedades
            for (const prop of attributes) {
              const nameLower = String(prop.name || '').toLowerCase();
              if (!brand && (nameLower.includes('brand') || nameLower.includes('marca'))) {
                brand = prop.value;
              }
              if (!model && (nameLower.includes('model') || nameLower.includes('modelo'))) {
                model = prop.value;
              }
            }

            // Adicionar atributos nas especificações
            specifications = {
              rating: product.rating,
              orders: product.orders,
              nicho: product.nicho,
              importedAt: new Date().toISOString(),
              attrs: attributes
            };
          }
        } else {
          console.warn(`⚠️ Sem detalhes para ${product.productId} — importando com dados básicos da busca`);
        }

        // Calcular preços com margem
        const margin = 0.5; // 50%
        const sellingPrice = costPrice * (1 + margin);
        const comparePrice = product.originalPrice
          ? product.originalPrice * (1 + margin)
          : sellingPrice * 1.2;

        // Criar produto com dados completos
        await prisma.product.create({
          data: {
            name,
            slug: generateSlug(name),
            description,
            price: parseFloat(sellingPrice.toFixed(2)),
            comparePrice: parseFloat(comparePrice.toFixed(2)),
            costPrice: parseFloat(costPrice.toFixed(2)),
            images: allImages,
            stock: 9999, // Dropshipping — sem controle de estoque
            categoryId: defaultCategory.id,
            supplierId,
            supplierSku: `ali_${product.productId}`,
            supplierUrl: `https://www.aliexpress.com/item/${product.productId}.html`,
            active,
            isDropshipping: true,
            availableForDropship: true,
            featured: false,
            specifications: JSON.stringify(specifications),
            variants: variants.length > 0 ? JSON.stringify(variants) : null,
            attributes: attributes.length > 0 ? JSON.stringify(attributes) : null,
            brand,
            model,
            weight,
            weightWithPackage,
            height,
            heightWithPackage,
            width,
            widthWithPackage,
            length,
            lengthWithPackage,
            shipFromCountry,
            shippingCost: 0,
            taxCost: 0,
            totalCost: parseFloat(costPrice.toFixed(2)),
            margin: margin * 100
          }
        });

        console.log(`✅ Importado [${variants.length} variantes, ${attributes.length} atributos]: ${name.substring(0, 50)}...`);
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
