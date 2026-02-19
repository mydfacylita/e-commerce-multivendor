const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUser() {
  try {
    // Listar todos os usuários com suas roles
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    console.log('\n👥 Últimos usuários cadastrados:\n')
    users.forEach(user => {
      console.log(`📧 ${user.email}`)
      console.log(`   Nome: ${user.name}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   ID: ${user.id}`)
      console.log('')
    })

    // Contar por role
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
    const sellerCount = await prisma.user.count({ where: { role: 'SELLER' } })
    const userCount = await prisma.user.count({ where: { role: 'USER' } })

    console.log('\n📊 Resumo:')
    console.log(`   ADMIN: ${adminCount}`)
    console.log(`   SELLER: ${sellerCount}`)
    console.log(`   USER: ${userCount}`)

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUser()
