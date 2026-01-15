'use client'

import { useEffect, useState } from 'react'
import { FiAlertTriangle, FiCheckCircle, FiRefreshCw } from 'react-icons/fi'
import Link from 'next/link'

interface HealthStatus {
  healthy: boolean
  stuckOrders: number
  abandonedOrders: number
  missingFraudStatus: number
  processingWithoutPayment: number
  ordersWithoutBuyer: number
  ordersWithoutShipping: number
  dropWithoutSeller: number
  ordersWithoutItems: number
}

export default function ConsistencyHealthWidget() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/admin/consistency/health')
      const data = await response.json()
      if (data.success) {
        setHealth(data.health)
      }
    } catch (error) {
      console.error('Erro ao buscar health check:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchHealth, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-2">
          <FiRefreshCw className="animate-spin text-gray-400" />
          <span className="text-sm text-gray-600">Verificando consistência...</span>
        </div>
      </div>
    )
  }

  if (!health) return null

  const totalIssues =
    health.stuckOrders +
    health.abandonedOrders +
    health.missingFraudStatus +
    health.processingWithoutPayment +
    health.ordersWithoutBuyer +
    health.ordersWithoutShipping +
    health.dropWithoutSeller +
    health.ordersWithoutItems

  return (
    <Link href="/admin/consistency">
      <div
        className={`rounded-lg shadow p-4 cursor-pointer transition-all hover:shadow-md ${
          health.healthy ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {health.healthy ? (
              <FiCheckCircle className="text-green-600 text-xl" />
            ) : (
              <FiAlertTriangle className="text-red-600 text-xl" />
            )}
            <h3
              className={`font-semibold ${
                health.healthy ? 'text-green-900' : 'text-red-900'
              }`}
            >
              Consistência do Sistema
            </h3>
          </div>
          {totalIssues > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {totalIssues}
            </span>
          )}
        </div>

        {health.healthy ? (
          <p className="text-sm text-green-700">
            ✅ Todos os pedidos estão consistentes
          </p>
        ) : (
          <div className="space-y-1">
            {health.stuckOrders > 0 && (
              <p className="text-sm text-red-700">
                • {health.stuckOrders} pedido(s) travado(s)
              </p>
            )}
            {health.processingWithoutPayment > 0 && (
              <p className="text-sm text-red-700">
                • {health.processingWithoutPayment} sem pagamento
              </p>
            )}
            {health.ordersWithoutBuyer > 0 && (
              <p className="text-sm text-red-700">
                • {health.ordersWithoutBuyer} sem cliente
              </p>
            )}
            {health.ordersWithoutShipping > 0 && (
              <p className="text-sm text-red-700">
                • {health.ordersWithoutShipping} sem frete
              </p>
            )}
            {health.dropWithoutSeller > 0 && (
              <p className="text-sm text-red-700">
                • {health.dropWithoutSeller} drop sem vendedor
              </p>
            )}
            {health.ordersWithoutItems > 0 && (
              <p className="text-sm text-red-700">
                • {health.ordersWithoutItems} sem produtos
              </p>
            )}
            {health.abandonedOrders > 0 && (
              <p className="text-sm text-red-700">
                • {health.abandonedOrders} abandonado(s)
              </p>
            )}
            {health.missingFraudStatus > 0 && (
              <p className="text-sm text-red-700">
                • {health.missingFraudStatus} sem fraudStatus
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-gray-600 mt-2">
          Clique para corrigir problemas →
        </p>
      </div>
    </Link>
  )
}
