const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkMaintenanceConfig() {
  try {
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: ['app.maintenanceMode', 'app.maintenanceMessage', 'app.maintenanceReturnDate']
        }
      }
    })

    console.log('\n📊 Configurações de Manutenção no Banco:\n')
    configs.forEach(config => {
      console.log(`   ${config.key}: "${config.value}"`)
    })

    if (configs.length === 0) {
      console.log('   ⚠️ Nenhuma configuração encontrada!')
    }

    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Erro:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

checkMaintenanceConfig()
