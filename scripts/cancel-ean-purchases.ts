/**
 * Script para cancelar todas as compras de EAN de um vendedor
 * - Cancela compras pagas e pendentes
 * - Remove códigos EAN gerados
 * - Atualiza produtos que usam esses códigos (remove GTIN)
 * - Estorna valores pagos para a conta do vendedor
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface PurchaseSummary {
  totalPurchases: number
  paidPurchases: number
  pendingPurchases: number
  freePurchases: number
  totalCodes: number
  productsAffected: number
  amountToRefund: number
}

async function cancelEANPurchases(sellerId: string): Promise<PurchaseSummary> {
  console.log(`\n🔄 Iniciando cancelamento de compras EAN para vendedor: ${sellerId}`)
  
  const summary: PurchaseSummary = {
    totalPurchases: 0,
    paidPurchases: 0,
    pendingPurchases: 0,
    freePurchases: 0,
    totalCodes: 0,
    productsAffected: 0,
    amountToRefund: 0
  }

  try {
    // 1. Buscar todas as compras do vendedor usando SQL direto
    console.log('\n📋 Buscando compras de EAN...')
    const purchases = await prisma.$queryRawUnsafe<any[]>(`
      SELECT ep.*, pkg.name as packageName, pkg.price as packagePrice
      FROM eanpurchase ep
      LEFT JOIN eanpackage pkg ON ep.packageId = pkg.id
      WHERE ep.sellerId = '${sellerId}'
    `)

    summary.totalPurchases = purchases.length
    console.log(`✅ Encontradas ${purchases.length} compras`)

    if (purchases.length === 0) {
      console.log('⚠️  Nenhuma compra encontrada para este vendedor')
      return summary
    }

    // Separar por status
    const paidPurchases = purchases.filter(p => p.status === 'PAID' || p.status === 'GENERATED')
    const pendingPurchases = purchases.filter(p => p.status === 'PENDING')
    
    summary.paidPurchases = paidPurchases.length
    summary.pendingPurchases = pendingPurchases.length
    summary.freePurchases = purchases.filter(p => Number(p.price) === 0).length

    console.log(`  - Pagas/Geradas: ${summary.paidPurchases}`)
    console.log(`  - Pendentes: ${summary.pendingPurchases}`)
    console.log(`  - Gratuitas: ${summary.freePurchases}`)

    // 2. Calcular valor total a estornar (apenas compras pagas)
    console.log('\n💰 Calculando valor do estorno...')
    for (const purchase of paidPurchases) {
      const price = Number(purchase.price)
      if (price > 0) {
        summary.amountToRefund += price
      }
    }
    console.log(`✅ Total a estornar: R$ ${summary.amountToRefund.toFixed(2)}`)

    // 3. Buscar todos os códigos EAN do vendedor usando SQL direto
    console.log('\n🔢 Buscando códigos EAN gerados...')
    const codes = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM eancode WHERE sellerId = '${sellerId}'
    `)
    summary.totalCodes = codes.length
    console.log(`✅ Encontrados ${codes.length} códigos`)

    // 4. Buscar produtos que usam esses códigos usando SQL direto
    console.log('\n📦 Buscando produtos afetados...')
    const codesArray = codes.map(c => c.code)
    const products = codesArray.length > 0 ? await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM product 
      WHERE gtin IN (${codesArray.map(c => `'${c}'`).join(',')})
      AND sellerId = '${sellerId}'
    `) : []
    summary.productsAffected = products.length
    console.log(`✅ Encontrados ${products.length} produtos usando esses códigos`)

    // 5. Executar transação para cancelar tudo
    console.log('\n🔄 Executando transação de cancelamento...')
    
    await prisma.$transaction(async (tx) => {
      // 5.1. Atualizar produtos (remover GTIN) usando SQL direto
      if (products.length > 0) {
        console.log('  ⏳ Removendo GTIN dos produtos...')
        await tx.$executeRawUnsafe(`
          UPDATE product SET gtin = NULL 
          WHERE gtin IN (${codesArray.map(c => `'${c}'`).join(',')}) 
          AND sellerId = '${sellerId}'
        `)
        console.log(`  ✅ ${products.length} produtos atualizados`)
      }

      // 5.2. Deletar códigos EAN usando SQL direto
      if (codes.length > 0) {
        console.log('  ⏳ Deletando códigos EAN...')
        await tx.$executeRawUnsafe(`DELETE FROM eancode WHERE sellerId = '${sellerId}'`)
        console.log(`  ✅ ${codes.length} códigos deletados`)
      }

      // 5.3. Deletar compras EAN usando SQL direto
      console.log('  ⏳ Deletando compras de EAN...')
      await tx.$executeRawUnsafe(`DELETE FROM eanpurchase WHERE sellerId = '${sellerId}'`)
      console.log(`  ✅ ${purchases.length} compras deletadas`)

      // 5.4. Estornar valor para o vendedor (se houver)
      if (summary.amountToRefund > 0) {
        console.log('  ⏳ Estornando valor para o vendedor...')
        
        // Buscar saldo atual
        const seller = await tx.seller.findUnique({
          where: { id: sellerId }
        })

        if (!seller) {
          throw new Error('Vendedor não encontrado')
        }

        const currentBalance = Number(seller.balance)
        const newBalance = currentBalance + summary.amountToRefund

        // Atualizar saldo
        await tx.seller.update({
          where: { id: sellerId },
          data: {
            balance: newBalance
          }
        })

        console.log(`  ✅ Estorno realizado: R$ ${summary.amountToRefund.toFixed(2)}`)
        console.log(`     Saldo anterior: R$ ${currentBalance.toFixed(2)}`)
        console.log(`     Saldo atual: R$ ${newBalance.toFixed(2)}`)
      }
    })

    console.log('\n✅ Transação concluída com sucesso!')
    
  } catch (error) {
    console.error('\n❌ Erro ao cancelar compras:', error)
    throw error
  }

  return summary
}

async function main() {
  const sellerId = process.argv[2]

  if (!sellerId) {
    console.error('❌ Erro: ID do vendedor não fornecido')
    console.log('\nUso: npx tsx scripts/cancel-ean-purchases.ts <SELLER_ID>')
    console.log('Exemplo: npx tsx scripts/cancel-ean-purchases.ts cmk4hal6j0009cxgjq662ziwc')
    process.exit(1)
  }

  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║     CANCELAMENTO DE COMPRAS EAN - SCRIPT DE ESTORNO       ║')
  console.log('╚════════════════════════════════════════════════════════════╝')

  try {
    // Verificar se o vendedor existe
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      include: { user: true }
    })

    if (!seller) {
      console.error(`❌ Vendedor não encontrado: ${sellerId}`)
      process.exit(1)
    }

    console.log(`\n👤 Vendedor: ${seller.storeName || seller.user.name}`)
    console.log(`📧 Email: ${seller.user.email}`)
    console.log(`💰 Saldo atual: R$ ${Number(seller.balance).toFixed(2)}`)

    // Confirmar ação
    console.log('\n⚠️  ATENÇÃO: Esta ação irá:')
    console.log('   1. Cancelar todas as compras de EAN (pagas e pendentes)')
    console.log('   2. Deletar todos os códigos EAN gerados')
    console.log('   3. Remover códigos EAN dos produtos que os utilizam')
    console.log('   4. Estornar valores pagos para a conta do vendedor')
    console.log('\n⏳ Aguarde 5 segundos antes de continuar...\n')

    await new Promise(resolve => setTimeout(resolve, 5000))

    // Executar cancelamento
    const summary = await cancelEANPurchases(sellerId)

    // Exibir resumo final
    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║                    RESUMO DO CANCELAMENTO                  ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log(`\n📊 Compras processadas:`)
    console.log(`   - Total: ${summary.totalPurchases}`)
    console.log(`   - Pagas/Geradas: ${summary.paidPurchases}`)
    console.log(`   - Pendentes: ${summary.pendingPurchases}`)
    console.log(`   - Gratuitas: ${summary.freePurchases}`)
    console.log(`\n🔢 Códigos EAN:`)
    console.log(`   - Total deletado: ${summary.totalCodes}`)
    console.log(`\n📦 Produtos afetados:`)
    console.log(`   - Total: ${summary.productsAffected}`)
    console.log(`   - GTIN removido de todos`)
    console.log(`\n💰 Estorno financeiro:`)
    console.log(`   - Valor total: R$ ${summary.amountToRefund.toFixed(2)}`)
    
    // Buscar saldo atualizado
    const updatedSeller = await prisma.seller.findUnique({
      where: { id: sellerId }
    })
    
    if (updatedSeller) {
      console.log(`   - Novo saldo: R$ ${Number(updatedSeller.balance).toFixed(2)}`)
    }

    console.log('\n✅ Operação concluída com sucesso!')
    console.log('\n💡 Próximos passos:')
    console.log('   - Verificar o saldo do vendedor na plataforma')
    console.log('   - Confirmar que os produtos não têm mais código EAN')
    console.log('   - Vendedor pode solicitar novos códigos com prefixo correto')

  } catch (error) {
    console.error('\n❌ Erro fatal:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
