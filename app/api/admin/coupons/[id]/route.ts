import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Obter cupom específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const coupon = await prisma.coupon.findUnique({
      where: { id: params.id },
      include: {
        usages: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        _count: {
          select: { usages: true }
        }
      }
    })

    if (!coupon) {
      return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 })
    }

    return NextResponse.json(coupon)

  } catch (error: any) {
    console.error('Erro ao buscar cupom:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Atualizar cupom
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verificar se cupom existe
    const existing = await prisma.coupon.findUnique({
      where: { id: params.id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 })
    }

    // Se mudou o código, verificar se já existe
    if (code && code.toUpperCase().trim() !== existing.code) {
      const codeExists = await prisma.coupon.findUnique({
        where: { code: code.toUpperCase().trim() }
      })
      if (codeExists) {
        return NextResponse.json(
          { error: 'Já existe um cupom com este código' },
          { status: 400 }
        )
      }
    }

    const coupon = await prisma.coupon.update({
      where: { id: params.id },
      data: {
        ...(code && { code: code.toUpperCase().trim() }),
        ...(description !== undefined && { description }),
        ...(discountType && { discountType }),
        ...(discountValue && { discountValue: parseFloat(discountValue) }),
        ...(minOrderValue !== undefined && { minOrderValue: minOrderValue ? parseFloat(minOrderValue) : null }),
        ...(maxDiscountValue !== undefined && { maxDiscountValue: maxDiscountValue ? parseFloat(maxDiscountValue) : null }),
        ...(maxUses !== undefined && { maxUses: maxUses ? parseInt(maxUses) : null }),
        ...(maxUsesPerUser !== undefined && { maxUsesPerUser: maxUsesPerUser ? parseInt(maxUsesPerUser) : null }),
        ...(validFrom && { validFrom: new Date(validFrom) }),
        ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
        ...(allowedStates !== undefined && { allowedStates: allowedStates ? JSON.stringify(allowedStates) : null }),
        ...(allowedCategories !== undefined && { allowedCategories: allowedCategories ? JSON.stringify(allowedCategories) : null }),
        ...(excludedProducts !== undefined && { excludedProducts: excludedProducts ? JSON.stringify(excludedProducts) : null }),
        ...(firstPurchaseOnly !== undefined && { firstPurchaseOnly }),
        ...(isActive !== undefined && { isActive })
      }
    })

    return NextResponse.json({ success: true, coupon })

  } catch (error: any) {
    console.error('Erro ao atualizar cupom:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Excluir cupom
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se cupom existe
    const existing = await prisma.coupon.findUnique({
      where: { id: params.id },
      include: { _count: { select: { usages: true } } }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 })
    }

    // Se já foi usado, apenas desativar
    if (existing._count.usages > 0) {
      await prisma.coupon.update({
        where: { id: params.id },
        data: { isActive: false }
      })
      return NextResponse.json({ 
        success: true, 
        message: 'Cupom desativado (já foi utilizado)' 
      })
    }

    // Se nunca foi usado, pode deletar
    await prisma.coupon.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true, message: 'Cupom excluído' })

  } catch (error: any) {
    console.error('Erro ao excluir cupom:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
