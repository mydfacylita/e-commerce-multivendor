const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const apiKey = await prisma.systemConfig.findFirst({
    where: { key: 'app.api.key' }
  })
  console.log('API Key no banco:', apiKey)
}

main().finally(() => prisma.$disconnect())