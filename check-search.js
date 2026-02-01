const mysql = require('mysql2/promise');

async function checkSearch() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ecommerce'
  });

  // Buscar por maquiagem
  const [rows] = await conn.execute(`
    SELECT p.id, p.name, p.active, c.name as categoria 
    FROM Product p 
    LEFT JOIN Category c ON p.categoryId = c.id 
    WHERE p.name LIKE '%maquiagem%' 
       OR p.description LIKE '%maquiagem%' 
       OR c.name LIKE '%maquiagem%'
    LIMIT 10
  `);
  
  console.log('Produtos com maquiagem:', rows.length);
  console.log(JSON.stringify(rows, null, 2));

  // Verificar categorias com maquiagem
  const [cats] = await conn.execute(`
    SELECT id, name, parentId FROM Category WHERE name LIKE '%maquiagem%'
  `);
  console.log('\nCategorias com maquiagem:', cats);

  await conn.end();
}

checkSearch().catch(console.error);
