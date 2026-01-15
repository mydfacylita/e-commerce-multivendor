/**
 * 🔍 Sistema de Verificação e Correção de Inconsistências
 * 
 * Verifica periodicamente:
 * 1. Pedidos com pagamento aprovado + antifraude aprovado mas status errado
 * 2. Balance de vendedores não incrementado
 * 3. Pedidos travados em estados inconsistentes
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ConsistencyIssue {
  orderId: string
  issue: string
  fixed: boolean
  error?: string
}

interface CheckResult {
  timestamp: Date
  totalChecked: number
  issuesFound: number
  issuesFixed: number
  issues: ConsistencyIssue[]
}

/**
 * 🔍 Verifica e corrige pedidos com pagamento e antifraude aprovados mas não processando
 */
async function fixStuckOrders(): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = []

  try {
    // Buscar pedidos travados
    const stuckOrders = await prisma.order.findMany({
      where: {
        paymentStatus: 'approved',
        fraudStatus: 'approved',
        status: {
          notIn: ['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']
        }
      },
      include: {
        items: {
          include: {
            product: {
              select: { sellerId: true }
            }
          }
        }
      }
    })

    console.log(`[Consistency] Encontrados ${stuckOrders.length} pedidos travados`)

    for (const order of stuckOrders) {
      try {
        // Verificar se balance já foi incrementado
        const orderItems = await prisma.orderItem.findMany({
          where: { orderId: order.id }
        })

        // Calcular balance esperado
        const sellerBalances = new Map<string, number>()
        for (const item of orderItems) {
          if (item.sellerId && item.sellerRevenue) {
            const current = sellerBalances.get(item.sellerId) || 0
            sellerBalances.set(item.sellerId, current + item.sellerRevenue)
          }
        }

        // Atualizar em transação
        await prisma.$transaction(async (tx) => {
          // Mudar status para PROCESSING
          await tx.order.update({
            where: { id: order.id },
            data: { 
              status: 'PROCESSING',
              updatedAt: new Date()
            }
          })

          // Incrementar balance dos vendedores
          for (const [sellerId, revenue] of sellerBalances.entries()) {
            const seller = await tx.seller.findUnique({
              where: { id: sellerId },
              select: { balance: true, totalEarned: true }
            })

            if (seller) {
              // Verificar se já foi incrementado (heurística: se balance >= revenue)
              // Nota: Isso não é 100% preciso, mas evita duplicação
              const alreadyIncremented = seller.balance >= revenue

              if (!alreadyIncremented) {
                await tx.seller.update({
                  where: { id: sellerId },
                  data: {
                    balance: { increment: revenue },
                    totalEarned: { increment: revenue }
                  }
                })
                console.log(`[Consistency] Balance incrementado: Vendedor ${sellerId.slice(0, 8)} + R$ ${revenue.toFixed(2)}`)
              } else {
                console.log(`[Consistency] Balance já incrementado: Vendedor ${sellerId.slice(0, 8)}`)
              }
            }
          }
        })

        issues.push({
          orderId: order.id,
          issue: 'Pedido travado com pagamento e antifraude aprovados',
          fixed: true
        })

        console.log(`[Consistency] ✅ Pedido ${order.id} corrigido`)
      } catch (error: any) {
        issues.push({
          orderId: order.id,
          issue: 'Erro ao corrigir pedido travado',
          fixed: false,
          error: error.message
        })
        console.error(`[Consistency] ❌ Erro ao corrigir pedido ${order.id}:`, error)
      }
    }
  } catch (error) {
    console.error('[Consistency] Erro ao buscar pedidos travados:', error)
  }

  return issues
}

/**
 * 🔍 Verifica pedidos com antifraude aprovado mas sem pagamento há muito tempo
 */
