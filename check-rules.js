const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const rules = await p.shippingRule.findMany({ where: { isActive: true } })
  console.log(JSON.stringify(rules, null, 2))
}

main().finally(() => p.$disconnect())
