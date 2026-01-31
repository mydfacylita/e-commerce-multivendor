import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function CategoriasPage() {
  // Buscar apenas categorias principais (sem pai)
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    include: {
      children: true,
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Todas as Categorias</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/categorias/${category.slug}`}
            className="bg-white rounded-lg shadow-md hover:shadow-xl transition overflow-hidden group"
          >
            <div className="h-48 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white">
              {category.image ? (
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                />
              ) : (
                <span className="text-6xl">📦</span>
              )}
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold mb-2 group-hover:text-primary-600">
                {category.name}
              </h2>
              <p className="text-sm text-gray-500">
                {category._count.products}{' '}
                {category._count.products === 1 ? 'produto' : 'produtos'}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-16">
          <p className="text-xl text-gray-500">Nenhuma categoria encontrada.</p>
        </div>
      )}
    </div>
  )
}
