import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'

// POST - Validar e aplicar cupom
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, subtotal, state, userId: bodyUserId } = body

    // Tenta pegar userId do token se não veio no body
    let userId = bodyUserId
    if (!userId) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7)
          const decoded = jwt.verify(token, JWT_SECRET) as { sub: string }
          userId = decoded.sub
        } catch (e) {
          // Ignora erro de JWT
        }
      }
    }

    if (!code) {
      return NextResponse.json(
        { error: 'Código do cupom é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar cupom
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() }
    })

    if (!coupon) {
      return NextResponse.json(
        { valid: false, error: 'Cupom não encontrado' },
        { status: 404 }
      )
    }

    // Validações
    const now = new Date()
    const errors: string[] = []

    // Cupom ativo?
    if (!coupon.isActive) {
      errors.push('Este cupom está desativado')
    }

    // Data de validade
    if (coupon.validFrom && coupon.validFrom > now) {
      errors.push('Este cupom ainda não está válido')
    }
    if (coupon.validUntil && coupon.validUntil < now) {
      errors.push('Este cupom expirou')
    }

    // Limite de usos total
    if (coupon.maxUses && coupon.usageCount >= coupon.maxUses) {
      errors.push('Este cupom atingiu o limite de usos')
    }

    // Valor mínimo
    if (coupon.minOrderValue && subtotal && subtotal < coupon.minOrderValue) {
      errors.push(`Valor mínimo do pedido: R$ ${coupon.minOrderValue.toFixed(2)}`)
    }

    // Verificar uso por usuário
    if (userId && coupon.maxUsesPerUser) {
      const userUsages = await prisma.couponUsage.count({
        where: {
          couponId: coupon.id,
          userId: userId
        }
      })
      if (userUsages >= coupon.maxUsesPerUser) {
        errors.push('Você já utilizou este cupom o máximo de vezes permitido')
      }
    }

    // Primeira compra apenas
    if (coupon.firstPurchaseOnly && userId) {
      const previousOrders = await prisma.order.count({
        where: {
          userId: userId,
          status: { notIn: ['CANCELLED'] }
        }
      })
      if (previousOrders > 0) {
        errors.push('Este cupom é válido apenas para a primeira compra')
      }
    }

    // Restrição por estado
    if (coupon.allowedStates && state) {
      try {
        const allowedStates = JSON.parse(coupon.allowedStates)
        if (Array.isArray(allowedStates) && allowedStates.length > 0) {
          if (!allowedStates.includes(state.toUpperCase())) {
            errors.push('Este cupom não é válido para o seu estado')
          }
        }
      } catch (e) {
        // Ignora erro de parse
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        valid: false,
        error: errors[0],
        errors
      })
    }

    // Calcular desconto
    let discount = 0
    if (coupon.discountType === 'PERCENTAGE') {
      discount = (subtotal || 0) * (coupon.discountValue / 100)
      // Aplicar limite máximo se existir
      if (coupon.maxDiscountValue && discount > coupon.maxDiscountValue) {
        discount = coupon.maxDiscountValue
      }
    } else {
      // FIXED
      discount = coupon.discountValue
    }

    // Desconto não pode ser maior que o subtotal
    if (subtotal && discount > subtotal) {
      discount = subtotal
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        description: coupon.description
      },
      discount: Math.round(discount * 100) / 100, // Arredondar para 2 casas
      discountAmount: Math.round(discount * 100) / 100, // Alias para compatibilidade
      discountType: coupon.discountType,
      message: coupon.discountType === 'PERCENTAGE' 
        ? `${coupon.discountValue}% de desconto aplicado!`
        : `R$ ${coupon.discountValue.toFixed(2)} de desconto aplicado!`
    })

  } catch (error: any) {
    console.error('Erro ao validar cupom:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
