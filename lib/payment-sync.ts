/**
 * SISTEMA UNIFICADO DE VERIFICAÇÃO DE PAGAMENTOS
 * 
 * Este arquivo substitui:
 * - payment-checker.ts
 * - payment-sync-cron.ts
 * 
 * Funciona assim:
 * 1. Roda a cada 30 segundos
 * 2. Busca pedidos PENDING com paymentId
 * 3. Verifica status na API do Mercado Pago
 * 4. Atualiza pedido se aprovado/rejeitado
 * 5. Se não tem paymentId, busca por external_reference (orderId)
 */

import { prisma } from './prisma'
import { sendTemplateEmail, EMAIL_TEMPLATES } from './email'

interface MercadoPagoPayment {
  id: number
  status: string
  status_detail: string
  transaction_amount: number
  date_created: string
  date_approved: string | null
  payment_method_id: string
  external_reference: string
}

// Singleton para evitar múltiplas instâncias
let isRunning = false
let intervalId: NodeJS.Timeout | null = null
let accessToken: string | null = null
let tokenLastFetch = 0

// Configurações de resiliência
const FETCH_TIMEOUT = 15000 // 15 segundos
const MAX_RETRIES = 3
const RETRY_DELAY = 2000 // 2 segundos

/**
 * Fetch com timeout configurável
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeout = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Fetch com retry automático
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options)
      return response
    } catch (error: any) {
      const isLastAttempt = attempt === retries
      const isTimeout = error?.code === 'UND_ERR_CONNECT_TIMEOUT' || error?.name === 'AbortError'
      
      if (isLastAttempt) {
        console.error(`[PAYMENT-SYNC] ❌ Falha após ${retries} tentativas:`, error.message || error)
        return null
      }
      
      // Aguardar antes de tentar novamente (exponential backoff)
      const delay = RETRY_DELAY * attempt
      console.warn(`[PAYMENT-SYNC] ⚠️ Tentativa ${attempt}/${retries} falhou${isTimeout ? ' (timeout)' : ''}. Retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  return null
}

/**
 * Busca token do Mercado Pago (com cache de 5 minutos)
 */
async function getAccessToken(): Promise<string | null> {
  // Cache de 5 minutos
  if (accessToken && Date.now() - tokenLastFetch < 5 * 60 * 1000) {
    return accessToken
  }

  try {
    const gateway = await prisma.paymentGateway.findFirst({
      where: { gateway: 'MERCADOPAGO', isActive: true }
    })

    if (!gateway?.config) {
      console.error('[PAYMENT-SYNC] ❌ Gateway Mercado Pago não configurado')
      return null
    }

    let config = gateway.config
    if (typeof config === 'string') {
      config = JSON.parse(config)
    }

    accessToken = (config as any).accessToken || null
    tokenLastFetch = Date.now()
    
    return accessToken
  } catch (error) {
    console.error('[PAYMENT-SYNC] ❌ Erro ao buscar token:', error)
    return null
  }
}

/**
 * Verifica um pagamento específico pelo ID
 */
