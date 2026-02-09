import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET - Buscar categorias públicas (sem autenticação)
// Retorna apenas categorias PAI (parentId = null) com suas subcategorias
export async function GET() {
  try {
    // Buscar apenas categorias PAI (sem parentId)
    const categories = await prisma.category.findMany({
      where: {
        parentId: null  // Apenas categorias raiz
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        parentId: true,
        image: true,
        // Incluir subcategorias
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            parentId: true,
            image: true,
          },
          orderBy: { name: 'asc' }
        }
      }
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Erro ao buscar categorias:', error)
    return NextResponse.json([], { status: 500 })
  }
}
