'use client'

import { useState, useCallback, useMemo } from 'react'
import ProductCard from '@/components/ProductCard'
import CategoryFilters, { FilterState } from '@/components/CategoryFilters'
import Link from 'next/link'
import { FiArrowLeft, FiGrid, FiList, FiChevronRight } from 'react-icons/fi'

interface Subcategory {
  id: string
  name: string
  slug: string
  productCount?: number
}

interface Product {
  id: string
  name: string
  slug: string
  price: number
  compareAtPrice?: number | null
  images: string[]
  stock: number
  categoryId?: string
  [key: string]: any
}

interface ParentCategory {
  id: string
  name: string
  slug: string
}

interface CategoryPageClientProps {
  category: {
    id: string
    name: string
    slug: string
    description?: string | null
    parent?: ParentCategory | null
  }
  subcategories: Subcategory[]
  products: Product[]
}

export default function CategoryPageClient({
  category,
  subcategories,
  products
}: CategoryPageClientProps) {
  const [filters, setFilters] = useState<FilterState>({
    selectedSubcategories: [],
    priceRange: [0, 10000],
    sortBy: 'newest'
  })
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Calcular preços mín/máx dos produtos
  const { minPrice, maxPrice } = useMemo(() => {
    if (products.length === 0) return { minPrice: 0, maxPrice: 10000 }
    const prices = products.map(p => p.price)
    return {
      minPrice: Math.floor(Math.min(...prices)),
      maxPrice: Math.ceil(Math.max(...prices))
    }
  }, [products])

  // Callback para atualizar filtros
  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters)
  }, [])

  // Filtrar e ordenar produtos
  const filteredProducts = useMemo(() => {
    let result = [...products]

    // Filtrar por subcategorias
    if (filters.selectedSubcategories.length > 0) {
      result = result.filter(p => 
        filters.selectedSubcategories.includes(p.categoryId || '')
      )
    }

    // Filtrar por preço
    result = result.filter(p => 
      p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
    )

    // Ordenar
    switch (filters.sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price)
        break
      case 'price_desc':
        result.sort((a, b) => b.price - a.price)
        break
      case 'name_asc':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name_desc':
        result.sort((a, b) => b.name.localeCompare(a.name))
        break
      case 'discount':
        result.sort((a, b) => {
          const discountA = a.compareAtPrice ? ((a.compareAtPrice - a.price) / a.compareAtPrice) * 100 : 0
          const discountB = b.compareAtPrice ? ((b.compareAtPrice - b.price) / b.compareAtPrice) * 100 : 0
          return discountB - discountA
        })
        break
      case 'newest':
      default:
        // Mantém a ordem original (mais recentes)
        break
    }

    return result
  }, [products, filters])

  // Contar produtos por subcategoria
  const subcategoriesWithCount = useMemo(() => {
    return subcategories.map(sub => ({
      ...sub,
      productCount: products.filter(p => p.categoryId === sub.id).length
    }))
  }, [subcategories, products])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb / Navegação */}
      <nav className="flex items-center gap-2 text-sm mb-6 flex-wrap">
        <Link href="/categorias" className="text-primary-600 hover:text-primary-700">
          Categorias
        </Link>
        
        {category.parent && (
          <>
            <FiChevronRight className="text-gray-400" size={14} />
            <Link 
              href={`/categorias/${category.parent.slug}`}
              className="text-primary-600 hover:text-primary-700"
            >
              {category.parent.name}
            </Link>
          </>
        )}
        
        <FiChevronRight className="text-gray-400" size={14} />
        <span className="text-gray-600 font-medium">{category.name}</span>
      </nav>

      {/* Link Voltar */}
      <Link
        href={category.parent ? `/categorias/${category.parent.slug}` : '/categorias'}
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
      >
        <FiArrowLeft className="mr-2" />
        {category.parent ? `Voltar para ${category.parent.name}` : 'Voltar para Categorias'}
      </Link>

      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2">{category.name}</h1>
        {category.description && (
          <p className="text-gray-600 text-lg">{category.description}</p>
        )}
      </div>

      {/* Subcategorias em chips (navegação rápida) */}
      {subcategories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Link 
            href={`/categorias/${category.slug}`}
            className="px-4 py-2 bg-primary-500 text-white rounded-full text-sm font-medium"
          >
            Todos ({products.length})
          </Link>
          {subcategoriesWithCount.map((sub) => (
            <Link
              key={sub.id}
              href={`/categorias/${sub.slug}`}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition"
            >
              {sub.name} ({sub.productCount})
            </Link>
          ))}
        </div>
      )}

      <div className="flex gap-6">
        {/* Filtros Sidebar */}
        <CategoryFilters
          subcategories={subcategoriesWithCount}
          currentCategorySlug={category.slug}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onFiltersChange={handleFiltersChange}
        />

        {/* Produtos */}
        <div className="flex-1">
          {/* Header com contagem e controles */}
          <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-lg shadow-sm border">
            <p className="text-gray-600">
              <span className="font-semibold text-gray-900">{filteredProducts.length}</span>
              {' '}
              {filteredProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
              {filteredProducts.length !== products.length && (
                <span className="text-gray-400"> de {products.length}</span>
              )}
            </p>
            
            <div className="flex items-center gap-4">
              {/* Ordenação rápida */}
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="newest">Mais recentes</option>
                <option value="price_asc">Menor preço</option>
                <option value="price_desc">Maior preço</option>
                <option value="discount">Maior desconto</option>
                <option value="name_asc">A - Z</option>
              </select>

              {/* Toggle Grid/List */}
              <div className="hidden sm:flex items-center gap-1 border rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  <FiGrid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  <FiList size={18} />
                </button>
              </div>
            </div>
          </div>

          {filteredProducts.length > 0 ? (
            <div className={
              viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                : "space-y-4"
            }>
              {filteredProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  layout={viewMode === 'list' ? 'horizontal' : 'vertical'}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-lg">
              <p className="text-xl text-gray-500 mb-4">
                Nenhum produto encontrado com os filtros selecionados.
              </p>
              <button
                onClick={() => setFilters({
                  selectedSubcategories: [],
                  priceRange: [minPrice, maxPrice],
                  sortBy: 'newest'
                })}
                className="text-primary-600 hover:text-primary-700 font-semibold"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
