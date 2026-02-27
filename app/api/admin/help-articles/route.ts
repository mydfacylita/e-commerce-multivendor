import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// GET /api/admin/help-articles — list all
export const GET = withAuth(async (_req: NextRequest) => {
  const articles = await prisma.helpArticle.findMany({
    orderBy: [{ category: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(articles)
})

// POST /api/admin/help-articles — create
export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json()
  const { title, category, description, blocks, published, position, icon } = body

  if (!title?.trim() || !category?.trim()) {
    return NextResponse.json({ message: 'Título e categoria são obrigatórios' }, { status: 400 })
  }

  // Gerar slug único
  let baseSlug = slugify(title)
  let slug = baseSlug
  let counter = 1
  while (await prisma.helpArticle.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`
  }

  const article = await prisma.helpArticle.create({
    data: {
      title: title.trim(),
      slug,
      category: category.trim(),
      description: description?.trim() || null,
      blocks: JSON.stringify(blocks || []),
      published: published ?? false,
      position: position ?? 0,
      icon: icon || null,
    },
  })

  return NextResponse.json(article, { status: 201 })
})
