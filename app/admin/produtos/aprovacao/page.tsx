'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FiCheck, FiX, FiEye, FiClock, FiPackage, FiUser, FiAlertCircle, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  images: string
  stock: number
  createdAt: string
  category: {
    name: string
  }
  seller: {
    id: string
    storeName: string
    nomeFantasia: string | null
  } | null
}

export default function AprovacaoProdutosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')

  useEffect(() => {
    loadProducts()
  }, [filter])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/products/approval?status=${filter}`)
      const data = await res.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
      toast.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (productId: string) => {
    try {
      setProcessing(productId)
      const res = await fetch('/api/admin/products/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          action: 'APPROVED'
        })
      })

      const data = await res.json()
      
      if (res.ok) {
        toast.success('Produto aprovado com sucesso!')
        loadProducts()
      } else {
        toast.error(data.error || 'Erro ao aprovar produto')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao aprovar produto')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async () => {
    if (!selectedProduct) return

    try {
      setProcessing(selectedProduct.id)
      const res = await fetch('/api/admin/products/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          action: 'REJECTED',
          note: rejectNote
        })
      })

      const data = await res.json()
      
      if (res.ok) {
        toast.success('Produto rejeitado')
        setShowRejectModal(false)
        setRejectNote('')
        setSelectedProduct(null)
        loadProducts()
      } else {
        toast.error(data.error || 'Erro ao rejeitar produto')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao rejeitar produto')
    } finally {
      setProcessing(null)
    }
  }

  const getImages = (imagesStr: string): string[] => {
    try {
      const parsed = JSON.parse(imagesStr)
      return Array.isArray(parsed) ? parsed : [imagesStr]
    } catch {
      return imagesStr ? [imagesStr] : []
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED': return 'bg-green-100 text-green-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <FiClock className="w-4 h-4" />
      case 'APPROVED': return <FiCheckCircle className="w-4 h-4" />
      case 'REJECTED': return <FiXCircle className="w-4 h-4" />
      default: return <FiAlertCircle className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Aprovação de Produtos</h1>
          <p className="text-gray-600 mt-2">
            Revise e aprove produtos enviados pelos vendedores antes de serem publicados na loja
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('PENDING')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                filter === 'PENDING' 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FiClock />
              Pendentes
            </button>
            <button
              onClick={() => setFilter('APPROVED')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                filter === 'APPROVED' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FiCheckCircle />
              Aprovados
            </button>
            <button
              onClick={() => setFilter('REJECTED')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                filter === 'REJECTED' 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FiXCircle />
              Rejeitados
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && products.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FiPackage className="mx-auto text-6xl text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {filter === 'PENDING' 
                ? 'Nenhum produto pendente de aprovação'
                : filter === 'APPROVED'
                ? 'Nenhum produto aprovado'
                : 'Nenhum produto rejeitado'}
            </h3>
            <p className="text-gray-500">
              {filter === 'PENDING' 
                ? 'Quando vendedores enviarem produtos próprios, eles aparecerão aqui para revisão.'
                : 'Altere o filtro para ver outros produtos.'}
            </p>
          </div>
        )}

        {/* Lista de Produtos */}
        {!loading && products.length > 0 && (
          <div className="grid gap-6">
            {products.map(product => {
              const images = getImages(product.images)
              return (
                <div key={product.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-6">
                    <div className="flex gap-6">
                      {/* Imagem */}
                      <div className="flex-shrink-0">
                        {images[0] ? (
                          <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-gray-100">
                            <Image
                              src={images[0]}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-32 h-32 rounded-lg bg-gray-100 flex items-center justify-center">
                            <FiPackage className="text-4xl text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Informações */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {product.category?.name} • R$ {product.price.toFixed(2)}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${getStatusColor(filter)}`}>
                            {getStatusIcon(filter)}
                            {filter === 'PENDING' ? 'Pendente' : filter === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}
                          </span>
                        </div>

                        {/* Vendedor */}
                        {product.seller && (
                          <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
                            <FiUser className="text-gray-400" />
                            <span>Vendedor: <strong>{product.seller.storeName}</strong></span>
                          </div>
                        )}

                        {/* Descrição */}
                        {product.description && (
                          <p className="text-gray-600 text-sm mt-3 line-clamp-2">
                            {product.description}
                          </p>
                        )}

                        {/* Informações adicionais */}
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                          <span>Estoque: {product.stock} unid.</span>
                          <span>•</span>
                          <span>Enviado em: {new Date(product.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>

                      {/* Ações */}
                      {filter === 'PENDING' && (
                        <div className="flex flex-col gap-2">
                          <Link
                            href={`/admin/produtos/${product.id}`}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                          >
                            <FiEye />
                            Ver Detalhes
                          </Link>
                          <button
                            onClick={() => handleApprove(product.id)}
                            disabled={processing === product.id}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2 disabled:opacity-50"
                          >
                            {processing === product.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            ) : (
                              <FiCheck />
                            )}
                            Aprovar
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProduct(product)
                              setShowRejectModal(true)
                            }}
                            disabled={processing === product.id}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2 disabled:opacity-50"
                          >
                            <FiX />
                            Rejeitar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de Rejeição */}
      {showRejectModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Rejeitar Produto
            </h3>
            <p className="text-gray-600 mb-4">
              Você está rejeitando o produto: <strong>{selectedProduct.name}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo da rejeição (opcional)
              </label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Explique o motivo da rejeição para o vendedor..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows={4}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectNote('')
                  setSelectedProduct(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={processing === selectedProduct.id}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing === selectedProduct.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <FiX />
                )}
                Confirmar Rejeição
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
