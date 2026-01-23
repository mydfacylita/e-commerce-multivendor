/**
 * Script para limpar invoices duplicadas com status ERROR
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function cleanupDuplicateInvoices() {
  console.log('=== Limpeza de Invoices Duplicadas ===\n')
  
  try {
    // Buscar pedidos com múltiplas invoices
    const duplicates = await prisma.$queryRaw`
      SELECT orderId, COUNT(*) as total 
      FROM invoice 
      GROUP BY orderId 
      HAVING COUNT(*) > 1
    `
    
    if (duplicates.length === 0) {
      console.log('✅ Nenhuma invoice duplicada encontrada!')
      return
    }
    
    console.log(`Encontrados ${duplicates.length} pedidos com invoices duplicadas:\n`)
    
    for (const dup of duplicates) {
      console.log(`\n📦 Pedido: ${dup.orderId}`)
      
      // Buscar todas as invoices deste pedido
      const invoices = await prisma.invoice.findMany({
        where: { orderId: dup.orderId },
        orderBy: { createdAt: 'desc' } // Mais recente primeiro
      })
      
      console.log(`   Total de invoices: ${invoices.length}`)
      invoices.forEach((inv, idx) => {
        console.log(`   ${idx + 1}. ID: ${inv.id} | Status: ${inv.status} | Número: ${inv.invoiceNumber || 'N/A'} | Criado: ${inv.createdAt}`)
      })
      
      // Manter apenas a invoice mais recente que NÃO seja ERROR
      // Se todas forem ERROR, manter a mais recente
      const successInvoice = invoices.find(i => i.status !== 'ERROR')
      const toKeep = successInvoice || invoices[0]
      
      console.log(`   ✅ Mantendo: ${toKeep.id} (${toKeep.status})`)
      
      // Deletar as outras
      const toDelete = invoices.filter(i => i.id !== toKeep.id)
      
      for (const inv of toDelete) {
        console.log(`   🗑️  Deletando: ${inv.id} (${inv.status})`)
        await prisma.invoice.delete({
          where: { id: inv.id }
        })
      }
    }
    
    console.log('\n✅ Limpeza concluída com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupDuplicateInvoices()
