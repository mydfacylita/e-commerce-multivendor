const Imap = require('imap');
const { simpleParser } = require('mailparser');

const imapConfig = {
  user: 'contato',
  password: '@Misael131189',
  host: 'mail.mydsistemas.com.br',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
};

console.log('Conectando ao IMAP...');

const imap = new Imap(imapConfig);

imap.once('ready', () => {
  console.log('✅ Conectado!');
  
  imap.openBox('INBOX', true, (err, box) => {
    if (err) {
      console.error('Erro:', err);
      imap.end();
      return;
    }
    
    console.log(`📧 Total de mensagens: ${box.messages.total}`);
    console.log('');
    
    if (!box.messages.total) {
      imap.end();
      return;
    }
    
    // Buscar TODOS os emails
    const f = imap.seq.fetch('1:*', {
      bodies: '',
      struct: true
    });
    
    let count = 0;
    
    f.on('message', (msg, seqno) => {
      let buffer = '';
      
      msg.on('body', (stream) => {
        stream.on('data', (chunk) => {
          buffer += chunk.toString('utf8');
        });
      });
      
      msg.once('end', async () => {
        count++;
        try {
          const parsed = await simpleParser(buffer);
          const from = parsed.from?.value?.[0]?.name || parsed.from?.text || 'Desconhecido';
          const subject = parsed.subject || '(Sem assunto)';
          const date = parsed.date?.toLocaleDateString('pt-BR') || '';
          
          console.log(`${count}. [${date}] ${from}`);
          console.log(`   📝 ${subject}`);
          console.log('');
        } catch (e) {
          console.log(`${count}. Erro ao parsear email #${seqno}`);
        }
      });
    });
    
    f.once('end', () => {
      console.log(`\n✅ Total listado: ${count} emails`);
      imap.end();
    });
  });
});

imap.once('error', (err) => {
  console.error('❌ Erro:', err.message);
});

imap.connect();
