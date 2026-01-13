import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const productTypes = await prisma.productType.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(productTypes)
  } catch (error) {
    console.error('Erro ao buscar tipos de produtos:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar tipos de produtos' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 403 }
      )
    }

    const data = await req.json()

    const productType = await prisma.productType.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        icon: data.icon,
      },
    })

    return NextResponse.json(productType, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar tipo de produto:', error)
    return NextResponse.json(
      { error: 'Erro ao criar tipo de produto' },
      { status: 500 }
    )
  }
}
