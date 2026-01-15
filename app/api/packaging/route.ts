import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

/**
 * GET /api/packaging
 * Lista todas as embalagens
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    const validation = await validateApiKey(apiKey)
    
    if (!validation.valid) {
      return NextResponse.json({ error: 'API Key inválida' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') !== 'false'

    const boxes = await prisma.packagingBox.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [
        { priority: 'desc' },
        { name: 'asc' }
      ]
    })

    // Calcular volume para cada embalagem
    const boxesWithVolume = boxes.map(box => ({
      ...box,
      innerVolume: box.innerLength * box.innerWidth * box.innerHeight,
      outerVolume: box.outerLength * box.outerWidth * box.outerHeight
    }))

    return NextResponse.json({ 
      success: true,
      packaging: boxesWithVolume,
      total: boxesWithVolume.length
    })
  } catch (error) {
    console.error('Erro ao listar embalagens:', error)
    return NextResponse.json({ error: 'Erro ao listar embalagens' }, { status: 500 })
  }
}

/**
 * POST /api/packaging
 * Cria nova embalagem
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    const validation = await validateApiKey(apiKey)
    
    if (!validation.valid) {
      return NextResponse.json({ error: 'API Key inválida' }, { status: 401 })
    }

    const body = await request.json()
    
    const {
      name,
      code,
      type = 'BOX',
      innerLength,
      innerWidth,
      innerHeight,
      outerLength,
      outerWidth,
      outerHeight,
      emptyWeight,
      maxWeight,
      cost = 0,
      isActive = true,
      isDefault = false,
      priority = 0
    } = body

    // Validações
    if (!name || !code) {
      return NextResponse.json({ error: 'Nome e código são obrigatórios' }, { status: 400 })
    }

    if (!innerLength || !innerWidth || !innerHeight) {
      return NextResponse.json({ error: 'Dimensões internas são obrigatórias' }, { status: 400 })
    }

    // Verificar código único
    const existing = await prisma.packagingBox.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json({ error: 'Código já existe' }, { status: 400 })
    }

    // Se for default, remover default de outras
    if (isDefault) {
      await prisma.packagingBox.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      })
    }

    const maxVolume = innerLength * innerWidth * innerHeight

    const newBox = await prisma.packagingBox.create({
      data: {
        name,
        code,
        type,
        innerLength,
        innerWidth,
        innerHeight,
        outerLength: outerLength || innerLength + 2,
        outerWidth: outerWidth || innerWidth + 2,
        outerHeight: outerHeight || innerHeight + 2,
        emptyWeight: emptyWeight || 0.1,
        maxWeight: maxWeight || 30,
        maxVolume,
        cost,
        isActive,
        isDefault,
        priority
      }
    })

    return NextResponse.json({ 
      success: true,
      packaging: newBox,
      message: 'Embalagem criada com sucesso'
    })
  } catch (error) {
    console.error('Erro ao criar embalagem:', error)
    return NextResponse.json({ error: 'Erro ao criar embalagem' }, { status: 500 })
  }
}

/**
 * PUT /api/packaging
 * Atualiza embalagem existente
 */
export async function PUT(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    const validation = await validateApiKey(apiKey)
    
    if (!validation.valid) {
      return NextResponse.json({ error: 'API Key inválida' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    // Se for default, remover default de outras
    if (data.isDefault) {
      await prisma.packagingBox.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false }
      })
    }

    // Recalcular volume máximo se dimensões mudaram
    if (data.innerLength && data.innerWidth && data.innerHeight) {
      data.maxVolume = data.innerLength * data.innerWidth * data.innerHeight
    }

    const updated = await prisma.packagingBox.update({
      where: { id },
      data
    })

    return NextResponse.json({ 
      success: true,
      packaging: updated,
      message: 'Embalagem atualizada com sucesso'
    })
  } catch (error) {
    console.error('Erro ao atualizar embalagem:', error)
    return NextResponse.json({ error: 'Erro ao atualizar embalagem' }, { status: 500 })
  }
}

/**
 * DELETE /api/packaging
 * Remove embalagem
 */
export async function DELETE(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    const validation = await validateApiKey(apiKey)
    
    if (!validation.valid) {
      return NextResponse.json({ error: 'API Key inválida' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    await prisma.packagingBox.delete({ where: { id } })

    return NextResponse.json({ 
      success: true,
      message: 'Embalagem removida com sucesso'
    })
  } catch (error) {
    console.error('Erro ao remover embalagem:', error)
    return NextResponse.json({ error: 'Erro ao remover embalagem' }, { status: 500 })
  }
}
