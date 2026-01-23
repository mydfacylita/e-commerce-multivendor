const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Buscar cupom
  const cupom = await prisma.coupon.findFirst({
    where: { code: 'MYD2025JO' },
    include: {
      usages: true,
      _count: { select: { usages: true } }
    }
  })
  
  console.log('\n=== CUPOM NO BANCO ===')
  console.log('Código:', cupom?.code)
  console.log('usageCount (campo no banco):', cupom?.usageCount)
  console.log('_count.usages (registros reais):', cupom?._count?.usages)
  console.log('maxUses:', cupom?.maxUses)
  console.log('isActive:', cupom?.isActive)
  console.log('validUntil:', cupom?.validUntil)
  
  console.log('\n=== REGISTROS DE USO (CouponUsage) ===')
  if (cupom?.usages && cupom.usages.length > 0) {
    cupom.usages.forEach((u, i) => {
      console.log(`${i+1}. orderId: ${u.orderId}, userId: ${u.userId}, data: ${u.usedAt}`)
    })
  } else {
    console.log('Nenhum registro de uso encontrado')
  }
  
  // Verificar lógica do status
  console.log('\n=== ANÁLISE DO STATUS ===')
  const now = new Date()
  
  if (!cupom?.isActive) {
    console.log('Status: INATIVO (isActive = false)')
  } else if (cupom?.validUntil && new Date(cupom.validUntil) < now) {
    console.log('Status: EXPIRADO (validUntil < agora)')
  } else if (cupom?.maxUses && cupom?.usageCount >= cupom?.maxUses) {
    console.log('Status: ESGOTADO (usageCount >= maxUses)')
    console.log(`  -> usageCount (${cupom.usageCount}) >= maxUses (${cupom.maxUses})`)
  } else {
    console.log('Status: ATIVO')
  }
  
  await prisma.$disconnect()
}

main()
