'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiAlertTriangle, FiCheckCircle, FiXCircle, FiEye, FiSearch, FiShield } from 'react-icons/fi'
import { formatCurrency, formatDateTime } from '@/lib/format'

interface SuspiciousOrder {
  id: string
  buyerName: string
  buyerEmail: string
  buyerCpf: string
  total: number
  fraudScore: number
  fraudReasons: string[]
  fraudStatus: string
  createdAt: string
  ipAddress: string
  user: {
    createdAt: string
    orders: { id: string }[]
  }
}

export default function AntiFraudPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<SuspiciousOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'investigating'>('pending')

  useEffect(() => {
    fetchSuspiciousOrders()
  }, [filter])

  const fetchSuspiciousOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/fraud/suspicious?status=${filter}`)
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos suspeitos:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-600 bg-red-50'
    if (score >= 50) return 'text-orange-600 bg-orange-50'
    if (score >= 30) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  const getRiskLabel = (score: number) => {
    if (score >= 80) return 'CRÍTICO'
    if (score >= 50) return 'ALTO'
    if (score >= 30) return 'MÉDIO'
    return 'BAIXO'
  }

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const getAccountAge = (createdAt: string) => {
    if (!mounted) return '-' // Retorna placeholder durante SSR
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Hoje'
    if (days === 1) return '1 dia'
    return `${days} dias`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiShield className="text-primary-600" />
              Antifraude
            </h1>
            <p className="text-gray-600 mt-1">
              Análise de pedidos com suspeita de fraude
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'pending'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pendentes ({orders.filter(o => o.fraudStatus === 'pending').length})
            </button>
            <button
              onClick={() => setFilter('investigating')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'investigating'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Em Investigação
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Pedidos Suspeitos */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FiCheckCircle className="mx-auto text-green-500 text-5xl mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhum pedido suspeito
          </h3>
          <p className="text-gray-600">
            {filter === 'pending' ? 'Não há pedidos pendentes de análise.' : 'Não há pedidos nesta categoria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const reasons = order.fraudReasons || []
            
            return (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Pedido #{order.id.slice(-8).toUpperCase()}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-bold ${getRiskColor(
                          order.fraudScore
                        )}`}
                      >
                        {getRiskLabel(order.fraudScore)} ({order.fraudScore}/100)
                      </span>
                      
                      {/* Badge de Status da Análise */}
                      {order.fraudStatus && order.fraudStatus !== 'pending' && (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            order.fraudStatus === 'approved'
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : order.fraudStatus === 'rejected'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-blue-100 text-blue-800 border border-blue-300'
                          }`}
                        >
                          {order.fraudStatus === 'approved' ? '✅ APROVADO' :
                           order.fraudStatus === 'rejected' ? '❌ REJEITADO' :
                           '🔍 EM INVESTIGAÇÃO'}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Cliente:</span>
                        <p className="font-medium text-gray-900">{order.buyerName}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">CPF:</span>
                        <p className="font-medium text-gray-900">
                          {order.buyerCpf || 'Não informado'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Valor:</span>
                        <p className="font-semibold text-primary-600">
                          {formatCurrency(order.total)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Data:</span>
                        <p className="font-medium text-gray-900">
                          {formatDateTime(order.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Idade da conta:</span>
                        <p className="font-medium text-gray-900">
                          {getAccountAge(order.user.createdAt)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Pedidos anteriores:</span>
                        <p className="font-medium text-gray-900">
                          {order.user.orders.length}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">IP:</span>
                        <p className="font-medium text-gray-900 font-mono text-xs">
                          {order.ipAddress || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/admin/antifraude/${order.id}`}
                    className={`ml-4 px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                      order.fraudStatus && order.fraudStatus !== 'pending'
                        ? 'bg-gray-600 text-white hover:bg-gray-700'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    <FiEye />
                    {order.fraudStatus && order.fraudStatus !== 'pending' ? 'Ver Análise' : 'Analisar'}
                  </Link>
                </div>

                {/* Motivos da Suspeita */}
                {reasons.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <FiAlertTriangle className="text-orange-500" />
                      Motivos da Suspeita:
                    </h4>
                    <ul className="space-y-1">
                      {reasons.map((reason, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-gray-700 pl-6 relative before:content-['•'] before:absolute before:left-2 before:text-orange-500"
                        >
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
