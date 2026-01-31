import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { FiCheck, FiX, FiClock, FiEye } from 'react-icons/fi';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function AdminSellersPage() {
  const sellers = await prisma.seller.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          products: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const stats = {
    pending: sellers.filter((s) => s.status === 'PENDING').length,
    active: sellers.filter((s) => s.status === 'ACTIVE').length,
    suspended: sellers.filter((s) => s.status === 'SUSPENDED').length,
    rejected: sellers.filter((s) => s.status === 'REJECTED').length,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Gerenciar Vendedores</h1>

      {/* Estatísticas */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-800 text-sm font-medium">Pendentes</p>
              <p className="text-3xl font-bold text-yellow-900">{stats.pending}</p>
            </div>
            <FiClock className="text-yellow-600" size={32} />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-800 text-sm font-medium">Ativos</p>
              <p className="text-3xl font-bold text-green-900">{stats.active}</p>
            </div>
            <FiCheck className="text-green-600" size={32} />
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-800 text-sm font-medium">Suspensos</p>
              <p className="text-3xl font-bold text-red-900">{stats.suspended}</p>
            </div>
            <FiX className="text-red-600" size={32} />
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-800 text-sm font-medium">Rejeitados</p>
              <p className="text-3xl font-bold text-gray-900">{stats.rejected}</p>
            </div>
            <FiX className="text-gray-600" size={32} />
          </div>
        </div>
      </div>

      {/* Tabela de Vendedores */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loja
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Localização
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produtos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cadastro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sellers.map((seller) => (
                <tr key={seller.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {seller.storeName}
                        </div>
                        <div className="text-sm text-gray-500">
                          /loja/{seller.storeSlug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{seller.user.name}</div>
                    <div className="text-sm text-gray-500">{seller.user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      seller.sellerType === 'PF' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {seller.sellerType === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {seller.cidade}, {seller.estado}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {seller._count.products}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      seller.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : seller.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : seller.status === 'SUSPENDED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {seller.status === 'PENDING' && '⏳ Pendente'}
                      {seller.status === 'ACTIVE' && '✅ Ativo'}
                      {seller.status === 'SUSPENDED' && '⛔ Suspenso'}
                      {seller.status === 'REJECTED' && '❌ Rejeitado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(seller.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/admin/vendedores/${seller.id}`}
                      className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                    >
                      <FiEye size={16} />
                      Ver Detalhes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sellers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhum vendedor cadastrado ainda</p>
          </div>
        )}
      </div>
    </div>
  );
}
