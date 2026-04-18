import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const { address } = await req.json()
  if (!address?.street || !address?.city) {
    return NextResponse.json({ message: 'Rua e Cidade são obrigatórios' }, { status: 400 })
  }

  await prisma.order.update({
    where: { id: params.id },
    data: {
      shippingAddress: JSON.stringify(address),
      buyerName: address.name || undefined,
      buyerPhone: address.phone || undefined,
    },
  })

  return NextResponse.json({ ok: true })
}
