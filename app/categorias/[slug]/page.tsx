import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ProductCard from '@/components/ProductCard'
import Link from 'next/link'
import { FiArrowLeft } from 'react-icons/fi'
import { serializeProducts } from '@/lib/serialize'

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = await prisma.category.findUnique({
    where: { slug: params.slug },
    include: {
      children: {
        select: { id: true },
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
    },
    include: {
      category: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const products = serializeProducts(productsRaw)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link
        href="/categorias"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
      >
        <FiArrowLeft className="mr-2" />
        Voltar para Categorias
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{category.name}</h1>
        {category.description && (
          <p className="text-gray-600 text-lg">{category.description}</p>
        )}
        <p className="text-gray-500 mt-2">
          {products.length}{' '}
          {products.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
        </p>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <p className="text-xl text-gray-500 mb-4">
            Nenhum produto nesta categoria ainda.
          </p>
          <Link
            href="/produtos"
            className="text-primary-600 hover:text-primary-700 font-semibold"
          >
            Ver todos os produtos →
          </Link>
        </div>
      )}
    </div>
  )
}
