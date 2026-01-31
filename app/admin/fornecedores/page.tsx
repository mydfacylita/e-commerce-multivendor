import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { FiEdit, FiTrash2, FiPlus, FiGlobe, FiPhone, FiMail } from 'react-icons/fi'
import DeleteSupplierButton from '@/components/admin/DeleteSupplierButton'
import { unstable_noStore as noStore } from 'next/cache'

// Forçar renderização dinâmica - NUNCA cachear esta página
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default async function AdminFornecedoresPage() {
  // Desabilitar cache completamente
  noStore()
  
  const suppliers = await prisma.supplier.findMany({
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
        <h1 className="text-3xl font-bold">Gerenciar Fornecedores</h1>
        <Link
          href="/admin/fornecedores/novo"
          className="bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 flex items-center space-x-2"
        >
          <FiPlus />
          <span>Novo Fornecedor</span>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map((supplier) => (
          <div
            key={supplier.id}
            className={`bg-white rounded-lg shadow-md overflow-hidden ${
              !supplier.active && 'opacity-60'
            }`}
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
              <h3 className="text-xl font-bold mb-2">{supplier.name}</h3>
              <div className="space-y-1 text-sm">
                {supplier.email && (
                  <div className="flex items-center space-x-2">
                    <FiMail size={14} />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center space-x-2">
                    <FiPhone size={14} />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.website && (
                  <div className="flex items-center space-x-2">
                    <FiGlobe size={14} />
                    <a
                      href={supplier.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline truncate"
                    >
                      {supplier.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Produtos</p>
                  <p className="text-2xl font-bold text-primary-600">
                    {supplier._count.products}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Comissão</p>
                  <p className="text-2xl font-bold text-green-600">
                    {supplier.commission}%
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    supplier.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {supplier.active ? 'Ativo' : 'Inativo'}
                </span>
                {supplier.apiUrl && (
                  <span className="ml-2 inline-block px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                    API Integrada
                  </span>
                )}
              </div>

              <div className="flex space-x-2">
                <Link
                  href={`/admin/fornecedores/${supplier.id}`}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 text-center flex items-center justify-center space-x-1"
                >
                  <FiEdit size={16} />
                  <span>Editar</span>
                </Link>
                <DeleteSupplierButton supplierId={supplier.id} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {suppliers.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 mb-4">Nenhum fornecedor cadastrado</p>
          <Link
            href="/admin/fornecedores/novo"
            className="text-primary-600 hover:text-primary-700 font-semibold"
          >
            Cadastrar primeiro fornecedor →
          </Link>
        </div>
      )}
    </div>
  )
}
