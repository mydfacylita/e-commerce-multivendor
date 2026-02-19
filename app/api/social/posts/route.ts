import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Lista posts com filtros
 * GET /api/social/posts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')
    const status = searchParams.get('status')
    const productId = searchParams.get('productId')

    const where: any = {}
    if (platform) where.platform = platform
    if (status) where.status = status
    if (productId) where.productId = productId

    const posts = await prisma.socialPost.findMany({
      where,
      include: {
        connection: {
          select: {
            id: true,
            name: true,
            platform: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json(posts)
  } catch (error) {
    console.error('Erro ao buscar posts:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar posts' },
      { status: 500 }
    )
  }
}

/**
 * Cria um novo post (draft)
 * POST /api/social/posts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { connectionId, productId, platform, caption, images, scheduledFor } = body

    if (!connectionId || !platform || !caption || !images || images.length === 0) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      )
    }

    // Verificar se a conexão existe e está ativa
    const connection = await prisma.socialConnection.findFirst({
      where: { id: connectionId, isActive: true }
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'Conexão não encontrada ou inativa' },
        { status: 404 }
      )
    }

    const post = await prisma.socialPost.create({
      data: {
        id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        connectionId,
        productId: productId || null,
        platform,
        caption,
        images: JSON.stringify(images),
        status: scheduledFor ? 'SCHEDULED' : 'DRAFT',
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        createdBy: 'admin' // TODO: pegar do usuário logado
      },
      include: {
        connection: true,
        product: true
      }
    })

    return NextResponse.json(post)
  } catch (error) {
    console.error('Erro ao criar post:', error)
    return NextResponse.json(
      { error: 'Erro ao criar post' },
      { status: 500 }
    )
  }
}
