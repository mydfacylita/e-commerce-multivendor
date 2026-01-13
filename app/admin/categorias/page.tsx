import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { FiEdit, FiTrash2, FiPlus } from 'react-icons/fi'
import DeleteCategoryButton from '@/components/admin/DeleteCategoryButton'

export default async function AdminCategoriasPage() {
  const categories = await prisma.category.findMany({
    include: {
      parent: true,
      children: {
        include: {
          _count: {
            select: { products: true },
          },
        },
      },
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Separar categorias principais das subcategorias
  const mainCategories = categories.filter(cat => !cat.parentId)
  const subCategories = categories.filter(cat => cat.parentId)

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

      {/* Categorias Principais */}
      {mainCategories.map((category) => (
        <div key={category.id} className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center text-white text-3xl">
                    📦
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-bold">{category.name}</h3>
                  {category.description && (
                    <p className="text-gray-600 text-sm">{category.description}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    {category._count.products}{' '}
                    {category._count.products === 1 ? 'produto' : 'produtos'}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Link
                  href={`/admin/categorias/${category.id}`}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-1"
                >
                  <FiEdit size={16} />
                  <span>Editar</span>
                </Link>
                <DeleteCategoryButton categoryId={category.id} />
              </div>
            </div>

            {/* Subcategorias */}
            {category.children && category.children.length > 0 && (
              <div className="mt-4 pl-6 border-l-4 border-primary-200">
                <h4 className="text-sm font-semibold text-gray-600 mb-3">Subcategorias:</h4>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.children.map((child) => (
                    <div key={child.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h5 className="font-semibold text-gray-800 mb-1">{child.name}</h5>
                      {child.description && (
                        <p className="text-gray-600 text-xs mb-2 line-clamp-2">{child.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mb-3">
                        {child._count.products}{' '}
                        {child._count.products === 1 ? 'produto' : 'produtos'}
                      </p>
                      <div className="flex space-x-2">
                        <Link
                          href={`/admin/categorias/${child.id}`}
                          className="flex-1 bg-blue-600 text-white py-1.5 px-3 rounded-md hover:bg-blue-700 text-center text-sm flex items-center justify-center space-x-1"
                        >
                          <FiEdit size={14} />
                          <span>Editar</span>
                        </Link>
                        <DeleteCategoryButton categoryId={child.id} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {mainCategories.length === 0 && (
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