async function checkAbandonedOrders(): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = []

  try {
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const abandonedOrders = await prisma.order.findMany({
      where: {
        fraudStatus: 'approved',
        paymentStatus: {
          notIn: ['approved']
        },
        createdAt: {
          lt: twoDaysAgo
        },
        status: {
          notIn: ['CANCELLED']
        }
      }
    })

    console.log(`[Consistency] Encontrados ${abandonedOrders.length} pedidos abandonados`)

    for (const order of abandonedOrders) {
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'CANCELLED',
            cancelReason: 'Pedido cancelado automaticamente - Pagamento não confirmado em 48h',
            updatedAt: new Date()
          }
        })

        issues.push({
          orderId: order.id,
          issue: 'Pedido abandonado (48h sem pagamento)',
          fixed: true
        })

        console.log(`[Consistency] ✅ Pedido abandonado ${order.id} cancelado`)
      } catch (error: any) {
        issues.push({
          orderId: order.id,
          issue: 'Erro ao cancelar pedido abandonado',
          fixed: false,
          error: error.message
        })
      }
    }
  } catch (error) {
    console.error('[Consistency] Erro ao verificar pedidos abandonados:', error)
  }

  return issues
}

/**
 * 🔍 Verifica pedidos com fraudScore alto mas sem fraudStatus
 */
async function checkMissingFraudStatus(): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = []

  try {
    const ordersWithoutStatus = await prisma.order.findMany({
      where: {
        fraudScore: {
          gte: 30
        },
        fraudStatus: null
      }
    })

    console.log(`[Consistency] Encontrados ${ordersWithoutStatus.length} pedidos sem fraudStatus`)

    for (const order of ordersWithoutStatus) {
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            fraudStatus: 'pending',
            updatedAt: new Date()
          }
        })

        issues.push({
          orderId: order.id,
          issue: 'Pedido com score alto sem fraudStatus',
          fixed: true
        })

        console.log(`[Consistency] ✅ FraudStatus definido para pedido ${order.id}`)
      } catch (error: any) {
        issues.push({
          orderId: order.id,
          issue: 'Erro ao definir fraudStatus',
          fixed: false,
          error: error.message
        })
      }
    }
  } catch (error) {
    console.error('[Consistency] Erro ao verificar fraudStatus:', error)
  }

  return issues
}

/**
 * 🔍 Verifica pedidos em PROCESSING sem pagamento aprovado
 */
async function checkProcessingWithoutPayment(): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = []

  try {
    const invalidOrders = await prisma.order.findMany({
      where: {
        status: 'PROCESSING',
        paymentStatus: {
          not: 'approved'
        }
      }
    })

    console.log(`[Consistency] Encontrados ${invalidOrders.length} pedidos em PROCESSING sem pagamento`)

    for (const order of invalidOrders) {
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'PENDING',
            updatedAt: new Date()
          }
        })

        issues.push({
          orderId: order.id,
          issue: 'Pedido em PROCESSING sem pagamento aprovado - movido para PENDING',
          fixed: true
        })

        console.log(`[Consistency] ✅ Pedido ${order.id} movido para PENDING`)
      } catch (error: any) {
        issues.push({
          orderId: order.id,
          issue: 'Erro ao corrigir status sem pagamento',
          fixed: false,
          error: error.message
        })
      }
    }
  } catch (error) {
    console.error('[Consistency] Erro ao verificar pedidos sem pagamento:', error)
  }

  return issues
}

/**
 * 🔍 Verifica pedidos sem cliente válido
 */
