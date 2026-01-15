/**
 * Script para criar embalagens padrão no sistema
 */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const embalagensDefault = [
  {
    name: 'Envelope Pequeno',
    code: 'ENV-P',
    type: 'ENVELOPE',
    innerLength: 20,
    innerWidth: 15,
    innerHeight: 3,
    outerLength: 22,
    outerWidth: 17,
    outerHeight: 3,
    emptyWeight: 0.05,
    maxWeight: 1,
    cost: 0.50,
    priority: 10,
    isActive: true,
    isDefault: false
  },
  {
    name: 'Envelope Médio',
    code: 'ENV-M',
    type: 'ENVELOPE',
    innerLength: 30,
    innerWidth: 22,
    innerHeight: 5,
    outerLength: 32,
    outerWidth: 24,
    outerHeight: 5,
    emptyWeight: 0.08,
    maxWeight: 2,
    cost: 0.80,
    priority: 9,
    isActive: true,
    isDefault: false
  },
  {
    name: 'Caixa Mini',
    code: 'BOX-MINI',
    type: 'BOX',
    innerLength: 16,
    innerWidth: 11,
    innerHeight: 6,
    outerLength: 18,
    outerWidth: 13,
    outerHeight: 8,
    emptyWeight: 0.1,
    maxWeight: 3,
    cost: 1.00,
    priority: 8,
    isActive: true,
    isDefault: false
  },
  {
    name: 'Caixa Pequena',
    code: 'BOX-P',
    type: 'BOX',
    innerLength: 25,
    innerWidth: 18,
    innerHeight: 10,
    outerLength: 27,
    outerWidth: 20,
    outerHeight: 12,
    emptyWeight: 0.15,
    maxWeight: 5,
    cost: 1.50,
    priority: 7,
    isActive: true,
    isDefault: true
  },
  {
    name: 'Caixa Média',
    code: 'BOX-M',
    type: 'BOX',
    innerLength: 35,
    innerWidth: 25,
    innerHeight: 15,
    outerLength: 37,
    outerWidth: 27,
    outerHeight: 17,
    emptyWeight: 0.25,
    maxWeight: 10,
    cost: 2.50,
    priority: 6,
    isActive: true,
    isDefault: false
  },
  {
    name: 'Caixa Grande',
    code: 'BOX-G',
    type: 'BOX',
    innerLength: 50,
    innerWidth: 35,
    innerHeight: 25,
    outerLength: 52,
    outerWidth: 37,
    outerHeight: 27,
    emptyWeight: 0.4,
    maxWeight: 20,
    cost: 4.00,
    priority: 5,
    isActive: true,
    isDefault: false
  },
  {
    name: 'Caixa Extra Grande',
    code: 'BOX-XG',
    type: 'BOX',
    innerLength: 70,
    innerWidth: 50,
    innerHeight: 40,
    outerLength: 72,
    outerWidth: 52,
    outerHeight: 42,
    emptyWeight: 0.6,
    maxWeight: 30,
    cost: 6.00,
    priority: 4,
    isActive: true,
    isDefault: false
  },
  {
    name: 'Sacola Plástica P',
    code: 'BAG-P',
    type: 'BAG',
    innerLength: 30,
    innerWidth: 25,
    innerHeight: 40,
    outerLength: 30,
    outerWidth: 25,
    outerHeight: 40,
    emptyWeight: 0.03,
    maxWeight: 5,
    cost: 0.30,
    priority: 3,
    isActive: true,
    isDefault: false
  }
]

async function main() {
  console.log('📦 Criando embalagens padrão...\n')
  
  for (const emb of embalagensDefault) {
    try {
      // Verificar se já existe
      const existing = await prisma.packagingBox.findUnique({
        where: { code: emb.code }
      })

      if (existing) {
        console.log(`⏭️  ${emb.code} - ${emb.name} (já existe)`)
        continue
      }

      const maxVolume = emb.innerLength * emb.innerWidth * emb.innerHeight

      await prisma.packagingBox.create({
        data: {
          ...emb,
          maxVolume
        }
      })

      console.log(`✅ ${emb.code} - ${emb.name}`)
      console.log(`   Interno: ${emb.innerLength}x${emb.innerWidth}x${emb.innerHeight}cm`)
      console.log(`   Externo: ${emb.outerLength}x${emb.outerWidth}x${emb.outerHeight}cm`)
      console.log(`   Peso vazio: ${emb.emptyWeight}kg | Max: ${emb.maxWeight}kg`)
      console.log(`   Custo: R$ ${emb.cost.toFixed(2)}`)
      console.log('')
    } catch (error) {
      console.error(`❌ Erro ao criar ${emb.code}:`, error.message)
    }
  }

  // Listar todas as embalagens
  const total = await prisma.packagingBox.count()
  console.log(`\n📊 Total de embalagens no sistema: ${total}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
