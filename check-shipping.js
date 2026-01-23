const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'ecommerce'
  });
  
  const [rows] = await conn.execute('SELECT shippingAddress FROM `order` ORDER BY createdAt DESC LIMIT 1');
  console.log('=== shippingAddress ===');
  console.log(rows[0].shippingAddress);
  console.log('\n=== Parsed ===');
  try {
    console.log(JSON.parse(rows[0].shippingAddress));
  } catch(e) {
    console.log('Não é JSON válido');
  }
  
  conn.end();
})();