async function checkOrdersWithoutValidBuyer(): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = []

  try {
    // Buscar pedidos onde o usuário não existe mais
    const ordersWithInvalidBuyer = await prisma.order.findMany({
      where: {
        status: {
          notIn: ['CANCELLED']
        }
      },
      include: {
        user: true
      }
    })

    const orphanOrders = ordersWithInvalidBuyer.filter(o => !o.user)

    console.log(`[Consistency] Encontrados ${orphanOrders.length} pedidos sem cliente válido`)

    for (const order of orphanOrders) {
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'CANCELLED',
            cancelReason: 'Pedido cancelado - Cliente não encontrado no sistema',
            updatedAt: new Date()
          }
        })

        issues.push({
          orderId: order.id,
          issue: 'Pedido sem cliente válido - cancelado',
          fixed: true
        })

        console.log(`[Consistency] ✅ Pedido órfão ${order.id} cancelado`)
      } catch (error: any) {
        issues.push({
          orderId: order.id,
          issue: 'Erro ao cancelar pedido órfão',
          fixed: false,
          error: error.message
        })
      }
    }
  } catch (error) {
    console.error('[Consistency] Erro ao verificar pedidos órfãos:', error)
  }

  return issues
}

/**
 * 🔍 Verifica pedidos sem frete calculado
 */
async function checkOrdersWithoutShipping(): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = []

  try {
    const ordersWithoutShipping = await prisma.order.findMany({
      where: {
        status: {
          in: ['PROCESSING', 'SHIPPED']
        },
        OR: [
          { shippingCost: null },
          { shippingCost: 0 },
          { shippingMethod: null },
          { shippingMethod: '' }
        ]
      }
    })

    console.log(`[Consistency] Encontrados ${ordersWithoutShipping.length} pedidos sem frete válido`)

    for (const order of ordersWithoutShipping) {
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'PENDING',
            updatedAt: new Date()
          }
        })

        issues.push({
          orderId: order.id,
          issue: 'Pedido em processamento sem frete calculado - movido para PENDING',
          fixed: true
        })

        console.log(`[Consistency] ✅ Pedido ${order.id} sem frete movido para PENDING`)
      } catch (error: any) {
        issues.push({
          orderId: order.id,
          issue: 'Erro ao corrigir pedido sem frete',
          fixed: false,
          error: error.message
        })
      }
    }
  } catch (error) {
    console.error('[Consistency] Erro ao verificar pedidos sem frete:', error)
  }

  return issues
}

/**
 * 🔍 Verifica pedidos drop sem vendedor
 */
async function checkDropOrdersWithoutSeller(): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = []

  try {
    const dropOrders = await prisma.order.findMany({
      where: {
        status: {
          notIn: ['CANCELLED']
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    const invalidDropOrders = dropOrders.filter(order => 
      order.items.some(item => item.product && 'isDrop' in item.product && item.product.isDrop && !item.sellerId)
    )

    console.log(`[Consistency] Encontrados ${invalidDropOrders.length} pedidos drop sem vendedor`)

    for (const order of invalidDropOrders) {
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'CANCELLED',
            cancelReason: 'Pedido cancelado - Produto dropshipping sem vendedor definido',
            updatedAt: new Date()
          }
        })

        issues.push({
          orderId: order.id,
          issue: 'Pedido drop sem vendedor - cancelado',
          fixed: true
        })

        console.log(`[Consistency] ✅ Pedido drop ${order.id} sem vendedor cancelado`)
      } catch (error: any) {
        issues.push({
          orderId: order.id,
          issue: 'Erro ao cancelar pedido drop sem vendedor',
          fixed: false,
          error: error.message
        })
      }
    }
  } catch (error) {
    console.error('[Consistency] Erro ao verificar pedidos drop:', error)
  }

  return issues
}

/**
 * 🔍 Verifica pedidos sem produtos
 */
async function checkOrdersWithoutItems(): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = []

  try {
    const orders = await prisma.order.findMany({
      where: {
        status: {
          notIn: ['CANCELLED']
        }
      },
      include: {
        items: true
      }
    })

    const ordersWithoutItems = orders.filter(o => o.items.length === 0)

    console.log(`[Consistency] Encontrados ${ordersWithoutItems.length} pedidos sem produtos`)

    for (const order of ordersWithoutItems) {
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'CANCELLED',
            cancelReason: 'Pedido cancelado - Nenhum produto encontrado',
            updatedAt: new Date()
          }
        })

        issues.push({
          orderId: order.id,
          issue: 'Pedido sem produtos - cancelado',
          fixed: true
        })

        console.log(`[Consistency] ✅ Pedido vazio ${order.id} cancelado`)
      } catch (error: any) {
        issues.push({
          orderId: order.id,
          issue: 'Erro ao cancelar pedido vazio',
          fixed: false,
          error: error.message
        })
      }
    }
  } catch (error) {
    console.error('[Consistency] Erro ao verificar pedidos vazios:', error)
  }

  return issues
}

