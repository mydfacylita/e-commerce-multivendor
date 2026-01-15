// ========================================
// SISTEMA DE DETECÇÃO DE FRAUDES
// Análise de risco para pedidos
// ========================================

import { prisma } from './prisma'
import { isValidCPF } from './validation'

export interface FraudAnalysis {
  score: number // 0-100 (0=seguro, 100=alto risco)
  reasons: string[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  shouldAlert: boolean
  details: {
    isFirstOrder?: boolean
    orderCount24h?: number
    orderCountSameIP?: number
    valueVsAverage?: number
    cpfValid?: boolean
    phoneValid?: boolean
    emailValid?: boolean
    hasCpfInPayment?: boolean
    sameAddressCount?: number
    userAge?: number // dias desde criação da conta
  }
}

/**
 * Analisa pedido e retorna score de risco
 */
export async function analyzeFraud(orderData: {
  userId?: string | null
  total: number
  buyerCpf?: string | null
  buyerEmail?: string | null
  buyerPhone?: string | null
  shippingAddress?: string | null
  ipAddress?: string | null
  paymentMethod?: string | null
  paymentDetails?: any
}): Promise<FraudAnalysis> {
  const reasons: string[] = []
  let score = 0
  const details: FraudAnalysis['details'] = {}

  // =============================================
  // 1. VALIDAÇÃO DE CPF
  // =============================================
  if (orderData.buyerCpf) {
    const cpfValid = isValidCPF(orderData.buyerCpf)
    details.cpfValid = cpfValid
    if (!cpfValid) {
      score += 30
      reasons.push('⚠️ CPF inválido')
    }
  } else {
    score += 15
    reasons.push('⚠️ CPF não informado')
  }

  // =============================================
  // 2. VERIFICAR SE É PRIMEIRO PEDIDO
  // =============================================
  if (orderData.userId) {
    const userOrders = await prisma.order.findMany({
      where: { userId: orderData.userId },
      select: { id: true, total: true, status: true, createdAt: true }
    })

    details.isFirstOrder = userOrders.length === 0
    
    if (details.isFirstOrder && orderData.total > 500) {
      score += 20
      reasons.push(`🆕 Primeiro pedido com valor alto (R$ ${orderData.total.toFixed(2)})`)
    }

    // Calcular idade da conta
    const user = await prisma.user.findUnique({
      where: { id: orderData.userId },
      select: { createdAt: true }
    })
    if (user) {
      const accountAgeDays = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      details.userAge = accountAgeDays
      
      if (accountAgeDays < 1) {
        score += 25
        reasons.push('🆕 Conta criada há menos de 24h')
      } else if (accountAgeDays < 7 && orderData.total > 300) {
        score += 15
        reasons.push('🆕 Conta recente com pedido de valor alto')
      }
    }
  }

  // =============================================
  // 3. MÚLTIPLOS PEDIDOS EM 24H
  // =============================================
  if (orderData.userId) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentOrders = await prisma.order.count({
      where: {
        userId: orderData.userId,
        createdAt: { gte: yesterday }
      }
    })
    
    details.orderCount24h = recentOrders
    
    if (recentOrders >= 3) {
      score += 25
      reasons.push(`🔄 ${recentOrders} pedidos nas últimas 24h`)
    } else if (recentOrders >= 5) {
      score += 40
      reasons.push(`🚨 ${recentOrders} pedidos nas últimas 24h - SUSPEITO`)
    }
  }

  // =============================================
  // 4. MESMO IP - MÚLTIPLOS PEDIDOS
  // =============================================
  if (orderData.ipAddress) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const ordersFromSameIP = await prisma.order.count({
      where: {
        ipAddress: orderData.ipAddress,
        createdAt: { gte: yesterday }
      }
    })
    
    details.orderCountSameIP = ordersFromSameIP
    
