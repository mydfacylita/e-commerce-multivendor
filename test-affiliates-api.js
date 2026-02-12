const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testAffiliates() {
  try {
    console.log('🔍 Buscando afiliados...\n')
    
    const affiliates = await prisma.affiliate.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            sales: true,
            clicks: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`✅ Encontrados ${affiliates.length} afiliado(s):`)
    console.log(JSON.stringify(affiliates, null, 2))

    const stats = await prisma.affiliate.aggregate({
      _count: {
        id: true
      },
      _sum: {
        totalSales: true,
        totalCommission: true,
        totalWithdrawn: true
      }
    })

    console.log('\n📊 Estatísticas:')
    console.log(JSON.stringify(stats, null, 2))

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAffiliates()
