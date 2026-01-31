import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Força renderização dinâmica - evita cache
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    const data = await req.json()

    const supplier = await prisma.supplier.create({
      data: {
        name: data.name,
        email: data.email || `${data.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
        phone: data.phone || '',
        website: data.website || '',
        apiUrl: data.apiUrl,
        apiKey: data.apiKey,
        type: data.type || 'aliexpress',
        isActive: data.isActive ?? true,
        commission: data.commission || 0,
      },
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar fornecedor:', error)
    return NextResponse.json(
      { message: 'Erro ao criar fornecedor' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ suppliers })
  } catch (error) {
    console.error('Erro ao buscar fornecedores:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar fornecedores' },
      { status: 500 }
    )
  }
}
