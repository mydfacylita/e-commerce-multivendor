const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ecommerce'
  });
  
  // Buscar produto da panela
  const [products] = await conn.execute(`
    SELECT id, name, supplierSku, selectedSkus, costPrice 
    FROM Product 
    WHERE supplierSku = '1005007517611251' 
       OR name LIKE '%Panela%Pressão%Electrolux%'
    LIMIT 5
  `);
  
  console.log('=== PRODUTOS ENCONTRADOS ===');
  products.forEach(p => {
    console.log('ID:', p.id);
    console.log('Nome:', p.name?.substring(0, 60));
    console.log('SupplierSku:', p.supplierSku);
    console.log('CostPrice:', p.costPrice);
    console.log('SelectedSkus:', p.selectedSkus ? p.selectedSkus.substring(0, 200) : 'null');
    console.log('---');
  });
  
  // Buscar pedidos recentes
  const [orders] = await conn.execute(`
    SELECT o.id, o.supplierOrderId, o.sentToSupplier, o.sentToSupplierAt,
           oi.supplierOrderId as itemSupplierOrderId, oi.supplierStatus
    FROM \`Order\` o
    LEFT JOIN OrderItem oi ON oi.orderId = o.id
    WHERE o.sentToSupplier = 1
    ORDER BY o.createdAt DESC
    LIMIT 5
  `);
  
  console.log('\n=== PEDIDOS ENVIADOS ===');
  orders.forEach(o => {
    console.log('OrderID:', o.id);
    console.log('  Order.supplierOrderId:', o.supplierOrderId);
    console.log('  Item.supplierOrderId:', o.itemSupplierOrderId);
    console.log('  Item.supplierStatus:', o.supplierStatus);
    console.log('---');
  });
  
  await conn.end();
}

main().catch(console.error);
