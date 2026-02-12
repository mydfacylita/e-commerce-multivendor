import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

/**
 * GET: Buscar detalhes de um afiliado específico
 */
export async function GET(
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

    const affiliate = await prisma.affiliate.findUnique({
      where: { id: affiliateId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
            createdAt: true
          }
        },
        account: {
          select: {
            accountNumber: true,
            status: true,
            balance: true,
            blockedBalance: true,
            totalReceived: true,
            totalWithdrawn: true,
            pixKey: true,
            pixKeyType: true,
            bankName: true,
            bankCode: true,
            agencia: true,
            conta: true,
            contaTipo: true,
            kycStatus: true,
            createdAt: true
          }
        },
        sales: {
          take: 10,
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            order: {
              select: {
                id: true,
                total: true,
                status: true,
                createdAt: true
              }
            }
          }
        },
        withdrawals: {
          take: 10,
          orderBy: {
            requestedAt: 'desc'
          }
        },
        _count: {
          select: {
            sales: true,
            clicks: true,
            withdrawals: true
          }
        }
      }
    })

    if (!affiliate) {
      return NextResponse.json(
        { error: 'Afiliado não encontrado' },
        { status: 404 }
      )
    }

    // Calcular taxa de conversão
    const conversionRate = affiliate._count.clicks > 0
      ? (affiliate._count.sales / affiliate._count.clicks) * 100
      : 0

    // Calcular ticket médio
    const averageTicket = affiliate._count.sales > 0
      ? affiliate.totalSales / affiliate._count.sales
      : 0

    return NextResponse.json({
      affiliate,
      sales: affiliate.sales,
      stats: {
        conversionRate: conversionRate.toFixed(2),
        averageTicket: averageTicket.toFixed(2),
        totalClicks: affiliate._count.clicks,
        totalSales: affiliate._count.sales,
        totalWithdrawals: affiliate._count.withdrawals
      }
    })

  } catch (error) {
    console.error('Erro ao buscar afiliado:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar afiliado' },
      { status: 500 }
    )
  }
}

/**
 * PUT: Atualizar dados do afiliado
 */
export async function PUT(
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
    const body = await request.json()
    const {
      name,
      email,
      phone,
      cpf,
      instagram,
      youtube,
      tiktok,
      commissionRate,
      isActive,
      banco,
      agencia,
      conta,
      tipoConta,
      chavePix,
      notes
    } = body

    const affiliate = await prisma.affiliate.update({
      where: { id: affiliateId },
      data: {
        name,
        email,
        phone,
        cpf,
        instagram,
        youtube,
        tiktok,
        commissionRate,
        isActive,
        banco,
        agencia,
        conta,
        tipoConta,
        chavePix,
        notes
      },
      include: { account: true }
    })

    // Se tem conta MYD, atualizar dados bancários também
    if (affiliate.account) {
      await prisma.sellerAccount.update({
        where: { affiliateId: affiliateId },
        data: {
          pixKey: chavePix,
          bankName: banco,
          agencia,
          conta,
          contaTipo: tipoConta
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Afiliado atualizado com sucesso',
      affiliate
    })

  } catch (error) {
    console.error('Erro ao atualizar afiliado:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar afiliado' },
      { status: 500 }
    )
  }
}

/**
 * DELETE: Excluir afiliado (soft delete - mudar status para SUSPENDED)
 */
export async function DELETE(
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

    // Soft delete - suspender ao invés de deletar
    const affiliate = await prisma.affiliate.update({
      where: { id: affiliateId },
      data: {
        status: 'SUSPENDED',
        isActive: false,
        notes: `Conta suspensa em ${new Date().toISOString()} por ${session.user.name || session.user.email}`
      }
    })

    // Bloquear conta MYD também
    await prisma.sellerAccount.updateMany({
      where: { affiliateId: affiliateId },
      data: {
        status: 'SUSPENDED'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Afiliado suspenso com sucesso',
      affiliate
    })

  } catch (error) {
    console.error('Erro ao suspender afiliado:', error)
    return NextResponse.json(
      { error: 'Erro ao suspender afiliado' },
      { status: 500 }
    )
  }
}
