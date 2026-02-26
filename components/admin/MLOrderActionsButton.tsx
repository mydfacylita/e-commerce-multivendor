'use client'

import { useState } from 'react'
import {
  FiRefreshCw,
  FiTruck,
  FiExternalLink,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiPackage,
  FiLoader,
} from 'react-icons/fi'

interface MLOrderActionsProps {
  orderId: string
  mlOrderId: string
  currentTrackingCode?: string | null
}

interface MLOrderInfo {
  id: string | number
  status: string
  statusDetail: string
  totalAmount: number
  paidAmount: number
  buyer: { id: number; nickname: string }
  shipping: {
    id: number
    status: string
    substatus: string
    trackingNumber: string | null
    carrier: string | null
    mode: string
    estimatedDelivery: string | null
  } | null
  items: { id: string; title: string; quantity: number; unitPrice: number }[]
  viewUrl: string
}

const ML_STATUS_LABEL: Record<string, string> = {
  confirmed: '✅ Confirmado',
  payment_required: '⏳ Aguardando Pagamento',
  payment_in_process: '⏳ Pagamento em Processo',
  paid: '💰 Pago',
  partially_refunded: '↩️ Parcialmente Reembolsado',
  cancelled: '❌ Cancelado',
}

const ML_SHIPPING_STATUS_LABEL: Record<string, string> = {
  pending: '⏳ Pendente',
  handling: '📦 Preparando',
  ready_to_ship: '📫 Pronto p/ Envio',
  shipped: '🚀 Enviado',
  delivered: '✅ Entregue',
  not_delivered: '❌ Não Entregue',
  cancelled: '❌ Cancelado',
}

