import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserPermissions } from '@/lib/seller'
import { formatOrderNumber } from '@/lib/order'
import Link from 'next/link'
import { FiEye, FiPackage, FiTruck, FiCheckCircle, FiXCircle } from 'react-icons/fi'

export default async function VendedorPedidosPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'SELLER') {
    redirect('/login');
  }

  // Verificar permissões
  const permissions = await getUserPermissions(session);
  if (!permissions || (!permissions.canManageOrders && !permissions.isOwner)) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-red-800 mb-2">🚫 Acesso Negado</h2>
          <p className="text-red-600">
            Você não tem permissão para visualizar pedidos.
          </p>
          <p className="text-sm text-red-500 mt-2">
            Entre em contato com o proprietário da loja para solicitar acesso.
          </p>
        </div>
      </div>
    );
  }

  // Buscar vendedor
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { 
      seller: true,
      workForSeller: true 
    }
  });

  // Determinar qual seller usar (próprio ou do patrão)
  const seller = user?.seller || user?.workForSeller;

  if (!seller) {
    redirect('/vendedor/cadastro');
  }

  // Buscar pedidos deste vendedor
  const orders = await prisma.order.findMany({
    where: {
      sellerId: seller.id
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              category: true
            }
          }
        }
      },
      user: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Estatísticas
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    processing: orders.filter(o => o.status === 'PROCESSING').length,
    shipped: orders.filter(o => o.status === 'SHIPPED').length,
    delivered: orders.filter(o => o.status === 'DELIVERED').length,
    cancelled: orders.filter(o => o.status === 'CANCELLED').length,
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
      PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: FiPackage },
      PROCESSING: { label: 'Processando', color: 'bg-blue-100 text-blue-800', icon: FiPackage },
      SHIPPED: { label: 'Enviado', color: 'bg-purple-100 text-purple-800', icon: FiTruck },
      DELIVERED: { label: 'Entregue', color: 'bg-green-100 text-green-800', icon: FiCheckCircle },
      CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: FiXCircle },
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon size={14} />
        {config.label}
      </span>
    );
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Meus Pedidos</h1>
        <p className="text-gray-600 mt-2">Gerencie os pedidos dos seus produtos</p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Pendentes</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Processando</p>
          <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Enviados</p>
          <p className="text-2xl font-bold text-purple-600">{stats.shipped}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Entregues</p>
          <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Cancelados</p>
          <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="bg-white rounded-lg shadow">
        {orders.length === 0 ? (
          <div className="p-8 text-center">
            <FiPackage size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">Você ainda não tem pedidos</p>
            <Link
              href="/vendedor/produtos"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Ver Meus Produtos
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Pedido</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cliente</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Origem</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tipo</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Produtos</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Data</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const totalVendedor = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                  
                  // Verificar origem do pedido
                  const origem = order.marketplaceName || 'MYD';
                  
                  // Verificar tipo: próprio ou dropshipping (baseado nos itens do vendedor)
                  const vendorItems = order.items.filter(item => item.sellerId === seller.id);
                  const hasDropshipping = vendorItems.some(item => item.product.supplierSku);
                  const hasOwnProducts = vendorItems.some(item => !item.product.supplierSku);
                  
                  let tipo = '';
                  let tipoBadgeColor = '';
                  if (hasDropshipping && hasOwnProducts) {
                    tipo = 'Misto';
                    tipoBadgeColor = 'bg-purple-100 text-purple-800';
                  } else if (hasDropshipping) {
                    tipo = 'Dropshipping';
                    tipoBadgeColor = 'bg-blue-100 text-blue-800';
                  } else {
                    tipo = 'Próprio';
                    tipoBadgeColor = 'bg-green-100 text-green-800';
                  }
                  
                  return (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm font-semibold text-blue-600">{formatOrderNumber(order.id)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{order.user.name || 'N/A'}</p>
                        <p className="text-sm text-gray-600">{order.user.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {origem}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tipoBadgeColor}`}>
                          {tipo}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {order.items.map((item) => (
                            <div key={item.id} className="text-sm">
                              <span className="text-gray-900">{item.quantity}x</span>{' '}
                              <span className="text-gray-600">{item.product.name}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-green-600">
                          R$ {totalVendedor.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-900">
                          {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(order.createdAt).toLocaleTimeString('pt-BR')}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/vendedor/pedidos/${order.id}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          <FiEye size={16} />
                          Ver Detalhes
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Informações */}
      {orders.length > 0 && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-lg mb-2 text-blue-900">💡 Dica</h3>
          <p className="text-blue-800 text-sm">
            Mantenha o status dos pedidos atualizado para uma melhor experiência do cliente. 
            Pedidos pendentes devem ser processados em até 24 horas.
          </p>
        </div>
      )}
    </div>
  );
}
