import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { serializeProducts } from '@/lib/serialize'
import CategoryPageClient from '@/components/CategoryPageClient'

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydshop.com.br'
  const category = await prisma.category.findUnique({
    where: { slug: params.slug },
    select: { name: true, description: true, slug: true }
  })
  if (!category) return { title: 'Categoria | MYDSHOP' }

  const title = `${category.name} — Comprar Online com Melhor Preço | MYDSHOP`
  const description = category.description
    || `Confira os melhores produtos de ${category.name} com ótimos preços, frete rápido e entrega para todo o Brasil. Compre com segurança na MYDSHOP.`
  const url = `${baseUrl}/categorias/${category.slug}`

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: 'MYDSHOP',
    },
    twitter: { card: 'summary', title, description },
    alternates: { canonical: url },
  }
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = await prisma.category.findUnique({
    where: { slug: params.slug },
    include: {
      children: {
        select: { 
          id: true,
          name: true,
          slug: true,
        },
      },
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  })

  if (!category) {
    notFound()
  }

  // IDs da categoria atual + todas as subcategorias
  const categoryIds = [category.id, ...category.children.map(child => child.id)]

  // Buscar produtos da categoria e de todas as subcategorias
  const productsRaw = await prisma.product.findMany({
    where: { 
      categoryId: { in: categoryIds },
      active: true,
      approvalStatus: 'APPROVED',  // Apenas produtos aprovados
    },
    include: {
      category: true,
      supplier: true,
      seller: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const products = serializeProducts(productsRaw)

  // Preparar dados para o componente cliente
  const categoryData = {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    parent: category.parent ? {
      id: category.parent.id,
      name: category.parent.name,
      slug: category.parent.slug,
    } : null,
  }

  const subcategories = category.children.map(child => ({
    id: child.id,
    name: child.name,
    slug: child.slug,
  }))

  // JSON-LD ItemList para Google entender os produtos da categoria
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydshop.com.br'
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${category.name} — MYDSHOP`,
    url: `${baseUrl}/categorias/${category.slug}`,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 20).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${baseUrl}/produtos/${p.slug}`,
      name: p.name,
    }))
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
      ...(categoryData.parent ? [{ '@type': 'ListItem', position: 2, name: categoryData.parent.name, item: `${baseUrl}/categorias/${categoryData.parent.slug}` }] : []),
      { '@type': 'ListItem', position: categoryData.parent ? 3 : 2, name: category.name, item: `${baseUrl}/categorias/${category.slug}` },
    ]
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <CategoryPageClient 
        category={categoryData}
        subcategories={subcategories}
        products={products}
      />
    </>
  )
}
