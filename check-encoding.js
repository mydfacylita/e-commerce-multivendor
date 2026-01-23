const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'ecommerce',
    charset: 'utf8mb4'
  });
  
  await conn.execute("SET NAMES 'utf8mb4'");
  
  const [rows] = await conn.execute('SELECT name, uf FROM states LIMIT 10');
  console.log('Estados:');
  rows.forEach(r => console.log(`  ${r.uf}: ${r.name}`));
  
  conn.end();
})();
