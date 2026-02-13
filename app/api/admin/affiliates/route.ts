import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('[Affiliates API] Session:', session ? `User: ${session.user.email}, Role: ${session.user.role}` : 'No session')

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'ALL'

    // Filtros
    const where: any = {}
    if (status !== 'ALL') {
      where.status = status
    }

    // Buscar afiliados
    const affiliates = await prisma.affiliate.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            sales: true,
            clicks: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Estatísticas gerais
    const stats = await prisma.affiliate.aggregate({
      _count: {
        id: true
      },
      _sum: {
        totalSales: true,
        totalCommission: true,
        totalWithdrawn: true
      }
    })

    const activeAffiliates = await prisma.affiliate.count({
      where: {
        status: 'APPROVED',
        isActive: true
      }
    })

    const pendingAffiliates = await prisma.affiliate.count({
      where: {
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      affiliates,
      stats: {
        totalAffiliates: stats._count.id,
        activeAffiliates,
        pendingAffiliates,
        totalSales: stats._sum.totalSales || 0,
        totalCommission: stats._sum.totalCommission || 0,
        totalPaid: stats._sum.totalWithdrawn || 0
      }
    })

  } catch (error) {
    console.error('Erro ao buscar afiliados:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar afiliados' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      userId,
      name,
      email,
      phone,
      cpf,
      instagram,
      youtube,
      tiktok,
      commissionRate
    } = body

    // Verificar se usuário já é afiliado
    const existingAffiliate = await prisma.affiliate.findUnique({
      where: { userId }
    })

    if (existingAffiliate) {
      return NextResponse.json(
        { error: 'Usuário já é afiliado' },
        { status: 400 }
      )
    }

    // Gerar código único
    const code = await generateUniqueCode(name)

    // Criar afiliado
    const affiliate = await prisma.affiliate.create({
      data: {
        userId,
        code,
        name,
        email,
        phone,
        cpf,
        instagram,
        youtube,
        tiktok,
        commissionRate: commissionRate || 5,
        status: 'APPROVED', // Admin cria já aprovado
        isActive: true,
        approvedAt: new Date(),
        approvedBy: session.user.id
      }
    })

    return NextResponse.json(affiliate, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar afiliado:', error)
    return NextResponse.json(
      { error: 'Erro ao criar afiliado' },
      { status: 500 }
    )
  }
}

async function generateUniqueCode(name: string): Promise<string> {
  // Gerar código baseado no nome
  const baseName = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9]/g, '') // Remove caracteres especiais
    .toUpperCase()
    .substring(0, 6)

  let code = baseName
  let counter = 1

  // Garantir que o código é único
  while (true) {
    const existing = await prisma.affiliate.findUnique({
      where: { code }
    })

    if (!existing) break

    code = `${baseName}${counter}`
    counter++
  }

  return code
}
