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
      shippingAddress: JSON.stringify({
        name: address.name || '',
        phone: address.phone || '',
        street: address.street || '',
        number: address.number || 'S/N',
        neighborhood: address.neighborhood || '',
        complement: address.complement || '',
        city: address.city || '',
        state: address.state || '',
        zipCode: address.zipCode || '',
        cpfCnpj: address.cpfCnpj || '',
      }),
      buyerName: address.name || undefined,
      buyerPhone: address.phone || undefined,
      buyerCpf: address.cpfCnpj || undefined,
    },
  })

  return NextResponse.json({ ok: true })
}
