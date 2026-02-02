const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ecommerce'
  });

  // Total de pedidos
  const [orders] = await conn.execute('SELECT COUNT(*) as total FROM `Order`');
  console.log('Total de pedidos:', orders[0].total);

  // Com endereço
  const [withAddr] = await conn.execute('SELECT COUNT(*) as total FROM `Order` WHERE shippingAddress IS NOT NULL');
  console.log('Com endereço:', withAddr[0].total);

  // Status dos pedidos
  const [stats] = await conn.execute('SELECT status, COUNT(*) as qty FROM `Order` GROUP BY status');
  console.log('\nStatus dos pedidos:');
  stats.forEach(s => console.log(`  ${s.status}: ${s.qty}`));

  // Exemplos de endereço
  const [sample] = await conn.execute('SELECT id, status, shippingAddress FROM `Order` WHERE shippingAddress IS NOT NULL LIMIT 3');
  console.log('\nExemplos de endereço:');
  sample.forEach(o => {
    console.log(`  ID: ${o.id}`);
    console.log(`  Status: ${o.status}`);
    console.log(`  Endereço: ${o.shippingAddress?.substring(0, 200)}`);
    console.log('---');
  });

  await conn.end();
}

main().catch(console.error);
