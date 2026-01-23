'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Package, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/format'

interface OrderItem {
  id: string
  productName: string
  quantity: number
  price: number
  imageUrl?: string
  productId: string
}

interface Order {
  id: string
  total: number
  status: string
  paymentStatus: string
  createdAt: string
  shippedAt?: string
  items: OrderItem[]
  buyerName: string
  buyerEmail: string
}

export default function SolicitarDevolucaoPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params?.id as string
  
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')

  // Motivos pré-definidos para devolução
  const returnReasons = [
    { value: 'PRODUTO_DANIFICADO', label: 'Produto chegou danificado' },
    { value: 'PRODUTO_INCORRETO', label: 'Produto diferente do pedido' },
    { value: 'NAO_ATENDE_EXPECTATIVA', label: 'Produto não atende expectativa' },
    { value: 'DEFEITO_FABRICACAO', label: 'Defeito de fabricação' },
    { value: 'ARREPENDIMENTO', label: 'Arrependimento da compra' },
    { value: 'OUTRO', label: 'Outro motivo' }
  ]

  useEffect(() => {
    loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data.order)
        
        // Verificar se o pedido é elegível para devolução
        if (!isEligibleForReturn(data.order)) {
          router.push(`/pedidos/${orderId}`)
          return
        }
      } else {
        console.error('Erro ao carregar pedido')
        router.push('/pedidos')
      }
    } catch (error) {
      console.error('Erro:', error)
      router.push('/pedidos')
    } finally {
      setLoading(false)
    }
  }

  // Verifica se o pedido é elegível para devolução
  const isEligibleForReturn = (order: Order): boolean => {
    // Pedido deve estar entregue e dentro do prazo de 7 dias
    if (order.status !== 'DELIVERED') return false
    
    if (order.shippedAt) {
      const shippedDate = new Date(order.shippedAt)
      const daysSinceShipped = Math.floor((Date.now() - shippedDate.getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceShipped <= 7
    }
    
    return false
  }

  const handleItemSelection = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId])
    } else {
      setSelectedItems(selectedItems.filter(id => id !== itemId))
    }
  }

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      alert('Selecione pelo menos um item para devolução')
      return
    }
    
    if (!reason) {
      alert('Selecione um motivo para a devolução')
      return
    }

    if (reason === 'OUTRO' && !description.trim()) {
      alert('Descreva o motivo da devolução')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/returns/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId,
          itemIds: selectedItems,
          reason,
          description: description.trim() || undefined
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert('Solicitação de devolução enviada com sucesso!')
        router.push(`/pedidos/${orderId}`)
      } else {
        alert(result.error || 'Erro ao solicitar devolução')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao processar solicitação')
    } finally {
      setSubmitting(false)
    }
  }

  const calculateReturnValue = () => {
    if (!order) return 0
    return order.items
      .filter(item => selectedItems.includes(item.id))
      .reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto p-6">
        <p>Pedido não encontrado</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push(`/pedidos/${orderId}`)}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Solicitar Devolução</h1>
          <p className="text-gray-600">Pedido #{orderId}</p>
        </div>
      </div>

      {/* Informações do prazo */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold">Política de Devolução</h3>
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-600">
            Você tem até 7 dias após o recebimento do pedido para solicitar a devolução. 
            A devolução será analisada e, se aprovada, o valor será estornado em até 5 dias úteis.
          </p>
        </div>
      </div>

      {/* Seleção de Itens */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Selecione os itens para devolução</h3>
        </div>
        <div className="p-4 space-y-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
              <input
                type="checkbox"
                checked={selectedItems.includes(item.id)}
                onChange={(e) => handleItemSelection(item.id, e.target.checked)}
                className="h-4 w-4 text-blue-600"
              />
              
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium">{item.productName}</h4>
                    <p className="text-sm text-gray-600">
                      Quantidade: {item.quantity} • {formatCurrency(item.price)} cada
                    </p>
                    <p className="font-medium">
                      Total: {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Motivo da Devolução */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Motivo da devolução</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {returnReasons.map((reasonOption) => (
              <div key={reasonOption.value} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={reasonOption.value}
                  name="reason"
                  value={reasonOption.value}
                  checked={reason === reasonOption.value}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-4 w-4"
                />
                <label htmlFor={reasonOption.value} className="text-sm font-medium">
                  {reasonOption.label}
                </label>
              </div>
            ))}
          </div>
          
          {(reason === 'OUTRO' || reason === 'PRODUTO_DANIFICADO' || reason === 'DEFEITO_FABRICACAO') && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                Descreva o problema {reason === 'OUTRO' ? '(obrigatório)' : '(opcional)'}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva detalhadamente o problema ou motivo da devolução..."
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {description.length}/500 caracteres
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Resumo */}
      {selectedItems.length > 0 && (
        <div className="mb-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Resumo da Devolução</h3>
          </div>
          <div className="p-4">
            <div className="flex justify-between items-center">
              <span>Itens selecionados: {selectedItems.length}</span>
              <span className="font-bold text-lg">
                Valor a ser devolvido: {formatCurrency(calculateReturnValue())}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex gap-4">
        <button
          onClick={() => router.push(`/pedidos/${orderId}`)}
          disabled={submitting}
          className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || selectedItems.length === 0 || !reason}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          {submitting ? 'Enviando...' : 'Solicitar Devolução'}
        </button>
      </div>
    </div>
  )
}