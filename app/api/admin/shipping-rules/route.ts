import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const rules = await prisma.shippingRule.findMany({
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({ rules })
  } catch (error: any) {
    console.error('Erro ao buscar regras de frete:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar regras', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const data = await req.json()

    const rule = await prisma.shippingRule.create({
      data: {
        name: data.name,
        description: data.description || null,
        regionType: data.regionType,
        regions: JSON.stringify(data.regions),
        minWeight: data.minWeight || null,
        maxWeight: data.maxWeight || null,
        minCartValue: data.minCartValue || null,
        maxCartValue: data.maxCartValue || null,
        shippingCost: data.shippingCost,
        costPerKg: data.costPerKg || null,
        freeShippingMin: data.freeShippingMin || null,
        deliveryDays: data.deliveryDays,
        isActive: data.isActive !== undefined ? data.isActive : true,
        priority: data.priority || 0,
      }
    })

    return NextResponse.json({ rule }, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar regra de frete:', error)
    return NextResponse.json(
      { error: 'Erro ao criar regra', details: error.message },
      { status: 500 }
    )
  }
}
