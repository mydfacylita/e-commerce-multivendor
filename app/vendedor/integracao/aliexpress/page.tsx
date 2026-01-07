'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FiArrowLeft, FiCheck, FiPackage, FiDownload } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface AliExpressStatus {
  configured: boolean
  authorized: boolean
  trackingId?: string
  message: string
  error?: boolean
}

export default function VendedorAliExpressPage() {
  const [status, setStatus] = useState<AliExpressStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [showConfigForm, setShowConfigForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [keywords, setKeywords] = useState('')

  const [appKey, setAppKey] = useState('')
  const [appSecret, setAppSecret] = useState('')
  const [trackingId, setTrackingId] = useState('')

  const categories = [
    { id: '', name: 'Todos (Recomendados)' },
    { id: '1524', name: 'Telefones & Eletrônicos' },
    { id: '1511', name: 'Computadores & Escritório' },
    { id: '36', name: 'Eletrodomésticos' },
    { id: '1501', name: 'Jóias & Relógios' },
    { id: '1503', name: 'Casa & Jardim' },
    { id: '34', name: 'Bolsas & Sapatos' },
    { id: '1420', name: 'Brinquedos & Hobbies' },
    { id: '200003482', name: 'Esportes & Entretenimento' },
    { id: '26', name: 'Moda Feminina' },
    { id: '200000345', name: 'Moda Masculina' },
    { id: '39', name: 'Luzes & Iluminação' },
    { id: '66', name: 'Beleza & Saúde' },
  ]

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/seller/integrations/aliexpress/status')
      const data = await response.json()
      setStatus(data)
      if (data.trackingId) setTrackingId(data.trackingId)
    } catch (error) {
      toast.error('Erro ao verificar status')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!appKey || !appSecret) {
      toast.error('Preencha App Key e App Secret')
      return
    }

    try {
      const response = await fetch('/api/seller/integrations/aliexpress/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appKey, appSecret, trackingId }),
      })

      if (response.ok) {
        toast.success('AliExpress configurado com sucesso!')
        setAppKey('')
        setAppSecret('')
        setShowConfigForm(false)
        await checkStatus()
      } else {
        const data = await response.json()
        toast.error(data.message || 'Erro ao salvar credenciais')
      }
    } catch (error) {
      toast.error('Erro ao configurar AliExpress')
    }
  }

  const handleImportProducts = async () => {
    setImporting(true)

    try {
      const response = await fetch('/api/seller/integrations/aliexpress/import-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          keywords: keywords || 'trending products',
          categoryId: selectedCategory || ''
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`${data.importedProducts?.length || 0} produtos importados!`)
        if (data.errors && data.errors.length > 0) {
          toast.error(`${data.errors.length} produtos com erro`)
        }
      } else {
        toast.error(data.message || 'Erro ao importar produtos')
      }
    } catch (error) {
      toast.error('Erro ao importar produtos')
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/vendedor/integracao" className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-4">
          <FiArrowLeft /> Voltar para Integrações
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Integração AliExpress</h1>
        <p className="text-gray-600 mt-2">Importe produtos para dropshipping</p>
      </div>

      {/* Status */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Status da Configuração</h2>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${status?.configured ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="text-lg">{status?.configured ? 'Configurado' : 'Não configurado'}</span>
        </div>
        {status?.message && (
          <p className="mt-2 text-gray-600">{status.message}</p>
        )}
      </div>

      {/* Configuração */}
      {!status?.configured || showConfigForm ? (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Credenciais da API</h2>
          <p className="text-gray-600 mb-4">
            Obtenha suas credenciais em{' '}
            <a href="https://portals.aliexpress.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              AliExpress Open Platform
            </a>
          </p>

          <form onSubmit={handleSaveCredentials} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">App Key</label>
              <input
                type="text"
                value={appKey}
                onChange={(e) => setAppKey(e.target.value)}
                placeholder="Seu App Key"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">App Secret</label>
              <input
                type="password"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                placeholder="Seu App Secret"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tracking ID (Opcional)
              </label>
              <input
                type="text"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="Seu Tracking ID de afiliado"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">Para ganhar comissão de afiliado nos produtos</p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600"
              >
                Salvar Configuração
              </button>
              {showConfigForm && (
                <button
                  type="button"
                  onClick={() => setShowConfigForm(false)}
                  className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <FiCheck className="text-green-600" size={20} />
            <span className="font-semibold text-green-900">AliExpress Configurado</span>
          </div>
          <p className="text-green-800 text-sm">Você pode importar produtos agora</p>
          <button
            onClick={() => setShowConfigForm(true)}
            className="mt-3 text-green-700 hover:text-green-900 text-sm underline"
          >
            Reconfigurar credenciais
          </button>
        </div>
      )}

      {/* Importar Produtos */}
      {status?.configured && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Importar Produtos</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Palavras-chave (opcional)
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Ex: wireless headphones, smartwatch..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <button
              onClick={handleImportProducts}
              disabled={importing}
              className="bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiDownload /> {importing ? 'Importando...' : 'Importar Produtos'}
            </button>
          </div>
        </div>
      )}

      {/* Informações */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-lg mb-2 text-blue-900">💡 Como funciona?</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>Configure suas credenciais da API AliExpress</li>
          <li>Escolha uma categoria e palavras-chave</li>
          <li>Importe produtos automaticamente</li>
          <li>Os produtos serão adicionados à sua loja para venda em dropshipping</li>
        </ol>
      </div>
    </div>
  )
}
