// Script para corrigir o produto existente buscando dados da API
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixProduct() {
  const productId = '1005008496972052';
  
  // Buscar produto atual
  const product = await prisma.product.findFirst({
    where: { supplierSku: productId }
  });

  if (!product) {
    console.log('Produto não encontrado');
    return;
  }

  console.log('Produto encontrado:', product.id);
  console.log('Buscando dados da API AliExpress...');

  // Buscar dados frescos da API
  const apiResponse = await fetch('http://localhost:3000/api/admin/integrations/aliexpress/test-product', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId })
  });

  const data = await apiResponse.json();
  
  if (!data.found || !data.data?.aliexpress_ds_product_get_response?.result) {
    console.log('Produto não encontrado na API');
    return;
  }

  const result = data.data.aliexpress_ds_product_get_response.result;
  const skuList = result.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o || [];
  const skus = Array.isArray(skuList) ? skuList : [skuList];

  console.log('SKUs encontrados:', skus.length);

  // Reconstruir variações com properties corretas
  const variationsMap = {};
  
  for (const sku of skus) {
    if (sku.ae_sku_property_dtos?.ae_sku_property_d_t_o) {
      const props = sku.ae_sku_property_dtos.ae_sku_property_d_t_o;
      const propList = Array.isArray(props) ? props : [props];
      for (const prop of propList) {
        const propId = String(prop.sku_property_id || '');
        const propName = prop.sku_property_name || 'Opção';
        const optionId = String(prop.property_value_id || prop.property_value_id_long || '');
        const optionValue = prop.property_value_definition_name || prop.sku_property_value || '';
        const optionImage = prop.sku_image || sku.sku_image;
        
        if (!variationsMap[propName]) {
          variationsMap[propName] = { id: propId, name: propName, options: new Map() };
        }
        if (optionValue && !variationsMap[propName].options.has(optionId)) {
          variationsMap[propName].options.set(optionId, { 
            id: optionId, 
            value: optionValue,
            image: optionImage ? (optionImage.startsWith('http') ? optionImage : `https:${optionImage}`) : null
          });
        }
      }
    }
  }

  const variationOptions = Object.entries(variationsMap).map(([type, data]) => ({
    type, 
    id: data.id,
    optionsWithIds: Array.from(data.options.values())
  }));

  // Construir SKUs com properties
  const variations = skus.map(sku => {
    const skuProperties = [];
    if (sku.ae_sku_property_dtos?.ae_sku_property_d_t_o) {
      const props = sku.ae_sku_property_dtos.ae_sku_property_d_t_o;
      const propList = Array.isArray(props) ? props : [props];
      for (const prop of propList) {
        skuProperties.push({
          propertyId: String(prop.sku_property_id || ''),
          propertyName: prop.sku_property_name || '',
          optionId: String(prop.property_value_id || prop.property_value_id_long || ''),
          optionValue: prop.sku_property_value || '',
          optionLabel: prop.property_value_definition_name || prop.sku_property_value || ''
        });
      }
    }

    return {
      skuId: sku.sku_id,
      skuAttr: sku.sku_attr,
      price: parseFloat(sku.offer_sale_price || sku.sku_price) || 0,
      originalPrice: parseFloat(sku.sku_price) || 0,
      stock: sku.sku_available_stock || (sku.sku_stock ? 999 : 0),
      image: sku.sku_image ? (sku.sku_image.startsWith('http') ? sku.sku_image : `https:${sku.sku_image}`) : null,
      properties: skuProperties
    };
  });

  // Nova estrutura de variants
  const newVariants = {
    version: '1.0',
    source: 'aliexpress',
    sourceProductId: productId,
    lastUpdated: new Date().toISOString(),
    properties: variationOptions.map(opt => ({
      id: opt.id,
      name: opt.type.toLowerCase(),
      type: opt.type.toLowerCase().includes('cor') || opt.type.toLowerCase().includes('color') ? 'color' : 
            opt.type.toLowerCase().includes('tamanho') || opt.type.toLowerCase().includes('size') ? 'size' : 'other',
      options: opt.optionsWithIds.map(o => ({
        id: o.id,
        value: o.value,
        label: o.value,
        image: o.image
      }))
    })),
    skus: variations.map(v => ({
      skuId: v.skuId,
      skuAttr: v.skuAttr,
      price: v.price,
      originalPrice: v.originalPrice,
      stock: v.stock,
      available: v.stock > 0,
      image: v.image,
      properties: v.properties
    })),
    metadata: {
      currency: 'BRL',
      minPrice: Math.min(...variations.map(v => v.price)),
      maxPrice: Math.max(...variations.map(v => v.price)),
      totalStock: variations.reduce((sum, v) => sum + v.stock, 0),
      hasImages: variations.some(v => v.image)
    }
  };

  // Novo selectedSkus
  const newSelectedSkus = variations.map(v => ({
    skuId: v.skuId,
    enabled: true,
    customPrice: Math.round(v.price * 1.5 * 100) / 100,
    margin: 50,
    costPrice: v.price
  }));

  console.log('\n=== NOVA ESTRUTURA ===');
  console.log('Properties:', variationOptions.length);
  console.log('SKUs com properties preenchidas:', variations.filter(v => v.properties.length > 0).length);
  console.log('\nPrimeiro SKU novo:', JSON.stringify(newVariants.skus[0], null, 2));

  // Atualizar no banco
  await prisma.product.update({
    where: { id: product.id },
    data: {
      variants: JSON.stringify(newVariants),
      selectedSkus: JSON.stringify(newSelectedSkus)
    }
  });

  console.log('\n✅ Produto atualizado com sucesso!');
  await prisma.$disconnect();
}

fixProduct().catch(console.error);
