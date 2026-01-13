import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()

    const updateData: any = {}
    
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description || null
    if (body.regionType !== undefined) updateData.regionType = body.regionType
    if (body.regions !== undefined) updateData.regions = JSON.stringify(body.regions)
    if (body.minWeight !== undefined) updateData.minWeight = body.minWeight
    if (body.maxWeight !== undefined) updateData.maxWeight = body.maxWeight
    if (body.minCartValue !== undefined) updateData.minCartValue = body.minCartValue
    if (body.maxCartValue !== undefined) updateData.maxCartValue = body.maxCartValue
    if (body.shippingCost !== undefined) updateData.shippingCost = body.shippingCost
    if (body.costPerKg !== undefined) updateData.costPerKg = body.costPerKg
    if (body.freeShippingMin !== undefined) updateData.freeShippingMin = body.freeShippingMin
    if (body.deliveryDays !== undefined) updateData.deliveryDays = body.deliveryDays
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const rule = await prisma.shippingRule.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json({ rule })
  } catch (error: any) {
    console.error('Erro ao atualizar regra:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar regra', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    await prisma.shippingRule.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Regra excluída' })
  } catch (error: any) {
    console.error('Erro ao excluir regra:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir regra', details: error.message },
      { status: 500 }
    )
  }
}
