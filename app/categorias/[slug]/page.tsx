import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { serializeProducts } from '@/lib/serialize'
import CategoryPageClient from '@/components/CategoryPageClient'

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

  return (
    <CategoryPageClient 
      category={categoryData}
      subcategories={subcategories}
      products={products}
    />
  )
}
