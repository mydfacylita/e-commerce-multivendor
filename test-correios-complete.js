/**
 * Script de Teste Completo - Correios CWS Integration
 * 
 * Testa todo o fluxo:
 * 1. Autenticação
 * 2. Criação de Pré-Postagem
 * 3. Geração de Etiqueta PDF (assíncrono)
 * 
 * Uso: node test-correios-complete.js
 */

const fs = require('fs');

// Configurações
const BASE_URL = 'https://api.correios.com.br';
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ecommerce'
};

// Buscar credenciais do banco
async function getCredentials() {
  const mysql = require('mysql2/promise');
  const conn = await mysql.createConnection(DB_CONFIG);
  
  const [rows] = await conn.execute(`
    SELECT \`key\`, \`value\` FROM systemconfig 
    WHERE \`key\` LIKE 'correios.%'
  `);
  
  await conn.end();
  
  const config = {};
  rows.forEach(row => {
    const key = row.key.replace('correios.', '');
    config[key] = row.value;
  });
  
  return config;
}

// Obter token de autenticação
async function getToken(credentials) {
  console.log('\n📡 Obtendo token de autenticação...');
  
  const auth = Buffer.from(`${credentials.usuario}:${credentials.codigoAcesso}`).toString('base64');
  
  const response = await fetch(`${BASE_URL}/token/v1/autentica/cartaopostagem`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ numero: credentials.cartaoPostagem })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao obter token: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  console.log('✅ Token obtido com sucesso!');
  
  return data.token;
}

// Criar pré-postagem
async function criarPrePostagem(token, cepOrigem) {
  console.log('\n📦 Criando pré-postagem...');
  
  const payload = {
    remetente: {
      nome: 'Loja Teste E-commerce',
      cpfCnpj: '24223868000119',
      endereco: {
        cep: cepOrigem.replace(/\D/g, ''),
        logradouro: 'Rua Teste',
        numero: '100',
        complemento: 'Sala 1',
        bairro: 'Centro',
        cidade: 'São Luís',
        uf: 'MA'
      }
    },
    destinatario: {
      nome: 'Cliente Teste',
      cpfCnpj: '12345678909',
      endereco: {
        cep: '01310100',
        logradouro: 'Avenida Paulista',
        numero: '1000',
        complemento: 'Apto 101',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        uf: 'SP',
        regiao: 'Sudeste'
      }
    },
    codigoServico: '03298', // PAC
    pesoInformado: '500',
    codigoFormatoObjetoInformado: '2',
    alturaInformada: '10',
    larguraInformada: '15',
    comprimentoInformado: '20',
    itensDeclaracaoConteudo: [{
      conteudo: 'Produto E-commerce Teste',
      quantidade: '1',
      valor: '99.90'
    }],
    cienteObjetoNaoProibido: '1'
    // Nota: Serviço adicional 019 (valor declarado) precisa estar vinculado ao contrato
  };
  
  const response = await fetch(`${BASE_URL}/prepostagem/v1/prepostagens`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao criar pré-postagem: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  console.log('✅ Pré-postagem criada!');
  console.log(`   Código de Rastreio: ${data.codigoObjeto}`);
  console.log(`   ID Pré-postagem: ${data.id}`);
  
  return data;
}

// Solicitar rótulo (async)
async function solicitarRotulo(token, idPrePostagem) {
  console.log('\n🏷️  Solicitando geração do rótulo...');
  
  const response = await fetch(`${BASE_URL}/prepostagem/v1/prepostagens/rotulo/assincrono/pdf`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      idsPrePostagem: [idPrePostagem],
      tipoRotulo: 'P',
      formatoRotulo: 'ET'
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao solicitar rótulo: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  console.log('✅ Rótulo solicitado!');
  console.log(`   ID Recibo: ${data.idRecibo}`);
  
  return data.idRecibo;
}

// Baixar rótulo PDF
async function baixarRotulo(token, idRecibo) {
  console.log('\n⬇️  Baixando PDF do rótulo...');
  
  // Aguardar processamento
  console.log('   Aguardando processamento (3s)...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const response = await fetch(`${BASE_URL}/prepostagem/v1/prepostagens/rotulo/download/assincrono/${idRecibo}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao baixar rótulo: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  
  if (!data.dados) {
    throw new Error('Resposta não contém dados do PDF');
  }
  
  const pdfBuffer = Buffer.from(data.dados, 'base64');
  console.log('✅ PDF baixado com sucesso!');
  console.log(`   Tamanho: ${pdfBuffer.length} bytes`);
  
  return pdfBuffer;
}

// Executar teste completo
async function runTest() {
  console.log('═══════════════════════════════════════════════════');
  console.log('    TESTE COMPLETO - CORREIOS CWS INTEGRATION');
  console.log('═══════════════════════════════════════════════════');
  
  try {
    // 1. Obter credenciais
    console.log('\n🔐 Carregando credenciais...');
    const credentials = await getCredentials();
    console.log('   Usuario:', credentials.usuario);
    console.log('   Cartão Postagem:', credentials.cartaoPostagem);
    console.log('   CEP Origem:', credentials.cepOrigem);
    
    // 2. Autenticar
    const token = await getToken(credentials);
    
    // 3. Criar pré-postagem
    const prePostagem = await criarPrePostagem(token, credentials.cepOrigem);
    
    // 4. Solicitar rótulo
    const idRecibo = await solicitarRotulo(token, prePostagem.id);
    
    // 5. Baixar PDF
    const pdfBuffer = await baixarRotulo(token, idRecibo);
    
    // 6. Salvar PDF
    const filename = `etiqueta-${prePostagem.codigoObjeto}.pdf`;
    fs.writeFileSync(filename, pdfBuffer);
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('    ✅ TESTE COMPLETO - SUCESSO!');
    console.log('═══════════════════════════════════════════════════');
    console.log(`\n📄 Etiqueta salva em: ${filename}`);
    console.log(`📬 Código de Rastreio: ${prePostagem.codigoObjeto}`);
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runTest();