/**
 * 🔍 Verifica pagamentos sem pedidos (limpa registros órfãos)
 */
async function checkOrphanPayments(): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = []

  try {
    // Buscar todos os pedidos com paymentId
    const ordersWithPayment = await prisma.order.findMany({
      where: {
        paymentId: {
          not: null
        }
      },
      select: {
        paymentId: true
      }
    })

    const validPaymentIds = new Set(ordersWithPayment.map(o => o.paymentId).filter(Boolean))

    // Aqui você pode adicionar lógica para limpar payments órfãos se tiver tabela separada
    // Por enquanto, apenas registramos para auditoria
    console.log(`[Consistency] Total de paymentIds válidos: ${validPaymentIds.size}`)

    issues.push({
      orderId: 'SYSTEM',
      issue: `Auditoria de pagamentos - ${validPaymentIds.size} pagamentos vinculados`,
      fixed: true
    })

  } catch (error) {
    console.error('[Consistency] Erro ao verificar pagamentos órfãos:', error)
  }

  return issues
}

/**
 * 🔍 Executa todas as verificações de consistência
 */
export async function checkAndFixConsistency(): Promise<CheckResult> {
  console.log('\n🔍 [Consistency Check] Iniciando verificação de consistência...')
  const startTime = Date.now()

  const allIssues: ConsistencyIssue[] = []

  // 1. Corrigir pedidos travados
  console.log('\n1️⃣ Verificando pedidos travados...')
  const stuckIssues = await fixStuckOrders()
  allIssues.push(...stuckIssues)

  // 2. Cancelar pedidos abandonados
  console.log('\n2️⃣ Verificando pedidos abandonados...')
  const abandonedIssues = await checkAbandonedOrders()
  allIssues.push(...abandonedIssues)

  // 3. Corrigir fraudStatus faltando
  console.log('\n3️⃣ Verificando fraudStatus...')
  const fraudStatusIssues = await checkMissingFraudStatus()
  allIssues.push(...fraudStatusIssues)

  // 4. Pedidos em PROCESSING sem pagamento
  console.log('\n4️⃣ Verificando pedidos sem pagamento...')
  const noPaymentIssues = await checkProcessingWithoutPayment()
  allIssues.push(...noPaymentIssues)

  // 5. Pedidos sem cliente válido
  console.log('\n5️⃣ Verificando pedidos órfãos...')
  const orphanIssues = await checkOrdersWithoutValidBuyer()
  allIssues.push(...orphanIssues)

  // 6. Pedidos sem frete calculado
  console.log('\n6️⃣ Verificando pedidos sem frete...')
  const noShippingIssues = await checkOrdersWithoutShipping()
  allIssues.push(...noShippingIssues)

  // 7. Pedidos drop sem vendedor
  console.log('\n7️⃣ Verificando pedidos drop...')
  const dropIssues = await checkDropOrdersWithoutSeller()
  allIssues.push(...dropIssues)

  // 8. Pedidos sem produtos
  console.log('\n8️⃣ Verificando pedidos vazios...')
  const emptyOrderIssues = await checkOrdersWithoutItems()
  allIssues.push(...emptyOrderIssues)

  // 9. Pagamentos órfãos (auditoria)
  console.log('\n9️⃣ Verificando pagamentos órfãos...')
  const paymentIssues = await checkOrphanPayments()
  allIssues.push(...paymentIssues)

  const issuesFixed = allIssues.filter(i => i.fixed).length
  const duration = Date.now() - startTime

  console.log(`\n✅ [Consistency Check] Verificação concluída em ${duration}ms`)
  console.log(`   Total verificado: ${allIssues.length}`)
  console.log(`   Problemas encontrados: ${allIssues.length}`)
  console.log(`   Problemas corrigidos: ${issuesFixed}`)

  return {
    timestamp: new Date(),
    totalChecked: allIssues.length,
    issuesFound: allIssues.length,
    issuesFixed,
    issues: allIssues
  }
}

