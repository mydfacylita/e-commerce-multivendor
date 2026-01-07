'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

interface AliExpressOrderStatusProps {
  orderId: string
  aliexpressOrderId: string
}

export default function AliExpressOrderStatus({ 
  orderId, 
  aliexpressOrderId 
}: AliExpressOrderStatusProps) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<any>(null)

  const checkStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/orders/aliexpress-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, aliexpressOrderId }),
      })

      const data = await response.json()
      
      if (data.success) {
        setStatus(data.order)
        toast.success('Status atualizado!')
      } else {
        toast.error(data.error || 'Erro ao consultar status')
      }
    } catch (error: any) {
      toast.error('Erro ao consultar status: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (orderStatus: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      'PLACE_ORDER_SUCCESS': { label: 'Pedido Criado', color: 'bg-blue-100 text-blue-800' },
      'IN_CANCEL': { label: 'Cancelando', color: 'bg-yellow-100 text-yellow-800' },
      'WAIT_SELLER_SEND_GOODS': { label: 'Aguardando Envio', color: 'bg-orange-100 text-orange-800' },
      'SELLER_PART_SEND_GOODS': { label: 'Enviado Parcialmente', color: 'bg-purple-100 text-purple-800' },
      'WAIT_BUYER_ACCEPT_GOODS': { label: 'Em Trânsito', color: 'bg-indigo-100 text-indigo-800' },
      'FUND_PROCESSING': { label: 'Processando Pagamento', color: 'bg-yellow-100 text-yellow-800' },
      'IN_ISSUE': { label: 'Com Problema', color: 'bg-red-100 text-red-800' },
      'IN_FROZEN': { label: 'Congelado', color: 'bg-gray-100 text-gray-800' },
      'WAIT_SELLER_EXAMINE_MONEY': { label: 'Aguardando Confirmação', color: 'bg-yellow-100 text-yellow-800' },
      'RISK_CONTROL': { label: 'Controle de Risco', color: 'bg-red-100 text-red-800' },
      'FINISH': { label: 'Finalizado', color: 'bg-green-100 text-green-800' },
    }

    const statusInfo = statusMap[orderStatus] || { label: orderStatus, color: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    )
  }

  const getPaymentStatusBadge = (paymentStatus: string) => {
    if (!paymentStatus) return null
    
    const statusMap: Record<string, { label: string; color: string }> = {
      'WAIT_BUYER_PAY': { label: 'Aguardando Pagamento', color: 'bg-yellow-100 text-yellow-800' },
      'PAY_SUCCESS': { label: 'Pago', color: 'bg-green-100 text-green-800' },
      'PAY_CANCEL': { label: 'Pagamento Cancelado', color: 'bg-red-100 text-red-800' },
    }

    const statusInfo = statusMap[paymentStatus] || { label: paymentStatus, color: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    )
  }

  return (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg shadow-md p-6 border-2 border-red-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-red-900">
          📦 Status AliExpress
        </h3>
        <button
          onClick={checkStatus}
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {loading ? '🔄 Consultando...' : '🔍 Consultar Status'}
        </button>
      </div>

      {status && (
        <div className="space-y-4">
          {/* Informações Básicas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">ID do Pedido</p>
              <p className="font-mono text-sm font-semibold">{status.order_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Status</p>
              {getStatusBadge(status.order_status)}
            </div>
          </div>

          {/* Status de Pagamento */}
          {status.payment_status && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Status do Pagamento</p>
                {getPaymentStatusBadge(status.payment_status)}
              </div>
              {status.payment_time && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Data do Pagamento</p>
                  <p className="text-sm font-semibold">
                    {new Date(status.payment_time).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* URL de Pagamento (se ainda não pago) */}
          {status.payment_url && status.payment_status === 'WAIT_BUYER_PAY' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-yellow-800 mb-2">
                ⚠️ Pagamento Pendente
              </p>
              <p className="text-xs text-yellow-700 mb-3">
                Este pedido foi criado mas ainda não foi pago. Clique no botão abaixo para completar o pagamento.
              </p>
              <a
                href={status.payment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm font-medium"
              >
                💳 Pagar Agora
              </a>
            </div>
          )}

          {/* Informações de Logística */}
          {status.logistics_service_name && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Método de Envio</p>
              <p className="text-sm font-semibold">{status.logistics_service_name}</p>
            </div>
          )}

          {status.tracking_number && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Código de Rastreamento</p>
              <p className="font-mono text-sm font-semibold">{status.tracking_number}</p>
            </div>
          )}

          {/* Valor Total */}
          {status.total_amount && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Valor Total</p>
              <p className="text-lg font-bold text-red-600">
                {status.total_amount.currency} {status.total_amount.amount}
              </p>
            </div>
          )}

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 pt-4 border-t">
            {status.create_time && (
              <div>
                <span className="font-medium">Criado em:</span>{' '}
                {new Date(status.create_time).toLocaleString('pt-BR')}
              </div>
            )}
          </div>

          {/* Link para gerenciar no AliExpress */}
          <div className="pt-4 border-t">
            <a
              href="https://trade.aliexpress.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-red-600 hover:text-red-700 font-medium inline-flex items-center"
            >
              🔗 Gerenciar no AliExpress →
            </a>
          </div>
        </div>
      )}

      {!status && (
        <p className="text-sm text-gray-500 text-center py-4">
          Clique em "Consultar Status" para ver as informações atualizadas do pedido no AliExpress.
        </p>
      )}

      {/* Informações estáticas (sempre visíveis) */}
      <div className="mt-4 pt-4 border-t">
        <p className="text-xs text-gray-600 mb-2">
          <strong>ID do Pedido AliExpress:</strong> {aliexpressOrderId}
        </p>
        <p className="text-xs text-gray-500">
          💡 <strong>Dica:</strong> Após criar o pedido, você precisa completar o pagamento no AliExpress para que o fornecedor processe o envio.
        </p>
      </div>
    </div>
  )
}
