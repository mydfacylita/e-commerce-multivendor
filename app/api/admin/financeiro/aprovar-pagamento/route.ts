import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Aprovar pagamento para vendedor
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { sellerId, observacao } = await request.json()

    if (!sellerId) {
      return NextResponse.json({ error: 'sellerId obrigatório' }, { status: 400 })
    }

    // Buscar todos os itens pendentes deste vendedor
    const itensPendentes = await prisma.orderItem.findMany({
      where: {
        sellerId,
        seller: {
          paid: false
        },
        order: {
          status: 'DELIVERED'
        }
      },
      include: {
        order: true,
        seller: {
          include: {
            user: true
          }
        }
      }
    })

    if (itensPendentes.length === 0) {
      return NextResponse.json({ error: 'Nenhum pagamento pendente para este vendedor' }, { status: 404 })
    }

    const totalComissao = itensPendentes.reduce((sum, item) => sum + (item.sellerCommission || 0), 0)

    // Marcar todos os itens como pagos e criar registro de pagamento
    const resultado = await prisma.$transaction(async (tx) => {
      // Atualizar itens
      await tx.orderItem.updateMany({
        where: {
          sellerId,
          sellerPaid: false,
          order: {
            status: 'APPROVED'
          }
        },
        data: {
          sellerPaid: true,
          sellerPaidAt: new Date()
        }
      })

      // Criar registro de pagamento (você pode ter uma tabela Payment)
      // Por enquanto vamos só registrar no log
      return {
        sellerId,
        sellerName: itensPendentes[0].seller?.storeName,
        totalPago: totalComissao,
        quantidadeItens: itensPendentes.length,
        pagoEm: new Date(),
        pagoBy: session.user.id,
        observacao
      }
    })

    // TODO: Aqui você pode integrar com gateway de pagamento (PIX, TED, etc)
    // Por exemplo: enviar PIX automático, registrar na contabilidade, etc

    return NextResponse.json({
      success: true,
      message: 'Pagamento aprovado com sucesso',
      resultado
    })

  } catch (error) {
    console.error('Erro ao aprovar pagamento:', error)
    return NextResponse.json({ error: 'Erro ao aprovar pagamento' }, { status: 500 })
  }
}