async function checkPaymentById(paymentId: string, token: string): Promise<MercadoPagoPayment | null> {
  try {
    const response = await fetchWithRetry(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!response) {
      console.warn(`[PAYMENT-SYNC] ⚠️ Não foi possível conectar à API para paymentId ${paymentId}`)
      return null
    }

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      console.error(`[PAYMENT-SYNC] Erro HTTP ${response.status} para paymentId ${paymentId}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error(`[PAYMENT-SYNC] Erro ao verificar payment ${paymentId}:`, error)
    return null
  }
}

/**
 * Busca pagamentos por external_reference (orderId)
 * Tenta primeiro o orderId exato, depois busca todos os pagamentos recentes
 * para encontrar os que contém o orderId (para casos legados com timestamp)
 */
async function searchPaymentsByOrderId(orderId: string, token: string): Promise<MercadoPagoPayment[]> {
  try {
    // Primeiro: Buscar pelo orderId exato
    const response = await fetchWithRetry(
      `https://api.mercadopago.com/v1/payments/search?external_reference=${orderId}&sort=date_created&criteria=desc`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )

    if (response?.ok) {
      const data = await response.json()
      if (data.results && data.results.length > 0) {
        return data.results
      }
    }

    // Segundo: Buscar pagamentos recentes e filtrar os que começam com o orderId
    // (para casos legados onde external_reference era orderId-timestamp)
    const recentResponse = await fetchWithRetry(
      `https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=50`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )

    if (recentResponse?.ok) {
      const recentData = await recentResponse.json()
      const filtered = (recentData.results || []).filter((p: MercadoPagoPayment) => 
        p.external_reference && p.external_reference.startsWith(orderId)
      )
      return filtered
    }

    return []
  } catch (error) {
    console.error(`[PAYMENT-SYNC] Erro ao buscar pagamentos do pedido ${orderId}:`, error)
    return []
  }
}

/**
 * Atualiza pedido como aprovado
 */
async function approveOrder(orderId: string, payment: MercadoPagoPayment): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      // Atualizar pedido
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'PROCESSING',
          paymentStatus: 'approved',
          paymentId: String(payment.id),
          paymentType: payment.payment_method_id,
          paymentApprovedAt: payment.date_approved ? new Date(payment.date_approved) : new Date()
        },
        include: {
          user: {
            select: { email: true, name: true }
          }
        }
      })

      // Enviar email de pagamento aprovado (não-bloqueante)
      if (updatedOrder.user?.email) {
        sendTemplateEmail(
          EMAIL_TEMPLATES.PAYMENT_RECEIVED,
          updatedOrder.user.email,
          {
            customerName: updatedOrder.user.name || updatedOrder.buyerName || 'Cliente',
            orderId: updatedOrder.id,
            orderTotal: updatedOrder.total.toFixed(2),
            paymentMethod: payment.payment_method_id || 'Não informado'
          }
        ).catch((error: any) => {
          console.error('⚠️ Erro ao enviar email de pagamento aprovado:', error?.message)
        })
      }

      // Buscar itens para atualizar balance dos vendedores
      const orderItems = await tx.orderItem.findMany({
        where: { orderId },
        select: { sellerId: true, sellerRevenue: true }
      })

      // Agrupar receita por vendedor
      const sellerBalances = new Map<string, number>()
      for (const item of orderItems) {
        if (item.sellerId && item.sellerRevenue) {
          const current = sellerBalances.get(item.sellerId) || 0
          sellerBalances.set(item.sellerId, current + item.sellerRevenue)
        }
      }

      // Atualizar balance de cada vendedor
      for (const [sellerId, revenue] of sellerBalances.entries()) {
        await tx.seller.update({
          where: { id: sellerId },
          data: {
            balance: { increment: revenue },
            totalEarned: { increment: revenue }
          }
        })
      }

      // Verificar se tem pedidos relacionados (parentOrderId)
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { parentOrderId: true }
      })

      if (order?.parentOrderId) {
        // Atualizar todos os pedidos relacionados
        await tx.order.updateMany({
          where: {
            parentOrderId: order.parentOrderId,
            status: 'PENDING'
          },
          data: {
            status: 'PROCESSING',
            paymentStatus: 'approved',
            paymentApprovedAt: new Date()
          }
        })
      }
    })

    console.log(`[PAYMENT-SYNC] ✅ Pedido ${orderId.slice(0, 8)} APROVADO! (${payment.payment_method_id} - R$ ${payment.transaction_amount})`)
  } catch (error) {
    console.error(`[PAYMENT-SYNC] ❌ Erro ao aprovar pedido ${orderId}:`, error)
  }
}

/**
 * Marca pedido como rejeitado e limpa paymentId
 */
async function rejectOrder(orderId: string, status: string): Promise<void> {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: status,
        paymentId: null // Limpar para permitir nova tentativa
      }
    })
    console.log(`[PAYMENT-SYNC] ❌ Pedido ${orderId.slice(0, 8)} ${status.toUpperCase()} - limpo para nova tentativa`)
  } catch (error) {
    console.error(`[PAYMENT-SYNC] Erro ao rejeitar pedido ${orderId}:`, error)
  }
}

/**
 * Executa verificação de todos os pedidos pendentes
 */
