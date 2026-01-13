'use client'

import { useEffect, useState } from 'react'
import { FiAlertCircle, FiRefreshCw, FiExternalLink, FiCheckCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface DuplicatePayment {
  orderId: string
  paymentId: string
  totalPayments: number
  payments: any[]
  orderTotal: number
}

export default function DuplicadosPage() {
  const [duplicates, setDuplicates] = useState<DuplicatePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    loadDuplicates()
  }, [])

  const loadDuplicates = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/financeiro/duplicados')
      if (response.ok) {
        const data = await response.json()
        setDuplicates(data.duplicates || [])
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao carregar pagamentos duplicados')
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = async (paymentId: string, orderId: string) => {
    if (!confirm(`Deseja estornar o pagamento ${paymentId}?`)) return

    setProcessing(paymentId)
    try {
      const response = await fetch('/api/admin/financeiro/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, orderId })
      })

      if (response.ok) {
        toast.success('Estorno realizado com sucesso!')
        loadDuplicates()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao processar estorno')
      }
    } catch (error) {
      toast.error('Erro ao processar estorno')
    } finally {
      setProcessing(null)
    }
  }

  const viewPaymentDetails = (paymentId: string) => {
    window.open(`/api/payment/details/${paymentId}`, '_blank')
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Pagamentos Duplicados</h1>
        <p className="text-gray-600">
          Gerencie pagamentos em duplicidade e processe estornos
        </p>
      </div>

      {duplicates.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <FiCheckCircle className="mx-auto text-green-600 mb-4" size={48} />
          <h3 className="text-xl font-bold text-green-900 mb-2">
            Nenhum pagamento duplicado encontrado!
          </h3>
          <p className="text-green-700">
            Todos os pagamentos estão corretos no momento.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {duplicates.map((duplicate) => (
            <div key={duplicate.orderId} className="bg-white rounded-lg shadow-md border-2 border-red-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <FiAlertCircle className="text-red-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Pedido: {duplicate.orderId.slice(0, 12)}...
                    </h3>
                    <p className="text-sm text-gray-600">
                      {duplicate.totalPayments} pagamentos encontrados (duplicado!)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">
                    R$ {duplicate.orderTotal.toFixed(2)}
                  </div>
                  <p className="text-sm text-gray-600">Valor do pedido</p>
                </div>
              </div>

              <div className="space-y-3">
                {duplicate.payments.map((payment: any, index: number) => (
                  <div
                    key={payment.id}
                    className={`p-4 rounded-lg border-2 ${
                      payment.status === 'approved'
                        ? 'bg-green-50 border-green-300'
                        : payment.status === 'refunded'
                        ? 'bg-gray-50 border-gray-300'
                        : 'bg-yellow-50 border-yellow-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-gray-900">
                            Pagamento #{index + 1}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            payment.status === 'approved' ? 'bg-green-200 text-green-800' :
                            payment.status === 'refunded' ? 'bg-gray-200 text-gray-800' :
                            'bg-yellow-200 text-yellow-800'
                          }`}>
                            {payment.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">ID:</span>
                            <span className="ml-2 font-mono">{payment.id}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Método:</span>
                            <span className="ml-2">{payment.payment_method}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Data:</span>
                            <span className="ml-2">
                              {new Date(payment.date_created).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Valor:</span>
                            <span className="ml-2 font-bold">R$ {payment.amount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => viewPaymentDetails(payment.id)}
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                          title="Ver detalhes completos"
                        >
                          <FiExternalLink size={18} />
                        </button>
                        {payment.status === 'approved' && (
                          <button
                            onClick={() => handleRefund(payment.id, duplicate.orderId)}
                            disabled={processing === payment.id}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 flex items-center gap-2"
                          >
                            <FiRefreshCw className={processing === payment.id ? 'animate-spin' : ''} />
                            {processing === payment.id ? 'Processando...' : 'Estornar'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
