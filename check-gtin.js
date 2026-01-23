const { PrismaClient } = require('@prisma/client')

async function checkGtin() {
  const prisma = new PrismaClient()
  
  try {
    // Verificar última invoice e XML
    const invoice = await prisma.invoice.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true, xmlAssinado: true }
    })
    
    if (invoice && invoice.xmlAssinado) {
      const gtin = invoice.xmlAssinado.match(/<cEAN>([^<]+)<\/cEAN>/)
      const ncm = invoice.xmlAssinado.match(/<NCM>([^<]+)<\/NCM>/)
      console.log('=== Dados no XML da NF-e ===')
      console.log('cEAN (GTIN):', gtin ? gtin[1] : 'N/A')
      console.log('NCM:', ncm ? ncm[1] : 'N/A')
    }
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

checkGtin()
