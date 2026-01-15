const http = require('http');

const url = 'http://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx?nCdEmpresa=&sDsSenha=&sCepOrigem=65067380&sCepDestino=01310100&nVlPeso=0.5&nCdFormato=1&nVlComprimento=20&nVlAltura=10&nVlLargura=15&sCdMaoPropria=N&nVlValorDeclarado=0&sCdAvisoRecebimento=N&nCdServico=04510&nVlDiametro=0&StrRetorno=xml';

console.log('🚀 Testando conexão com Correios...');
console.log('URL:', url);
console.log('');

const startTime = Date.now();

const req = http.get(url, { timeout: 30000 }, (res) => {
  console.log('✅ Conexão estabelecida!');
  console.log('Status:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('');
    console.log('📦 Resposta completa:');
    console.log(data);
    console.log('');
    console.log(`⏱️ Tempo total: ${Date.now() - startTime}ms`);
  });
});

req.on('error', (e) => {
  console.log('❌ ERRO:', e.message);
  console.log('   Código:', e.code);
  console.log('   Causa:', e.cause);
  console.log('   Stack:', e.stack);
  console.log(`⏱️ Tempo até erro: ${Date.now() - startTime}ms`);
});

req.on('timeout', () => {
  console.log('⏰ TIMEOUT após', Date.now() - startTime, 'ms');
  req.destroy();
});

req.on('socket', (socket) => {
  console.log('🔌 Socket criado...');
  socket.on('connect', () => {
    console.log('🔗 Socket conectado!');
  });
});