async function syncPendingPayments(): Promise<void> {
  if (isRunning) {
    return // Já está rodando
  }

  isRunning = true
  const startTime = Date.now()

  try {
    const token = await getAccessToken()
    if (!token) {
      console.error('[PAYMENT-SYNC] ❌ Token não disponível')
      return
    }

    // Buscar pedidos pendentes dos últimos 2 dias
    // Excluir pedidos com paymentStatus cancelado/rejeitado - não tem mais o que fazer
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        createdAt: { gte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        paymentStatus: {
          notIn: ['cancelled', 'rejected', 'refunded', 'charged_back']
        }
      },
      select: {
        id: true,
        paymentId: true,
        total: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    if (pendingOrders.length === 0) {
      return
    }

    console.log(`[PAYMENT-SYNC] 🔍 Verificando ${pendingOrders.length} pedidos pendentes...`)

    let approved = 0
    let rejected = 0
    let pending = 0

    for (const order of pendingOrders) {
      try {
        // Se tem paymentId numérico, verificar diretamente
        if (order.paymentId && /^\d+$/.test(order.paymentId)) {
          const payment = await checkPaymentById(order.paymentId, token)
          
          if (!payment) {
            pending++
            continue
          }

          if (payment.status === 'approved') {
            await approveOrder(order.id, payment)
            approved++
          } else if (['rejected', 'cancelled', 'refunded'].includes(payment.status)) {
            await rejectOrder(order.id, payment.status)
            rejected++
          } else {
            pending++
          }
          continue
        }

        // Se não tem paymentId, buscar por external_reference
        const payments = await searchPaymentsByOrderId(order.id, token)
        
        // Filtrar aprovados
        const approvedPayments = payments.filter(p => p.status === 'approved')
        
        if (approvedPayments.length > 0) {
          // Usar o primeiro aprovado
          const payment = approvedPayments.sort((a, b) => 
            new Date(a.date_approved!).getTime() - new Date(b.date_approved!).getTime()
          )[0]
          
          await approveOrder(order.id, payment)
          approved++
          continue
        }

        // Verificar se tem pagamentos pendentes (ainda aguardando)
        const pendingPayments = payments.filter(p => p.status === 'pending')
        if (pendingPayments.length > 0) {
          // Tem pagamento pendente, atualizar paymentId se não tiver
          if (!order.paymentId) {
            await prisma.order.update({
              where: { id: order.id },
              data: { paymentId: String(pendingPayments[0].id) }
            })
          }
          pending++
          continue
        }

        // Verificar se só tem rejeitados (não tem pendente nem aprovado)
        const rejectedPayments = payments.filter(p => 
          ['rejected', 'cancelled', 'refunded'].includes(p.status)
        )
        
        if (rejectedPayments.length > 0) {
          // Só tem rejeitados, marcar como rejeitado
          await rejectOrder(order.id, rejectedPayments[0].status)
          rejected++
          continue
        }

        // Não encontrou nenhum pagamento, continua pendente
        pending++
      } catch (orderError) {
        // Erro em um pedido específico não deve parar o loop
        console.error(`[PAYMENT-SYNC] Erro no pedido ${order.id.slice(0, 8)}:`, orderError)
        pending++
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    
    if (approved > 0 || rejected > 0) {
      console.log(`[PAYMENT-SYNC] 📊 ${approved} aprovados | ${rejected} rejeitados | ${pending} pendentes (${duration}s)`)
    }

  } catch (error) {
    console.error('[PAYMENT-SYNC] ❌ Erro na sincronização:', error)
  } finally {
    isRunning = false
  }
}

/**
 * Inicia o sistema de sincronização
 */
export function startPaymentSync(): void {
  if (intervalId) {
    console.log('[PAYMENT-SYNC] ⚠️ Sistema já está rodando')
    return
  }

  console.log('[PAYMENT-SYNC] 🚀 Iniciando sistema unificado de pagamentos (a cada 30s)')

  // Executar a primeira vez após 5 segundos
  setTimeout(() => {
    syncPendingPayments()
  }, 5000)

  // Executar a cada 30 segundos
  intervalId = setInterval(() => {
    syncPendingPayments()
  }, 30 * 1000)
}

/**
 * Para o sistema de sincronização
 */
export function stopPaymentSync(): void {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
    console.log('[PAYMENT-SYNC] 🛑 Sistema parado')
  }
}

/**
 * Verifica um pedido específico (para uso da API check-status)
 */
export async function checkOrderPayment(orderId: string): Promise<{
  status: 'approved' | 'pending' | 'rejected' | 'error'
  paymentStatus?: string
  message?: string
}> {
  try {
    const token = await getAccessToken()
    if (!token) {
      return { status: 'error', message: 'Token não disponível' }
    }

    // Buscar pedido
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, paymentId: true, parentOrderId: true }
    })

    if (!order) {
      return { status: 'error', message: 'Pedido não encontrado' }
    }

    // Se já está processando, retornar aprovado
    if (order.status !== 'PENDING') {
      return { status: 'approved', paymentStatus: 'approved' }
    }

    // Verificar por paymentId se existir
    if (order.paymentId && /^\d+$/.test(order.paymentId)) {
      const payment = await checkPaymentById(order.paymentId, token)
      
      if (payment) {
        if (payment.status === 'approved') {
          await approveOrder(order.id, payment)
          return { status: 'approved', paymentStatus: 'approved', message: 'Pagamento aprovado!' }
        }
        
        if (['rejected', 'cancelled', 'refunded'].includes(payment.status)) {
          await rejectOrder(order.id, payment.status)
          return { status: 'rejected', paymentStatus: payment.status }
        }
        
        return { status: 'pending', paymentStatus: payment.status }
      }
    }

    // Buscar por external_reference
    const payments = await searchPaymentsByOrderId(orderId, token)
    const approvedPayment = payments.find(p => p.status === 'approved')
    
    if (approvedPayment) {
      await approveOrder(orderId, approvedPayment)
      return { status: 'approved', paymentStatus: 'approved', message: 'Pagamento aprovado!' }
    }

    const pendingPayment = payments.find(p => p.status === 'pending')
    if (pendingPayment) {
      // Atualizar paymentId no pedido se ainda não tiver
      if (!order.paymentId) {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentId: String(pendingPayment.id) }
        })
      }
      return { status: 'pending', paymentStatus: 'pending' }
    }

    return { status: 'pending', paymentStatus: 'waiting' }
  } catch (error) {
    console.error(`[PAYMENT-SYNC] Erro ao verificar pedido ${orderId}:`, error)
    return { status: 'error', message: 'Erro interno' }
  }
}

