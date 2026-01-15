import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkKey() {
  try {
    const apiKeys = await prisma.systemConfig.findMany({
      where: {
        OR: [
          { key: { contains: 'api' } },
          { key: { contains: 'analytics' } }
        ]
      }
    })

    console.log('🔑 API Keys encontradas:', apiKeys)

    if (apiKeys.length === 0) {
      console.log('\n⚠️  Nenhuma chave encontrada. Vou criar uma...')
      
      const newKey = await prisma.systemConfig.create({
        data: {
          key: 'analytics.api_key',
          value: crypto.randomUUID(),
          category: 'api',
          label: 'Analytics API Key',
          description: 'Chave de autenticação para API de Analytics',
          type: 'text'
        }
      })

      console.log('✅ Chave criada:', newKey)
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkKey()