    if (ordersFromSameIP >= 3) {
      score += 20
      reasons.push(`🌐 ${ordersFromSameIP} pedidos do mesmo IP nas últimas 24h`)
    } else if (ordersFromSameIP >= 5) {
      score += 35
      reasons.push(`🚨 ${ordersFromSameIP} pedidos do mesmo IP - SUSPEITO`)
    }
  }

  // =============================================
  // 5. VALOR DO PEDIDO MUITO ALTO
  // =============================================
  if (orderData.total > 2000) {
    score += 20
    reasons.push(`💰 Valor muito alto (R$ ${orderData.total.toFixed(2)})`)
  } else if (orderData.total > 5000) {
    score += 35
    reasons.push(`🚨 Valor extremamente alto (R$ ${orderData.total.toFixed(2)})`)
  }

  // =============================================
  // 6. COMPARAR COM MÉDIA DO USUÁRIO
  // =============================================
  if (orderData.userId) {
    const userOrders = await prisma.order.findMany({
      where: {
        userId: orderData.userId,
        status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] }
      },
      select: { total: true }
    })

    if (userOrders.length > 0) {
      const avgValue = userOrders.reduce((sum, o) => sum + o.total, 0) / userOrders.length
      const ratio = orderData.total / avgValue
      details.valueVsAverage = ratio

      if (ratio > 3) {
        score += 15
        reasons.push(`📊 Valor ${ratio.toFixed(1)}x maior que a média do cliente`)
      }
    }
  }

  // =============================================
  // 7. MESMO ENDEREÇO - MÚLTIPLOS CPFS
  // =============================================
  if (orderData.shippingAddress) {
    const ordersToSameAddress = await prisma.order.findMany({
      where: {
        shippingAddress: orderData.shippingAddress,
        buyerCpf: { not: orderData.buyerCpf || undefined }
      },
      select: { buyerCpf: true, buyerName: true }
    })
    
    details.sameAddressCount = ordersToSameAddress.length
    
    if (ordersToSameAddress.length >= 2) {
      score += 15
      reasons.push(`📍 ${ordersToSameAddress.length} CPFs diferentes no mesmo endereço`)
    } else if (ordersToSameAddress.length >= 4) {
      score += 30
      reasons.push(`🚨 ${ordersToSameAddress.length} CPFs diferentes no mesmo endereço - SUSPEITO`)
    }
  }

  // =============================================
  // 8. VALIDAR TELEFONE
  // =============================================
  if (orderData.buyerPhone) {
    const phoneClean = orderData.buyerPhone.replace(/\D/g, '')
    details.phoneValid = phoneClean.length >= 10 && phoneClean.length <= 11
    
    if (!details.phoneValid) {
      score += 10
      reasons.push('📱 Telefone inválido')
    }
  } else {
    score += 10
    reasons.push('📱 Telefone não informado')
  }

  // =============================================
  // 9. VALIDAR EMAIL
  // =============================================
  if (orderData.buyerEmail) {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orderData.buyerEmail)
    details.emailValid = emailValid
    
    if (!emailValid) {
      score += 10
      reasons.push('📧 Email inválido')
    }

    // Emails temporários suspeitos
    const tempEmailDomains = ['tempmail', 'guerrillamail', '10minutemail', 'throwaway', 'mailinator']
    const isTempEmail = tempEmailDomains.some(domain => orderData.buyerEmail?.toLowerCase().includes(domain))
    
    if (isTempEmail) {
      score += 25
      reasons.push('🚨 Email temporário/descartável')
    }
  } else {
    score += 10
    reasons.push('📧 Email não informado')
  }

  // =============================================
  // 10. ANÁLISE DE PIX/PAGAMENTO
  // =============================================
  if (orderData.paymentMethod === 'pix' && orderData.paymentDetails) {
    try {
      const paymentData = typeof orderData.paymentDetails === 'string' 
        ? JSON.parse(orderData.paymentDetails) 
        : orderData.paymentDetails

      // Verificar se CPF do pagamento = CPF do pedido
      const paymentCpf = paymentData.payer?.identification?.number
      
      if (paymentCpf) {
        details.hasCpfInPayment = true
        
        if (orderData.buyerCpf && paymentCpf !== orderData.buyerCpf.replace(/\D/g, '')) {
          score += 30
          reasons.push('🚨 CPF do PIX diferente do CPF do pedido')
        }
      } else {
        score += 15
        reasons.push('⚠️ CPF não identificado no pagamento PIX')
      }
    } catch (error) {
      console.error('Erro ao analisar paymentDetails:', error)
    }
  }

  // =============================================
  // CALCULAR NÍVEL DE RISCO
  // =============================================
  let riskLevel: FraudAnalysis['riskLevel'] = 'low'
  let shouldAlert = false

  if (score >= 80) {
    riskLevel = 'critical'
    shouldAlert = true
  } else if (score >= 50) {
    riskLevel = 'high'
    shouldAlert = true
  } else if (score >= 30) {
    riskLevel = 'medium'
    shouldAlert = true
  }

  return {
    score: Math.min(score, 100),
    reasons,
    riskLevel,
    shouldAlert,
    details
  }
}

/**
 * Busca informações detalhadas para análise manual
 */
export async function getFraudDetails(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          cpf: true,
          createdAt: true,
          orders: {
            select: {
              id: true,
              total: true,
              status: true,
              createdAt: true,
              ipAddress: true,
              paymentMethod: true
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              images: true
            }
          }
        }
      }
    }
  })

  if (!order) return null

  // Buscar pagamento completo
  let paymentInfo = null
  if (order.paymentDetails) {
    try {
      paymentInfo = typeof order.paymentDetails === 'string'
        ? JSON.parse(order.paymentDetails)
        : order.paymentDetails
    } catch (e) {
      console.error('Erro ao parsear paymentDetails:', e)
    }
  }

  // Buscar outros pedidos do mesmo IP
  const ordersFromSameIP = order.ipAddress
    ? await prisma.order.findMany({
        where: {
          ipAddress: order.ipAddress,
          id: { not: orderId }
        },
        select: {
          id: true,
          total: true,
          buyerName: true,
          buyerCpf: true,
          createdAt: true
        },
        take: 10
      })
    : []

  // Buscar pedidos no mesmo endereço
  const ordersToSameAddress = order.shippingAddress
    ? await prisma.order.findMany({
        where: {
          shippingAddress: order.shippingAddress,
          id: { not: orderId }
        },
        select: {
          id: true,
          total: true,
          buyerName: true,
          buyerCpf: true,
          buyerEmail: true,
          createdAt: true
        },
        take: 10
      })
    : []

  return {
    order,
    paymentInfo,
    ordersFromSameIP,
    ordersToSameAddress,
    accountAgeDays: order.user
      ? Math.floor((Date.now() - order.user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : null
  }
}