/**
 * SISTEMA DE CONSISTÊNCIA DE REEMBOLSOS
 * Processa reembolsos que falharam e estão com status PENDING
 */
async function syncPendingRefunds(): Promise<void> {
  try {
    const token = await getAccessToken()
    if (!token) {
      console.error('[REFUND-SYNC] ❌ Token não disponível')
      return
    }

    // Buscar reembolsos pendentes (criados há mais de 1 minuto para evitar duplicatas)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000)
    
    const pendingRefunds = await prisma.refund.findMany({
      where: {
        status: 'PENDING',
        gateway: 'MERCADOPAGO',
        createdAt: { lt: oneMinuteAgo }
      },
      include: {
        order: {
          select: { id: true, status: true, paymentId: true }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 20 // Processar 20 por vez
    })

    if (pendingRefunds.length === 0) {
      return
    }

    console.log(`[REFUND-SYNC] 🔄 Processando ${pendingRefunds.length} reembolsos pendentes...`)

    let processed = 0
    let failed = 0

    for (const refund of pendingRefunds) {
      try {
        // Usar o paymentId do refund (já está correto)
        const paymentId = refund.paymentId

        if (!paymentId || !/^\d+$/.test(paymentId)) {
          console.error(`[REFUND-SYNC] ⚠️ PaymentId inválido para refund ${refund.id.slice(0, 8)}`)
          // Marcar como FAILED se não tem paymentId válido
          await prisma.refund.update({
            where: { id: refund.id },
            data: { 
              status: 'FAILED',
              reason: (refund.reason || '') + ' | PaymentId inválido'
            }
          })
          failed++
          continue
        }

        // Tentar processar o reembolso
        const response = await fetchWithRetry(
          `https://api.mercadopago.com/v1/payments/${paymentId}/refunds`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'X-Idempotency-Key': `refund-${refund.id}` // Evita duplicatas
            },
            body: JSON.stringify({
              amount: refund.amount
            })
          }
        )

        if (!response) {
          console.warn(`[REFUND-SYNC] ⚠️ Não foi possível conectar à API para refund ${refund.id.slice(0, 8)}`)
          continue // Tentar novamente na próxima execução
        }

        const responseData = await response.json()

        if (response.ok) {
          // Reembolso processado com sucesso
          await prisma.refund.update({
            where: { id: refund.id },
            data: { 
              status: 'APPROVED',
              refundId: String(responseData.id)
            }
          })
          
          // Atualizar paymentStatus do pedido
          await prisma.order.update({
            where: { id: refund.orderId },
            data: { paymentStatus: 'refunded' }
          })
          
          console.log(`[REFUND-SYNC] ✅ Reembolso ${refund.id.slice(0, 8)} processado! R$ ${refund.amount}`)
          processed++
        } else if (response.status === 400 || response.status === 404) {
          // Erro permanente - marcar como falho
          const errorMsg = responseData.message || responseData.error || 'Erro desconhecido'
          
          // Verificar se já foi reembolsado
          if (errorMsg.includes('already refunded') || errorMsg.includes('Payment already refunded')) {
            await prisma.refund.update({
              where: { id: refund.id },
              data: { 
                status: 'APPROVED',
                reason: (refund.reason || '') + ' | Já reembolsado anteriormente'
              }
            })
            console.log(`[REFUND-SYNC] ✅ Refund ${refund.id.slice(0, 8)} já estava reembolsado`)
            processed++
          } else {
            await prisma.refund.update({
              where: { id: refund.id },
              data: { 
                status: 'FAILED',
                reason: (refund.reason || '') + ` | Erro: ${errorMsg}`
              }
            })
            console.error(`[REFUND-SYNC] ❌ Refund ${refund.id.slice(0, 8)} falhou: ${errorMsg}`)
            failed++
          }
        } else {
          // Erro temporário (5xx, etc) - tentar novamente depois
          console.warn(`[REFUND-SYNC] ⚠️ Erro ${response.status} para refund ${refund.id.slice(0, 8)}, tentando depois`)
        }

        // Aguardar 500ms entre cada requisição para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (refundError) {
        console.error(`[REFUND-SYNC] ❌ Erro ao processar refund ${refund.id.slice(0, 8)}:`, refundError)
      }
    }

    if (processed > 0 || failed > 0) {
      console.log(`[REFUND-SYNC] 📊 ${processed} processados | ${failed} falharam`)
    }

  } catch (error) {
    console.error('[REFUND-SYNC] ❌ Erro na sincronização de reembolsos:', error)
  }
}

