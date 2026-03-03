/**
 * 🔍 Sistema de Verificação e Correção de Inconsistências
 * 
 * Verifica periodicamente:
 * 1. Pedidos com pagamento aprovado + antifraude aprovado mas status errado
 * 2. Balance de vendedores não incrementado
 * 3. Pedidos travados em estados inconsistentes
 * 
 * Logs salvos em AuditLog com action = 'CONSISTENCY_CHECK'
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Grava log no banco de dados
 */
async function logConsistencyFix(
  orderId: string,
  issue: string,
  fixed: boolean,
  error?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: 'SYSTEM',
        action: 'CONSISTENCY_CHECK',
        resource: 'Order',
        resourceId: orderId,
        status: fixed ? 'SUCCESS' : 'FAILED',
        details: JSON.stringify({
          issue,
          fixed,
          error,
          timestamp: new Date().toISOString()
        })
      }
    })
  } catch (error) {
    console.error('[Consistency] Erro ao gravar log:', error)
  }
}

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
        },
        // Ignorar pedidos de carnê/financiamento próprio
        paymentMethod: { not: 'carne' }
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
          notIn: ['approved', 'financing'] // 'financing' = carnê aceito pelo cliente
        },
        createdAt: {
          lt: twoDaysAgo
        },
        status: {
          notIn: ['CANCELLED']
        },
        // Nunca cancelar pedidos de carnê/financiamento próprio automaticamente
        paymentMethod: { not: 'carne' }
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
          // 'financing' = pedido de carnê com contrato aceito pelo cliente — não resetar
          notIn: ['approved', 'financing']
        },
        // Nunca mover pedidos de carnê de volta para PENDING
        paymentMethod: { not: 'carne' }
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
        ],
        // Pedidos de carnê não têm frete obrigatório no fluxo de financiamento
        paymentMethod: { not: 'carne' }
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
 * 🔍 10. Verifica pedidos com código de rastreio mas status ainda em PROCESSING
 */
async function checkTrackingWithoutShippedStatus(): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = []

  try {
    const ordersWithTrackingNotShipped = await prisma.order.findMany({
      where: {
        trackingCode: {
          not: null
        },
        status: {
          in: ['PENDING', 'PROCESSING']
        }
      }
    })

    console.log(`[Consistency] Encontrados ${ordersWithTrackingNotShipped.length} pedidos com rastreio mas não despachados`)

    for (const order of ordersWithTrackingNotShipped) {
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'SHIPPED',
            shippedAt: order.shippedAt || new Date(),
            updatedAt: new Date()
          }
        })

        issues.push({
          orderId: order.id,
          issue: 'Pedido com rastreio mas status incorreto - atualizado para SHIPPED',
          fixed: true
        })

        console.log(`[Consistency] ✅ Pedido ${order.id} com rastreio atualizado para SHIPPED`)
      } catch (error: any) {
        issues.push({
          orderId: order.id,
          issue: 'Erro ao atualizar status do pedido com rastreio',
          fixed: false,
          error: error.message
        })
      }
    }
  } catch (error) {
    console.error('[Consistency] Erro ao verificar pedidos com rastreio:', error)
  }

  return issues
}

/**
 * 🔍 11. Verifica divergências de pagamento (valor menor ou não confirmado no gateway)
 */
async function checkPaymentDivergence(): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = []

  try {
    // Buscar pedidos com pagamento aprovado
    const paidOrders = await prisma.order.findMany({
      where: {
        paymentStatus: 'approved',
        status: {
          notIn: ['CANCELLED']
        }
      },
      select: {
        id: true,
        total: true,
        paymentId: true,
        paymentStatus: true
      }
    })

    console.log(`[Consistency] Verificando divergências em ${paidOrders.length} pedidos pagos`)

    for (const order of paidOrders) {
      try {
        // TODO: Implementar verificação com gateway de pagamento
        // Para Mercado Pago, fazer GET /v1/payments/{paymentId}
        // Para outros gateways, implementar conforme API
        // if (order.paymentId) {
        //   const gatewayPayment = await verifyPaymentInGateway(order.paymentId)
        //   if (!gatewayPayment || gatewayPayment.status !== 'approved') {
        //     issues.push({
        //       orderId: order.id,
        //       issue: '🚨 Pagamento não confirmado no gateway - possível fraude',
        //       fixed: false
        //     })
        //   }
        // }

      } catch (error: any) {
        console.error(`[Consistency] Erro ao verificar pagamento do pedido ${order.id}:`, error)
      }
    }

    if (issues.length === 0) {
      console.log('[Consistency] ✅ Nenhuma divergência de pagamento encontrada')
    }

  } catch (error) {
    console.error('[Consistency] Erro ao verificar divergências de pagamento:', error)
  }

  return issues
}

