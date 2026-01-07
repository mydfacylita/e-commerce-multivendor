'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  FiPackage, FiDollarSign, FiShoppingBag, FiAlertCircle, 
  FiPlus, FiEdit, FiTrendingUp, FiClock
} from 'react-icons/fi';

export default function SellerDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [seller, setSeller] = useState<any>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchSellerData();
    }
  }, [status]);

  const fetchSellerData = async () => {
    try {
      const response = await fetch('/api/seller/register');
      if (response.ok) {
        const data = await response.json();
        setSeller(data.seller);
      } else if (response.status === 404) {
        router.push('/vendedor/cadastro');
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!seller) {
    return null;
  }

  const stats = {
    totalProducts: seller.products?.length || 0,
    activeProducts: seller.products?.filter((p: any) => p.active).length || 0,
    totalSales: 0,
    totalRevenue: 0,
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Bem-vindo ao seu painel de vendedor</p>
        </div>
      </div>

      <div className="p-8">
        {/* Alerta de Status */}
        {seller.status === 'PENDING' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start">
            <FiAlertCircle className="text-yellow-600 mr-3 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <h3 className="font-semibold text-yellow-900">Cadastro em Análise</h3>
              <p className="text-yellow-800 text-sm">
                Seu cadastro está sendo analisado pela nossa equipe. Você será notificado assim que for aprovado.
              </p>
            </div>
          </div>
        )}

        {seller.status === 'SUSPENDED' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
            <FiAlertCircle className="text-red-600 mr-3 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <h3 className="font-semibold text-red-900">Conta Suspensa</h3>
              <p className="text-red-800 text-sm">
                Sua conta foi temporariamente suspensa. Entre em contato com o suporte para mais informações.
              </p>
            </div>
          </div>
        )}

        {/* Cards de Estatísticas */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Total de Produtos</span>
              <FiPackage className="text-blue-600" size={24} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
            <p className="text-sm text-gray-500 mt-1">{stats.activeProducts} ativos</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Vendas</span>
              <FiShoppingBag className="text-green-600" size={24} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalSales}</p>
            <p className="text-sm text-green-600 mt-1 flex items-center">
              <FiTrendingUp size={14} className="mr-1" />
              Este mês
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Receita</span>
              <FiDollarSign className="text-purple-600" size={24} />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              R$ {stats.totalRevenue.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Comissão: {seller.commission}%</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Status</span>
              <FiClock className="text-orange-600" size={24} />
            </div>
            <p className="text-lg font-bold text-gray-900">
              {seller.status === 'ACTIVE' ? 'Operacional' : 'Inativo'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Desde {new Date(seller.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Seção de Produtos */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Meus Produtos</h2>
            <Link
              href="/vendedor/produtos/novo"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FiPlus size={20} />
              Adicionar Produto
            </Link>
          </div>

          <div className="p-6">
            {stats.totalProducts === 0 ? (
              <div className="text-center py-12">
                <FiPackage className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum produto cadastrado
                </h3>
                <p className="text-gray-600 mb-6">
                  Comece adicionando seus produtos para vender na plataforma
                </p>
                <Link
                  href="/vendedor/produtos/novo"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <FiPlus size={20} />
                  Adicionar Primeiro Produto
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Produto</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Categoria</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Preço</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Estoque</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seller.products.map((product: any) => {
                      let images = [];
                      try {
                        images = product.images ? JSON.parse(product.images) : [];
                      } catch (error) {
                        console.warn('Failed to parse product images:', product.id, error);
                        images = [];
                      }
                      return (
                        <tr key={product.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              {images[0] && (
                                <img
                                  src={images[0]}
                                  alt={product.name}
                                  className="w-12 h-12 object-cover rounded mr-3"
                                />
                              )}
                              <span className="font-medium">{product.name}</span>
                            </div>
                          </td>
                        <td className="py-3 px-4 text-gray-600">{product.category.name}</td>
                        <td className="py-3 px-4 text-green-600 font-semibold">
                          R$ {product.price.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-sm ${
                            product.stock > 10 
                              ? 'bg-green-100 text-green-800' 
                              : product.stock > 0 
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {product.stock} un.
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {product.active ? (
                            <span className="text-green-600">Ativo</span>
                          ) : (
                            <span className="text-gray-600">Inativo</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            href={`/vendedor/produtos/${product.id}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <FiEdit size={18} />
                          </Link>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Informações da Loja */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-lg mb-4">Informações da Loja</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600">URL da Loja:</span>
                <p className="font-medium">/loja/{seller.storeSlug}</p>
              </div>
              {seller.storeDescription && (
                <div>
                  <span className="text-gray-600">Descrição:</span>
                  <p className="font-medium">{seller.storeDescription}</p>
                </div>
              )}
              <div>
                <span className="text-gray-600">Membro desde:</span>
                <p className="font-medium">
                  {new Date(seller.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-lg mb-4">Configurações</h3>
            <div className="space-y-3">
              <Link
                href="/vendedor/configuracoes"
                className="block px-4 py-2 border rounded-lg hover:bg-gray-50 text-gray-700"
              >
                Editar Dados da Loja
              </Link>
              <Link
                href="/vendedor/financeiro"
                className="block px-4 py-2 border rounded-lg hover:bg-gray-50 text-gray-700"
              >
                Dados Bancários
              </Link>
              <Link
                href="/vendedor/pedidos"
                className="block px-4 py-2 border rounded-lg hover:bg-gray-50 text-gray-700"
              >
                Ver Todos os Pedidos
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
