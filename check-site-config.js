const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const configs = await prisma.systemConfig.findMany({
    where: {
      key: {
        contains: 'site.'
      }
    }
  })
  
  console.log('=== Configurações do Site ===')
  configs.forEach(c => {
    console.log(`${c.key} = ${c.value}`)
  })
}

main().finally(() => prisma.$disconnect())