// Interval para sincronização de reembolsos
let refundIntervalId: NodeJS.Timeout | null = null

/**
 * Inicia o sistema de consistência de reembolsos
 */
export function startRefundSync(): void {
  if (refundIntervalId) {
    console.log('[REFUND-SYNC] ⚠️ Sistema já está rodando')
    return
  }

  console.log('[REFUND-SYNC] 🚀 Iniciando sistema de consistência de reembolsos (a cada 2min)')

  // Executar a primeira vez após 30 segundos
  setTimeout(() => {
    syncPendingRefunds()
  }, 30 * 1000)

  // Executar a cada 2 minutos
  refundIntervalId = setInterval(() => {
    syncPendingRefunds()
  }, 2 * 60 * 1000)
}

/**
 * Para o sistema de consistência de reembolsos
 */
export function stopRefundSync(): void {
  if (refundIntervalId) {
    clearInterval(refundIntervalId)
    refundIntervalId = null
    console.log('[REFUND-SYNC] 🛑 Sistema parado')
  }
}

/**
 * Cancela automaticamente pedidos PENDING muito antigos
 * Roda uma vez por hora para limpar pedidos abandonados
 */
async function cancelOldPendingOrders(): Promise<void> {
  try {
    // Cancelar pedidos PENDING com mais de 7 dias
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    const result = await prisma.order.updateMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: sevenDaysAgo }
      },
      data: {
        status: 'CANCELLED',
        paymentStatus: 'expired'
      }
    })

    if (result.count > 0) {
      console.log(`[PAYMENT-SYNC] 🗑️ ${result.count} pedidos antigos cancelados automaticamente`)
    }
  } catch (error) {
    console.error('[PAYMENT-SYNC] Erro ao cancelar pedidos antigos:', error)
  }
}

// Rodar cancelamento automático a cada 1 hora
let cleanupIntervalId: NodeJS.Timeout | null = null

export function startOrderCleanup(): void {
  if (cleanupIntervalId) return
  
  // Executar a primeira vez após 1 minuto
  setTimeout(() => {
    cancelOldPendingOrders()
  }, 60 * 1000)

  // Executar a cada 1 hora
  cleanupIntervalId = setInterval(() => {
    cancelOldPendingOrders()
  }, 60 * 60 * 1000)
  
  console.log('[PAYMENT-SYNC] 🧹 Limpeza automática de pedidos ativada (a cada 1h)')
}

// ============================================================
// SUBSCRIPTION PAYMENT SYNC - Sincronização de Pagamentos de Planos
// ============================================================

