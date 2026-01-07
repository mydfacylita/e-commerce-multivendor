import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { FiEye, FiPackage, FiAlertCircle } from 'react-icons/fi'
import UpdateOrderStatusButton from '@/components/admin/UpdateOrderStatusButton'
import SendToSupplierButton from '@/components/admin/SendToSupplierButton'
import PrintShippingLabelButton from '@/components/admin/PrintShippingLabelButton'
import AutoFetchOrders from '@/components/admin/AutoFetchOrders'

export default async function AdminPedidosPage() {
  const orders = await prisma.order.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  console.log('[Admin Pedidos] Total de pedidos encontrados:', orders.length)

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      PENDING: 'bg-gray-100 text-gray-800',
      PROCESSING: 'bg-yellow-100 text-yellow-800',
      SHIPPED: 'bg-blue-100 text-blue-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    }
    return colorMap[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      PENDING: 'Pendente',
      PROCESSING: 'Processando',
      SHIPPED: 'Enviado',
      DELIVERED: 'Entregue',
      CANCELLED: 'Cancelado',
    }
    return statusMap[status] || status
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Gerenciar Pedidos</h1>
        <div className="flex gap-4">
          <div className="bg-white px-4 py-2 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total de Pedidos</p>
            <p className="text-2xl font-bold">{orders.length}</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg shadow">
            <p className="text-sm text-gray-600">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-600">
              {orders.filter(o => o.status === 'PENDING').length}
            </p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg shadow">
            <p className="text-sm text-gray-600">Não Enviados</p>
            <p className="text-2xl font-bold text-red-600">
              {orders.filter(o => !o.sentToSupplier && o.status !== 'CANCELLED').length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-4 px-6 font-semibold">ID</th>
                <th className="text-left py-4 px-6 font-semibold">Origem</th>
                <th className="text-left py-4 px-6 font-semibold">Cliente</th>
                <th className="text-left py-4 px-6 font-semibold">Total</th>
                <th className="text-left py-4 px-6 font-semibold">Itens</th>
                <th className="text-left py-4 px-6 font-semibold">Status</th>
                <th className="text-left py-4 px-6 font-semibold">Fornecedor</th>
                <th className="text-left py-4 px-6 font-semibold">Data</th>
                <th className="text-right py-4 px-6 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <p className="font-mono text-sm">{order.id.slice(0, 8)}...</p>
                  </td>
                  <td className="py-4 px-6">
                    {order.marketplaceOrderId ? (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                        ML
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                        Site
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <p className="font-semibold">{order.buyerName || order.user?.name || 'N/A'}</p>
                    <p className="text-sm text-gray-500">{order.buyerEmail || order.user?.email || 'N/A'}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="font-semibold text-primary-600">
                      R$ {order.total.toFixed(2)}
                    </p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm">{order.items.length} produtos</p>
                  </td>
                  <td className="py-4 px-6">
                    {order.status !== 'CANCELLED' ? (
                      <UpdateOrderStatusButton orderId={order.id} currentStatus={order.status} />
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                        ❌ Cancelado
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    {order.sentToSupplier ? (
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <FiPackage size={16} />
                        <span>Enviado</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600 text-sm">
                        <FiAlertCircle size={16} />
                        <span>Pendente</span>
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleTimeString('pt-BR')}
                    </p>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex justify-end gap-2">
                      {order.marketplaceOrderId && order.status !== 'CANCELLED' && (
                        <PrintShippingLabelButton 
                          orderId={order.id}
                          marketplace="mercadolivre"
                        />
                      )}
                      {!order.sentToSupplier && order.status !== 'CANCELLED' && (
                        <SendToSupplierButton 
                          orderId={order.id} 
                          sentToSupplier={order.sentToSupplier}
                        />
                      )}
                      <Link
                        href={`/admin/pedidos/${order.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                        title="Ver detalhes"
                      >
                        <FiEye size={18} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhum pedido encontrado</p>
          </div>
        )}
      </div>

      {/* Componente de verificação automática */}
      <AutoFetchOrders />
    </div>
  )
}
