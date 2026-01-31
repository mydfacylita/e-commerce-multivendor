'use client'

import { useState, useEffect } from 'react'
import { Printer, Package, Search, RefreshCw, Download, FileText, AlertCircle } from 'lucide-react'
import { formatOrderNumber } from '@/lib/order'

interface Order {
  id: string
  status: string
  buyerName: string
  shippingAddress: string
  shippingMethod?: string
  shippingService?: string
  trackingCode?: string
  createdAt: string
  packedAt?: string
  shippedAt?: string
  shippingLabel?: string
  shippingLabelCost?: number
  items: {
    id: string
    quantity: number
    product: {
      name: string
      weight?: number
    }
  }[]
}

export default function VendedorEtiquetasPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [generating, setGenerating] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      // Buscar pedidos embalados ou enviados (que precisam de etiqueta)
      const res = await fetch('/api/vendedor/expedicao?status=packed')
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
      }
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGerarEtiqueta = async (orderId: string) => {
    setGenerating(orderId)
    try {
      const res = await fetch(`/api/vendedor/expedicao/${orderId}/etiqueta`, {
        method: 'POST'
      })
      
      if (res.ok) {
        const data = await res.json()
        setMessage({ type: 'success', text: 'Etiqueta gerada com sucesso!' })
        loadOrders()
        
        // Se tem URL da etiqueta, abre em nova aba
        if (data.labelUrl) {
          window.open(data.labelUrl, '_blank')
        }
      } else {
        const error = await res.json()
        setMessage({ type: 'error', text: error.error || 'Erro ao gerar etiqueta' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao gerar etiqueta' })
    } finally {
      setGenerating(null)
    }
  }

  const filteredOrders = orders.filter(order => {
    if (!search) return true
    return order.id.toLowerCase().includes(search.toLowerCase()) ||
           order.buyerName.toLowerCase().includes(search.toLowerCase())
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Etiquetas de Envio</h1>
        <p className="text-gray-600">Gere e imprima etiquetas para seus pedidos</p>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-4 underline">Fechar</button>
        </div>
      )}

      {/* Busca */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por número do pedido ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={loadOrders}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="Atualizar"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="bg-white rounded-lg shadow">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="mx-auto mb-4 text-gray-300" size={48} />
            <p>Nenhum pedido aguardando etiqueta</p>
            <p className="text-sm mt-2">Os pedidos embalados aparecerão aqui</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Pedido</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Destino</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Frete</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Rastreio</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-blue-600">#{formatOrderNumber(order.id)}</span>
                      <p className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{order.buyerName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600 max-w-xs truncate" title={order.shippingAddress}>
                        {order.shippingAddress}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">
                        {order.shippingMethod || 'Padrão'} 
                        {order.shippingService && ` - ${order.shippingService}`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {order.trackingCode ? (
                        <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {order.trackingCode}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {order.shippingLabel ? (
                          <a
                            href={order.shippingLabel}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1"
                          >
                            <Download size={14} />
                            Baixar
                          </a>
                        ) : (
                          <button
                            onClick={() => handleGerarEtiqueta(order.id)}
                            disabled={generating === order.id}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                          >
                            {generating === order.id ? (
                              <>
                                <RefreshCw size={14} className="animate-spin" />
                                Gerando...
                              </>
                            ) : (
                              <>
                                <Printer size={14} />
                                Gerar Etiqueta
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 bg-blue-50 p-4 rounded-lg flex gap-3">
        <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Como funciona?</p>
          <p className="mt-1">
            1. Embale o pedido na página de Expedição<br />
            2. Gere a etiqueta aqui<br />
            3. Imprima e cole no pacote<br />
            4. Marque como despachado após enviar
          </p>
        </div>
      </div>
    </div>
  )
}
