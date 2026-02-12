import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * JOB AUTOMÁTICO: Processar pagamentos de afiliados
 * 
 * Executa automaticamente:
 * - Busca vendas CONFIRMED onde availableAt <= hoje (7 dias já passaram)
 * - Credita automaticamente na conta MYD do afiliado
 * - Marca venda como PAID
 * 
 * Deve rodar a cada:
 * - 1 hora (polling) OU
 * - Via cron job diário
 */

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    console.log('💰 [JOB] Iniciando processamento automático de pagamentos de afiliados...')

    // Buscar vendas confirmadas que já passaram dos 7 dias
    const readyForPayment = await prisma.affiliateSale.findMany({
      where: {
        status: 'CONFIRMED',
        availableAt: {
          lte: new Date() // Menor ou igual a agora
        }
      },
      include: {
        affiliate: {
          include: {
            account: true
          }
        }
      }
    })

    console.log(`   📦 Encontradas ${readyForPayment.length} vendas prontas para pagamento automático`)

    if (readyForPayment.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhuma venda pronta para pagamento',
        processed: 0,
        errors: []
      })
    }

    let processed = 0
    let errors: any[] = []

    // Agrupar vendas por afiliado
    const salesByAffiliate = new Map<string, typeof readyForPayment>()
    
    for (const sale of readyForPayment) {
      const affiliateId = sale.affiliateId
      if (!salesByAffiliate.has(affiliateId)) {
        salesByAffiliate.set(affiliateId, [])
      }
      salesByAffiliate.get(affiliateId)!.push(sale)
    }

    console.log(`   👥 Processando pagamentos para ${salesByAffiliate.size} afiliado(s)`)

    // Processar cada afiliado
    for (const [affiliateId, sales] of salesByAffiliate) {
      try {
        const affiliate = sales[0].affiliate
        const totalAmount = sales.reduce((sum, sale) => sum + Number(sale.commissionAmount), 0)

        console.log(`\n   💳 Afiliado: ${affiliate.name} (${affiliate.code})`)
        console.log(`      Vendas: ${sales.length}`)
        console.log(`      Total: R$ ${totalAmount.toFixed(2)}`)

        // Criar ou buscar conta MYD do afiliado
        let account = affiliate.account

        if (!account) {
          console.log('      📝 Criando conta MYD...')
          account = await prisma.sellerAccount.create({
            data: {
              affiliateId: affiliateId,
              accountNumber: `MYFAF${affiliate.code.toUpperCase()}${Date.now().toString().slice(-6)}`,
              accountType: 'AFFILIATE',
              status: 'ACTIVE',
              balance: 0,
              totalReceived: 0,
              totalWithdrawn: 0
            }
          })
        }

        const balanceBefore = Number(account.balance)
        const balanceAfter = balanceBefore + totalAmount

        // Transação: Creditar valor e marcar vendas como PAID
        await prisma.$transaction(async (tx) => {
          // 1. Atualizar saldo da conta
          await tx.sellerAccount.update({
            where: { id: account!.id },
            data: {
              balance: balanceAfter,
              totalReceived: {
                increment: totalAmount
              },
              updatedAt: new Date()
            }
          })

          // 2. Marcar vendas como PAID
          await tx.affiliateSale.updateMany({
            where: {
              id: {
                in: sales.map(s => s.id)
              }
            },
            data: {
              status: 'PAID',
              paidAt: new Date()
            }
          })

          // 3. Registrar transação (histórico)
          await tx.sellerAccountTransaction.create({
            data: {
              accountId: account!.id,
              type: 'CREDIT',
              amount: totalAmount,
              balanceBefore: balanceBefore,
              balanceAfter: balanceAfter,
              description: `Pagamento automático de ${sales.length} venda(s) - Comissão disponibilizada após 7 dias`,
              referenceType: 'COMMISSION',
              status: 'COMPLETED',
              metadata: JSON.stringify({
                saleIds: sales.map(s => s.id),
                processedAt: new Date().toISOString(),
                automatic: true,
                salesCount: sales.length
              }),
              processedAt: new Date()
            }
          })
        })

        console.log(`      ✅ Pagamento processado com sucesso`)
        console.log(`      💰 Novo saldo: R$ ${balanceAfter.toFixed(2)}`)
        console.log(`      📊 Saldo anterior: R$ ${balanceBefore.toFixed(2)}`)
        
        processed += sales.length

      } catch (error: any) {
        console.error(`      ❌ Erro ao processar afiliado ${affiliateId}:`, error?.message)
        errors.push({
          affiliateId,
          error: error?.message,
          salesCount: sales.length
        })
      }
    }

    console.log(`\n✅ [JOB] Processamento concluído`)
    console.log(`   Vendas processadas: ${processed}`)
    console.log(`   Erros: ${errors.length}`)

    return NextResponse.json({
      success: true,
      message: `${processed} vendas processadas automaticamente`,
      processed,
      affiliatesCount: salesByAffiliate.size,
      errors
    })

  } catch (error: any) {
    console.error('❌ [JOB] Erro no processamento automático:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error?.message || 'Erro desconhecido' 
      },
      { status: 500 }
    )
  }
}

// GET: Status do job
export async function GET(req: NextRequest) {
  try {
    const pendingPayments = await prisma.affiliateSale.findMany({
      where: {
        status: 'CONFIRMED',
        availableAt: {
          lte: new Date()
        }
      },
      include: {
        affiliate: {
          select: {
            code: true,
            name: true
          }
        }
      }
    })

    const upcomingPayments = await prisma.affiliateSale.findMany({
      where: {
        status: 'CONFIRMED',
        availableAt: {
          gt: new Date()
        }
      },
      select: {
        availableAt: true,
        commissionAmount: true
      }
    })

    return NextResponse.json({
      pendingPayments: {
        count: pendingPayments.length,
        totalAmount: pendingPayments.reduce((sum, s) => sum + Number(s.commissionAmount), 0),
        sales: pendingPayments
      },
      upcomingPayments: {
        count: upcomingPayments.length,
        totalAmount: upcomingPayments.reduce((sum, s) => sum + Number(s.commissionAmount), 0),
        nextPaymentDate: upcomingPayments.length > 0 
          ? upcomingPayments.sort((a, b) => a.availableAt!.getTime() - b.availableAt!.getTime())[0].availableAt
          : null
      }
    })
  } catch (error: any) {
    console.error('Erro ao verificar status:', error)
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