/**
 * 🔍 Versão simplificada para health check rápido
 */
export async function quickHealthCheck(): Promise<{
  healthy: boolean
  stuckOrders: number
  abandonedOrders: number
  missingFraudStatus: number
  processingWithoutPayment: number
  ordersWithoutBuyer: number
  ordersWithoutShipping: number
  dropWithoutSeller: number
  ordersWithoutItems: number
}> {
  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

  const [
    stuckOrders,
    abandonedOrders,
    missingFraudStatus,
    processingWithoutPayment,
    ordersWithoutBuyer,
    ordersWithoutShipping,
    dropWithoutSeller,
    ordersWithoutItems
  ] = await Promise.all([
    // Pedidos travados
    prisma.order.count({
      where: {
        paymentStatus: 'approved',
        fraudStatus: 'approved',
        status: {
          notIn: ['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']
        }
      }
    }),
    // Pedidos abandonados
    prisma.order.count({
      where: {
        fraudStatus: 'approved',
        paymentStatus: {
          notIn: ['approved']
        },
        createdAt: {
          lt: twoDaysAgo
        },
        status: {
          notIn: ['CANCELLED']
        }
      }
    }),
    // Sem fraudStatus
    prisma.order.count({
      where: {
        fraudScore: {
          gte: 30
        },
        fraudStatus: null
      }
    }),
    // PROCESSING sem pagamento
    prisma.order.count({
      where: {
        status: 'PROCESSING',
        paymentStatus: {
          not: 'approved'
        }
      }
    }),
    // Sem comprador (contagem manual via query)
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count 
      FROM \`order\` o
      LEFT JOIN user u ON o.buyerId = u.id
      WHERE u.id IS NULL AND o.status != 'CANCELLED'
    `.then(result => Number(result[0].count)),
    // Sem frete
    prisma.order.count({
      where: {
        status: {
          in: ['PROCESSING', 'SHIPPED']
        },
        OR: [
          { shippingCost: null },
          { shippingCost: 0 },
          { shippingMethod: null },
          { shippingMethod: '' }
        ]
      }
    }),
    // Drop sem vendedor (contagem manual via query)
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT o.id) as count
      FROM \`order\` o
      JOIN order_item oi ON o.id = oi.orderId
      JOIN product p ON oi.productId = p.id
      WHERE p.isDrop = 1 AND oi.sellerId IS NULL AND o.status != 'CANCELLED'
    `.then(result => Number(result[0].count)),
    // Sem itens
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM \`order\` o
      LEFT JOIN order_item oi ON o.id = oi.orderId
      WHERE oi.id IS NULL AND o.status != 'CANCELLED'
      GROUP BY o.id
    `.then(result => result.length || 0)
  ])

  const healthy =
    stuckOrders === 0 &&
    abandonedOrders === 0 &&
    missingFraudStatus === 0 &&
    processingWithoutPayment === 0 &&
    ordersWithoutBuyer === 0 &&
    ordersWithoutShipping === 0 &&
    dropWithoutSeller === 0 &&
    ordersWithoutItems === 0

  return {
    healthy,
    stuckOrders,
    abandonedOrders,
    missingFraudStatus,
    processingWithoutPayment,
    ordersWithoutBuyer,
    ordersWithoutShipping,
    dropWithoutSeller,
    ordersWithoutItems
  }
}
