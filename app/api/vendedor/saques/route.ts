import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// POST - Solicitar saque
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é vendedor
    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id },
      include: { user: true }
    })

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 })
    }

    if (seller.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Vendedor não está ativo' }, { status: 403 })
    }

    const body = await req.json()
    const { amount, paymentMethod, pixKey, pixKeyType, bankName, bankCode, agencia, conta, contaTipo, sellerNote } = body

    // Validações
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
    }

    // Valor mínimo de saque (R$ 0,01)
    const MIN_WITHDRAWAL = 0.01
    if (amount < MIN_WITHDRAWAL) {
      return NextResponse.json({ 
        error: `Valor mínimo para saque é R$ ${MIN_WITHDRAWAL.toFixed(2)}` 
      }, { status: 400 })
    }

    // Verificar se há saque pendente
    const pendingWithdrawal = await prisma.withdrawal.findFirst({
      where: {
        sellerId: seller.id,
        status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] }
      }
    })

    if (pendingWithdrawal) {
      return NextResponse.json({ 
        error: 'Você já possui um saque em andamento' 
      }, { status: 400 })
    }

    // Validar método de pagamento
    if (!paymentMethod || !['PIX', 'TED', 'BANK_TRANSFER'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Método de pagamento inválido' }, { status: 400 })
    }

    // Validar dados bancários
    if (paymentMethod === 'PIX') {
      if (!pixKey || !pixKeyType) {
        return NextResponse.json({ error: 'Chave PIX obrigatória' }, { status: 400 })
      }
      if (!['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM'].includes(pixKeyType)) {
        return NextResponse.json({ error: 'Tipo de chave PIX inválido' }, { status: 400 })
      }
    } else {
      if (!bankName || !agencia || !conta || !contaTipo) {
        return NextResponse.json({ error: 'Dados bancários incompletos' }, { status: 400 })
      }
    }

    // Buscar ou criar conta digital do vendedor
    let sellerAccount = await prisma.sellerAccount.findUnique({
      where: { sellerId: seller.id }
    })

    if (!sellerAccount) {
      // Criar conta digital se não existir
      sellerAccount = await prisma.sellerAccount.create({
        data: {
          sellerId: seller.id,
          accountNumber: `SA${Date.now()}${seller.id.slice(-4)}`,
          status: 'ACTIVE',
          balance: seller.balance,
          blockedBalance: 0,
          totalReceived: seller.totalEarned || 0,
          totalWithdrawn: seller.totalWithdrawn || 0
        }
      })
    }

    // Verificar saldo disponível REAL (balance - blockedBalance)
    const realAvailableBalance = sellerAccount.balance - sellerAccount.blockedBalance
    if (realAvailableBalance < amount) {
      return NextResponse.json({ 
        error: 'Saldo disponível insuficiente', 
        balance: sellerAccount.balance,
        blockedBalance: sellerAccount.blockedBalance,
        availableBalance: Math.max(0, realAvailableBalance),
        requested: amount
      }, { status: 400 })
    }

    // Usar transação para garantir consistência: criar saque, bloquear saldo e registrar transação
    const result = await prisma.$transaction(async (tx) => {
      // 1. Criar solicitação de saque
      const withdrawal = await tx.withdrawal.create({
        data: {
          sellerId: seller.id,
          amount,
          status: 'PENDING',
          paymentMethod,
          pixKey,
          pixKeyType,
          bankName,
          bankCode,
          agencia,
          conta,
          contaTipo,
          sellerNote
        },
        include: {
          seller: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          }
        }
      })

      // 2. Bloquear o valor na conta digital (incrementar blockedBalance)
      const updatedAccount = await tx.sellerAccount.update({
        where: { sellerId: seller.id },
        data: {
          blockedBalance: { increment: amount }
        }
      })

      // 3. Criar transação de saque com status PENDING
      await tx.sellerAccountTransaction.create({
        data: {
          accountId: sellerAccount!.id,
          type: 'WITHDRAWAL',
          amount: -amount, // Negativo pois é débito
          balanceBefore: sellerAccount!.balance,
          balanceAfter: sellerAccount!.balance - amount, // Saldo após conclusão
          description: `Solicitação de saque via ${paymentMethod}`,
          reference: withdrawal.id,
          referenceType: 'WITHDRAWAL',
          withdrawalId: withdrawal.id,
          status: 'PENDING' // Será atualizado para COMPLETED quando concluir
        }
      })

      return { withdrawal, updatedAccount }
    })

    return NextResponse.json({ 
      success: true,
      withdrawal: {
        id: result.withdrawal.id,
        amount: result.withdrawal.amount,
        status: result.withdrawal.status,
        paymentMethod: result.withdrawal.paymentMethod,
        createdAt: result.withdrawal.createdAt
      },
      blockedBalance: result.updatedAccount.blockedBalance,
      availableBalance: result.updatedAccount.balance - result.updatedAccount.blockedBalance,
      message: 'Solicitação de saque criada! O valor foi bloqueado e aguarda aprovação do administrador.'
    })

  } catch (error) {
    console.error('Erro ao solicitar saque:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Detalhes do erro:', errorMessage)
    return NextResponse.json({ 
      error: 'Erro ao processar solicitação de saque',
      details: errorMessage
    }, { status: 500 })
  }
}

