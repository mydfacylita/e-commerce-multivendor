import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

function getIdFromUrl(req: NextRequest) {
  return req.nextUrl.pathname.split('/').at(-1)!
}

// GET – single article (public: no auth)
export async function GET(req: NextRequest) {
  const id = getIdFromUrl(req)
  const article = await prisma.helpArticle.findFirst({
    where: { OR: [{ id }, { slug: id }] },
  })
  if (!article) return NextResponse.json({ message: 'Artigo não encontrado' }, { status: 404 })
  return NextResponse.json(article)
}

// PUT – update
export const PUT = withAuth(async (req: NextRequest) => {
  const id = getIdFromUrl(req)
  const body = await req.json()
  const { title, category, description, blocks, published, position, icon } = body

  const article = await prisma.helpArticle.update({
    where: { id },
    data: {
      title: title?.trim(),
      category: category?.trim(),
      description: description?.trim() || null,
      blocks: JSON.stringify(blocks || []),
      published: published ?? undefined,
      position: position ?? undefined,
      icon: icon || null,
    },
  })

  return NextResponse.json(article)
})

// DELETE
export const DELETE = withAuth(async (req: NextRequest) => {
  const id = getIdFromUrl(req)
  await prisma.helpArticle.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
