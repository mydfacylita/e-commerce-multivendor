'use client'

import { useState } from 'react'
import { FiRefreshCw, FiCheck, FiClock, FiAlertCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function CheckPaymentsPage() {
  const [checking, setChecking] = useState(false)
  const [results, setResults] = useState<any>(null)

  const checkPendingPayments = async () => {
    setChecking(true)
    setResults(null)

    try {
      const response = await fetch('/api/payment/check-pending', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setResults(data.results)
        
        if (data.results.approved > 0) {
          toast.success(`${data.results.approved} pagamento(s) aprovado(s)! 🎉`)
        } else {
          toast.success('Verificação concluída')
        }
      } else {
        toast.error('Erro ao verificar pagamentos')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao verificar pagamentos')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Verificar Pagamentos</h1>
        <p className="text-gray-600 mt-2">
          Verifica o status de todos os pedidos pendentes no Mercado Pago
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiRefreshCw className="text-blue-600" size={24} />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-2">Verificação Manual</h2>
            <p className="text-gray-600 mb-4">
              Este processo verifica todos os pedidos com status PENDING e consulta o Mercado Pago
              para ver se o pagamento foi aprovado. Pedidos aprovados serão automaticamente atualizados
              para PROCESSING.
            </p>
            <button
              onClick={checkPendingPayments}
              disabled={checking}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FiRefreshCw className={checking ? 'animate-spin' : ''} />
              {checking ? 'Verificando...' : 'Verificar Agora'}
            </button>
          </div>
        </div>

        {results && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Resultados da Verificação</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-600 font-medium">Verificados</span>
                  <FiClock className="text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-blue-900">{results.checked}</div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-600 font-medium">Aprovados</span>
                  <FiCheck className="text-green-600" />
                </div>
                <div className="text-3xl font-bold text-green-900">{results.approved}</div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-yellow-600 font-medium">Pendentes</span>
                  <FiClock className="text-yellow-600" />
                </div>
                <div className="text-3xl font-bold text-yellow-900">{results.stillPending}</div>
              </div>

              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-red-600 font-medium">Erros</span>
                  <FiAlertCircle className="text-red-600" />
                </div>
                <div className="text-3xl font-bold text-red-900">{results.errors}</div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <FiAlertCircle className="text-gray-600" />
            Automação (Opcional)
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Para verificação automática, você pode configurar um cron job:
          </p>
          <code className="block bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
            */5 * * * * cd /path/to/project && node scripts/check-pending-payments.js
          </code>
          <p className="text-xs text-gray-500 mt-2">
            Isso verificará pagamentos a cada 5 minutos automaticamente
          </p>
        </div>
      </div>
    </div>
  )
}