// GET - Listar transações do vendedor (extrato)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é vendedor
    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id }
    })

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view') || 'statement' // 'statement' ou 'withdrawals'

    // Se for view de apenas saques, retorna o antigo formato
    if (view === 'withdrawals') {
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '20')
      const status = searchParams.get('status')

      const skip = (page - 1) * limit

      const where = {
        sellerId: seller.id,
        ...(status && { status: status as any })
      }

      const [withdrawals, total] = await Promise.all([
        prisma.withdrawal.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            amount: true,
            status: true,
            paymentMethod: true,
            pixKey: true,
            pixKeyType: true,
            bankName: true,
            agencia: true,
            conta: true,
            contaTipo: true,
            transactionId: true,
            processedAt: true,
            rejectionReason: true,
            sellerNote: true,
            adminNote: true,
            createdAt: true,
            updatedAt: true
          }
        }),
        prisma.withdrawal.count({ where })
      ])

      // Calcular pagamentos DROP pendentes também no view de withdrawals
      const pendingDropPayments = await prisma.orderItem.findMany({
        where: {
          sellerId: seller.id,
          itemType: 'DROPSHIPPING',
          order: {
            status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] }
          }
        },
        select: {
          supplierCost: true
        }
      })

      const totalPendingPayments = pendingDropPayments.reduce((total, item) => {
        return total + (item.supplierCost || 0)
      }, 0)

      const availableBalance = seller.balance - totalPendingPayments

      return NextResponse.json({
        withdrawals,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        summary: {
          balance: seller.balance,
          totalEarned: seller.totalEarned,
          totalWithdrawn: seller.totalWithdrawn,
          pendingPayments: totalPendingPayments,
          availableBalance: Math.max(0, availableBalance)
        }
      })
    }

    // View de extrato (statement) - Busca vendas e saques
    // Calcular pagamentos DROP pendentes
    const pendingDropPayments = await prisma.orderItem.findMany({
      where: {
        sellerId: seller.id,
        itemType: 'DROPSHIPPING',
        order: {
          status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] }
        }
      },
      select: {
        supplierCost: true
      }
    })

    const totalPendingPayments = pendingDropPayments.reduce((total, item) => {
      return total + (item.supplierCost || 0)
    }, 0)

    const availableBalance = seller.balance - totalPendingPayments

    const [orderItems, withdrawals, eanPurchases] = await Promise.all([
      // Vendas de produtos (CRÉDITOS)
      prisma.orderItem.findMany({
        where: {
          sellerId: seller.id,
          order: {
            status: { not: 'CANCELLED' }
          }
        },
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: { name: true }
          },
          order: {
            select: {
              status: true,
              createdAt: true
            }
          }
        }
      }),
      // Saques (DÉBITOS)
      prisma.withdrawal.findMany({
        where: { sellerId: seller.id },
        orderBy: { createdAt: 'desc' }
      }),
      // Compras de pacotes EAN (DÉBITOS) - apenas pagos
      prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          ep.id,
          ep.packageId,
          ep.quantity,
          ep.type as eanType,
          ep.price,
          ep.paidAt,
          ep.createdAt,
          pkg.name as packageName
        FROM EANPurchase ep
        LEFT JOIN EANPackage pkg ON ep.packageId = pkg.id
        WHERE ep.sellerId = '${seller.id}' AND ep.status = 'PAID'
        ORDER BY ep.paidAt DESC
      `)
    ])

    // Transformar em transações unificadas
    const transactions = [
      // Vendas de produtos (CRÉDITOS - vendedor ganha comissão)
      ...orderItems.map(item => ({
        id: `sale-${item.id}`,
        type: 'CREDIT' as const,
        description: `Venda: ${item.product.name} - ID: ${item.orderId.substring(0, 8)}`,
        amount: item.sellerRevenue || 0,
        date: item.createdAt,
        status: item.order.status,
        reference: item.orderId
      })),
      // Compras de pacotes EAN (DÉBITOS - vendedor paga)
      ...eanPurchases.map(purchase => ({
        id: `ean-${purchase.id}`,
        type: 'DEBIT' as const,
        description: `Compra: Pacote EAN ${purchase.packageName || 'Código EAN'} (${purchase.quantity} códigos ${purchase.eanType})`,
        amount: Number(purchase.price),
        date: purchase.paidAt || purchase.createdAt,
        status: 'DELIVERED',
        reference: purchase.id
      })),
      // Saques como débitos
      ...withdrawals.map(w => ({
        id: `withdrawal-${w.id}`,
        type: w.status === 'COMPLETED' ? 'DEBIT' as const : 'PENDING' as const,
        description: w.status === 'COMPLETED' 
          ? `Saque ${w.paymentMethod} - Concluído`
          : w.status === 'REJECTED'
          ? `Saque ${w.paymentMethod} - Rejeitado`
          : w.status === 'CANCELLED'
          ? `Saque ${w.paymentMethod} - Cancelado`
          : `Saque ${w.paymentMethod} - ${w.status}`,
        amount: w.amount,
        date: w.processedAt || w.createdAt,
        status: w.status,
        reference: w.transactionId || w.id
      }))
    ]

    // Ordenar por data (mais recente primeiro)
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Calcular saldo progressivo
    let runningBalance = 0
    const transactionsWithBalance = transactions.reverse().map(t => {
      if (t.type === 'CREDIT') {
        runningBalance += t.amount
      } else if (t.type === 'DEBIT') {
        runningBalance -= t.amount
      }
      return {
        ...t,
        balance: runningBalance
      }
    }).reverse()

    return NextResponse.json({
      transactions: transactionsWithBalance,
      summary: {
        balance: seller.balance,
        totalEarned: seller.totalEarned,
        totalWithdrawn: seller.totalWithdrawn,
        pendingPayments: totalPendingPayments,
        availableBalance: Math.max(0, availableBalance)
      }
    })

  } catch (error) {
    console.error('Erro ao listar saques:', error)
    return NextResponse.json({ 
      error: 'Erro ao listar saques',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
