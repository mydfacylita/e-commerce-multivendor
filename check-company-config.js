const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function check() {
  // Verificar companySettings com novos campos
  const company = await p.companySettings.findFirst()
  console.log('CompanySettings:', JSON.stringify(company, null, 2))
  
  await p.$disconnect()
}

check()
