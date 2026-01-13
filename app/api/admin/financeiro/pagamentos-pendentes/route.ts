import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Lista pagamentos pendentes para vendedores
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar pedidos aprovados dos últimos 30 dias com comissões pendentes
    const pedidosPendentes = await prisma.order.findMany({
      where: {
        status: 'APPROVED',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // últimos 30 dias
        },
        items: {
          some: {
            sellerId: { not: null },
            sellerPaid: false // ainda não foi pago
          }
        }
      },
      include: {
        items: {
          where: {
            sellerId: { not: null },
            sellerPaid: false
          },
          include: {
            seller: {
              include: {
                user: {
                  select: { name: true, email: true }
                }
              }
            },
            product: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Agrupar por vendedor
    const pagamentosPorVendedor = new Map()

    for (const pedido of pedidosPendentes) {
      for (const item of pedido.items) {
        if (!item.seller) continue

        const key = item.sellerId
        if (!pagamentosPorVendedor.has(key)) {
          pagamentosPorVendedor.set(key, {
            sellerId: item.sellerId,
            sellerName: item.seller.storeName,
            sellerOwner: item.seller.user?.name || 'N/A',
            sellerEmail: item.seller.user?.email,
            totalComissao: 0,
            totalItens: 0,
            pedidos: []
          })
        }

        const vendedor = pagamentosPorVendedor.get(key)
        vendedor.totalComissao += item.sellerCommission || 0
        vendedor.totalItens += 1
        
        // Adicionar pedido se ainda não estiver na lista
        if (!vendedor.pedidos.find((p: any) => p.orderId === pedido.id)) {
          vendedor.pedidos.push({
            orderId: pedido.id,
            orderNumber: pedido.orderNumber,
            createdAt: pedido.createdAt,
            total: pedido.total
          })
        }
      }
    }

    const resultado = Array.from(pagamentosPorVendedor.values())
      .sort((a, b) => b.totalComissao - a.totalComissao)

    return NextResponse.json({
      vendedores: resultado,
      totalVendedores: resultado.length,
      totalPagar: resultado.reduce((sum, v) => sum + v.totalComissao, 0)
    })

  } catch (error) {
    console.error('Erro ao buscar pagamentos pendentes:', error)
    return NextResponse.json({ error: 'Erro ao buscar pagamentos' }, { status: 500 })
  }
}
