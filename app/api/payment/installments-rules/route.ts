import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Buscar regras de parcelamento para um pedido
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    
    if (!orderId) {
      return NextResponse.json({ error: 'OrderId é obrigatório' }, { status: 400 })
    }

    // Buscar pedido com itens e produtos
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                acceptsCreditCard: true,
                maxInstallments: true,
                installmentsFreeInterest: true,
                sellerId: true
              }
            }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    // Buscar configuração padrão do sistema
    const systemConfigs = await prisma.config.findMany({
      where: {
        key: {
          in: [
            'payment.acceptsCreditCard',
            'payment.maxInstallments',
            'payment.installmentsFreeInterest'
          ]
        }
      }
    })

    const systemConfig = {
      acceptsCreditCard: systemConfigs.find(c => c.key === 'payment.acceptsCreditCard')?.value !== 'false',
      maxInstallments: parseInt(systemConfigs.find(c => c.key === 'payment.maxInstallments')?.value || '12'),
      installmentsFreeInterest: parseInt(systemConfigs.find(c => c.key === 'payment.installmentsFreeInterest')?.value || '1')
    }

    // Calcular regras baseado nos produtos do pedido
    // A regra mais restritiva vence (menor máximo de parcelas)
    let acceptsCreditCard = systemConfig.acceptsCreditCard
    let maxInstallments = systemConfig.maxInstallments
    let installmentsFreeInterest = systemConfig.installmentsFreeInterest
    
    const productRules: Array<{
      productId: string
      productName: string
      acceptsCreditCard: boolean | null
      maxInstallments: number | null
      installmentsFreeInterest: number | null
    }> = []

    for (const item of order.items) {
      if (!item.product) continue
      
      const product = item.product
      
      productRules.push({
        productId: product.id,
        productName: product.name,
        acceptsCreditCard: product.acceptsCreditCard,
        maxInstallments: product.maxInstallments,
        installmentsFreeInterest: product.installmentsFreeInterest
      })

      // Se algum produto não aceita cartão, desabilita para todo o pedido
      if (product.acceptsCreditCard === false) {
        acceptsCreditCard = false
      }

      // Usar o menor máximo de parcelas entre todos os produtos
      if (product.maxInstallments !== null && product.maxInstallments < maxInstallments) {
        maxInstallments = product.maxInstallments
      }

      // Usar o menor número de parcelas sem juros
      if (product.installmentsFreeInterest !== null && product.installmentsFreeInterest < installmentsFreeInterest) {
        installmentsFreeInterest = product.installmentsFreeInterest
      }
    }

    return NextResponse.json({
      // Regras finais calculadas
      acceptsCreditCard,
      maxInstallments,
      installmentsFreeInterest,
      // Regras do sistema (para referência)
      systemConfig,
      // Regras por produto (para debug/transparência)
      productRules,
      // Info do pedido
      orderId: order.id,
      total: order.total
    })

  } catch (error) {
    console.error('Erro ao buscar regras de parcelamento:', error)
    return NextResponse.json({ error: 'Erro ao buscar regras' }, { status: 500 })
  }
}
