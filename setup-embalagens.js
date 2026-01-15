// Script para cadastrar embalagens padrão
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const embalagensIniciais = [
  {
    code: 'A1',
    name: 'Envelope Pequeno',
    type: 'ENVELOPE',
    innerLength: 18,
    innerWidth: 12,
    innerHeight: 3,
    outerLength: 20,
    outerWidth: 14,
    outerHeight: 4,
    emptyWeight: 0.02,
    maxWeight: 0.5,
    cost: 0.50,
    isActive: true,
    priority: 10
  },
  {
    code: 'A2',
    name: 'Envelope Médio',
    type: 'ENVELOPE',
    innerLength: 28,
    innerWidth: 18,
    innerHeight: 4,
    outerLength: 30,
    outerWidth: 20,
    outerHeight: 5,
    emptyWeight: 0.03,
    maxWeight: 1,
    cost: 0.80,
    isActive: true,
    priority: 20
  },
  {
    code: 'B1',
    name: 'Caixa Pequena',
    type: 'BOX',
    innerLength: 18,
    innerWidth: 13,
    innerHeight: 8,
    outerLength: 20,
    outerWidth: 15,
    outerHeight: 10,
    emptyWeight: 0.1,
    maxWeight: 2,
    cost: 1.50,
    isActive: true,
    priority: 30
  },
  {
    code: 'B2',
    name: 'Caixa Média',
    type: 'BOX',
    innerLength: 28,
    innerWidth: 18,
    innerHeight: 13,
    outerLength: 30,
    outerWidth: 20,
    outerHeight: 15,
    emptyWeight: 0.15,
    maxWeight: 5,
    cost: 2.50,
    isActive: true,
    priority: 40
  },
  {
    code: 'B3',
    name: 'Caixa Grande',
    type: 'BOX',
    innerLength: 38,
    innerWidth: 28,
    innerHeight: 18,
    outerLength: 40,
    outerWidth: 30,
    outerHeight: 20,
    emptyWeight: 0.25,
    maxWeight: 10,
    cost: 4.00,
    isActive: true,
    priority: 50
  },
  {
    code: 'C1',
    name: 'Caixa Extra Grande',
    type: 'BOX',
    innerLength: 48,
    innerWidth: 38,
    innerHeight: 28,
    outerLength: 50,
    outerWidth: 40,
    outerHeight: 30,
    emptyWeight: 0.4,
    maxWeight: 20,
    cost: 6.00,
    isActive: true,
    priority: 60
  },
  {
    code: 'C2',
    name: 'Caixa Gigante',
    type: 'BOX',
    innerLength: 58,
    innerWidth: 48,
    innerHeight: 38,
    outerLength: 60,
    outerWidth: 50,
    outerHeight: 40,
    emptyWeight: 0.6,
    maxWeight: 30,
    cost: 10.00,
    isActive: true,
    priority: 70
  },
  {
    code: 'T1',
    name: 'Tubo Pequeno',
    type: 'TUBE',
    innerLength: 38,
    innerWidth: 8,
    innerHeight: 8,
    outerLength: 40,
    outerWidth: 10,
    outerHeight: 10,
    emptyWeight: 0.1,
    maxWeight: 3,
    cost: 2.00,
    isActive: true,
    priority: 35
  },
  {
    code: 'T2',
    name: 'Tubo Grande',
    type: 'TUBE',
    innerLength: 78,
    innerWidth: 13,
    innerHeight: 13,
    outerLength: 80,
    outerWidth: 15,
    outerHeight: 15,
    emptyWeight: 0.2,
    maxWeight: 5,
    cost: 4.00,
    isActive: true,
    priority: 45
  }
]

async function main() {
  console.log('📦 Cadastrando embalagens padrão...\n')

  for (const emb of embalagensIniciais) {
    try {
      const existente = await prisma.packagingBox.findUnique({
        where: { code: emb.code }
      })

      if (existente) {
        console.log(`⚠️  ${emb.code} já existe, atualizando...`)
        await prisma.packagingBox.update({
          where: { code: emb.code },
          data: emb
        })
        continue
      }

      await prisma.packagingBox.create({ data: emb })
      console.log(`✅ ${emb.code} - ${emb.name} (${emb.outerLength}x${emb.outerWidth}x${emb.outerHeight}cm)`)
    } catch (error) {
      console.error(`❌ Erro ao cadastrar ${emb.code}:`, error.message)
    }
  }

  console.log('\n🎉 Embalagens cadastradas com sucesso!')
  
  // Listar todas
  const todas = await prisma.packagingBox.findMany({
    orderBy: { code: 'asc' }
  })
  
  console.log('\n📋 Embalagens disponíveis:')
  console.log('═════════════════════════════════════════════════════════════════════')
  console.log('Código │ Nome                  │ Interna (cm)     │ Externa (cm)     │ Peso Máx')
  console.log('───────┼───────────────────────┼──────────────────┼──────────────────┼─────────')
  
  for (const e of todas) {
    const interna = `${e.innerLength}x${e.innerWidth}x${e.innerHeight}`.padEnd(16)
    const externa = `${e.outerLength}x${e.outerWidth}x${e.outerHeight}`.padEnd(16)
    const nome = e.name.substring(0, 21).padEnd(21)
    console.log(`  ${e.code.padEnd(4)} │ ${nome} │ ${interna} │ ${externa} │ ${e.maxWeight}kg`)
  }
  
  console.log('═════════════════════════════════════════════════════════════════════')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