export default function MLOrderActionsButton({
  orderId,
  mlOrderId,
  currentTrackingCode,
}: MLOrderActionsProps) {
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [mlInfo, setMlInfo] = useState<MLOrderInfo | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [showTrackingForm, setShowTrackingForm] = useState(false)
  const [trackingCode, setTrackingCode] = useState(currentTrackingCode || '')
  const [carrier, setCarrier] = useState('')
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const baseUrl = `/api/admin/orders/${orderId}/marketplace-actions`

  async function syncStatus() {
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await fetch(baseUrl)
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Erro ao sincronizar')
      setMlInfo(data.mlOrder)
      if (data.updated) setSuccessMsg('Status sincronizado! Página precisa ser atualizada.')
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function callAction(action: string, extra: Record<string, string> = {}) {
    setActionLoading(action)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Erro ao executar ação')
      setSuccessMsg(data.message || 'Ação realizada com sucesso!')
      if (action === 'send_tracking') setShowTrackingForm(false)
      if (action === 'cancel') setShowCancelForm(false)
      // Resync info
      setTimeout(() => syncStatus(), 800)
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="mt-6 bg-white rounded-lg shadow-md overflow-hidden border-l-4 border-yellow-400">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-yellow-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-white font-bold text-sm">
            ML
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Ações Mercado Livre</h2>
            <p className="text-xs text-gray-600">
              ID do pedido ML:{' '}
              <span className="font-mono font-semibold">{mlOrderId}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`https://www.mercadolivre.com.br/vendas/${mlOrderId}/detail`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-yellow-700 border border-yellow-400 rounded-lg hover:bg-yellow-100 transition"
          >
            <FiExternalLink size={14} />
            Ver no ML
          </a>
          <button
            onClick={syncStatus}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 transition disabled:opacity-60"
          >
            {loading ? (
              <FiLoader size={14} className="animate-spin" />
            ) : (
              <FiRefreshCw size={14} />
            )}
            Sincronizar
          </button>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        {/* Mensagens de feedback */}
        {errorMsg && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <FiAlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            <FiCheckCircle size={16} className="mt-0.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Informações do ML (pós-sync) */}
        {mlInfo && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg space-y-1">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Status do Pedido</p>
              <p className="font-semibold text-sm">
                {ML_STATUS_LABEL[mlInfo.status] || mlInfo.status}
              </p>
              {mlInfo.statusDetail && (
                <p className="text-xs text-gray-500">{mlInfo.statusDetail}</p>
              )}
              <p className="text-xs text-gray-500">
                Comprador: <span className="font-medium text-gray-700">{mlInfo.buyer?.nickname}</span>
              </p>
              <p className="text-xs text-gray-500">
                Total ML:{' '}
                <span className="font-medium text-gray-700">
                  R$ {mlInfo.totalAmount?.toFixed(2)}
                </span>{' '}
                |{' '}
                <span className="text-green-600 font-medium">
                  Pago R$ {mlInfo.paidAmount?.toFixed(2)}
                </span>
              </p>
            </div>

            {mlInfo.shipping && (
              <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Envio</p>
                <p className="font-semibold text-sm">
                  {ML_SHIPPING_STATUS_LABEL[mlInfo.shipping.status] || mlInfo.shipping.status}
                </p>
                {mlInfo.shipping.substatus && (
                  <p className="text-xs text-gray-400">{mlInfo.shipping.substatus}</p>
                )}
                {mlInfo.shipping.carrier && (
                  <p className="text-xs text-gray-500">
                    Transportadora: <span className="font-medium">{mlInfo.shipping.carrier}</span>
                  </p>
                )}
                {mlInfo.shipping.trackingNumber && (
                  <p className="text-xs text-gray-500">
                    Rastreio:{' '}
                    <span className="font-mono font-medium text-blue-600">
                      {mlInfo.shipping.trackingNumber}
                    </span>
                  </p>
                )}
                {mlInfo.shipping.estimatedDelivery && (
                  <p className="text-xs text-gray-400">
                    Entrega estimada:{' '}
                    {new Date(mlInfo.shipping.estimatedDelivery).toLocaleDateString('pt-BR')}
                  </p>
                )}
                <p className="text-xs text-gray-400">Modo: {mlInfo.shipping.mode}</p>
              </div>
            )}
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {/* Pronto para envio */}
          <button
            onClick={() => callAction('ready_to_ship')}
            disabled={actionLoading !== null}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
          >
            {actionLoading === 'ready_to_ship' ? (
              <FiLoader size={14} className="animate-spin" />
            ) : (
              <FiPackage size={14} />
            )}
            Pronto para Envio
          </button>

          {/* Enviar rastreio */}
          <button
            onClick={() => setShowTrackingForm(!showTrackingForm)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <FiTruck size={14} />
            Enviar Código de Rastreio
          </button>

          {/* Cancelar */}
          <button
            onClick={() => setShowCancelForm(!showCancelForm)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-red-100 text-red-700 border border-red-300 rounded-lg hover:bg-red-200 transition"
          >
            <FiXCircle size={14} />
            Cancelar Pedido
          </button>
        </div>

        {/* Formulário de rastreio */}
        {showTrackingForm && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
            <p className="text-sm font-semibold text-green-800">📦 Enviar Código de Rastreio ao ML</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Código de Rastreio *
                </label>
                <input
                  type="text"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="Ex: BR123456789BR"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Transportadora (opcional)
                </label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option value="">Selecionar...</option>
                  <option value="correios">Correios</option>
                  <option value="jadlog">JadLog</option>
                  <option value="loggi">Loggi</option>
                  <option value="total_express">Total Express</option>
                  <option value="azul">Azul Cargo</option>
                  <option value="fedex">FedEx</option>
                  <option value="mercadoenvios">Mercado Envios</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => callAction('send_tracking', { trackingCode, carrier })}
                disabled={!trackingCode || actionLoading !== null}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-60"
              >
                {actionLoading === 'send_tracking' ? (
                  <FiLoader size={14} className="animate-spin" />
                ) : (
                  <FiCheckCircle size={14} />
                )}
                Confirmar e Enviar
              </button>
              <button
                onClick={() => setShowTrackingForm(false)}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Formulário de cancelamento */}
        {showCancelForm && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
            <p className="text-sm font-semibold text-red-800">⚠️ Cancelar Pedido no Mercado Livre</p>
            <p className="text-xs text-red-700">
              Esta ação cancela o pedido no ML e no sistema. Esta ação pode não ser reversível.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Motivo do Cancelamento *
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <option value="">Selecionar motivo...</option>
                <option value="out_of_stock">Produto sem estoque</option>
                <option value="buyer_request">Solicitação do comprador</option>
                <option value="duplicated_order">Pedido duplicado</option>
                <option value="payment_issues">Problemas com pagamento</option>
                <option value="other">Outro motivo</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => callAction('cancel', { reason: cancelReason })}
                disabled={!cancelReason || actionLoading !== null}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-60"
              >
                {actionLoading === 'cancel' ? (
                  <FiLoader size={14} className="animate-spin" />
                ) : (
                  <FiXCircle size={14} />
                )}
                Confirmar Cancelamento
              </button>
              <button
                onClick={() => setShowCancelForm(false)}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Voltar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
