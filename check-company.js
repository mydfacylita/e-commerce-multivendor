const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    const company = await prisma.companySettings.findFirst()
    console.log('CompanySettings:')
    console.log(JSON.stringify(company, null, 2))
    
    // Buscar logo
    const logoConfig = await prisma.systemConfig.findMany({
      where: { key: { contains: 'logo' } }
    })
    console.log('\nLogos:')
    console.log(JSON.stringify(logoConfig, null, 2))
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
