const mysql = require('mysql2/promise');

async function test() {
  const conn = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'ecommerce' });
  
  // Simular o que o código faz
  const [items] = await conn.execute(`
    SELECT oi.supplierSkuId, p.variants, p.selectedSkus, p.supplierSku
    FROM orderitem oi
    JOIN product p ON oi.productId = p.id
    WHERE oi.supplierSkuId IS NOT NULL
    LIMIT 1
  `);
  
  if (items.length === 0) {
    console.log('Nenhum item com supplierSkuId encontrado');
    await conn.end();
    return;
  }
  
  const item = items[0];
  const skuId = item.supplierSkuId;
  console.log('skuId:', skuId);
  console.log('productId (supplierSku):', item.supplierSku);
  
  // Buscar em variants
  const variants = JSON.parse(item.variants);
  if (variants?.skus) {
    const matched = variants.skus.find(s => s.skuId === skuId);
    console.log('\nEncontrado em variants.skus:');
    console.log('  skuAttr:', matched ? matched.skuAttr : 'NÃO ENCONTRADO');
  }
  
  await conn.end();
}

test().catch(console.error);
