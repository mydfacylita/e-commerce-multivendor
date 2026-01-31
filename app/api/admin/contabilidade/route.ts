import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET /api/admin/contabilidade
 * Retorna todas as transações financeiras (entradas e saídas)
 * 
 * Fontes de dados:
 * - ENTRADAS: Vendas (orders com status PAID/COMPLETED), fretes pagos
 * - SAÍDAS: Reembolsos, comissões vendedores, saques, custos de etiqueta, custos fornecedores
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type') // ENTRADA ou SAIDA
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const exportCSV = searchParams.get('export') === 'true'

    // Montar filtro de datas
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate + 'T23:59:59')
    }

    // Buscar vendas concluídas (ENTRADA)
    // Status válidos: PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED
    // Pedidos pagos são identificados por paymentStatus = 'approved'
    const ordersWhere: any = {
      status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] },
      paymentStatus: 'approved'
    }
    if (startDate || endDate) {
      ordersWhere.createdAt = dateFilter
    }

    const orders = await prisma.order.findMany({
      where: ordersWhere,
      select: {
        id: true,
        total: true,
        shippingCost: true,
        commissionAmount: true,
        sellerRevenue: true,
        createdAt: true,
        buyerName: true,
        status: true,
        packagingBoxId: true,
        items: {
          select: {
            supplierCost: true,
            sellerId: true,
            sellerRevenue: true,
            commissionAmount: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Buscar embalagens para calcular custos
    const packagingBoxes = await prisma.packagingBox.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        cost: true
      }
    })
    const packagingMap = new Map(packagingBoxes.map(p => [p.id, p]))

    // Buscar reembolsos (SAÍDA)
    // Status: approved, rejected (minúsculo)
    const refundsWhere: any = {
      status: 'approved'
    }
    if (startDate || endDate) {
      refundsWhere.createdAt = dateFilter
    }

    const refunds = await prisma.refund.findMany({
      where: refundsWhere,
      select: {
        id: true,
        orderId: true,
        amount: true,
        reason: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Buscar saques de vendedores (SAÍDA)
    // Status: COMPLETED, REJECTED, CANCELLED (maiúsculo)
    const withdrawalsWhere: any = {
      status: 'COMPLETED'
    }
    if (startDate || endDate) {
      withdrawalsWhere.createdAt = dateFilter
    }

    const withdrawals = await prisma.withdrawal.findMany({
      where: withdrawalsWhere,
      select: {
        id: true,
        sellerId: true,
        amount: true,
        createdAt: true,
        seller: {
          select: { storeName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Montar lista unificada de transações
    const transactions: any[] = []

    // Processar vendas
    for (const order of orders) {
      // Entrada: Valor da venda (produto + frete)
      transactions.push({
        id: `venda-${order.id}`,
        date: order.createdAt.toISOString(),
        type: 'ENTRADA',
        category: 'Venda',
        description: `Venda para ${order.buyerName || 'Cliente'}`,
        reference: order.id,
        value: order.total
      })

      // Entrada separada para frete (se existir)
      if (order.shippingCost && order.shippingCost > 0) {
        transactions.push({
          id: `frete-${order.id}`,
          date: order.createdAt.toISOString(),
          type: 'ENTRADA',
          category: 'Frete Pago',
          description: `Frete do pedido #${order.id.substring(0, 8)}`,
          reference: order.id,
          value: order.shippingCost
        })
      }

      // Saída: Comissão do vendedor (se houver)
      if (order.sellerRevenue && order.sellerRevenue > 0) {
        transactions.push({
          id: `comissao-${order.id}`,
          date: order.createdAt.toISOString(),
          type: 'SAIDA',
          category: 'Comissão Marketplace',
          description: `Repasse para vendedor - Pedido #${order.id.substring(0, 8)}`,
          reference: order.id,
          value: order.sellerRevenue
        })
      }

      // Saída: Custo do fornecedor (dropshipping)
      for (const item of order.items) {
        if (item.supplierCost && item.supplierCost > 0) {
          transactions.push({
            id: `fornecedor-${order.id}-${Math.random().toString(36).substr(2, 9)}`,
            date: order.createdAt.toISOString(),
            type: 'SAIDA',
            category: 'Custo Fornecedor',
            description: `Custo fornecedor - Pedido #${order.id.substring(0, 8)}`,
            reference: order.id,
            value: item.supplierCost
          })
        }
      }

      // Saída: Custo da embalagem
      if (order.packagingBoxId) {
        const packaging = packagingMap.get(order.packagingBoxId)
        if (packaging && packaging.cost > 0) {
          transactions.push({
            id: `embalagem-${order.id}`,
            date: order.createdAt.toISOString(),
            type: 'SAIDA',
            category: 'Custo Embalagem',
            description: `Embalagem ${packaging.name || packaging.code} - Pedido #${order.id.substring(0, 8)}`,
            reference: order.id,
            value: packaging.cost
          })
        }
      }
    }

    // Processar reembolsos
    for (const refund of refunds) {
      transactions.push({
        id: `reembolso-${refund.id}`,
        date: refund.createdAt.toISOString(),
        type: 'SAIDA',
        category: 'Reembolso',
        description: refund.reason || `Reembolso do pedido #${refund.orderId.substring(0, 8)}`,
        reference: refund.orderId,
        value: refund.amount
      })
    }

    // Processar saques
    for (const withdrawal of withdrawals) {
      transactions.push({
        id: `saque-${withdrawal.id}`,
        date: withdrawal.createdAt.toISOString(),
        type: 'SAIDA',
        category: 'Saque Vendedor',
        description: `Saque - ${withdrawal.seller?.storeName || 'Vendedor'}`,
        reference: withdrawal.sellerId,
        value: withdrawal.amount
      })
    }

    // Ordenar por data (mais recente primeiro)
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Aplicar filtros
    let filtered = transactions

    if (type) {
      filtered = filtered.filter(t => t.type === type)
    }

    if (category) {
      filtered = filtered.filter(t => t.category === category)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchLower) ||
        (t.reference && t.reference.toLowerCase().includes(searchLower))
      )
    }

    // Calcular resumo
    const totalEntradas = filtered
      .filter(t => t.type === 'ENTRADA')
      .reduce((sum, t) => sum + t.value, 0)

    const totalSaidas = filtered
      .filter(t => t.type === 'SAIDA')
      .reduce((sum, t) => sum + t.value, 0)

    // Calcular breakdown por categoria
    const breakdownMap = new Map<string, { type: string; total: number; count: number }>()
    for (const t of filtered) {
      const key = `${t.category}-${t.type}`
      if (!breakdownMap.has(key)) {
        breakdownMap.set(key, { type: t.type, total: 0, count: 0 })
      }
      const item = breakdownMap.get(key)!
      item.total += t.value
      item.count += 1
    }

    const breakdown = Array.from(breakdownMap.entries()).map(([key, value]) => ({
      category: key.split('-')[0],
      type: value.type as 'ENTRADA' | 'SAIDA',
      total: value.total,
      count: value.count
    }))

    // Vendas brutas (soma de todas as vendas antes das saídas)
    const vendasBrutas = filtered
      .filter(t => t.category === 'Venda')
      .reduce((sum, t) => sum + t.value, 0)

    const summary = {
      totalEntradas,
      totalSaidas,
      saldo: totalEntradas - totalSaidas,
      vendasBrutas,
      comissoes: filtered.filter(t => t.category === 'Comissão Marketplace').reduce((sum, t) => sum + t.value, 0),
      fretes: filtered.filter(t => t.category === 'Frete Pago').reduce((sum, t) => sum + t.value, 0),
      reembolsos: filtered.filter(t => t.category === 'Reembolso').reduce((sum, t) => sum + t.value, 0),
      saques: filtered.filter(t => t.category === 'Saque Vendedor').reduce((sum, t) => sum + t.value, 0),
      custoEtiquetas: filtered.filter(t => t.category === 'Custo Etiqueta').reduce((sum, t) => sum + t.value, 0),
      custoEmbalagens: filtered.filter(t => t.category === 'Custo Embalagem').reduce((sum, t) => sum + t.value, 0),
      custoFornecedores: filtered.filter(t => t.category === 'Custo Fornecedor').reduce((sum, t) => sum + t.value, 0)
    }

    // Exportar CSV
    if (exportCSV) {
      const csvHeaders = 'Data,Tipo,Categoria,Descrição,Referência,Valor\n'
      const csvRows = filtered.map(t => 
        `"${new Date(t.date).toLocaleDateString('pt-BR')}","${t.type}","${t.category}","${t.description}","${t.reference || ''}","${t.value.toFixed(2)}"`
      ).join('\n')

      const csv = csvHeaders + csvRows

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="contabilidade-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // Paginação
    const total = filtered.length
    const totalPages = Math.ceil(total / limit)
    const paginatedTransactions = filtered.slice((page - 1) * limit, page * limit)

    return NextResponse.json({
      transactions: paginatedTransactions,
      summary,
      breakdown,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })
  } catch (error: any) {
    console.error('Erro ao buscar contabilidade:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados contábeis', details: error.message },
      { status: 500 }
    )
  }
}
