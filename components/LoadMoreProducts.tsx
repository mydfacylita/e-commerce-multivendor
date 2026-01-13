'use client'

import { useState } from 'react'
import ProductCard from './ProductCard'
import { FiLoader, FiChevronDown } from 'react-icons/fi'

interface Product {
  id: string
  name: string
  price: number
  originalPrice?: number | null
  images: string[]
  category?: { name: string } | null
  featured?: boolean
  slug?: string
}

interface LoadMoreProductsProps {
  initialProducts: Product[]
  totalCount: number
  itemsPerPage?: number
  title?: string
  subtitle?: string
}

export default function LoadMoreProducts({ 
  initialProducts, 
  totalCount,
  itemsPerPage = 12,
  title = "✨ Todos os Produtos",
  subtitle = "Explore nossa coleção completa"
}: LoadMoreProductsProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialProducts.length < totalCount)

  const loadMore = async () => {
    if (loading || !hasMore) return
    
    setLoading(true)
    try {
      const nextPage = page + 1
      const response = await fetch(`/api/products/paginated?page=${nextPage}&limit=${itemsPerPage}`)
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.products && data.products.length > 0) {
          setProducts(prev => [...prev, ...data.products])
          setPage(nextPage)
          setHasMore(products.length + data.products.length < data.total)
        } else {
          setHasMore(false)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar mais produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  const remaining = totalCount - products.length

  return (
    <section className="py-16 px-4 w-full">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">{title}</h2>
            <p className="text-gray-600">{subtitle}</p>
          </div>
          <div className="text-sm text-gray-500">
            Exibindo {products.length} de {totalCount} produtos
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {products.map((product, index) => (
            <div 
              key={product.id}
              className="animate-fade-in"
              style={{ animationDelay: `${Math.min(index, 11) * 50}ms` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* Botão Carregar Mais */}
        {hasMore && (
          <div className="mt-12 text-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 
                         text-white font-bold rounded-full shadow-lg hover:shadow-xl 
                         transform hover:scale-105 transition-all duration-300
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <>
                  <FiLoader className="animate-spin" size={20} />
                  Carregando...
                </>
              ) : (
                <>
                  <FiChevronDown size={20} />
                  Carregar Mais Produtos
                  {remaining > 0 && (
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                      +{remaining}
                    </span>
                  )}
                </>
              )}
            </button>
            
            {/* Indicador de progresso */}
            <div className="mt-4 max-w-md mx-auto">
              <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>{products.length} produtos</span>
                <span>{totalCount} total</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
                  style={{ width: `${(products.length / totalCount) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Todos os produtos carregados */}
        {!hasMore && products.length > 0 && (
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-100 text-green-700 rounded-full">
              <span className="text-xl">🎉</span>
              <span className="font-medium">Você viu todos os {totalCount} produtos!</span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
