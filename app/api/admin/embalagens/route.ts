import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// GET - Listar todas as embalagens
export async function GET() {
  try {
    const embalagens = await prisma.packagingBox.findMany({
      orderBy: [
        { isActive: 'desc' },
        { priority: 'asc' },
        { code: 'asc' }
      ]
    })
    
    return NextResponse.json(embalagens)
  } catch (error) {
    console.error('Erro ao listar embalagens:', error)
    return NextResponse.json({ error: 'Erro ao listar embalagens' }, { status: 500 })
  }
}

// POST - Criar nova embalagem
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      code, name, type, 
      innerLength, innerWidth, innerHeight,
      outerLength, outerWidth, outerHeight,
      emptyWeight, maxWeight, cost, isActive, priority 
    } = body

    // Validações
    if (!code || !name) {
      return NextResponse.json({ message: 'Código e nome são obrigatórios' }, { status: 400 })
    }

    if (innerLength <= 0 || innerWidth <= 0 || innerHeight <= 0) {
      return NextResponse.json({ message: 'Dimensões internas devem ser maiores que zero' }, { status: 400 })
    }

    if (maxWeight <= 0) {
      return NextResponse.json({ message: 'Peso máximo deve ser maior que zero' }, { status: 400 })
    }

    // Verificar se código já existe
    const existente = await prisma.packagingBox.findUnique({
      where: { code: code.toUpperCase() }
    })

    if (existente) {
      return NextResponse.json({ message: 'Já existe uma embalagem com este código' }, { status: 400 })
    }

    const embalagem = await prisma.packagingBox.create({
      data: {
        code: code.toUpperCase(),
        name,
        type: type || 'BOX',
        innerLength,
        innerWidth,
        innerHeight,
        outerLength: outerLength || innerLength + 2,
        outerWidth: outerWidth || innerWidth + 2,
        outerHeight: outerHeight || innerHeight + 2,
        emptyWeight: emptyWeight || 0,
        maxWeight,
        cost: cost || 0,
        isActive: isActive ?? true,
        priority: priority || 50
      }
    })

    return NextResponse.json(embalagem, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar embalagem:', error)
    return NextResponse.json({ error: 'Erro ao criar embalagem' }, { status: 500 })
  }
}
