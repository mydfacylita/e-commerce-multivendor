'use client'

import { useState } from 'react'

export default function TestProductsPage() {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    setLoading(true)
    setError('')
    console.log('🔍 Iniciando busca:', search)
    try {
      const url = `/api/admin/products?search=${encodeURIComponent(search)}`
      console.log('📡 URL da requisição:', url)
      
      const response = await fetch(url)
      console.log('📊 Status da resposta:', response.status)
      console.log('📋 Headers:', Object.fromEntries(response.headers.entries()))
      
      const data = await response.json()
      console.log('📦 Dados recebidos:', data)
      console.log('📦 Tipo dos dados:', typeof data)
      console.log('📦 É array?', Array.isArray(data))
      console.log('📦 Quantidade de produtos:', data?.length || 0)
      console.log('📦 JSON stringificado:', JSON.stringify(data, null, 2))
      
      // Verificar se tem mensagem de erro mesmo com status 200
      if (data.message || data.error) {
        console.warn('⚠️ Resposta contém mensagem de erro:', data.message || data.error)
      }

      if (!response.ok) {
        console.error('❌ Erro na resposta:', data)
        throw new Error(data.message || 'Erro ao buscar produtos')
      }

      console.log('✅ Produtos carregados com sucesso!')
      setProducts(data)
    } catch (err: any) {
      console.error('💥 Erro capturado:', err)
      console.error('💥 Stack:', err.stack)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 Teste API de Produtos</h1>

        {/* Campo de Busca */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <label className="block text-sm font-medium mb-2">
            Buscar produtos por nome
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite o nome do produto..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Deixe em branco para listar todos os produtos
          </p>
        </div>

        {/* Erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
            ❌ {error}
          </div>
        )}

        {/* Resultados */}
        {products.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <h2 className="text-lg font-semibold">
                📦 {products.length} produto(s) encontrado(s)
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Preço</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Estoque</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Categoria</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Vendedor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tipo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {product.id.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        {product.slug && (
                          <div className="text-xs text-gray-500">{product.slug}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-green-600">
                          R$ {product.price.toFixed(2)}
                        </div>
                        {product.comparePrice && (
                          <div className="text-xs text-gray-400 line-through">
                            R$ {product.comparePrice.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded ${
                          product.stock > 0 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {product.category?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {product.seller?.companyName || 'Nenhum'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {product.isDropshipping ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            📦 Drop
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                            🏪 Estoque
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Detalhes JSON */}
            <details className="p-4 border-t">
              <summary className="cursor-pointer text-sm font-medium text-gray-700">
                📄 Ver JSON completo
              </summary>
              <pre className="mt-2 p-4 bg-gray-50 rounded text-xs overflow-x-auto">
                {JSON.stringify(products, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Nenhum resultado */}
        {!loading && products.length === 0 && search && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-lg text-center">
            Nenhum produto encontrado com o termo "{search}"
          </div>
        )}
      </div>
    </div>
  )
}
