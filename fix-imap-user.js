const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function fix() {
  // Atualizar usuário IMAP para apenas "contato" (sem domínio)
  await p.systemConfig.upsert({
    where: { key: 'email.imapUser' },
    create: {
      key: 'email.imapUser',
      value: 'contato',
      category: 'email',
      label: 'IMAP Usuário',
      type: 'text'
    },
    update: { value: 'contato' }
  })
  
  console.log('Usuário IMAP atualizado para "contato"!')
  
  // Mostrar todas as configs de email
  const configs = await p.systemConfig.findMany({
    where: { key: { startsWith: 'email.' } }
  })
  
  console.log('\n📧 Configurações de E-mail:')
  configs.forEach(c => {
    const value = c.key.includes('Password') ? '****' : c.value
    console.log(`  ${c.key}: ${value}`)
  })
  
  await p.$disconnect()
}

fix()
