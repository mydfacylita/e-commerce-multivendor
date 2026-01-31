'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { 
  FiChevronLeft, FiCheck, FiX, FiRefreshCw, FiPlay, 
  FiSearch, FiTruck, FiShoppingCart, FiAlertCircle,
  FiCopy, FiExternalLink
} from 'react-icons/fi'

interface TestResult {
  success: boolean
  message: string
  data?: any
  error?: string
}

export default function TestAliExpressDSPage() {
  // Estados
  const [loading, setLoading] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, TestResult>>({})
  
  // Inputs para testes
  const [productId, setProductId] = useState('')
  const [skuId, setSkuId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [testOrderData, setTestOrderData] = useState({
    name: 'Teste Silva',
    phone: '11999999999',
    cpf: '12345678901',
    street: 'Rua Teste',
    number: '123',
    complement: 'Apto 1',
    district: 'Centro',
    city: 'Sao Paulo',           // Nome completo conforme API AliExpress (sem acento)
    state: 'Sao Paulo',          // Nome completo conforme API AliExpress (não usar sigla SP)
    zip: '01310100',
  })

  // Função para executar teste
  const runTest = async (testName: string, apiCall: () => Promise<Response>) => {
    setLoading(testName)
    try {
      const res = await apiCall()
      const data = await res.json()
      
      setResults(prev => ({
        ...prev,
        [testName]: {
          success: res.ok && !data.error,
          message: data.message || (res.ok ? 'Sucesso!' : 'Erro'),
          data: data,
          error: data.error || data.message
        }
      }))
      
      if (res.ok && !data.error) {
        toast.success(`${testName}: OK`)
      } else {
        toast.error(`${testName}: ${data.error || data.message || 'Erro'}`)
      }
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        [testName]: {
          success: false,
          message: 'Erro de conexão',
          error: error.message
        }
      }))
      toast.error(`${testName}: Erro de conexão`)
    } finally {
      setLoading(null)
    }
  }

  // Teste 1: Verificar conexão e credenciais
  const testConnection = () => {
    runTest('connection', () => 
      fetch('/api/admin/integrations/aliexpress/status')
    )
  }

  // Teste 2: Buscar produto
  const testSearchProduct = () => {
    if (!productId) {
      toast.error('Informe o ID do produto')
      return
    }
    runTest('product', () => 
      fetch('/api/admin/integrations/aliexpress/test-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      })
    )
  }

  // Teste 3: Verificar produto no DS
  const testProductDS = async () => {
    if (!productId) {
      toast.error('Informe o ID do produto')
      return
    }
    setLoading('productDS')
    try {
      const res = await fetch('/api/admin/orders/test-ds-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      })
      const data = await res.json()
      
      // Auto-capturar primeiro SKU disponível
      if (data.skus && data.skus.length > 0) {
        const firstSku = data.skus[0]
        if (firstSku.skuId) {
          setSkuId(firstSku.skuId.toString())
          toast.success('SKU capturado automaticamente!')
        }
      }
      
      setResults(prev => ({
        ...prev,
        productDS: {
          success: res.ok && data.available,
          message: data.message || (res.ok ? 'Sucesso!' : 'Erro'),
          data: data,
          error: data.error
        }
      }))
      
      if (res.ok && data.available) {
        toast.success('Produto DS: OK')
      } else {
        toast.error(`Produto DS: ${data.error || data.message || 'Erro'}`)
      }
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        productDS: {
          success: false,
          message: 'Erro ao testar',
          error: error.message
        }
      }))
    } finally {
      setLoading(null)
    }
  }

  // Teste 4: Buscar endereços válidos
  const testAddress = () => {
    runTest('address', () => 
      fetch('/api/admin/orders/ds-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          countryCode: 'BR',
          cityName: ''
        })
      })
    )
  }

  // Teste 5: Consultar frete
  const testShipping = () => {
    if (!productId) {
      toast.error('Informe o ID do produto')
      return
    }
    if (!skuId) {
      toast.error('SKU ID é obrigatório - execute primeiro o teste "Verificar DS"')
      return
    }
    runTest('shipping', () => 
      fetch('/api/admin/orders/shipping-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productId,
          skuId,
          quantity: parseInt(quantity),
          country: 'BR',
          address: JSON.stringify(testOrderData)
        })
      })
    )
  }

  // Teste 6: Simular criação de pedido (sem criar de verdade)
  const testOrderSimulation = () => {
    if (!productId) {
      toast.error('Informe o ID do produto')
      return
    }
    runTest('orderSimulation', () => 
      fetch('/api/admin/orders/test-ds-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productId,
          quantity: parseInt(quantity),
          simulate: true, // Apenas simula, não cria
          address: testOrderData
        })
      })
    )
  }

  // Copiar para clipboard
  const copyJson = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    toast.success('Copiado!')
  }

  // Renderizar resultado do teste
  const renderResult = (testName: string, title: string) => {
    const result = results[testName]
    if (!result) return null

    return (
      <div className={`mt-4 p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {result.success ? (
              <FiCheck className="text-green-600" />
            ) : (
              <FiX className="text-red-600" />
            )}
            <span className={`font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
              {title}: {result.success ? 'Sucesso' : 'Falhou'}
            </span>
          </div>
          {result.data && (
            <button
              onClick={() => copyJson(result.data)}
              className="p-1 hover:bg-white rounded"
              title="Copiar JSON"
            >
              <FiCopy size={14} />
            </button>
          )}
        </div>
        
        {result.error && !result.success && (
          <p className="text-sm text-red-600 mb-2">{result.error}</p>
        )}
        
        {result.data && (
          <pre className="text-xs bg-white p-3 rounded overflow-x-auto max-h-60">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/integracao/aliexpress" className="p-2 hover:bg-gray-100 rounded-lg">
              <FiChevronLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">🧪 Testes API AliExpress Dropshipping</h1>
              <p className="text-sm text-gray-500">Teste cada etapa antes de criar pedidos reais</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Aviso */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
          <FiAlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-medium text-yellow-800">Importante</p>
            <p className="text-sm text-yellow-700">
              Estes testes usam a API real do AliExpress. O teste de "Simular Pedido" NÃO cria pedido real, 
              mas os outros testes consomem sua cota de requisições.
            </p>
          </div>
        </div>

        {/* Teste 1: Conexão */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-bold">1</span>
                Verificar Conexão
              </h2>
              <p className="text-sm text-gray-500 mt-1">Verifica se as credenciais do AliExpress estão configuradas e válidas</p>
            </div>
            <button
              onClick={testConnection}
              disabled={loading === 'connection'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
              {loading === 'connection' ? <FiRefreshCw className="animate-spin" /> : <FiPlay />}
              Testar
            </button>
          </div>
          {renderResult('connection', 'Conexão')}
        </div>

        {/* Input do Produto */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">📦 Dados do Produto para Teste</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID do Produto AliExpress *
              </label>
              <input
                type="text"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                placeholder="Ex: 1005001234567890"
                className="w-full px-4 py-2 border rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Copie o ID do produto da URL do AliExpress (depois de /item/)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Teste 2: Buscar Produto */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-bold">2</span>
                Buscar Produto
              </h2>
              <p className="text-sm text-gray-500 mt-1">Verifica se o produto existe e retorna informações</p>
            </div>
            <button
              onClick={testSearchProduct}
              disabled={loading === 'product' || !productId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
              {loading === 'product' ? <FiRefreshCw className="animate-spin" /> : <FiSearch />}
              Buscar
            </button>
          </div>
          {renderResult('product', 'Produto')}
        </div>

        {/* Teste 3: Verificar no DS */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-sm font-bold">3</span>
                Verificar Produto no Dropshipping
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Verifica se o produto está na sua lista DS e pode ser encomendado via API
              </p>
            </div>
            <button
              onClick={testProductDS}
              disabled={loading === 'productDS' || !productId}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
            >
              {loading === 'productDS' ? <FiRefreshCw className="animate-spin" /> : <FiShoppingCart />}
              Verificar DS
            </button>
          </div>
          
          {/* Badge de Choice */}
          {results.productDS?.data?.isChoice && (
            <div className="mt-4 p-4 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl text-white">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⭐</span>
                <div>
                  <p className="font-bold text-lg">PRODUTO CHOICE!</p>
                  <p className="text-sm opacity-90">Frete grátis, entrega rápida e qualidade garantida pelo AliExpress</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Aviso se NÃO for Choice */}
          {results.productDS?.success && results.productDS?.data && !results.productDS?.data?.isChoice && (
            <div className="mt-4 p-3 bg-gray-100 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 text-gray-600">
                <FiAlertCircle />
                <span className="text-sm">Este produto <strong>não é Choice</strong>. Pode ter frete mais caro e entrega mais lenta.</span>
              </div>
            </div>
          )}
          
          {renderResult('productDS', 'Produto DS')}
        </div>

        {/* Teste 4: Buscar Endereços Válidos */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-sm font-bold">4</span>
                Buscar Endereços Válidos
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Retorna províncias e cidades válidas para envio no Brasil
              </p>
            </div>
            <button
              onClick={testAddress}
              disabled={loading === 'address'}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 disabled:opacity-50"
            >
              {loading === 'address' ? <FiRefreshCw className="animate-spin" /> : <FiSearch />}
              Buscar Endereços
            </button>
          </div>
          {renderResult('address', 'Endereços')}
        </div>

        {/* Teste 5: Consultar Frete */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center text-cyan-600 text-sm font-bold">5</span>
                Consultar Opções de Frete
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Retorna métodos de envio disponíveis com custos e prazos
                {skuId && <span className="ml-2 text-cyan-600">(SKU: {skuId})</span>}
              </p>
            </div>
            <button
              onClick={testShipping}
              disabled={loading === 'shipping' || !productId || !skuId}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2 disabled:opacity-50"
            >
              {loading === 'shipping' ? <FiRefreshCw className="animate-spin" /> : <FiTruck />}
              Consultar Frete
            </button>
          </div>
          {!skuId && (
            <p className="text-sm text-amber-600 mt-2">
              ⚠️ Execute primeiro o teste "Verificar DS" para capturar o SKU automaticamente
            </p>
          )}
          {renderResult('shipping', 'Frete')}
        </div>

        {/* Dados do Endereço de Teste */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">📍 Endereço de Teste</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={testOrderData.name}
                onChange={(e) => setTestOrderData({...testOrderData, name: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="text"
                value={testOrderData.phone}
                onChange={(e) => setTestOrderData({...testOrderData, phone: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input
                type="text"
                value={testOrderData.cpf}
                onChange={(e) => setTestOrderData({...testOrderData, cpf: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rua</label>
              <input
                type="text"
                value={testOrderData.street}
                onChange={(e) => setTestOrderData({...testOrderData, street: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
              <input
                type="text"
                value={testOrderData.number}
                onChange={(e) => setTestOrderData({...testOrderData, number: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
              <input
                type="text"
                value={testOrderData.complement}
                onChange={(e) => setTestOrderData({...testOrderData, complement: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
              <input
                type="text"
                value={testOrderData.district}
                onChange={(e) => setTestOrderData({...testOrderData, district: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input
                type="text"
                value={testOrderData.city}
                onChange={(e) => setTestOrderData({...testOrderData, city: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <input
                type="text"
                value={testOrderData.state}
                onChange={(e) => setTestOrderData({...testOrderData, state: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
              <input
                type="text"
                value={testOrderData.zip}
                onChange={(e) => setTestOrderData({...testOrderData, zip: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* Teste 6: Simular Pedido */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm font-bold">6</span>
                Simular Criação de Pedido
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Valida todos os dados e mostra o que seria enviado à API (NÃO cria pedido real)
              </p>
            </div>
            <button
              onClick={testOrderSimulation}
              disabled={loading === 'orderSimulation' || !productId}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
            >
              {loading === 'orderSimulation' ? <FiRefreshCw className="animate-spin" /> : <FiPlay />}
              Simular
            </button>
          </div>
          {renderResult('orderSimulation', 'Simulação')}
        </div>

        {/* Links úteis */}
        <div className="bg-gray-100 rounded-xl p-6">
          <h3 className="font-semibold mb-3">🔗 Links Úteis</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <a 
              href="https://ds.aliexpress.com/" 
              target="_blank"
              className="flex items-center gap-2 text-blue-600 hover:underline"
            >
              <FiExternalLink /> Portal DS AliExpress
            </a>
            <a 
              href="https://portals.aliexpress.com/open-platform" 
              target="_blank"
              className="flex items-center gap-2 text-blue-600 hover:underline"
            >
              <FiExternalLink /> Open Platform AliExpress
            </a>
            <a 
              href="https://trade.aliexpress.com/orderList.htm" 
              target="_blank"
              className="flex items-center gap-2 text-blue-600 hover:underline"
            >
              <FiExternalLink /> Meus Pedidos AliExpress
            </a>
            <Link 
              href="/admin/integracao/aliexpress"
              className="flex items-center gap-2 text-blue-600 hover:underline"
            >
              <FiExternalLink /> Configurar Integração
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
