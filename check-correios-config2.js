const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function check() {
  const config = await p.systemConfig.findFirst({
    where: { key: 'correios.config' }
  })
  
  console.log('Configuração atual dos Correios:')
  console.log(config)
  
  if (config?.value) {
    console.log('\nValor parseado:')
    console.log(JSON.parse(config.value))
  }
  
  await p.$disconnect()
}

check()
