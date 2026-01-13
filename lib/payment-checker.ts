import cron from 'node-cron'
import { prisma } from './prisma'
import { PaymentService } from './payment'

let isChecking = false

// Configuração de concorrência
const BATCH_SIZE = 10 // Quantos pedidos verificar em paralelo
const DELAY_BETWEEN_BATCHES = 1000 // 1 segundo entre batches

/**
 * Verifica um único pedido e retorna o resultado
 */
async function checkSinglePayment(order: {
  id: string
  paymentId: string | null
  total: number
  buyerEmail: string | null
  buyerName: string | null
}): Promise<{ status: 'approved' | 'rejected' | 'pending' | 'error', orderId: string }> {
  try {
    if (!order.paymentId) {
      return { status: 'pending', orderId: order.id }
    }

    // Verificar status no Mercado Pago
    const paymentStatus = await PaymentService.checkPaymentStatus(
      order.paymentId,
      'MERCADOPAGO'
    )

    if (paymentStatus.paid && paymentStatus.status === 'approved') {
      // Buscar itens do pedido para calcular comissões
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: order.id }
      })

      // Atualizar pedido para PROCESSING e atualizar balance dos vendedores
      await prisma.$transaction(async (tx) => {
        // Atualizar pedido
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'PROCESSING',
            paymentStatus: 'approved',
            paymentApprovedAt: new Date()
          }
        })

        // Atualizar balance de cada vendedor envolvido
        const sellerBalances = new Map<string, number>()
        
        for (const item of orderItems) {
          if (item.sellerId && item.sellerRevenue) {
            const current = sellerBalances.get(item.sellerId) || 0
            sellerBalances.set(item.sellerId, current + item.sellerRevenue)
          }
        }

        // Incrementar balance de cada vendedor
        for (const [sellerId, revenue] of sellerBalances.entries()) {
          await tx.seller.update({
            where: { id: sellerId },
            data: {
              balance: { increment: revenue },
              totalEarned: { increment: revenue }
            }
          })
        }
      })

      console.log(`✅ Pedido ${order.id.slice(0, 8)} APROVADO! (${order.buyerName || order.buyerEmail || 'N/A'}) - R$ ${order.total}`)
      return { status: 'approved', orderId: order.id }
      
    } else if (paymentStatus.status === 'rejected' || paymentStatus.status === 'cancelled' || paymentStatus.status === 'refunded') {
      // Pagamento rejeitado/cancelado - limpar paymentId para permitir nova tentativa
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: paymentStatus.status,
          paymentId: null
        }
      })
      console.log(`❌ Pedido ${order.id.slice(0, 8)} ${paymentStatus.status.toUpperCase()} - paymentId limpo`)
      return { status: 'rejected', orderId: order.id }
      
    } else {
      return { status: 'pending', orderId: order.id }
    }

  } catch (error) {
    console.error(`❌ Erro ao verificar pedido ${order.id.slice(0, 8)}:`, error)
    return { status: 'error', orderId: order.id }
  }
}

/**
 * Processa um batch de pedidos em paralelo
 */
async function processBatch(orders: Array<{
  id: string
  paymentId: string | null
  total: number
  buyerEmail: string | null
  buyerName: string | null
}>): Promise<{ approved: number, rejected: number, pending: number, errors: number }> {
  const results = await Promise.all(orders.map(checkSinglePayment))
  
  return {
    approved: results.filter(r => r.status === 'approved').length,
    rejected: results.filter(r => r.status === 'rejected').length,
    pending: results.filter(r => r.status === 'pending').length,
    errors: results.filter(r => r.status === 'error').length
  }
}

/**
 * Verifica pagamentos pendentes automaticamente (PARALELO)
 */
async function checkPendingPayments() {
  // Evitar execuções simultâneas
  if (isChecking) {
    console.log('⏳ Verificação de pagamentos já em andamento, pulando...')
    return
  }

  isChecking = true

  try {
    const startTime = Date.now()
    console.log('\n🔍 [Payment Checker] Iniciando verificação automática de pagamentos...')
    console.log(`⏰ ${new Date().toLocaleString('pt-BR')}`)

    // Buscar pedidos pendentes COM paymentId válido (numérico)
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        paymentId: { not: null }
      },
      select: {
        id: true,
        paymentId: true,
        total: true,
        createdAt: true,
        buyerEmail: true,
        buyerName: true
      }
    })

    // Filtrar apenas paymentIds numéricos (válidos do Mercado Pago)
    const validOrders = pendingOrders.filter(o => o.paymentId && /^\d+$/.test(o.paymentId))

    if (validOrders.length === 0) {
      console.log('✅ Nenhum pedido pendente com pagamento para verificar')
      isChecking = false
      return
    }

    console.log(`📦 Pedidos a verificar: ${validOrders.length}`)
    console.log(`🔄 Processando em batches de ${BATCH_SIZE}...`)

    let totalApproved = 0
    let totalRejected = 0
    let totalPending = 0
    let totalErrors = 0

    // Processar em batches
    for (let i = 0; i < validOrders.length; i += BATCH_SIZE) {
      const batch = validOrders.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(validOrders.length / BATCH_SIZE)
      
      console.log(`   Batch ${batchNum}/${totalBatches} (${batch.length} pedidos)...`)
      
      const results = await processBatch(batch)
      
      totalApproved += results.approved
      totalRejected += results.rejected
      totalPending += results.pending
      totalErrors += results.errors

      // Delay entre batches para não sobrecarregar a API
      if (i + BATCH_SIZE < validOrders.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log('\n📊 Resultados da verificação:')
    console.log(`   ✅ Aprovados: ${totalApproved}`)
    console.log(`   ❌ Rejeitados: ${totalRejected}`)
    console.log(`   ⏳ Ainda pendentes: ${totalPending}`)
    console.log(`   ⚠️  Erros: ${totalErrors}`)
    console.log(`   ⏱️  Duração: ${duration}s (${validOrders.length} pedidos)\n`)

  } catch (error) {
    console.error('❌ [Payment Checker] Erro crítico:', error)
  } finally {
    isChecking = false
  }
}

/**
 * Inicia o agendador de verificação de pagamentos
 * Roda a cada 2 minutos
 */
export function startPaymentChecker() {
  console.log('🚀 [Payment Checker] Iniciando verificador automático de pagamentos...')
  console.log(`⏰ Verificação agendada a cada 2 minutos (batch de ${BATCH_SIZE} em paralelo)`)

  // Executar imediatamente na inicialização
  setTimeout(() => {
    checkPendingPayments()
  }, 10000) // Aguarda 10 segundos após o servidor iniciar

  // Agendar verificações a cada 2 minutos
  cron.schedule('*/2 * * * *', () => {
    checkPendingPayments()
  })

  console.log('✅ [Payment Checker] Verificador iniciado com sucesso!\n')
}

// Exportar função manual para testes
export { checkPendingPayments }
