const mysql = require('mysql2/promise');

async function check() {
  const conn = await mysql.createConnection({
    host: 'localhost', 
    user: 'root', 
    password: '', 
    database: 'ecommerce'
  });
  
  // Ver orders com supplierOrderId
  const [orders] = await conn.query(`
    SELECT o.id, o.supplierOrderId, o.status, o.trackingCode, 
           oi.id as itemId, oi.supplierStatus, oi.trackingCode as itemTracking
    FROM \`order\` o
    LEFT JOIN orderitem oi ON oi.orderId = o.id
    WHERE o.supplierOrderId IS NOT NULL
    LIMIT 5
  `);
  
  console.log('\n=== PEDIDOS COM SUPPLIER ORDER ID ===');
  orders.forEach(o => {
    console.log(`Order: ${o.id.slice(-10)}`);
    console.log(`  supplierOrderId: ${o.supplierOrderId}`);
    console.log(`  status: ${o.status}`);
    console.log(`  trackingCode: ${o.trackingCode || 'N/A'}`);
    console.log(`  Item supplierStatus: ${o.supplierStatus || 'N/A'}`);
    console.log('');
  });
  
  await conn.end();
}

check().catch(console.error);