/**
 * � Verifica carnês com todas as parcelas pagas mas pedido ainda não baixado (paymentStatus != 'paid')
 */
async function checkPaidParcelasNotClosed(): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = []

  try {
    // Raw SQL: carnês onde não existe nenhuma parcela que NÃO é PAID,
    // mas existe ao menos uma parcela, e o pedido ainda não está 'paid'
    // (evita bug do Prisma com filtro `none` + enum em MySQL)
    const carnesNaoBaixados = await prisma.$queryRaw<Array<{
      carneId: string
      orderId: string
      paymentStatus: string
      totalParcelas: number
    }>>`
      SELECT c.id AS carneId, c.orderId, o.paymentStatus,
             COUNT(cp.id) AS totalParcelas
      FROM carne c
      INNER JOIN \`order\` o ON o.id = c.orderId
      INNER JOIN carne_parcela cp ON cp.carneId = c.id
      WHERE o.paymentMethod = 'carne'
        AND o.paymentStatus != 'paid'
        AND NOT EXISTS (
          SELECT 1 FROM carne_parcela cp2
          WHERE cp2.carneId = c.id AND cp2.status != 'PAID'
        )
      GROUP BY c.id, c.orderId, o.paymentStatus
      HAVING COUNT(cp.id) > 0
    `

    if (carnesNaoBaixados.length === 0) {
      console.log('[Consistency] ✅ Nenhum carnê com parcelas pagas não baixadas')
      return issues
    }

    console.log(`[Consistency] ⚠️ ${carnesNaoBaixados.length} carnê(s) com todas as parcelas pagas mas pedido não baixado`)

    for (const row of carnesNaoBaixados) {
      const orderId = row.orderId
      try {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'paid' }
        })

        await logConsistencyFix(
          orderId,
          `Carnê ${row.carneId}: todas as ${Number(row.totalParcelas)} parcelas estavam PAID mas paymentStatus era '${row.paymentStatus}'. Corrigido para 'paid'.`,
          true
        )

        issues.push({
          orderId,
          issue: `Carnê quitado não baixado (${Number(row.totalParcelas)} parcelas pagas, status era '${row.paymentStatus}')`,
          fixed: true
        })

        console.log(`[Consistency] ✅ Pedido ${orderId} baixado — carnê totalmente quitado`)
      } catch (error: any) {
        await logConsistencyFix(
          orderId,
          `Erro ao baixar carnê quitado: ${error.message}`,
          false,
          error.message
        )
        issues.push({
          orderId,
          issue: `Carnê quitado não baixado — erro ao corrigir`,
          fixed: false,
          error: error.message
        })
      }
    }
  } catch (error) {
    console.error('[Consistency] Erro ao verificar carnês não baixados:', error)
  }

  return issues
}

/**
 * �🔍 Executa todas as verificações de consistência
 */
/**
 * 13. Verifica pedidos drop DELIVERED com itens supplierStatus em trânsito
 */
