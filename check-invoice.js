const {PrismaClient} = require('@prisma/client')
const p = new PrismaClient()

p.invoice.findUnique({
  where: { id: 'cmkld7xpq000c1v8d30kjlmmm' }
}).then(i => {
  if (i) {
    console.log('Invoice:', JSON.stringify({
      id: i.id,
      status: i.status,
      xmlUrl: i.xmlUrl,
      accessKey: i.accessKey,
      invoiceNumber: i.invoiceNumber
    }, null, 2))
  } else {
    console.log('Invoice não encontrada')
  }
  p.$disconnect()
})
