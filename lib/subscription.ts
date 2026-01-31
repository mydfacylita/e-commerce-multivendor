/**
 * Funções auxiliares para gerenciamento de assinaturas
 */

import { prisma } from './prisma'

/**
 * Busca a assinatura ativa (ou mais recente) de um vendedor
 * Prioridade: ACTIVE > TRIAL > PENDING_PAYMENT > mais recente
 */
export async function getActiveSubscription(sellerId: string) {
  // Primeiro tentar pegar assinatura ACTIVE
  let subscription = await prisma.subscription.findFirst({
    where: {
      sellerId,
      status: 'ACTIVE'
    },
    include: { plan: true },
    orderBy: { createdAt: 'desc' }
  })

  if (subscription) return subscription

  // Se não tem ACTIVE, tentar TRIAL
  subscription = await prisma.subscription.findFirst({
    where: {
      sellerId,
      status: 'TRIAL'
    },
    include: { plan: true },
    orderBy: { createdAt: 'desc' }
  })

  if (subscription) return subscription

  // Se não tem TRIAL, tentar PENDING_PAYMENT
  subscription = await prisma.subscription.findFirst({
    where: {
      sellerId,
      status: 'PENDING_PAYMENT'
    },
    include: { plan: true },
    orderBy: { createdAt: 'desc' }
  })

  if (subscription) return subscription

  // Senão, retornar a mais recente qualquer que seja o status
  subscription = await prisma.subscription.findFirst({
    where: { sellerId },
    include: { plan: true },
    orderBy: { createdAt: 'desc' }
  })

  return subscription
}

/**
 * Busca a assinatura ativa (ACTIVE ou TRIAL) de um vendedor
 * Retorna null se não houver assinatura ativa
 */
export async function getValidSubscription(sellerId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      sellerId,
      status: { in: ['ACTIVE', 'TRIAL'] },
      endDate: { gte: new Date() }
    },
    include: { plan: true },
    orderBy: { createdAt: 'desc' }
  })

  return subscription
}

/**
 * Busca todo o histórico de assinaturas de um vendedor
 */
export async function getSubscriptionHistory(sellerId: string) {
  return prisma.subscription.findMany({
    where: { sellerId },
    include: { plan: true },
    orderBy: { createdAt: 'desc' }
  })
}

/**
 * Gera número de contrato único
 */
export function generateContractNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `CT${year}${random}`
}

/**
 * Renova uma assinatura criando um novo registro
 */
export async function renewSubscription(currentSubscriptionId: string) {
  const current = await prisma.subscription.findUnique({
    where: { id: currentSubscriptionId },
    include: { plan: true }
  })

  if (!current) throw new Error('Assinatura não encontrada')

  // Calcular nova data de término
  const startDate = new Date()
  const endDate = new Date(startDate)
  
  switch (current.billingCycle) {
    case 'MONTHLY':
      endDate.setMonth(endDate.getMonth() + 1)
      break
    case 'QUARTERLY':
      endDate.setMonth(endDate.getMonth() + 3)
      break
    case 'SEMIANNUAL':
      endDate.setMonth(endDate.getMonth() + 6)
      break
    case 'ANNUAL':
      endDate.setFullYear(endDate.getFullYear() + 1)
      break
  }

  // Criar nova assinatura
  const newSubscription = await prisma.subscription.create({
    data: {
      sellerId: current.sellerId,
      planId: current.planId,
      status: 'PENDING_PAYMENT',
      startDate,
      endDate,
      price: current.plan.price,
      billingCycle: current.billingCycle,
      nextBillingDate: endDate,
      autoRenew: current.autoRenew,
      contractNumber: generateContractNumber(),
      previousId: current.id
    }
  })

  // Atualizar assinatura anterior com referência para a nova
  await prisma.subscription.update({
    where: { id: current.id },
    data: { renewedToId: newSubscription.id }
  })

  return newSubscription
}
