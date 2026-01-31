'use client'

import { useState, useEffect } from 'react'
import { FiPackage, FiCheck, FiX, FiClock, FiDownload, FiRefreshCw } from 'react-icons/fi'
import { toast } from 'react-hot-toast'

interface EANPurchase {
  id: string
  sellerId: string
  sellerName: string
  sellerEmail: string
  packageId: string
  quantity: number
  type: 'OFFICIAL' | 'INTERNAL'
  price: number
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'GENERATED'
  paymentId?: string
  paidAt?: string
  createdAt: string
  firstCode?: string
  lastCode?: string
  generatedCount?: number
  hasCodesGenerated?: boolean
}

export default function AdminEANPage() {
  const [purchases, setPurchases] = useState<EANPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'PAID' | 'GENERATED'>('all')

  useEffect(() => {
    loadPurchases()
  }, [])

  const loadPurchases = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ean/purchases')
      if (res.ok) {
        const data = await res.json()
        setPurchases(data.purchases || [])
      }
    } catch (error) {
      toast.error('Erro ao carregar solicitações')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateEANs = async (purchaseId: string) => {
    if (!confirm('Gerar códigos EAN para esta solicitação?')) return

    try {
      const res = await fetch('/api/admin/ean/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId })
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`${data.quantity} códigos EAN gerados com sucesso!`)
        loadPurchases()
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao gerar códigos')
      }
    } catch (error) {
      toast.error('Erro ao gerar códigos EAN')
    }
  }

  const handleCancelPurchase = async (purchaseId: string) => {
    if (!confirm('Cancelar esta solicitação?')) return

    try {
      const res = await fetch('/api/admin/ean/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId })
      })

      if (res.ok) {
        toast.success('Solicitação cancelada')
        loadPurchases()
      } else {
        toast.error('Erro ao cancelar')
      }
    } catch (error) {
      toast.error('Erro ao cancelar solicitação')
    }
  }

  const filteredPurchases = filter === 'all' 
    ? purchases 
    : purchases.filter(p => p.status === filter)

  const stats = {
    pending: purchases.filter(p => p.status === 'PENDING').length,
    paid: purchases.filter(p => p.status === 'PAID').length,
    generated: purchases.filter(p => p.status === 'GENERATED').length,
    revenue: purchases
      .filter(p => p.status === 'GENERATED')
      .reduce((sum, p) => sum + Number(p.price || 0), 0)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gestão de Códigos EAN</h1>
          <p className="text-gray-600 mt-1">Gerenciar solicitações e gerar códigos para vendedores</p>
        </div>
        <button
          onClick={loadPurchases}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <FiRefreshCw />
          Atualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <FiClock className="text-yellow-600 text-2xl" />
            <div>
              <p className="text-sm text-yellow-700">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <FiCheck className="text-blue-600 text-2xl" />
            <div>
              <p className="text-sm text-blue-700">Pagos</p>
              <p className="text-2xl font-bold text-blue-900">{stats.paid}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <FiPackage className="text-green-600 text-2xl" />
            <div>
              <p className="text-sm text-green-700">Gerados</p>
              <p className="text-2xl font-bold text-green-900">{stats.generated}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-purple-600 text-2xl">💰</span>
            <div>
              <p className="text-sm text-purple-700">Receita</p>
              <p className="text-2xl font-bold text-purple-900">
                R$ {stats.revenue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'PENDING', 'PAID', 'GENERATED'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'Todos' : 
             status === 'PENDING' ? 'Pendentes' :
             status === 'PAID' ? 'Pagos' : 'Gerados'}
          </button>
        ))}
      </div>

      {/* Purchases List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      ) : filteredPurchases.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <FiPackage className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Nenhuma solicitação encontrada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPurchases.map((purchase) => (
            <div
              key={purchase.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-800">
                      {purchase.sellerName}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        purchase.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : purchase.status === 'PAID'
                          ? 'bg-blue-100 text-blue-800'
                          : purchase.status === 'GENERATED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {purchase.status === 'PENDING' ? '⏳ Pendente' :
                       purchase.status === 'PAID' ? '✅ Pago' :
                       purchase.status === 'GENERATED' ? '📦 Gerado' : '❌ Cancelado'}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        purchase.type === 'OFFICIAL'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {purchase.type === 'OFFICIAL' ? '🏆 Oficial GS1' : '🏪 Interno'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{purchase.sellerEmail}</p>

                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Pacote</p>
                      <p className="font-medium">{purchase.packageId}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Quantidade</p>
                      <p className="font-medium">{purchase.quantity} códigos</p>
                      {purchase.status === 'GENERATED' && purchase.firstCode && purchase.lastCode && (
                        <p className="text-xs text-gray-500 mt-1">
                          {purchase.firstCode} até {purchase.lastCode}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-500">Valor</p>
                      <p className="font-medium text-green-600">
                        {Number(purchase.price) === 0 ? 'Grátis' : `R$ ${Number(purchase.price).toFixed(2)}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Data</p>
                      <p className="font-medium">
                        {new Date(purchase.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    {purchase.paidAt && (
                      <div>
                        <p className="text-gray-500">Pago em</p>
                        <p className="font-medium">
                          {new Date(purchase.paidAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {purchase.status === 'PAID' && !purchase.hasCodesGenerated && (
                    <button
                      onClick={() => handleGenerateEANs(purchase.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <FiCheck />
                      Gerar Códigos
                    </button>
                  )}
                  
                  {purchase.status === 'GENERATED' && purchase.generatedCount && (
                    <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 font-medium">
                      ✅ {purchase.generatedCount} códigos gerados
                    </div>
                  )}
                  
                  {(purchase.status === 'PENDING' || (purchase.status === 'PAID' && !purchase.hasCodesGenerated)) && (
                    <button
                      onClick={() => handleCancelPurchase(purchase.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                    >
                      <FiX />
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
