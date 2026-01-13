import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get('periodo') || '30' // dias
    const sellerId = searchParams.get('sellerId') // opcional

    const dataInicio = new Date()
    dataInicio.setDate(dataInicio.getDate() - parseInt(periodo))

    // Filtro base
    const whereFilter: any = {
      status: 'APPROVED',
      createdAt: { gte: dataInicio }
    }

    if (sellerId) {
      whereFilter.items = {
        some: { sellerId }
      }
    }

    // 1. Total de vendas aprovadas
    const pedidos = await prisma.order.findMany({
      where: whereFilter,
      include: {
        items: {
          include: {
            seller: {
              include: {
                user: { select: { name: true } }
              }
            },
            product: { select: { name: true } }
          }
        }
      }
    })

    const totalVendas = pedidos.reduce((sum, p) => sum + p.total, 0)
    const totalPedidos = pedidos.length

    // 2. Comissões por vendedor
    const comissoesPorVendedor = new Map()
    
    for (const pedido of pedidos) {
      for (const item of pedido.items) {
        if (!item.sellerId) continue

        const key = item.sellerId
        if (!comissoesPorVendedor.has(key)) {
          comissoesPorVendedor.set(key, {
            sellerId: item.sellerId,
            sellerName: item.seller?.storeName || 'N/A',
            sellerOwner: item.seller?.user?.name || 'N/A',
            totalComissao: 0,
            totalVendido: 0,
            quantidadePedidos: 0,
            quantidadeItens: 0,
            comissaoPaga: 0,
            comissaoPendente: 0
          })
        }

        const vendedor = comissoesPorVendedor.get(key)
        vendedor.totalComissao += item.sellerCommission || 0
        vendedor.totalVendido += item.price * item.quantity
        vendedor.quantidadeItens += 1
        
        if (item.sellerPaid) {
          vendedor.comissaoPaga += item.sellerCommission || 0
        } else {
          vendedor.comissaoPendente += item.sellerCommission || 0
        }
      }
    }

    // Contar pedidos únicos por vendedor
    for (const pedido of pedidos) {
      const vendedoresNoPedido = new Set(
        pedido.items.filter(i => i.sellerId).map(i => i.sellerId)
      )
      vendedoresNoPedido.forEach(sellerId => {
        const vendedor = comissoesPorVendedor.get(sellerId)
        if (vendedor) vendedor.quantidadePedidos += 1
      })
    }

    const vendedores = Array.from(comissoesPorVendedor.values())
      .sort((a, b) => b.totalVendido - a.totalVendido)

    // 3. Comissões totais
    const totalComissoes = vendedores.reduce((sum, v) => sum + v.totalComissao, 0)
    const totalComissoesPagas = vendedores.reduce((sum, v) => sum + v.comissaoPaga, 0)
    const totalComissoesPendentes = vendedores.reduce((sum, v) => sum + v.comissaoPendente, 0)

    // 4. Lucro da plataforma
    const lucroPlataforma = totalVendas - totalComissoes

    // 5. Vendas por dia (últimos 30 dias)
    const vendasPorDia = new Map()
    for (let i = 0; i < parseInt(periodo); i++) {
      const data = new Date()
      data.setDate(data.getDate() - i)
      const key = data.toISOString().split('T')[0]
      vendasPorDia.set(key, { vendas: 0, pedidos: 0 })
    }

    for (const pedido of pedidos) {
      const key = pedido.createdAt.toISOString().split('T')[0]
      if (vendasPorDia.has(key)) {
        const dia = vendasPorDia.get(key)
        dia.vendas += pedido.total
        dia.pedidos += 1
      }
    }

    const graficoVendas = Array.from(vendasPorDia.entries())
      .map(([data, valores]) => ({
        data,
        vendas: valores.vendas,
        pedidos: valores.pedidos
      }))
      .reverse()

    return NextResponse.json({
      periodo: parseInt(periodo),
      resumo: {
        totalVendas,
        totalPedidos,
        totalComissoes,
        totalComissoesPagas,
        totalComissoesPendentes,
        lucroPlataforma,
        ticketMedio: totalPedidos > 0 ? totalVendas / totalPedidos : 0
      },
      vendedores,
      graficoVendas
    })

  } catch (error) {
    console.error('Erro ao gerar relatório:', error)
    return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 })
  }
}