let subscriptionSyncRunning = false
let subscriptionIntervalId: NodeJS.Timeout | null = null

/**
 * Verifica pagamentos pendentes de assinaturas no Mercado Pago
 */
async function syncSubscriptionPayments(): Promise<void> {
  if (subscriptionSyncRunning) return
  subscriptionSyncRunning = true

  try {
    const token = await getAccessToken()
    if (!token) {
      return
    }

    // Buscar assinaturas PENDING_PAYMENT dos últimos 7 dias
    const pendingSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'PENDING_PAYMENT',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      include: {
        seller: {
          select: { id: true, userId: true }
        },
        plan: {
          select: { id: true, name: true }
        }
      },
      take: 50
    })

    if (pendingSubscriptions.length === 0) {
      return
    }

    console.log(`[SUBSCRIPTION-SYNC] 🔍 Verificando ${pendingSubscriptions.length} assinaturas pendentes...`)

    let activated = 0
    let pending = 0

    for (const subscription of pendingSubscriptions) {
      try {
        // Buscar pagamento por external_reference (subscription.id)
        const response = await fetchWithRetry(
          `https://api.mercadopago.com/v1/payments/search?external_reference=${subscription.id}&sort=date_created&criteria=desc`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (!response || !response.ok) {
          pending++
          continue
        }

        const data = await response.json()
        const payments = data.results || []

        // Verificar se tem pagamento aprovado
        const approvedPayment = payments.find((p: any) => p.status === 'approved')

        if (approvedPayment) {
          // Ativar assinatura
          const now = new Date()
          const endDate = new Date(now)
          
          // Calcular data de término baseado no ciclo
          const billingCycle = subscription.billingCycle
          if (billingCycle === 'MONTHLY') {
            endDate.setMonth(endDate.getMonth() + 1)
          } else if (billingCycle === 'QUARTERLY') {
            endDate.setMonth(endDate.getMonth() + 3)
          } else if (billingCycle === 'SEMIANNUAL') {
            endDate.setMonth(endDate.getMonth() + 6)
          } else if (billingCycle === 'ANNUAL') {
            endDate.setFullYear(endDate.getFullYear() + 1)
          } else {
            endDate.setMonth(endDate.getMonth() + 1) // Default mensal
          }

          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'ACTIVE',
              startDate: now,
              endDate: endDate,
              nextBillingDate: endDate
            }
          })

          console.log(`[SUBSCRIPTION-SYNC] ✅ Assinatura ${subscription.id.slice(0, 8)} ATIVADA! (${subscription.plan.name})`)
          activated++
        } else {
          pending++
        }
      } catch (error) {
        console.error(`[SUBSCRIPTION-SYNC] Erro na assinatura ${subscription.id.slice(0, 8)}:`, error)
        pending++
      }
    }

    if (activated > 0) {
      console.log(`[SUBSCRIPTION-SYNC] 📊 ${activated} ativadas | ${pending} pendentes`)
    }

  } catch (error) {
    console.error('[SUBSCRIPTION-SYNC] ❌ Erro na sincronização:', error)
  } finally {
    subscriptionSyncRunning = false
  }
}

/**
 * Expira assinaturas vencidas
 */
async function expireOldSubscriptions(): Promise<void> {
  try {
    const now = new Date()

    // Expirar assinaturas ACTIVE/TRIAL com endDate no passado
    const expiredSubs = await prisma.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'TRIAL'] },
        endDate: { lt: now }
      },
      select: { id: true, sellerId: true }
    })

    if (expiredSubs.length > 0) {
      await prisma.subscription.updateMany({
        where: { id: { in: expiredSubs.map(s => s.id) } },
        data: { status: 'EXPIRED' }
      })

      // Desativar produtos dos vendedores com assinatura expirada
      // (não altera seller.status — vendedor continua podendo acessar o painel e renovar o plano)
      await prisma.product.updateMany({
        where: { sellerId: { in: expiredSubs.map(s => s.sellerId) }, active: true },
        data: { active: false }
      })

      console.log(`[SUBSCRIPTION-SYNC] ⏰ ${expiredSubs.length} assinaturas expiradas, produtos desativados`)
    }

    // Cancelar assinaturas PENDING_PAYMENT com mais de 7 dias
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    const cancelledResult = await prisma.subscription.updateMany({
      where: {
        status: 'PENDING_PAYMENT',
        createdAt: { lt: sevenDaysAgo }
      },
      data: {
        status: 'CANCELLED'
      }
    })

    if (cancelledResult.count > 0) {
      console.log(`[SUBSCRIPTION-SYNC] 🗑️ ${cancelledResult.count} assinaturas pendentes canceladas (timeout)`)
    }

  } catch (error) {
    console.error('[SUBSCRIPTION-SYNC] Erro ao expirar assinaturas:', error)
  }
}

