'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { FiHeart, FiTrash2, FiShoppingCart, FiShare2 } from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa'
import ShareButtons from '@/components/ShareButtons'

const LS_KEY = 'mydshop_wishlist'

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface WishlistProduct {
  id: string
  name: string
  slug: string
  price: number
  comparePrice?: number | null
  images: string
  stock: number
  active: boolean
  category?: { name: string } | null
}

interface WishlistItem {
  id: string
  productId: string
  createdAt: string
  product: WishlistProduct
}

export default function DesejosPage() {
  const { data: session, status } = useSession()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [localProducts, setLocalProducts] = useState<WishlistProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    if (session) {
      // Usuário logado: busca da API
      fetch('/api/wishlist')
        .then(r => r.json())
        .then(data => {
          setItems(data.items || [])
          setLoading(false)
        })
        .catch(() => setLoading(false))
    } else {
      // Visitante: busca produtos do localStorage
      const ids: string[] = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
      if (ids.length === 0) {
        setLoading(false)
        return
      }
      fetch(`/api/products/batch?ids=${ids.join(',')}`)
        .then(r => r.ok ? r.json() : { products: [] })
        .then(data => {
          setLocalProducts(data.products || [])
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [session, status])

  const removeItem = async (productId: string) => {
    if (session) {
      await fetch('/api/wishlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      })
      setItems(prev => prev.filter(i => i.productId !== productId))
    } else {
      const ids: string[] = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
      localStorage.setItem(LS_KEY, JSON.stringify(ids.filter(id => id !== productId)))
      setLocalProducts(prev => prev.filter(p => p.id !== productId))
    }
  }

  const getImages = (imagesStr: string): string[] => {
    try {
      const parsed = JSON.parse(imagesStr)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const displayItems: { productId: string; product: WishlistProduct }[] = session
    ? items.map(i => ({ productId: i.productId, product: i.product }))
    : localProducts.map(p => ({ productId: p.id, product: p }))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
          <FaHeart className="text-red-500" size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lista de Desejos</h1>
          <p className="text-sm text-gray-500">
            {displayItems.length === 0
              ? 'Sua lista está vazia'
              : `${displayItems.length} produto${displayItems.length !== 1 ? 's' : ''} salvos`}
          </p>
        </div>
      </div>

      {displayItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <FiHeart className="mx-auto text-gray-300 mb-4" size={64} />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Nenhum produto salvo</h2>
          <p className="text-gray-500 mb-6">Toque no coração em qualquer produto para salvá-lo aqui.</p>
          <Link
            href="/produtos"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
          >
            Ver produtos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {displayItems.map(({ productId, product }) => {
            const images = getImages(product.images)
            const mainImage = images[0] || '/placeholder-product.jpg'
            const discount = product.comparePrice && product.comparePrice > product.price
              ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
              : null

            return (
              <div key={productId} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group overflow-hidden">
                {/* Imagem */}
                <div className="relative aspect-square overflow-hidden bg-gray-50">
                  <Link href={`/produtos/${product.slug}`}>
                    <Image
                      src={mainImage}
                      alt={product.name}
                      fill
                      className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  </Link>
                  {discount && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      -{discount}%
                    </span>
                  )}
                  <button
                    onClick={() => removeItem(productId)}
                    className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Remover dos desejos"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>

                {/* Info */}
                <div className="p-3">
                  {product.category && (
                    <p className="text-xs text-gray-400 mb-1">{product.category.name}</p>
                  )}
                  <Link href={`/produtos/${product.slug}`} className="hover:text-primary-600 transition-colors">
                    <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight mb-2">
                      {product.name}
                    </h3>
                  </Link>

                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-base font-bold text-primary-600">{formatCurrency(product.price)}</span>
                    {product.comparePrice && product.comparePrice > product.price && (
                      <span className="text-xs text-gray-400 line-through">{formatCurrency(product.comparePrice)}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/produtos/${product.slug}`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-600 text-white text-xs font-semibold rounded-xl hover:bg-primary-700 transition-colors"
                    >
                      <FiShoppingCart size={14} />
                      Ver produto
                    </Link>
                    <ShareButtons
                      url={`https://mydshop.com.br/produtos/${product.slug}`}
                      title={product.name}
                      price={formatCurrency(product.price)}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!session && displayItems.length > 0 && (
        <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 flex items-start gap-2">
          <span className="text-lg">💡</span>
          <p>
            <strong>Dica:</strong> <Link href="/login" className="underline font-semibold">Entre na sua conta</Link> para salvar sua lista de desejos e acessar de qualquer dispositivo.
          </p>
        </div>
      )}
    </div>
  )
}
