const mysql = require('mysql2/promise');
const fs = require('fs');

async function exportCities() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ecommerce',
    charset: 'utf8mb4'
  });

  const [cities] = await connection.execute('SELECT id, name, stateId, ibgeCode FROM cities ORDER BY id');
  
  let sql = 'SET NAMES utf8mb4;\n';
  
  for (const city of cities) {
    const name = city.name.replace(/'/g, "''");
    sql += `INSERT INTO cities (id, name, stateId, ibgeCode) VALUES (${city.id}, '${name}', ${city.stateId}, ${city.ibgeCode});\n`;
  }

  fs.writeFileSync('cities-export.sql', sql, 'utf8');
  console.log(`Exported ${cities.length} cities`);
  
  await connection.end();
}

exportCities().catch(console.error);