/**
 * Verifica uma assinatura específica (para uso da API check-payment)
 */
export async function checkSubscriptionPayment(subscriptionId: string): Promise<{
  paid: boolean
  status: string
  message?: string
}> {
  try {
    const token = await getAccessToken()
    if (!token) {
      return { paid: false, status: 'error', message: 'Token não disponível' }
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId }
    })

    if (!subscription) {
      return { paid: false, status: 'error', message: 'Assinatura não encontrada' }
    }

    // Se já está ativo, retornar
    if (subscription.status === 'ACTIVE' || subscription.status === 'TRIAL') {
      return { paid: true, status: subscription.status, message: 'Assinatura já está ativa' }
    }

    // Buscar pagamento no Mercado Pago
    const response = await fetchWithRetry(
      `https://api.mercadopago.com/v1/payments/search?external_reference=${subscriptionId}&sort=date_created&criteria=desc`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response || !response.ok) {
      return { paid: false, status: 'PENDING_PAYMENT', message: 'Não foi possível verificar pagamento' }
    }

    const data = await response.json()
    const payments = data.results || []
    const approvedPayment = payments.find((p: any) => p.status === 'approved')

    if (approvedPayment) {
      // Ativar assinatura
      const now = new Date()
      const endDate = new Date(now)
      
      const billingCycle = subscription.billingCycle
      if (billingCycle === 'MONTHLY') {
        endDate.setMonth(endDate.getMonth() + 1)
      } else if (billingCycle === 'QUARTERLY') {
        endDate.setMonth(endDate.getMonth() + 3)
      } else if (billingCycle === 'SEMIANNUAL') {
        endDate.setMonth(endDate.getMonth() + 6)
      } else if (billingCycle === 'ANNUAL') {
        endDate.setFullYear(endDate.getFullYear() + 1)
      } else {
        endDate.setMonth(endDate.getMonth() + 1)
      }

      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'ACTIVE',
          startDate: now,
          endDate: endDate,
          nextBillingDate: endDate
        }
      })

      return { paid: true, status: 'ACTIVE', message: 'Pagamento aprovado! Assinatura ativada.' }
    }

    // Verificar se tem pendente
    const pendingPayment = payments.find((p: any) => p.status === 'pending')
    if (pendingPayment) {
      return { paid: false, status: 'PENDING_PAYMENT', message: 'Pagamento ainda em processamento' }
    }

    return { paid: false, status: 'PENDING_PAYMENT', message: 'Pagamento não identificado ainda' }

  } catch (error) {
    console.error('[SUBSCRIPTION-SYNC] Erro ao verificar assinatura:', error)
    return { paid: false, status: 'error', message: 'Erro ao verificar pagamento' }
  }
}

/**
 * Inicia o sistema de sincronização de assinaturas
 */
export function startSubscriptionSync(): void {
  if (subscriptionIntervalId) {
    console.log('[SUBSCRIPTION-SYNC] ⚠️ Sistema já está rodando')
    return
  }

  console.log('[SUBSCRIPTION-SYNC] 🚀 Iniciando sincronização de assinaturas (a cada 60s)')

  // Executar a primeira vez após 10 segundos
  setTimeout(() => {
    syncSubscriptionPayments()
    expireOldSubscriptions()
  }, 10000)

  // Executar a cada 60 segundos
  subscriptionIntervalId = setInterval(() => {
    syncSubscriptionPayments()
  }, 60 * 1000)

  // Verificar expiração a cada 1 hora
  setInterval(() => {
    expireOldSubscriptions()
  }, 60 * 60 * 1000)
}

/**
 * Para o sistema de sincronização de assinaturas
 */
export function stopSubscriptionSync(): void {
  if (subscriptionIntervalId) {
    clearInterval(subscriptionIntervalId)
    subscriptionIntervalId = null
    console.log('[SUBSCRIPTION-SYNC] 🛑 Sistema parado')
  }
}