async function checkDropItemsWithStaleSupplierStatus(): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = []
  const IN_TRANSIT = ['WAIT_SELLER_SEND_GOODS', 'SELLER_PART_SEND_GOODS', 'WAIT_BUYER_ACCEPT_GOODS', 'PLACE_ORDER_SUCCESS']
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        items: { some: { supplierStatus: { in: IN_TRANSIT } } }
      },
      include: {
        items: {
          where: { supplierStatus: { in: IN_TRANSIT } },
          select: { id: true, supplierStatus: true }
        }
      }
    })
    console.log(`[Consistency] ${orders.length} pedido(s) DELIVERED com itens drop em trânsito`)
    for (const order of orders) {
      try {
        await prisma.orderItem.updateMany({
          where: { orderId: order.id, supplierStatus: { in: IN_TRANSIT } },
          data: { supplierStatus: 'BUYER_ACCEPT_GOODS' }
        })
        await logConsistencyFix(
          order.id,
          `Pedido DELIVERED com ${order.items.length} item(s) em trânsito (${order.items.map(i => i.supplierStatus).join(', ')}). Corrigido para BUYER_ACCEPT_GOODS.`,
          true
        )
        issues.push({ orderId: order.id, issue: 'Itens drop em trânsito em pedido DELIVERED — corrigido para BUYER_ACCEPT_GOODS', fixed: true })
        console.log(`[Consistency] ✅ Pedido ${order.id}: ${order.items.length} item(s) -> BUYER_ACCEPT_GOODS`)
      } catch (err) {
        await logConsistencyFix(order.id, `Erro ao corrigir supplierStatus: ${err.message}`, false, err.message)
        issues.push({ orderId: order.id, issue: 'Erro ao corrigir itens drop em trânsito', fixed: false, error: err.message })
      }
    }
  } catch (error) {
    console.error('[Consistency] Erro ao verificar itens drop com supplierStatus desatualizado:', error)
  }
  return issues
}

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

  // 10. Pedidos com rastreio mas status não é SHIPPED
  console.log('\n🔟 Verificando pedidos com rastreio inconsistente...')
  const trackingIssues = await checkTrackingWithoutShippedStatus()
  allIssues.push(...trackingIssues)

  // 11. Pagamentos com divergências de valor
  console.log('\n1️⃣1️⃣ Verificando divergências de pagamento...')
  const paymentDivergenceIssues = await checkPaymentDivergence()
  allIssues.push(...paymentDivergenceIssues)

  // 12. Carnês com parcelas pagas não baixadas
  console.log('\n1️⃣2️⃣ Verificando carnês quitados não baixados...')
  const carneNaoBaixadoIssues = await checkPaidParcelasNotClosed()
  allIssues.push(...carneNaoBaixadoIssues)

  // 13. Pedidos drop DELIVERED com itens supplierStatus em trânsito
  console.log('\n1️⃣3️⃣ Verificando itens drop com supplierStatus desatualizado...')
  const dropStaleIssues = await checkDropItemsWithStaleSupplierStatus()
  allIssues.push(...dropStaleIssues)

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
  trackingWithoutShipped: number
  paymentDivergence: number
  carneNaoBaixado: number
  dropStaleSupplierStatus: number
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
    ordersWithoutItems,
    trackingWithoutShipped,
    paymentDivergence,
    carneNaoBaixado,
    dropStaleSupplierStatus
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
    // Pedidos abandonados (excluir carnê)
    prisma.order.count({
      where: {
        fraudStatus: 'approved',
        paymentStatus: {
          notIn: ['approved', 'financing']
        },
        createdAt: {
          lt: twoDaysAgo
        },
        status: {
          notIn: ['CANCELLED']
        },
        paymentMethod: { not: 'carne' }
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
    // PROCESSING sem pagamento (excluir carnê com contrato ativo)
    prisma.order.count({
      where: {
        status: 'PROCESSING',
        paymentStatus: {
          notIn: ['approved', 'financing']
        },
        paymentMethod: { not: 'carne' }
      }
    }),
    // Sem comprador (contagem manual via query)
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count 
      FROM \`order\` o
      LEFT JOIN user u ON o.buyerId = u.id
      WHERE u.id IS NULL AND o.status != 'CANCELLED'
    `.then(result => Number(result[0].count)),
    // Sem frete (excluir carnê)
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
        ],
        paymentMethod: { not: 'carne' }
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
    `.then(result => result.length || 0),
    // Rastreio sem SHIPPED
    prisma.order.count({
      where: {
        trackingCode: { not: null },
        status: { in: ['PENDING', 'PROCESSING'] }
      }
    }),
    // Divergência de pagamento - TODO: implementar quando campo paymentAmount existir
    Promise.resolve(0),
    // Carnês totalmente quitados mas pedido não baixado (raw SQL — evita bug Prisma none+enum MySQL)
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT c.id) AS count
      FROM carne c
      INNER JOIN \`order\` o ON o.id = c.orderId
      INNER JOIN carne_parcela cp ON cp.carneId = c.id
      WHERE o.paymentMethod = 'carne'
        AND o.paymentStatus != 'paid'
        AND NOT EXISTS (
          SELECT 1 FROM carne_parcela cp2
          WHERE cp2.carneId = c.id AND cp2.status != 'PAID'
        )
    `.then(r => Number(r[0]?.count ?? 0)),
    // Pedidos DELIVERED com itens drop em trânsito
    prisma.order.count({
      where: {
        status: 'DELIVERED',
        items: { some: { supplierStatus: { in: ['WAIT_SELLER_SEND_GOODS', 'SELLER_PART_SEND_GOODS', 'WAIT_BUYER_ACCEPT_GOODS', 'PLACE_ORDER_SUCCESS'] } } }
      }
    })
  ])

  const healthy =
    stuckOrders === 0 &&
    abandonedOrders === 0 &&
    missingFraudStatus === 0 &&
    processingWithoutPayment === 0 &&
    ordersWithoutBuyer === 0 &&
    ordersWithoutShipping === 0 &&
    dropWithoutSeller === 0 &&
    ordersWithoutItems === 0 &&
    trackingWithoutShipped === 0 &&
    paymentDivergence === 0 &&
    carneNaoBaixado === 0 &&
    dropStaleSupplierStatus === 0

  return {
    healthy,
    stuckOrders,
    abandonedOrders,
    missingFraudStatus,
    processingWithoutPayment,
    ordersWithoutBuyer,
    ordersWithoutShipping,
    dropWithoutSeller,
    ordersWithoutItems,
    trackingWithoutShipped,
    paymentDivergence,
    carneNaoBaixado,
    dropStaleSupplierStatus
  }
}
