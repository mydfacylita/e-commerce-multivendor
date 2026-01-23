const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function fix() {
  // Atualizar usuário SMTP para email completo
  await p.systemConfig.update({
    where: { id: 'cmk8odo61001876h7hoy5d1s0' },
    data: { value: 'contato@mydsistemas.com.br' }
  })
  console.log('Usuário SMTP atualizado!')
  
  // Adicionar configuração IMAP
  await p.systemConfig.upsert({
    where: { key: 'email.imapHost' },
    create: {
      key: 'email.imapHost',
      value: 'mail.mydsistemas.com.br',
      category: 'email',
      label: 'IMAP Host',
      type: 'text'
    },
    update: { value: 'mail.mydsistemas.com.br' }
  })
  
  await p.systemConfig.upsert({
    where: { key: 'email.imapPort' },
    create: {
      key: 'email.imapPort',
      value: '993',
      category: 'email',
      label: 'IMAP Port',
      type: 'number'
    },
    update: { value: '993' }
  })
  
  await p.systemConfig.upsert({
    where: { key: 'email.imapUser' },
    create: {
      key: 'email.imapUser',
      value: 'contato@mydsistemas.com.br',
      category: 'email',
      label: 'IMAP Usuário',
      type: 'text'
    },
    update: { value: 'contato@mydsistemas.com.br' }
  })
  
  await p.systemConfig.upsert({
    where: { key: 'email.imapPassword' },
    create: {
      key: 'email.imapPassword',
      value: '@Misael131189',
      category: 'email',
      label: 'IMAP Senha',
      type: 'password'
    },
    update: { value: '@Misael131189' }
  })
  
  console.log('Configurações IMAP adicionadas!')
  
  await p.$disconnect()
}

fix()
