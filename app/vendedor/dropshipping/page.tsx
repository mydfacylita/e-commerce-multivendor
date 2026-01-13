'use client'

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Image from "next/image"
import { FiPackage, FiDollarSign, FiTrendingUp, FiShoppingBag, FiPlus, FiCheck } from "react-icons/fi"

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  images: string
  stock: number
  categoryId: string
  isDropshipping: boolean
  dropshippingCommission: number | null
  category: {
    name: string
  }
}

export default function DropshippingPage() {
  const { data: session, status } = useSession()
  const [products, setProducts] = useState<Product[]>([])
  const [myProducts, setMyProducts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [addingProduct, setAddingProduct] = useState<string | null>(null)
  const [showCustomizeModal, setShowCustomizeModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [customPrice, setCustomPrice] = useState("")
  const [customName, setCustomName] = useState("")

  useEffect(() => {
    if (status === 'authenticated') {
      loadProducts()
    }
  }, [status])

  const loadProducts = async () => {
    try {
      const [productsRes, myProductsRes] = await Promise.all([
        fetch('/api/admin/products?dropshipping=available'),
        fetch('/api/admin/products') // Busca produtos do vendedor (com filtro automático de sellerId)
      ])

      if (productsRes.ok) {
        const data = await productsRes.json()
        setProducts(data)
      }

      if (myProductsRes.ok) {
        const data = await myProductsRes.json()
        // Produtos do vendedor que vieram de dropshipping têm supplierSku preenchido
        const productIds = data
          .filter((p: any) => p.supplierSku) // Apenas produtos que são drops
          .map((p: any) => p.supplierSku) // O supplierSku é o ID do produto original
        setMyProducts(productIds)
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProduct = async (productId: string, skipCustomization = false) => {
    if (!skipCustomization) {
      const product = products.find(p => p.id === productId)
      if (product) {
        setSelectedProduct(product)
        setCustomPrice((product.price * 1.2).toFixed(2))
        setCustomName(product.name)
        setShowCustomizeModal(true)
      }
      return
    }

    setAddingProduct(productId)
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceProductId: productId,
          customPrice: customPrice ? parseFloat(customPrice) : null,
          customName: customName || null
        })
      })

      const data = await res.json()

      if (res.ok) {
        alert('✅ Produto adicionado ao seu catálogo com sucesso!')
        setMyProducts([...myProducts, productId])
        setShowCustomizeModal(false)
        setSelectedProduct(null)
        setCustomPrice("")
        setCustomName("")
        loadProducts() // Recarregar produtos
      } else {
        console.error('Erro da API:', data)
        alert(`❌ ${data.message || data.error || 'Erro ao adicionar produto'}\n${data.details || ''}`)
      }
    } catch (error) {
      console.error('Erro de rede:', error)
      alert('❌ Erro de conexão ao adicionar produto')
    } finally {
      setAddingProduct(null)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const stats = {
    total: products.length,
    myProducts: myProducts.length,
    avgCommission: products.reduce((acc, p) => acc + (p.dropshippingCommission || 0), 0) / products.length || 0
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Catálogo Dropshipping</h1>
          <p className="text-gray-600 mt-2">
            Escolha produtos para revender em sua loja e ganhe comissões
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Produtos Disponíveis</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FiPackage className="text-3xl text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Comissão Média</p>
                <p className="text-2xl font-bold text-green-600">{stats.avgCommission.toFixed(1)}%</p>
              </div>
              <FiDollarSign className="text-3xl text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Meus Produtos</p>
                <p className="text-2xl font-bold text-purple-600">{stats.myProducts}</p>
              </div>
              <FiShoppingBag className="text-3xl text-purple-500" />
            </div>
          </div>
        </div>

        {/* Banner Informativo */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white mb-6">
          <div className="flex items-start gap-4">
            <FiTrendingUp className="text-3xl flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold mb-3">Como Funciona o Dropshipping</h2>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="font-bold">1.</span>
                  <span>Escolha produtos do catálogo para revender em sua loja</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">2.</span>
                  <span>Defina seu próprio preço de venda (mínimo: preço base do produto)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">3.</span>
                  <span>Quando você vender, nós enviamos o produto para seu cliente</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">4.</span>
                  <span>Você recebe sua comissão automaticamente sem se preocupar com estoque</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Regras e Restrições */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Produtos de Dropshipping */}
          <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-orange-500 text-white p-2 rounded-lg">
                <FiPackage className="text-xl" />
              </div>
              <h3 className="font-bold text-lg text-orange-900">Produtos de Dropshipping</h3>
            </div>
            <div className="space-y-2 text-sm text-orange-900">
              <p className="font-semibold mb-2">✅ Permitido:</p>
              <ul className="space-y-1 ml-4">
                <li>• Vender na sua loja da plataforma</li>
                <li>• Definir seu preço de venda</li>
                <li>• Receber comissão automática</li>
              </ul>
              <p className="font-semibold mb-2 mt-4 text-red-700">❌ PROIBIDO:</p>
              <ul className="space-y-1 ml-4 text-red-700">
                <li>• Publicar em marketplaces externos</li>
                <li>• Alterar estoque (controlado pelo fornecedor)</li>
              </ul>
              <div className="mt-4 p-3 bg-orange-100 rounded border border-orange-300">
                <p className="text-xs font-medium">
                  ⚠️ <strong>Motivo:</strong> O pagamento precisa passar pela plataforma para garantir o repasse ao fornecedor. Vendas externas não podem ser rastreadas.
                </p>
              </div>
            </div>
          </div>

          {/* Produtos Próprios */}
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-green-500 text-white p-2 rounded-lg">
                <FiShoppingBag className="text-xl" />
              </div>
              <h3 className="font-bold text-lg text-green-900">Produtos Próprios</h3>
            </div>
            <div className="space-y-2 text-sm text-green-900">
              <p className="font-semibold mb-2">✅ Liberdade Total:</p>
              <ul className="space-y-1 ml-4">
                <li>• Vender na sua loja da plataforma</li>
                <li>• Publicar em marketplaces externos</li>
                <li>• Controlar estoque livremente</li>
                <li>• Definir preços sem restrições</li>
                <li>• Editar descrições e imagens</li>
              </ul>
              <div className="mt-4 p-3 bg-green-100 rounded border border-green-300">
                <p className="text-xs font-medium">
                  ✅ <strong>Vantagem:</strong> Você é o dono do produto e do estoque, então tem total liberdade para vender onde quiser!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Produtos */}
        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FiPackage className="text-6xl text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum produto disponível
            </h3>
            <p className="text-gray-600">
              Não há produtos de dropshipping disponíveis no momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((produto) => {
              const imagens = typeof produto.images === 'string' 
                ? JSON.parse(produto.images)
                : produto.images
              const primeiraImagem = Array.isArray(imagens) ? imagens[0] : '/placeholder.jpg'
              
              const lucroEstimado = produto.price * ((produto.dropshippingCommission || 0) / 100)
              const isAdded = myProducts.includes(produto.id)
              const isAdding = addingProduct === produto.id

              return (
                <div key={produto.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                  <div className="relative h-48 bg-gray-100 rounded-t-lg overflow-hidden">
                    <Image
                      src={primeiraImagem}
                      alt={produto.name}
                      fill
                      className="object-cover"
                    />
                    {produto.dropshippingCommission && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        {produto.dropshippingCommission}% comissão
                      </div>
                    )}
                    {isAdded && (
                      <div className="absolute top-2 left-2 bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                        <FiCheck size={16} />
                        Adicionado
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="mb-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {produto.category?.name || 'Sem categoria'}
                      </span>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {produto.name}
                    </h3>

                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-gray-600">Preço sugerido</p>
                        <p className="text-lg font-bold text-gray-900">
                          R$ {produto.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Comissão</p>
                        <p className="text-lg font-bold text-green-600">
                          R$ {lucroEstimado.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                      <FiPackage className="text-blue-500" />
                      <span>{produto.stock} em estoque</span>
                    </div>

                    {isAdded ? (
                      <div className="space-y-2">
                        <div className="w-full bg-purple-100 border-2 border-purple-300 text-purple-700 py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
                          <FiCheck className="text-xl" />
                          No Seu Catálogo
                        </div>
                        <p className="text-xs text-center text-purple-600">
                          ✓ Você já está dropando este produto
                        </p>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleAddProduct(produto.id)}
                        disabled={isAdding}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isAdding ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Adicionando...
                          </>
                        ) : (
                          <>
                            <FiPlus />
                            Adicionar ao Catálogo
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de Customização */}
      {showCustomizeModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Personalize seu Produto</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Produto Original:</p>
              <p className="font-semibold">{selectedProduct.name}</p>
              <p className="text-sm text-gray-600">
                Preço Base: R$ {selectedProduct.price.toFixed(2)}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Produto (opcional)
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={selectedProduct.name}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Deixe vazio para usar o nome original
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seu Preço de Venda
              </label>
              <input
                type="number"
                step="0.01"
                min={selectedProduct.price}
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-2 text-sm">
                <p className="text-gray-600">
                  Preço mínimo: R$ {selectedProduct.price.toFixed(2)}
                </p>
                {customPrice && parseFloat(customPrice) > selectedProduct.price && (
                  <p className="text-green-600 font-medium">
                    Sua margem: R$ {(parseFloat(customPrice) - selectedProduct.price).toFixed(2)} 
                    ({(((parseFloat(customPrice) - selectedProduct.price) / selectedProduct.price) * 100).toFixed(1)}%)
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCustomizeModal(false)
                  setSelectedProduct(null)
                  setCustomPrice("")
                  setCustomName("")
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => selectedProduct && handleAddProduct(selectedProduct.id, true)}
                disabled={!customPrice || parseFloat(customPrice) < selectedProduct.price}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
