'use client'

import { useState, useEffect } from 'react'
import { FiPackage, FiDownload, FiRefreshCw, FiCheck, FiClock } from 'react-icons/fi'
import { toast } from 'react-hot-toast'

interface EANCode {
  code: string
  type: 'OFFICIAL' | 'INTERNAL'
  used: boolean
  productId?: string
  productName?: string
  productSlug?: string
  productActive?: boolean
  createdAt: string
  usedAt?: string
}

interface EANPackage {
  id: string
  name: string
  quantity: number
  price: number
  type: 'OFFICIAL' | 'INTERNAL'
}

export default function AdminEANCodesPage() {
  const [codes, setCodes] = useState<EANCode[]>([])
  const [packages, setPackages] = useState<EANPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'available' | 'used'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'OFFICIAL' | 'INTERNAL'>('all')
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [customType, setCustomType] = useState<'OFFICIAL' | 'INTERNAL'>('INTERNAL')
  const [customQuantity, setCustomQuantity] = useState(10)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [codesRes, packagesRes] = await Promise.all([
        fetch('/api/admin/ean/my-codes'),
        fetch('/api/admin/ean/packages')
      ])

      if (codesRes.ok) {
        const codesData = await codesRes.json()
        setCodes(codesData.codes || [])
      }

      if (packagesRes.ok) {
        const packagesData = await packagesRes.json()
        setPackages(packagesData.packages || [])
      }
    } catch (error) {
      toast.error('Erro ao carregar códigos')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCodes = () => {
    if (filteredCodes.length === 0) {
      toast.error('Nenhum código para exportar')
      return
    }

    const csv = [
      'Código EAN,Tipo,Status,Produto,Data Criação',
      ...filteredCodes.map(code => 
        `${code.code},${code.type === 'OFFICIAL' ? 'Oficial' : 'Interno'},${code.used ? 'Em uso' : 'Disponível'},${code.productName || '-'},${new Date(code.createdAt).toLocaleDateString('pt-BR')}`
      )
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `codigos-ean-admin-${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast.success('Códigos exportados com sucesso!')
  }

  const handleGenerateCodes = async (packageId?: string) => {
    setGenerating(true)
    try {
      const body = packageId 
        ? { packageId }
        : { type: customType, quantity: customQuantity }
      
      const res = await fetch('/api/admin/ean/generate-for-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`${data.quantity} códigos gerados com sucesso!`)
        setShowGenerateModal(false)
        loadData()
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao gerar códigos')
      }
    } catch (error) {
      toast.error('Erro ao gerar códigos')
    } finally {
      setGenerating(false)
    }
  }

  const filteredCodes = codes.filter(code => {
    if (filter === 'available' && code.used) return false
    if (filter === 'used' && !code.used) return false
    if (typeFilter !== 'all' && code.type !== typeFilter) return false
    return true
  })

  const stats = {
    total: codes.length,
    available: codes.filter(c => !c.used).length,
    used: codes.filter(c => c.used).length,
    official: codes.filter(c => c.type === 'OFFICIAL').length,
    internal: codes.filter(c => c.type === 'INTERNAL').length
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Meus Códigos EAN</h1>
          <p className="text-gray-600 mt-1">Gerenciar códigos EAN da administração</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <FiPackage />
            Gerar Códigos
          </button>
          <button
            onClick={handleDownloadCodes}
            disabled={filteredCodes.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiDownload />
            Exportar CSV
          </button>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FiRefreshCw />
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <FiPackage className="text-blue-600 text-2xl" />
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <FiClock className="text-green-600 text-2xl" />
            <div>
              <p className="text-sm text-green-700">Disponíveis</p>
              <p className="text-2xl font-bold text-green-900">{stats.available}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <FiCheck className="text-blue-600 text-2xl" />
            <div>
              <p className="text-sm text-blue-700">Em Uso</p>
              <p className="text-2xl font-bold text-blue-900">{stats.used}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <span className="text-purple-600 text-2xl">🏆</span>
            <div>
              <p className="text-sm text-purple-700">Oficiais</p>
              <p className="text-2xl font-bold text-purple-900">{stats.official}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <span className="text-gray-600 text-2xl">🏪</span>
            <div>
              <p className="text-sm text-gray-700">Internos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.internal}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="flex gap-2">
              {(['all', 'available', 'used'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? 'Todos' : f === 'available' ? 'Disponíveis' : 'Em Uso'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
            <div className="flex gap-2">
              {(['all', 'OFFICIAL', 'INTERNAL'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    typeFilter === t
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t === 'all' ? 'Todos' : t === 'OFFICIAL' ? 'Oficiais' : 'Internos'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Codes List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Carregando códigos...</p>
        </div>
      ) : filteredCodes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <FiPackage className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Nenhum código encontrado</p>
          <p className="text-sm text-gray-500 mt-2">
            Solicite pacotes de códigos EAN na página de solicitações
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {filteredCodes.map((code) => (
            <div
              key={code.code}
              className={`rounded-xl border p-6 transition-all ${
                code.used
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-white border-gray-200 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-lg font-mono font-bold text-gray-800">{code.code}</p>
                  <div className="flex gap-2 mt-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        code.type === 'OFFICIAL'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {code.type === 'OFFICIAL' ? '🏆 Oficial GS1' : '🏪 Interno'}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        code.used
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {code.used ? '✓ Em uso' : '💤 Disponível'}
                    </span>
                  </div>
                </div>
              </div>

              {code.used && code.productName && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">Produto:</p>
                  <p className="text-sm font-medium text-blue-700">{code.productName}</p>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Criado em {new Date(code.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Gerar Códigos */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Gerar Códigos EAN</h3>
            <p className="text-gray-600 mb-6">Configure os códigos que deseja gerar:</p>
            
            {/* Formulário Personalizado */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Código
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCustomType('INTERNAL')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      customType === 'INTERNAL'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">🏪</div>
                    <div className="text-sm font-medium">Interno</div>
                    <div className="text-xs text-gray-500">Prefixo 200</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomType('OFFICIAL')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      customType === 'OFFICIAL'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">🏆</div>
                    <div className="text-sm font-medium">Oficial</div>
                    <div className="text-xs text-gray-500">Prefixo 789</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade de Códigos
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={customQuantity}
                  onChange={(e) => setCustomQuantity(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: 10"
                />
                <p className="mt-1 text-xs text-gray-500">Mínimo: 1 | Máximo: 1000</p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-800">
                  <span className="font-medium">Será gerado:</span> {customQuantity} código{customQuantity !== 1 ? 's' : ''} do tipo{' '}
                  {customType === 'OFFICIAL' ? 'Oficial (789)' : 'Interno (200)'}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowGenerateModal(false)}
                disabled={generating}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleGenerateCodes()}
                disabled={generating}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <FiRefreshCw className="animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <FiCheck />
                    Gerar Códigos
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
