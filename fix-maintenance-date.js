const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixMaintenanceDate() {
  try {
    // Buscar a data antiga
    const oldDate = await prisma.systemConfig.findUnique({
      where: { key: 'maintenance.estimatedTime' }
    })

    if (oldDate) {
      console.log(`📅 Data encontrada: ${oldDate.value}`)
      
      // Criar/atualizar com a chave correta
      await prisma.systemConfig.upsert({
        where: { key: 'app.maintenanceReturnDate' },
        create: {
          key: 'app.maintenanceReturnDate',
          value: oldDate.value,
          category: 'manutencao',
          label: 'Previsão de Retorno',
          description: 'Data e hora prevista para fim da manutenção'
        },
        update: {
          value: oldDate.value
        }
      })
      
      console.log('✅ Data migrada para app.maintenanceReturnDate')
    } else {
      console.log('⚠️ Data antiga não encontrada')
    }

    // Verificar resultado
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: ['app.maintenanceMode', 'app.maintenanceMessage', 'app.maintenanceReturnDate']
        }
      }
    })

    console.log('\n📊 Configurações atualizadas:\n')
    configs.forEach(config => {
      console.log(`   ${config.key}: "${config.value}"`)
    })

    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Erro:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

fixMaintenanceDate()
