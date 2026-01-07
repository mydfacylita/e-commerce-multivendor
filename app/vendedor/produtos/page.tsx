'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { FiPlus, FiEdit2, FiTrash2, FiPackage, FiTruck, FiEye, FiEyeOff, FiSearch } from 'react-icons/fi'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  costPrice: number | null
  stock: number
  active: boolean
  images: string
  category: {
    name: string
  }
  supplierSku: string | null
  isDropshipping: boolean
}

export default function VendedorProdutosPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'own' | 'dropshipping'>('all')

  useEffect(() => {
    if (status === 'authenticated') {
      loadProducts()
    }
  }, [status])

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/seller/products')
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('Deseja realmente excluir este produto?')) return

    try {
      const res = await fetch(`/api/seller/products/${productId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        alert('Produto excluído com sucesso!')
        loadProducts()
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao excluir produto')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao excluir produto')
    }
  }

  const handleToggleActive = async (productId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/seller/products/${productId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive })
      })

      if (res.ok) {
        loadProducts()
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = 
      filterType === 'all' ? true :
      filterType === 'own' ? !product.supplierSku :
      filterType === 'dropshipping' ? !!product.supplierSku : true

    return matchesSearch && matchesFilter
  })

  const stats = {
    total: products.length,
    own: products.filter(p => !p.supplierSku).length,
    dropshipping: products.filter(p => !!p.supplierSku).length,
    active: products.filter(p => p.active).length
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Meus Produtos</h1>
            <p className="text-gray-600 mt-2">Gerencie seus produtos e produtos de dropshipping</p>
          </div>
          <Link
            href="/vendedor/produtos/novo"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FiPlus />
            Adicionar Produto
          </Link>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Produtos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FiPackage className="text-3xl text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Produtos Próprios</p>
                <p className="text-2xl font-bold text-green-600">{stats.own}</p>
              </div>
              <FiPackage className="text-3xl text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Dropshipping</p>
                <p className="text-2xl font-bold text-purple-600">{stats.dropshipping}</p>
              </div>
              <FiTruck className="text-3xl text-purple-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ativos</p>
                <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
              </div>
              <FiEye className="text-3xl text-blue-500" />
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar produtos..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterType('own')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterType === 'own'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Próprios
              </button>
              <button
                onClick={() => setFilterType('dropshipping')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterType === 'dropshipping'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Dropshipping
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Produtos */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FiPackage className="text-6xl text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || filterType !== 'all' 
                ? 'Nenhum produto encontrado'
                : 'Nenhum produto cadastrado'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterType !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Comece adicionando seu primeiro produto'}
            </p>
            {!searchTerm && filterType === 'all' && (
              <Link
                href="/vendedor/produtos/novo"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <FiPlus />
                Adicionar Primeiro Produto
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold">Produto</th>
                    <th className="text-left py-4 px-6 font-semibold">Categoria</th>
                    <th className="text-left py-4 px-6 font-semibold">Preço</th>
                    <th className="text-left py-4 px-6 font-semibold">Estoque</th>
                    <th className="text-left py-4 px-6 font-semibold">Tipo</th>
                    <th className="text-left py-4 px-6 font-semibold">Status</th>
                    <th className="text-right py-4 px-6 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const images = typeof product.images === 'string' 
                      ? JSON.parse(product.images)
                      : product.images
                    const firstImage = Array.isArray(images) ? images[0] : '/placeholder.jpg'
                    const isDropshipping = !!product.supplierSku

                    return (
                      <tr key={product.id} className="border-b hover:bg-gray-50">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="relative w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                              <Image
                                src={firstImage}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{product.name}</p>
                              <p className="text-sm text-gray-500">{product.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {product.category.name}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-semibold text-gray-900">R$ {product.price.toFixed(2)}</p>
                          {product.costPrice && (
                            <p className="text-xs text-gray-500">Custo: R$ {product.costPrice.toFixed(2)}</p>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {isDropshipping ? (
                            <span className="inline-flex items-center gap-1 text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded">
                              <FiTruck size={14} />
                              Dropshipping
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-sm bg-green-100 text-green-700 px-2 py-1 rounded">
                              <FiPackage size={14} />
                              Próprio
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <button
                            onClick={() => handleToggleActive(product.id, product.active)}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                              product.active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {product.active ? <FiEye size={14} /> : <FiEyeOff size={14} />}
                            {product.active ? 'Ativo' : 'Inativo'}
                          </button>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/vendedor/produtos/${product.id}`}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Editar"
                            >
                              <FiEdit2 size={18} />
                            </Link>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Excluir"
                            >
                              <FiTrash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
