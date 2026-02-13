import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const affiliateId = params.id

    // Buscar afiliado
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: affiliateId },
      include: {
        account: true
      }
    })

    if (!affiliate) {
      return NextResponse.json(
        { error: 'Afiliado não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se já tem conta
    if (affiliate.account) {
      return NextResponse.json(
        { error: 'Afiliado já possui conta MYD' },
        { status: 400 }
      )
    }

    // Gerar número de conta único
    const timestamp = Date.now()
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const accountNumber = `MYD-AFF-${timestamp}-${randomSuffix}`

    // Aprovar afiliado e criar conta MYD em uma transação
    const result = await prisma.$transaction(async (tx) => {
      // 1. Aprovar afiliado
      const updatedAffiliate = await tx.affiliate.update({
        where: { id: affiliateId },
        data: {
          status: 'APPROVED',
          isActive: true,
          approvedAt: new Date(),
          approvedBy: session.user.id
        }
      })

      // 2. Criar conta MYD do afiliado
      const account = await tx.sellerAccount.create({
        data: {
          affiliateId: affiliateId,
          accountNumber: accountNumber,
          accountType: 'AFFILIATE',
          status: 'ACTIVE',
          balance: 0,
          blockedBalance: 0,
          totalReceived: 0,
          totalWithdrawn: 0,
          // Copiar dados bancários do afiliado
          pixKey: affiliate.chavePix,
          bankName: affiliate.banco,
          agencia: affiliate.agencia,
          conta: affiliate.conta,
          contaTipo: affiliate.tipoConta,
          minWithdrawalAmount: 50,
          kycStatus: 'PENDING',
          verifiedAt: new Date(),
          verifiedBy: session.user.id
        }
      })

      // 3. Criar transação inicial (registro de abertura de conta)
      await tx.sellerAccountTransaction.create({
        data: {
          accountId: account.id,
          type: 'MIGRATION',
          amount: 0,
          balanceBefore: 0,
          balanceAfter: 0,
          description: 'Conta MYD criada - Afiliado aprovado',
          status: 'COMPLETED',
          processedAt: new Date(),
          processedBy: session.user.id
        }
      })

      return { affiliate: updatedAffiliate, account }
    })

    // TODO: Enviar email de aprovação ao afiliado com dados da conta MYD

    return NextResponse.json({
      success: true,
      message: 'Afiliado aprovado e conta MYD criada com sucesso',
      data: {
        affiliate: result.affiliate,
        account: {
          accountNumber: result.account.accountNumber,
          status: result.account.status,
          balance: result.account.balance
        }
      }
    })

  } catch (error) {
    console.error('Erro ao aprovar afiliado:', error)
    return NextResponse.json(
      { error: 'Erro ao aprovar afiliado' },
      { status: 500 }
    )
  }
}
