import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Recalculando comissões dos pedidos (NOVA LÓGICA)...\n')
  
  const sellerId = 'cmk3bd6vb0002w0bioke9h4ps'
  
  // Buscar seller para pegar taxa de comissão padrão
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId }
  })

  if (!seller) {
    console.log('❌ Vendedor não encontrado')
    return
  }

  console.log(`Vendedor: ${seller.storeName}`)
  console.log(`Taxa de Comissão (produtos próprios): ${seller.commission}%\n`)

  // Buscar todos os OrderItems do vendedor
  const items = await prisma.orderItem.findMany({
    where: { sellerId },
    include: { 
      product: {
        select: {
          name: true,
          supplierSku: true,
          costPrice: true,
          dropshippingCommission: true
        }
      }
    }
  })

  console.log(`📦 Total de itens: ${items.length}\n`)

  let fixed = 0

  for (const item of items) {
    const itemTotal = item.price * item.quantity
    const isDropshipping = !!item.product.supplierSku
    
    let commissionRate = 0
    let commissionAmount = 0
    let sellerRevenue = 0

    if (isDropshipping) {
      // DROPSHIPPING: Buscar comissão do produto ORIGINAL (não da cópia)
      const originalProduct = await prisma.product.findUnique({
        where: { id: item.product.supplierSku },
        select: { 
          dropshippingCommission: true,
          name: true
        }
      })
      
      commissionRate = originalProduct?.dropshippingCommission || 0
      commissionAmount = (itemTotal * commissionRate) / 100
      const costBase = (item.product.costPrice || 0) * item.quantity
      // Lucro = (Venda - Custo) + Comissão
      sellerRevenue = (itemTotal - costBase) + commissionAmount
      
      console.log(`✅ DROPSHIPPING: ${item.product.name}`)
      console.log(`   Produto Original: ${originalProduct?.name || 'Não encontrado'}`)
      console.log(`   Venda: R$ ${itemTotal.toFixed(2)}`)
      console.log(`   Custo: R$ ${costBase.toFixed(2)}`)
      console.log(`   Comissão DROP (${commissionRate}%): + R$ ${commissionAmount.toFixed(2)}`)
      console.log(`   Você recebe: R$ ${sellerRevenue.toFixed(2)}`)
    } else {
      // PRODUTO PRÓPRIO: Vendedor PAGA comissão para plataforma
      commissionRate = seller.commission
      commissionAmount = (itemTotal * commissionRate) / 100
      sellerRevenue = itemTotal - commissionAmount
      
      console.log(`📦 PRODUTO PRÓPRIO: ${item.product.name}`)
      console.log(`   Venda: R$ ${itemTotal.toFixed(2)}`)
      console.log(`   Comissão Plataforma (${commissionRate}%): - R$ ${commissionAmount.toFixed(2)}`)
      console.log(`   Você recebe: R$ ${sellerRevenue.toFixed(2)}`)
    }

    // Atualizar item
    await prisma.orderItem.update({
      where: { id: item.id },
      data: {
        commissionRate,
        commissionAmount,
        sellerRevenue
      }
    })

    fixed++
    console.log('')
  }

  console.log(`\n✅ ${fixed} itens recalculados com sucesso!`)
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
