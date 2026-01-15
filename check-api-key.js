const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function check() {
  const key = await p.systemConfig.findFirst({ where: { key: 'app.apiKey' } })
  console.log('app.apiKey:', key)
  await p.$disconnect()
}

check()
