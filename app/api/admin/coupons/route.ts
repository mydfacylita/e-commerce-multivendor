import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// GET - Listar cupons
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') // active, inactive, expired, all
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}

    // Filtro de busca
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { description: { contains: search } }
      ]
    }

    // Filtro de status
    const now = new Date()
    if (status === 'active') {
      where.isActive = true
      where.OR = [
        { validUntil: null },
        { validUntil: { gte: now } }
      ]
    } else if (status === 'inactive') {
      where.isActive = false
    } else if (status === 'expired') {
      where.validUntil = { lt: now }
    }

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { usages: true }
          }
        }
      }),
      prisma.coupon.count({ where })
    ])

    return NextResponse.json({
      coupons,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error: any) {
    console.error('Erro ao listar cupons:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Criar cupom
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscountValue,
      maxUses,
      maxUsesPerUser,
      validFrom,
      validUntil,
      allowedStates,
      allowedCategories,
      excludedProducts,
      firstPurchaseOnly,
      isActive
    } = body

    // Validações
    if (!code || !discountValue) {
      return NextResponse.json(
        { error: 'Código e valor do desconto são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se código já existe
    const existing = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um cupom com este código' },
        { status: 400 }
      )
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase().trim(),
        description,
        discountType: discountType || 'PERCENTAGE',
        discountValue: parseFloat(discountValue),
        minOrderValue: minOrderValue ? parseFloat(minOrderValue) : null,
        maxDiscountValue: maxDiscountValue ? parseFloat(maxDiscountValue) : null,
        maxUses: maxUses ? parseInt(maxUses) : null,
        maxUsesPerUser: maxUsesPerUser ? parseInt(maxUsesPerUser) : 1,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        allowedStates: allowedStates ? JSON.stringify(allowedStates) : null,
        allowedCategories: allowedCategories ? JSON.stringify(allowedCategories) : null,
        excludedProducts: excludedProducts ? JSON.stringify(excludedProducts) : null,
        firstPurchaseOnly: firstPurchaseOnly || false,
        isActive: isActive !== false,
        createdBy: session.user.id
      }
    })

    return NextResponse.json({ success: true, coupon })

  } catch (error: any) {
    console.error('Erro ao criar cupom:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
