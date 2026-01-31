import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// GET - Buscar embalagem por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const embalagem = await prisma.packagingBox.findUnique({
      where: { id: params.id }
    })

    if (!embalagem) {
      return NextResponse.json({ error: 'Embalagem não encontrada' }, { status: 404 })
    }

    return NextResponse.json(embalagem)
  } catch (error) {
    console.error('Erro ao buscar embalagem:', error)
    return NextResponse.json({ error: 'Erro ao buscar embalagem' }, { status: 500 })
  }
}

// PUT - Atualizar embalagem
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verificar se código já existe em outra embalagem
    const existente = await prisma.packagingBox.findFirst({
      where: { 
        code: code.toUpperCase(),
        NOT: { id: params.id }
      }
    })

    if (existente) {
      return NextResponse.json({ message: 'Já existe outra embalagem com este código' }, { status: 400 })
    }

    const embalagem = await prisma.packagingBox.update({
      where: { id: params.id },
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

    return NextResponse.json(embalagem)
  } catch (error) {
    console.error('Erro ao atualizar embalagem:', error)
    return NextResponse.json({ error: 'Erro ao atualizar embalagem' }, { status: 500 })
  }
}

// DELETE - Excluir embalagem
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await prisma.packagingBox.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Embalagem excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir embalagem:', error)
    return NextResponse.json({ error: 'Erro ao excluir embalagem' }, { status: 500 })
  }
}
