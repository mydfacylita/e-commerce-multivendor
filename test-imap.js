const Imap = require('imap');

// Configurações de teste - testar só com "contato"
const imapConfig = {
  user: 'contato',
  password: '@Misael131189',
  host: 'mail.mydsistemas.com.br',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
  authTimeout: 30000,
  connTimeout: 30000,
  debug: console.log
};

console.log('Tentando conectar ao IMAP...');
console.log('Host:', imapConfig.host);
console.log('Port:', imapConfig.port);
console.log('User:', imapConfig.user);

const imap = new Imap(imapConfig);

imap.once('ready', () => {
  console.log('✅ Conexão IMAP estabelecida com sucesso!');
  
  // Listar todas as pastas
  imap.getBoxes((err, boxes) => {
    if (err) {
      console.error('Erro ao listar pastas:', err);
    } else {
      console.log('📂 Pastas disponíveis:');
      console.log(JSON.stringify(boxes, null, 2));
    }
    
    imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error('Erro ao abrir INBOX:', err);
        imap.end();
        return;
      }
      
      console.log('📧 INBOX aberta! Total de mensagens:', box.messages.total);
      imap.end();
    });
  });
});

imap.once('error', (err) => {
  console.error('❌ Erro IMAP:', err.message);
  if (err.textCode) {
    console.error('Código:', err.textCode);
  }
  console.log('\n🔍 Possíveis soluções:');
  console.log('1. Verificar se a senha está correta');
  console.log('2. Verificar se o usuário está correto (pode ser só "contato" sem o domínio)');
  console.log('3. Verificar se o servidor permite acesso IMAP');
  console.log('4. Tentar porta 143 sem TLS');
});

imap.once('end', () => {
  console.log('Conexão finalizada');
});

imap.connect();
