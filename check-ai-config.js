const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ecommerce'
  });
  
  const [rows] = await conn.query("SELECT * FROM SystemConfig WHERE `key` = 'ai_config'");
  
  if (rows.length > 0) {
    console.log('Configuração encontrada:');
    console.log(rows[0].value);
    try {
      const config = JSON.parse(rows[0].value);
      console.log('\nParsed:');
      console.log('Provider:', config.provider);
      console.log('API Key:', config.apiKey ? config.apiKey.substring(0, 10) + '...' : 'Não definida');
      console.log('Enabled:', config.enabled);
    } catch (e) {
      console.log('Erro ao parsear:', e);
    }
  } else {
    console.log('Configuração não encontrada');
  }
  
  conn.end();
})();
