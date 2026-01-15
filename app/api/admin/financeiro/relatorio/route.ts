import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const periodo = parseInt(searchParams.get('periodo') || '30')

    const dataInicio = new Date()
    dataInicio.setDate(dataInicio.getDate() - periodo)

    // Buscar todos os pedidos do período com PROCESSING, SHIPPED, DELIVERED
    const pedidos = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: dataInicio
        },
        status: {
          in: ['PROCESSING', 'SHIPPED', 'DELIVERED']
        },
        paymentStatus: 'approved'
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true
              }
            }
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Buscar todos os sellers
    const sellers = await prisma.seller.findMany({
      select: {
        id: true,
        storeName: true,
        userId: true
      }
    })

    // Buscar informações dos donos dos sellers
    const sellerOwners = await prisma.user.findMany({
      where: {
        id: {
          in: sellers.map(s => s.userId)
        }
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })

    const sellerOwnersMap = new Map(sellerOwners.map(u => [u.id, u]))

    // Buscar assinaturas de planos ativas no período
    const subscriptions = await prisma.subscription.findMany({
      where: {
        OR: [
          {
            startDate: {
              gte: dataInicio
            }
          },
          {
            nextBillingDate: {
              gte: dataInicio,
              lte: new Date()
            }
          }
        ],
        status: {
          in: ['ACTIVE', 'TRIAL']
        }
      },
      include: {
        plan: {
          select: {
            name: true,
            price: true
          }
        },
        seller: {
          select: {
            storeName: true,
            userId: true
          }
        }
      }
    })

    // Calcular receita de planos
    const receitaPlanos = subscriptions.reduce((sum, sub) => {
      // Se startDate está no período, conta como nova assinatura
      if (sub.startDate >= dataInicio) {
        return sum + sub.price
      }
      // Se nextBillingDate está no período, conta como renovação
      if (sub.nextBillingDate && sub.nextBillingDate >= dataInicio && sub.nextBillingDate <= new Date()) {
        return sum + sub.price
      }
      return sum
    }, 0)

    // Agrupar assinaturas por plano
    const planosPorTipo: Record<string, { nome: string; quantidade: number; receita: number }> = {}
    subscriptions.forEach(sub => {
      const planName = sub.plan.name
      if (!planosPorTipo[planName]) {
        planosPorTipo[planName] = {
          nome: planName,
          quantidade: 0,
          receita: 0
        }
      }
      planosPorTipo[planName].quantidade += 1
      
      if (sub.startDate >= dataInicio) {
        planosPorTipo[planName].receita += sub.price
      } else if (sub.nextBillingDate && sub.nextBillingDate >= dataInicio && sub.nextBillingDate <= new Date()) {
        planosPorTipo[planName].receita += sub.price
      }
    })

    const receitaPorPlano = Object.values(planosPorTipo)

    // Calcular métricas globais
    const totalVendas = pedidos.reduce((sum, p) => sum + p.total, 0)
    const totalPedidos = pedidos.length

    // Calcular comissões totais
    let totalComissoes = 0
    let totalComissoesPagas = 0
    let totalComissoesPendentes = 0
    let lucroPlataforma = 0

    pedidos.forEach(pedido => {
      pedido.items.forEach(item => {
        if (item.commissionAmount) {
          totalComissoes += item.commissionAmount
          
          // Se pedido foi entregue, comissão está paga
          if (pedido.status === 'DELIVERED') {
            totalComissoesPagas += item.commissionAmount
          } else {
            totalComissoesPendentes += item.commissionAmount
          }
        }

        // Lucro da plataforma = comissão + margem em produtos próprios
        if (item.commissionAmount) {
          lucroPlataforma += item.commissionAmount
        }
        
        // Se não tem seller (produto próprio), todo o valor é lucro
        if (!item.sellerId) {
          lucroPlataforma += item.price * item.quantity
        }
      })
    })

    const ticketMedio = totalPedidos > 0 ? totalVendas / totalPedidos : 0

    // Agrupar vendas por dia
    const vendasPorDia: Record<string, { vendas: number; pedidos: number }> = {}
    pedidos.forEach(pedido => {
      const data = pedido.createdAt.toISOString().split('T')[0]
      if (!vendasPorDia[data]) {
        vendasPorDia[data] = { vendas: 0, pedidos: 0 }
      }
      vendasPorDia[data].vendas += pedido.total
      vendasPorDia[data].pedidos += 1
    })

    const graficoVendas = Object.entries(vendasPorDia)
      .map(([data, valores]) => ({
        data,
        vendas: valores.vendas,
        pedidos: valores.pedidos
      }))
      .sort((a, b) => a.data.localeCompare(b.data))

    // Desempenho por vendedor
    const vendedoresMap: Record<string, any> = {}

    pedidos.forEach(pedido => {
      pedido.items.forEach(item => {
        if (item.sellerId) {
          if (!vendedoresMap[item.sellerId]) {
            const seller = sellers.find(s => s.id === item.sellerId)
            const owner = seller ? sellerOwnersMap.get(seller.userId) : null
            vendedoresMap[item.sellerId] = {
              sellerId: item.sellerId,
              sellerName: seller?.storeName || 'Desconhecido',
              sellerOwner: owner?.name || 'Desconhecido',
              totalComissao: 0,
              totalVendido: 0,
              quantidadePedidos: new Set(),
              quantidadeItens: 0,
              comissaoPaga: 0,
              comissaoPendente: 0
            }
          }

          const valorItem = item.price * item.quantity
          vendedoresMap[item.sellerId].totalVendido += valorItem
          vendedoresMap[item.sellerId].quantidadePedidos.add(pedido.id)
          vendedoresMap[item.sellerId].quantidadeItens += item.quantity

          if (item.commissionAmount) {
            vendedoresMap[item.sellerId].totalComissao += item.commissionAmount
            
            if (pedido.status === 'DELIVERED') {
              vendedoresMap[item.sellerId].comissaoPaga += item.commissionAmount
            } else {
              vendedoresMap[item.sellerId].comissaoPendente += item.commissionAmount
            }
          }
        }
      })
    })

    const vendedores = Object.values(vendedoresMap).map((v: any) => ({
      ...v,
      quantidadePedidos: v.quantidadePedidos.size
    }))

    // Despesas (exemplo - você pode expandir)
    const despesas = {
      comissoesVendedores: pedidos.reduce((sum, p) => {
        return sum + p.items.reduce((itemSum, item) => {
          return itemSum + (item.sellerRevenue || 0)
        }, 0)
      }, 0),
      taxasGateway: totalVendas * 0.0399, // 3.99% Mercado Pago
      taxasPix: pedidos.filter(p => p.paymentMethod === 'PIX').length * 0, // PIX é grátis
      custosFrete: pedidos.reduce((sum, p) => sum + (p.shippingCost || 0), 0)
    }

    const totalDespesas = despesas.comissoesVendedores + despesas.taxasGateway + despesas.custosFrete

    // Receitas detalhadas
    const receitas = {
      vendas: totalVendas,
      comissoes: totalComissoes,
      frete: pedidos.reduce((sum, p) => sum + (p.shippingCost || 0), 0),
      planos: receitaPlanos
    }

    const totalReceitas = receitas.vendas + receitas.frete + receitas.planos

    // Produtos mais vendidos
    const produtosMap: Record<string, any> = {}
    pedidos.forEach(pedido => {
      pedido.items.forEach(item => {
        if (!produtosMap[item.productId]) {
          produtosMap[item.productId] = {
            productId: item.productId,
            productName: item.product?.name || 'Produto Desconhecido',
            quantidade: 0,
            valorTotal: 0,
            isDrop: item.sellerId !== null // Se tem sellerId, é drop
          }
        }
        produtosMap[item.productId].quantidade += item.quantity
        produtosMap[item.productId].valorTotal += item.price * item.quantity
      })
    })

    const produtosMaisVendidos = Object.values(produtosMap)
      .sort((a: any, b: any) => b.valorTotal - a.valorTotal)
      .slice(0, 10)

    return NextResponse.json({
      periodo,
      resumo: {
        totalVendas,
        totalPedidos,
        totalComissoes,
        totalComissoesPagas,
        totalComissoesPendentes,
        lucroPlataforma,
        ticketMedio
      },
      receitas: {
        vendas: receitas.vendas,
        comissoes: totalComissoes,
        frete: receitas.frete,
        planos: receitaPlanos,
        total: totalReceitas
      },
      despesas: {
        comissoesVendedores: despesas.comissoesVendedores,
        taxasGateway: despesas.taxasGateway,
        custosFrete: despesas.custosFrete,
        total: totalDespesas
      },
      lucroLiquido: lucroPlataforma - totalDespesas + receitaPlanos,
      vendedores,
      graficoVendas,
      produtosMaisVendidos,
      receitaPorPlano,
      totalAssinaturasAtivas: subscriptions.filter(s => s.status === 'ACTIVE').length,
      totalAssinaturasTrial: subscriptions.filter(s => s.status === 'TRIAL').length
    })
  } catch (error: any) {
    console.error('[Relatório Financeiro] Erro:', error)
    return NextResponse.json(
      {
        error: 'Erro ao gerar relatório',
        message: error.message
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
