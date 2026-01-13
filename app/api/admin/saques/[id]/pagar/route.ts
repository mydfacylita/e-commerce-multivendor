import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getNubankService } from '@/lib/nubank'

// POST - Processar pagamento via Nubank PJ
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const withdrawalId = params.id
    const body = await req.json()
    const { adminNote } = body

    // Buscar saque
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        seller: {
          include: {
            user: true
          }
        }
      }
    })

    if (!withdrawal) {
      return NextResponse.json({ error: 'Saque não encontrado' }, { status: 404 })
    }

    // Verificar se está aprovado
    if (withdrawal.status !== 'APPROVED' && withdrawal.status !== 'PROCESSING') {
      return NextResponse.json({ 
        error: 'Apenas saques aprovados ou em processamento podem ser pagos',
        currentStatus: withdrawal.status
      }, { status: 400 })
    }

    // Validar dados de pagamento PIX
    if (withdrawal.paymentMethod !== 'PIX' || !withdrawal.pixKey) {
      return NextResponse.json({ error: 'Apenas pagamentos PIX são suportados via Nubank' }, { status: 400 })
    }

    // Marcar como PROCESSING
    await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: 'PROCESSING' }
    })

    try {
      // Obter serviço do Nubank
      const nubankService = await getNubankService()

      // Fazer transferência PIX via Nubank
      const transferResult = await nubankService.transferPix({
        amount: withdrawal.amount,
        pixKey: withdrawal.pixKey,
        pixKeyType: (withdrawal.pixKeyType?.toUpperCase() as any) || 'CPF',
        description: `Saque Dropshipping - ${withdrawal.seller.storeName}`,
        externalId: withdrawalId
      })

      // Marcar como concluído e deduzir saldo
      const [updatedWithdrawal] = await prisma.$transaction([
        prisma.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: 'COMPLETED',
            transactionId: transferResult.id?.toString(),
            adminNote: adminNote || `Pagamento processado via Nubank PJ`,
            processedBy: session.user.id,
            processedAt: new Date(),
            updatedAt: new Date()
          },
          include: {
            seller: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        }),
        prisma.seller.update({
          where: { id: withdrawal.sellerId },
          data: {
            balance: { decrement: withdrawal.amount },
            totalWithdrawn: { increment: withdrawal.amount }
          }
        })
      ])

      return NextResponse.json({ 
        success: true,
        message: 'Pagamento processado com sucesso via Nubank PJ',
        withdrawal: updatedWithdrawal,
        nubankTransactionId: transferResult.id,
        transferStatus: transferResult.status
      })

    } catch (nubankError: any) {
      console.error('Erro Nubank:', nubankError)
      
      // Reverter para APPROVED em caso de erro
      await prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: { 
          status: 'APPROVED',
          adminNote: `Erro ao processar via Nubank: ${nubankError.message}`
        }
      })

      return NextResponse.json({ 
        error: 'Erro ao processar pagamento via Nubank',
        details: nubankError.message
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Erro ao processar pagamento:', error)
    return NextResponse.json({ 
      error: 'Erro ao processar pagamento',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
