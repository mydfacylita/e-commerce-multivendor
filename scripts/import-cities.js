/**
 * Script para importar todas as cidades do Brasil via API do IBGE
 * Executa: node scripts/import-cities.js
 */

const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ecommerce',
  charset: 'utf8mb4'
};

// Lista de estados com acentuação correta
const ESTADOS = [
  { name: 'Acre', uf: 'AC', ibge: 12 },
  { name: 'Alagoas', uf: 'AL', ibge: 27 },
  { name: 'Amapá', uf: 'AP', ibge: 16 },
  { name: 'Amazonas', uf: 'AM', ibge: 13 },
  { name: 'Bahia', uf: 'BA', ibge: 29 },
  { name: 'Ceará', uf: 'CE', ibge: 23 },
  { name: 'Distrito Federal', uf: 'DF', ibge: 53 },
  { name: 'Espírito Santo', uf: 'ES', ibge: 32 },
  { name: 'Goiás', uf: 'GO', ibge: 52 },
  { name: 'Maranhão', uf: 'MA', ibge: 21 },
  { name: 'Mato Grosso', uf: 'MT', ibge: 51 },
  { name: 'Mato Grosso do Sul', uf: 'MS', ibge: 50 },
  { name: 'Minas Gerais', uf: 'MG', ibge: 31 },
  { name: 'Pará', uf: 'PA', ibge: 15 },
  { name: 'Paraíba', uf: 'PB', ibge: 25 },
  { name: 'Paraná', uf: 'PR', ibge: 41 },
  { name: 'Pernambuco', uf: 'PE', ibge: 26 },
  { name: 'Piauí', uf: 'PI', ibge: 22 },
  { name: 'Rio de Janeiro', uf: 'RJ', ibge: 33 },
  { name: 'Rio Grande do Norte', uf: 'RN', ibge: 24 },
  { name: 'Rio Grande do Sul', uf: 'RS', ibge: 43 },
  { name: 'Rondônia', uf: 'RO', ibge: 11 },
  { name: 'Roraima', uf: 'RR', ibge: 14 },
  { name: 'Santa Catarina', uf: 'SC', ibge: 42 },
  { name: 'São Paulo', uf: 'SP', ibge: 35 },
  { name: 'Sergipe', uf: 'SE', ibge: 28 },
  { name: 'Tocantins', uf: 'TO', ibge: 17 }
];

async function importCities() {
  console.log('🏙️  Importando estados e cidades do Brasil...\n');
  
  const conn = await mysql.createConnection(DB_CONFIG);
  
  // Garantir UTF-8
  await conn.execute("SET NAMES 'utf8mb4'");
  await conn.execute("SET CHARACTER SET utf8mb4");
  
  try {
    // Inserir estados
    console.log('📍 Inserindo 27 estados...');
    for (const estado of ESTADOS) {
      await conn.execute(
        'INSERT INTO states (name, uf, ibgeCode) VALUES (?, ?, ?)',
        [estado.name, estado.uf, estado.ibge]
      );
    }
    console.log('✅ Estados inseridos!\n');
    
    // Buscar estados do banco para pegar os IDs
    const [states] = await conn.execute('SELECT id, uf, ibgeCode FROM states ORDER BY uf');
    
    let totalCities = 0;
    
    for (const state of states) {
      process.stdout.write(`🔄 ${state.uf}... `);
      
      // API do IBGE
      const response = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state.ibgeCode}/municipios`
      );
      
      if (!response.ok) {
        console.log(`❌ Erro ${response.status}`);
        continue;
      }
      
      const cities = await response.json();
      
      // Inserir cidades em lote
      for (const city of cities) {
        await conn.execute(
          'INSERT IGNORE INTO cities (name, stateId, ibgeCode) VALUES (?, ?, ?)',
          [city.nome, state.id, city.id]
        );
      }
      
      console.log(`${cities.length} cidades`);
      totalCities += cities.length;
    }
    
    console.log(`\n════════════════════════════════════════`);
    console.log(`✅ Importação concluída! ${totalCities} cidades`);
    console.log(`════════════════════════════════════════\n`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await conn.end();
  }
}

importCities();
