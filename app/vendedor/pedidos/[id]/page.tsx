'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FiArrowLeft, FiPackage, FiMapPin, FiCreditCard, FiTruck, FiBox, FiPrinter, FiEdit2, FiCheck } from 'react-icons/fi';
import { formatOrderNumber } from '@/lib/order';
import toast from 'react-hot-toast';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchOrder();
    }
  }, [status]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      } else if (response.status === 404) {
        toast.error('Pedido não encontrado');
        router.push('/vendedor/pedidos');
      } else {
        toast.error('Erro ao carregar pedido');
      }
    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      toast.error('Erro ao carregar pedido');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintLabel = () => {
    window.open(`/api/vendedor/expedicao/${params.id}/etiqueta`, '_blank');
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (updatingStatus) return;
    
    try {
      setUpdatingStatus(true);
      
      // Mapear status para endpoints de expedição do vendedor
      let endpoint = '';
      let method = 'POST';
      
      switch (newStatus) {
        case 'PROCESSING':
          endpoint = `/api/vendedor/expedicao/${params.id}/separar`;
          break;
        case 'SHIPPED':
          endpoint = `/api/vendedor/expedicao/${params.id}/despachar`;
          break;
        case 'DELIVERED':
          // Para marcar como entregue, usar outra lógica se necessário
          toast.error('Marcar como entregue será feito automaticamente pelo rastreio');
          return;
        default:
          toast.error('Status não suportado');
          return;
      }
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        toast.success('Status atualizado com sucesso!');
        fetchOrder();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao atualizar status');
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddTracking = async () => {
    if (!trackingCode.trim()) {
      toast.error('Digite o código de rastreio');
      return;
    }

    try {
      const response = await fetch(`/api/vendedor/expedicao/${params.id}/despachar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingCode }),
      });

      if (response.ok) {
        toast.success('Código de rastreio adicionado!');
        setShowTrackingModal(false);
        setTrackingCode('');
        fetchOrder();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao adicionar rastreio');
      }
    } catch (error) {
      console.error('Erro ao adicionar rastreio:', error);
      toast.error('Erro ao adicionar rastreio');
    }
  };

  if (isLoading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) return null;

  const statusColors: any = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PROCESSING: 'bg-blue-100 text-blue-800',
    SHIPPED: 'bg-purple-100 text-purple-800',
    DELIVERED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  const statusLabels: any = {
    PENDING: 'Pendente',
    PROCESSING: 'Processando',
    SHIPPED: 'Enviado',
    DELIVERED: 'Entregue',
    CANCELLED: 'Cancelado',
  };

  // Função para formatar endereço (parse JSON se necessário)
  const formatShippingAddress = (address: string | null): string => {
    if (!address) return 'Endereço não informado'
    
    try {
      const parsed = JSON.parse(address)
      
      if (parsed.formatted) {
        return parsed.formatted
      }
      
      const parts = []
      if (parsed.street) parts.push(parsed.street)
      if (parsed.number && parsed.number !== 'SN') parts.push(parsed.number)
      if (parsed.complement) parts.push(parsed.complement)
      if (parsed.neighborhood) parts.push(parsed.neighborhood)
      if (parsed.city) parts.push(parsed.city)
      if (parsed.state) parts.push(parsed.state)
      if (parsed.zipCode) parts.push(`CEP: ${parsed.zipCode.replace(/(\d{5})(\d{3})/, '$1-$2')}`)
      
      return parts.join(', ') || address
    } catch {
      return address
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link
        href="/vendedor/pedidos"
        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
      >
        <FiArrowLeft size={20} />
        Voltar para Pedidos
      </Link>

      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold">Pedido {formatOrderNumber(order.id)}</h1>
          <p className="text-gray-600 mt-1">
            Realizado em {new Date(order.createdAt).toLocaleDateString('pt-BR')} às{' '}
            {new Date(order.createdAt).toLocaleTimeString('pt-BR')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-4 py-2 rounded-full font-semibold ${statusColors[order.status]}`}>
            {statusLabels[order.status]}
          </span>
        </div>
      </div>

      {/* Aviso de Pagamento Pendente */}
      {order.status === 'PENDING' && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600 text-xl">⏳</span>
            <div>
              <h3 className="font-semibold text-yellow-800">Aguardando Pagamento</h3>
              <p className="text-sm text-yellow-700">Este pedido ainda não foi pago. As ações estarão disponíveis na área de Expedição após a confirmação do pagamento.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Produtos */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiPackage className="text-blue-600" size={24} />
              <h2 className="text-xl font-bold">Produtos do Pedido</h2>
            </div>
            <div className="space-y-4">
              {order.items.map((item: any) => {
                const images = typeof item.product.images === 'string' 
                  ? JSON.parse(item.product.images) 
                  : item.product.images;
                const firstImage = Array.isArray(images) ? images[0] : '/placeholder.jpg';
                const isDropshipping = !!item.product.supplierSku;

                return (
                  <div key={item.id} className="flex gap-4 pb-4 border-b last:border-b-0">
                    <div className="w-20 h-20 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                      <img
                        src={firstImage}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-semibold">{item.product.name}</h3>
                        {isDropshipping && (
                          <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded">
                            <FiBox className="inline mr-1" size={12} />
                            Dropshipping
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Quantidade: {item.quantity} × R$ {item.price.toFixed(2)}
                      </p>
                      <p className="font-semibold text-gray-900">
                        Subtotal: R$ {(item.price * item.quantity).toFixed(2)}
                      </p>
                      {item.itemType === 'DROPSHIPPING' && item.supplierCost && (
                        <div className="mt-2 text-xs space-y-1 bg-green-50 p-2 rounded">
                          <div className="flex justify-between items-center text-gray-700">
                            <span>💰 Preço de venda:</span>
                            <span className="font-bold">R$ {(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center text-red-600">
                            <span>📦 Seu custo ({item.commissionRate}% desconto):</span>
                            <span className="font-medium">- R$ {(item.supplierCost * item.quantity).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-green-300 text-green-700 font-bold text-base">
                            <span>✅ Seu lucro:</span>
                            <span>R$ {item.sellerRevenue ? item.sellerRevenue.toFixed(2) : '0.00'}</span>
                          </div>
                        </div>
                      )}
                      {item.itemType === 'STOCK' && item.sellerRevenue && (
                        <div className="mt-2 text-xs space-y-1">
                          <div className="flex justify-between items-center text-gray-600">
                            <span>Valor de venda:</span>
                            <span className="font-medium">R$ {(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center text-orange-600">
                            <span>Taxa plataforma ({item.commissionRate}%):</span>
                            <span className="font-medium">- R$ {(item.commissionAmount).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t text-green-600 font-semibold">
                            <span>Você recebe:</span>
                            <span>R$ {(item.sellerRevenue).toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Endereço de Entrega */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiMapPin className="text-blue-600" size={24} />
              <h2 className="text-xl font-bold">Endereço de Entrega</h2>
            </div>
            <div className="text-gray-700 space-y-1">
              <p className="font-semibold">{formatShippingAddress(order.shippingAddress)}</p>
              {order.shippingCity && order.shippingState && (
                <p>{order.shippingCity}, {order.shippingState}</p>
              )}
              {order.shippingZip && (
                <p>CEP: {order.shippingZip}</p>
              )}
            </div>
          </div>
        </div>

        {/* Coluna Lateral */}
        <div className="space-y-6">
          {/* Resumo Financeiro */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiCreditCard className="text-blue-600" size={24} />
              <h2 className="text-xl font-bold">Resumo</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">R$ {order.total.toFixed(2)}</span>
              </div>
              {order.commission && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Comissão Plataforma:</span>
                  <span className="font-semibold text-red-600">
                    - R$ {order.commission.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="pt-3 border-t flex justify-between">
                <span className="font-semibold">Você Recebe:</span>
                <span className="font-bold text-green-600 text-xl">
                  R$ {order.sellerRevenue ? order.sellerRevenue.toFixed(2) : order.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Cliente */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Cliente</h2>
            <div className="space-y-2">
              <p className="font-semibold">{order.user?.name || 'N/A'}</p>
              {order.user?.cpf && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">CPF:</span> {order.user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                </p>
              )}
              {order.user?.email && (
                <p className="text-sm text-gray-600">{order.user.email}</p>
              )}
              {order.user?.phone && (
                <p className="text-sm text-gray-600">{order.user.phone}</p>
              )}
            </div>
          </div>

          {/* Rastreamento */}
          {order.trackingCode && (
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <FiTruck className="text-blue-600" size={24} />
                <h2 className="text-xl font-bold">Rastreamento</h2>
              </div>
              <p className="font-mono text-sm bg-white px-3 py-2 rounded border">
                {order.trackingCode}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Rastreio */}
      {showTrackingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Adicionar Código de Rastreio</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Rastreio
              </label>
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                placeholder="Ex: AA123456789BR"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                maxLength={13}
              />
              <p className="text-xs text-gray-500 mt-1">
                Digite o código de rastreamento dos Correios
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTrackingModal(false);
                  setTrackingCode('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddTracking}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
