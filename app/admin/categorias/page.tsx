import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { FiEdit, FiTrash2, FiPlus } from 'react-icons/fi'
import DeleteCategoryButton from '@/components/admin/DeleteCategoryButton'

export default async function AdminCategoriasPage() {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Gerenciar Categorias</h1>
        <Link
          href="/admin/categorias/nova"
          className="bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 flex items-center space-x-2"
        >
          <FiPlus />
          <span>Nova Categoria</span>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <div key={category.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="h-32 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white">
              {category.image ? (
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-5xl">📦</span>
              )}
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">{category.name}</h3>
              {category.description && (
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {category.description}
                </p>
              )}
              <p className="text-sm text-gray-500 mb-4">
                {category._count.products}{' '}
                {category._count.products === 1 ? 'produto' : 'produtos'}
              </p>
              <div className="flex space-x-2">
                <Link
                  href={`/admin/categorias/${category.id}`}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 text-center flex items-center justify-center space-x-1"
                >
                  <FiEdit size={16} />
                  <span>Editar</span>
                </Link>
                <DeleteCategoryButton categoryId={category.id} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 mb-4">Nenhuma categoria cadastrada</p>
          <Link
            href="/admin/categorias/nova"
            className="text-primary-600 hover:text-primary-700 font-semibold"
          >
            Criar primeira categoria →
          </Link>
        </div>
      )}
    </div>
  )
}
