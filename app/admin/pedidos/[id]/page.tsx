import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { FiArrowLeft, FiPackage, FiTruck, FiUser, FiMapPin, FiMessageCircle } from 'react-icons/fi'
import SendToSupplierButton from '@/components/admin/SendToSupplierButton'
import UpdateOrderStatusButton from '@/components/admin/UpdateOrderStatusButton'
import ResetSupplierStatusButton from '@/components/admin/ResetSupplierStatusButton'
import AliExpressOrderStatus from '@/components/admin/AliExpressOrderStatus'

export default async function AdminOrderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      user: true,
      items: {
        include: {
          product: {
            include: {
              supplier: true,
            },
          },
        },
      },
    },
  })

  if (!order) {
    notFound()
  }

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

  // Agrupar itens por fornecedor
  const itemsBySupplier = order.items.reduce((acc, item) => {
    const supplierId = item.product.supplierId || 'sem-fornecedor'
    const supplierName = item.product.supplier?.name || 'Sem fornecedor'
    
    if (!acc[supplierId]) {
      acc[supplierId] = {
        id: supplierId,
        name: supplierName,
        supplier: item.product.supplier,
        items: [],
        subtotal: 0,
      }
    }
    
    acc[supplierId].items.push(item)
    acc[supplierId].subtotal += item.price * item.quantity
    
    return acc
  }, {} as Record<string, any>)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/pedidos"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <FiArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              Pedido #{order.marketplaceOrderId || order.id.slice(0, 8)}
            </h1>
            <p className="text-gray-600 mt-1">
              {order.marketplaceName && `Via ${order.marketplaceName} • `}
              Criado em {new Date(order.createdAt).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {order.status !== 'CANCELLED' && (
            <>
              <UpdateOrderStatusButton orderId={order.id} currentStatus={order.status} />
              {order.sentToSupplier && (
                <ResetSupplierStatusButton orderId={order.id} />
              )}
              <SendToSupplierButton 
                orderId={order.id} 
                sentToSupplier={order.sentToSupplier}
              />
            </>
          )}
          {order.status === 'CANCELLED' && (
            <div className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold">
              ❌ Pedido Cancelado - Sem ações disponíveis
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações do Cliente */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary-100 rounded-lg">
              <FiUser className="text-primary-600" size={24} />
            </div>
            <h2 className="text-xl font-bold">Cliente</h2>
          </div>
          <div className="space-y-2">
            <p className="font-semibold">{order.buyerName || order.user?.name || 'N/A'}</p>
            <p className="text-gray-600">{order.buyerEmail || order.user?.email || 'N/A'}</p>
            {order.buyerPhone && (
              <p className="text-gray-600">📱 {order.buyerPhone}</p>
            )}
            {order.buyerCpf && (
              <p className="text-gray-600">CPF: {order.buyerCpf}</p>
            )}
            {order.paymentMethod && (
              <p className="text-sm text-gray-500 mt-2">
                Pagamento: <span className="font-semibold">{order.paymentMethod.toUpperCase()}</span>
              </p>
            )}
            {order.shippingCost && (
              <p className="text-sm text-gray-500">
                Frete: <span className="font-semibold">R$ {order.shippingCost.toFixed(2)}</span>
              </p>
            )}
          </div>
        </div>

        {/* Endereço de Entrega */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FiMapPin className="text-blue-600" size={24} />
            </div>
            <h2 className="text-xl font-bold">Endereço</h2>
          </div>
          <p className="text-gray-600 whitespace-pre-line">
            {order.shippingAddress || 'Endereço não informado'}
          </p>
        </div>

        {/* Status e Rastreio */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <FiTruck className="text-green-600" size={24} />
            </div>
            <h2 className="text-xl font-bold">Status</h2>
          </div>
          <div className="space-y-3">
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                {getStatusText(order.status)}
              </span>
            </div>
            {order.trackingCode && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Código de Rastreio</p>
                <p className="font-mono font-semibold">{order.trackingCode}</p>
              </div>
            )}
            {order.sentToSupplier && order.sentToSupplierAt && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Enviado ao fornecedor</p>
                <p className="text-sm">
                  {new Date(order.sentToSupplierAt).toLocaleString('pt-BR')}
                </p>
              </div>
            )}
            {order.cancelReason && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                <p className="text-sm font-semibold text-red-800 mb-1">Motivo do Cancelamento</p>
                <p className="text-sm text-red-700">{order.cancelReason}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Mensagens do Comprador */}
      {order.buyerMessages && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <FiMessageCircle className="text-purple-600" size={24} />
            </div>
            <h2 className="text-xl font-bold">Mensagens do Comprador</h2>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 whitespace-pre-line text-gray-700">
            {order.buyerMessages}
          </div>
        </div>
      )}
      {/* Itens por Fornecedor */}
      <div className="mt-6 space-y-6">
        {/* Status AliExpress (se houver pedido AliExpress) */}
        {order.supplierOrderId && order.items.some(item => 
          item.product.supplier?.name?.toLowerCase().includes('aliexpress')
        ) && (
          <AliExpressOrderStatus 
            orderId={order.id}
            aliexpressOrderId={order.supplierOrderId}
          />
        )}

        {Object.values(itemsBySupplier).map((supplierGroup: any) => (
          <div key={supplierGroup.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <FiPackage className="text-orange-600" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{supplierGroup.name}</h2>
                  {supplierGroup.supplier && (
                    <p className="text-sm text-gray-600">
                      {supplierGroup.supplier.apiUrl ? '🟢 API Integrada' : '🟡 Envio Manual'}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Subtotal</p>
                <p className="text-2xl font-bold text-primary-600">
                  R$ {supplierGroup.subtotal.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Produto</th>
                    <th className="text-left py-3 px-4 font-semibold">SKU Fornecedor</th>
                    <th className="text-center py-3 px-4 font-semibold">Qtd</th>
                    <th className="text-right py-3 px-4 font-semibold">Preço Un.</th>
                    <th className="text-right py-3 px-4 font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierGroup.items.map((item: any) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-semibold">{item.product.name}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-mono text-sm">
                          {item.product.supplierSku || 'N/A'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-3 py-1 bg-gray-100 rounded-full font-semibold">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        R$ {item.price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        R$ {(item.price * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Instruções de envio manual */}
            {supplierGroup.supplier && !supplierGroup.supplier.apiUrl && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="font-semibold text-yellow-800 mb-2">📋 Envio Manual Necessário</p>
                <p className="text-sm text-yellow-700">
                  Este fornecedor não possui API integrada. Acesse o painel do fornecedor e crie
                  o pedido manualmente com os itens listados acima.
                </p>
                {supplierGroup.supplier.website && (
                  <a
                    href={supplierGroup.supplier.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-sm text-blue-600 hover:underline"
                  >
                    Acessar site do fornecedor →
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Resumo Financeiro */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Resumo Financeiro</h2>
        <div className="space-y-2">
          <div className="pt-2 flex justify-between text-lg">
            <span className="font-bold">Total</span>
            <span className="font-bold text-primary-600">
              R$ {order.total.toFixed(2)}
            </span>
          </div>
          {order.profit && order.profit > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Lucro Estimado</span>
              <span className="font-semibold">R$ {order.profit.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
