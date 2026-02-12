import { prisma } from '@/lib/prisma'

/**
 * Libera comissão do afiliado quando pedido é entregue/confirmado
 * Deve ser chamado sempre que um pedido muda para status DELIVERED ou PROCESSING
 */
export async function processAffiliateCommission(orderId: string) {
  try {
    console.log('🎯 [AFILIADO] Verificando comissão para pedido:', orderId)

    // Buscar pedido com informações do afiliado
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        total: true,
        affiliateId: true,
        affiliateCode: true
      }
    })

    if (!order) {
      console.log('   ⚠️ Pedido não encontrado')
      return { success: false, message: 'Pedido não encontrado' }
    }

    if (!order.affiliateId) {
      console.log('   ℹ️ Pedido não tem afiliado associado')
      return { success: true, message: 'Pedido sem afiliado' }
    }

    // Buscar venda do afiliado
    const affiliateSale = await prisma.affiliateSale.findUnique({
      where: { orderId },
      include: {
        affiliate: {
          include: {
            account: true
          }
        }
      }
    })

    if (!affiliateSale) {
      console.log('   ⚠️ Venda de afiliado não encontrada')
      return { success: false, message: 'Venda de afiliado não encontrada' }
    }

    // Verificar se já foi processada
    if (affiliateSale.status === 'CONFIRMED' || affiliateSale.status === 'PAID') {
      console.log('   ✅ Comissão já foi liberada anteriormente')
      return { success: true, message: 'Comissão já liberada' }
    }

    // Liberar comissão apenas quando pedido for DELIVERED (entregue)
    if (order.status === 'DELIVERED') {
      console.log('   📦 Pedido ENTREGUE - Confirmando comissão')

      // Definir data de disponibilidade: 7 dias após a entrega (prazo de devolução)
      const availableAt = new Date()
      availableAt.setDate(availableAt.getDate() + 7)

      // Atualizar status da venda para CONFIRMED com data de disponibilidade
      await prisma.affiliateSale.update({
        where: { id: affiliateSale.id },
        data: {
          status: 'CONFIRMED',
          availableAt
        }
      })

      console.log(`   ✅ Comissão CONFIRMADA`)
      console.log(`   📅 Disponível para saque em: ${availableAt.toLocaleDateString('pt-BR')}`)
      console.log(`   💰 Valor: R$ ${affiliateSale.commissionAmount.toFixed(2)}`)
      console.log(`   👤 Afiliado: ${affiliateSale.affiliate.name}`)
      console.log(`   ⏳ Aguardando 7 dias (prazo de devolução)`)
      
      return {
        success: true,
        message: 'Comissão confirmada - disponível em 7 dias',
        amount: affiliateSale.commissionAmount,
        affiliate: affiliateSale.affiliate.name,
        availableAt: availableAt.toISOString()
      }
    } else {
      console.log(`   ⏳ Pedido ainda em ${order.status} - Aguardando entrega`)
      return { success: true, message: 'Aguardando entrega do pedido' }
    }
  } catch (error: any) {
    console.error('   ❌ Erro ao processar comissão de afiliado:', error?.message)
    return { success: false, message: error?.message || 'Erro desconhecido' }
  }
}

/**
 * Cancela comissão do afiliado quando pedido é cancelado
 */
export async function cancelAffiliateCommission(orderId: string) {
  try {
    console.log('🎯 [AFILIADO] Cancelando comissão para pedido:', orderId)

    const affiliateSale = await prisma.affiliateSale.findUnique({
      where: { orderId },
      include: {
        affiliate: {
          include: {
            account: true
          }
        }
      }
    })

    if (!affiliateSale) {
      console.log('   ℹ️ Venda de afiliado não encontrada')
      return { success: true, message: 'Sem afiliado para cancelar' }
    }

    // Observação: Não estornamos valor porque ele nunca foi creditado
    // A comissão só é creditada no momento do SAQUE (status PAID)
    // Aqui apenas cancelamos a promessa de pagamento

    // Atualizar status para CANCELLED
    await prisma.affiliateSale.update({
      where: { id: affiliateSale.id },
      data: {
        status: 'CANCELLED'
      }
    })

    console.log('   ✅ Comissão cancelada')
    return { success: true, message: 'Comissão cancelada' }
  } catch (error: any) {
    console.error('   ❌ Erro ao cancelar comissão:', error?.message)
    return { success: false, message: error?.message || 'Erro desconhecido' }
  }
}
