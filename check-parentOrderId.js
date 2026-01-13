const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkField() {
  try {
    // Testar se o campo parentOrderId existe
    const result = await prisma.$queryRaw`
      SHOW COLUMNS FROM \`order\` LIKE 'parentOrderId'
    `
    
    console.log('Campo parentOrderId:', result.length > 0 ? '✅ JÁ EXISTE' : '❌ NÃO EXISTE')
    
    if (result.length === 0) {
      console.log('\n📝 Criando campo parentOrderId...')
      await prisma.$executeRaw`
        ALTER TABLE \`order\` 
        ADD COLUMN parentOrderId VARCHAR(191) NULL AFTER userId,
        ADD INDEX idx_parentOrderId (parentOrderId)
      `
      console.log('✅ Campo criado com sucesso!')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkField()
