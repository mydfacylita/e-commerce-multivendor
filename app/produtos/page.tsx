'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ProductCard from '@/components/ProductCard'
import { 
  FiGrid, FiList, FiFilter, FiX, FiChevronDown, FiChevronUp, 
  FiSearch, FiSliders, FiLoader, FiRefreshCw, FiStar
} from 'react-icons/fi'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice?: number | null
  images: string[]
  stock: number
  category?: { id: string; name: string } | null
  brand?: string | null
  featured?: boolean
}

interface Category {
  id: string
  name: string
  slug: string
  count?: number
  children?: Category[]
}

type SortOption = 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'discount'
type ViewMode = 'grid' | 'list'

export default function ProdutosPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Estados
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [totalProducts, setTotalProducts] = useState(0)
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('categoria') || '')
  const [priceMin, setPriceMin] = useState(searchParams.get('preco_min') || '')
  const [priceMax, setPriceMax] = useState(searchParams.get('preco_max') || '')
  const [onlyInStock, setOnlyInStock] = useState(searchParams.get('em_estoque') === 'true')
  const [onlyOnSale, setOnlyOnSale] = useState(searchParams.get('promocao') === 'true')
  const [sortBy, setSortBy] = useState<SortOption>((searchParams.get('ordenar') as SortOption) || 'newest')
  const [viewMode, setViewMode] = useState<ViewMode>((searchParams.get('view') as ViewMode) || 'grid')
  
  // UI
  const [showFilters, setShowFilters] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    price: true,
    availability: true
  })
  
  // Paginação
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const productsPerPage = 24

  // Buscar categorias
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/public/categories')
        if (response.ok) {
          const data = await response.json()
          setCategories(data)
        }
      } catch (error) {
        console.error('Erro ao buscar categorias:', error)
      }
    }
    fetchCategories()
  }, [])

  // Buscar produtos
  const fetchProducts = useCallback(async (resetPage = false) => {
    setLoading(true)
    
    try {
      const params = new URLSearchParams()
      
      if (searchQuery) params.set('q', searchQuery)
      if (selectedCategory) params.set('category', selectedCategory)
      if (priceMin) params.set('minPrice', priceMin)
      if (priceMax) params.set('maxPrice', priceMax)
      if (onlyInStock) params.set('inStock', 'true')
      if (onlyOnSale) params.set('onSale', 'true')
      params.set('sort', sortBy)
      params.set('page', resetPage ? '1' : page.toString())
      params.set('limit', productsPerPage.toString())
      
      const response = await fetch(`/api/products/paginated?${params.toString()}`, {
        headers: {
          'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const newProducts = data.products || []
        
        if (resetPage) {
          setProducts(newProducts)
          setPage(1)
        } else {
          setProducts(prev => page === 1 ? newProducts : [...prev, ...newProducts])
        }
        
        setTotalProducts(data.total || newProducts.length)
        setHasMore(newProducts.length >= productsPerPage)
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedCategory, priceMin, priceMax, onlyInStock, onlyOnSale, sortBy, page])

  // Efeito para buscar produtos quando filtros mudam
  useEffect(() => {
    fetchProducts(true)
  }, [searchQuery, selectedCategory, priceMin, priceMax, onlyInStock, onlyOnSale, sortBy])

  // Efeito para carregar mais produtos
  useEffect(() => {
    if (page > 1) {
      fetchProducts(false)
    }
  }, [page])

  // Atualizar URL com filtros
  useEffect(() => {
    const params = new URLSearchParams()
    
    if (searchQuery) params.set('q', searchQuery)
    if (selectedCategory) params.set('categoria', selectedCategory)
    if (priceMin) params.set('preco_min', priceMin)
    if (priceMax) params.set('preco_max', priceMax)
    if (onlyInStock) params.set('em_estoque', 'true')
    if (onlyOnSale) params.set('promocao', 'true')
    if (sortBy !== 'newest') params.set('ordenar', sortBy)
    if (viewMode !== 'grid') params.set('view', viewMode)
    
    const newUrl = params.toString() ? `/produtos?${params.toString()}` : '/produtos'
    router.replace(newUrl, { scroll: false })
  }, [searchQuery, selectedCategory, priceMin, priceMax, onlyInStock, onlyOnSale, sortBy, viewMode])

  // Limpar filtros
  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('')
    setPriceMin('')
    setPriceMax('')
    setOnlyInStock(false)
    setOnlyOnSale(false)
    setSortBy('newest')
  }

  // Toggle seção expandida
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Contagem de filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (searchQuery) count++
    if (selectedCategory) count++
    if (priceMin || priceMax) count++
    if (onlyInStock) count++
    if (onlyOnSale) count++
    return count
  }, [searchQuery, selectedCategory, priceMin, priceMax, onlyInStock, onlyOnSale])

  // Função para encontrar nome da categoria (incluindo subcategorias)
  const getCategoryName = useCallback((categoryId: string): string => {
    for (const cat of categories) {
      if (cat.id === categoryId) return cat.name
      if (cat.children) {
        for (const subcat of cat.children) {
          if (subcat.id === categoryId) return subcat.name
        }
      }
    }
    return 'Categoria'
  }, [categories])

  // Opções de ordenação
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'newest', label: 'Mais Recentes' },
    { value: 'oldest', label: 'Mais Antigos' },
    { value: 'price-asc', label: 'Menor Preço' },
    { value: 'price-desc', label: 'Maior Preço' },
    { value: 'name-asc', label: 'A-Z' },
    { value: 'name-desc', label: 'Z-A' },
    { value: 'discount', label: 'Maior Desconto' },
  ]

  // Componente de Filtros (Sidebar)
  const FiltersSidebar = () => (
    <div className="space-y-6">
      {/* Busca */}
      <div>
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        </div>
      </div>

      {/* Categorias */}
      <div className="border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('categories')}
          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="font-semibold">Categorias</span>
          {expandedSections.categories ? <FiChevronUp /> : <FiChevronDown />}
        </button>
        {expandedSections.categories && (
          <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
            <button
              onClick={() => setSelectedCategory('')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                !selectedCategory 
                  ? 'bg-primary-100 text-primary-700 font-medium' 
                  : 'hover:bg-gray-100'
              }`}
            >
              Todas as Categorias
            </button>
            {categories.map((cat) => (
              <div key={cat.id}>
                <button
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex justify-between items-center ${
                    selectedCategory === cat.id 
                      ? 'bg-primary-100 text-primary-700 font-medium' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="font-medium">{cat.name}</span>
                  {cat.count !== undefined && (
                    <span className="text-xs text-gray-500">({cat.count})</span>
                  )}
                </button>
                {/* Subcategorias */}
                {cat.children && cat.children.length > 0 && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
                    {cat.children.map((subcat) => (
                      <button
                        key={subcat.id}
                        onClick={() => setSelectedCategory(subcat.id)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors text-sm ${
                          selectedCategory === subcat.id 
                            ? 'bg-primary-100 text-primary-700 font-medium' 
                            : 'hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        {subcat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Faixa de Preço */}
      <div className="border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('price')}
          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="font-semibold">Faixa de Preço</span>
          {expandedSections.price ? <FiChevronUp /> : <FiChevronDown />}
        </button>
        {expandedSections.price && (
          <div className="p-4 space-y-4">
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Mínimo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <span className="text-gray-400 mt-5">-</span>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Máximo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                  <input
                    type="number"
                    placeholder="999"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
            
            {/* Preços rápidos */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Até R$ 50', min: '', max: '50' },
                { label: 'R$ 50 - R$ 100', min: '50', max: '100' },
                { label: 'R$ 100 - R$ 200', min: '100', max: '200' },
                { label: 'Acima de R$ 200', min: '200', max: '' },
              ].map((range, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPriceMin(range.min)
                    setPriceMax(range.max)
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    priceMin === range.min && priceMax === range.max
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'hover:bg-gray-100 border-gray-300'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Disponibilidade */}
      <div className="border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('availability')}
          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="font-semibold">Disponibilidade</span>
          {expandedSections.availability ? <FiChevronUp /> : <FiChevronDown />}
        </button>
        {expandedSections.availability && (
          <div className="p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="group-hover:text-primary-600 transition-colors">
                Apenas em estoque
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={onlyOnSale}
                onChange={(e) => setOnlyOnSale(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="group-hover:text-primary-600 transition-colors flex items-center gap-2">
                <FiStar className="text-yellow-500" />
                Em promoção
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Limpar Filtros */}
      {activeFiltersCount > 0 && (
        <button
          onClick={clearFilters}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
        >
          <FiRefreshCw size={18} />
          Limpar Filtros ({activeFiltersCount})
        </button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Título e contagem */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {searchQuery ? `Resultados para "${searchQuery}"` : 'Todos os Produtos'}
              </h1>
              <p className="text-gray-500 mt-1">
                {loading ? 'Carregando...' : `${totalProducts} produtos encontrados`}
              </p>
            </div>

            {/* Controles */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Botão Filtros (mobile) */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FiFilter size={18} />
                Filtros
                {activeFiltersCount > 0 && (
                  <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Ordenação */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Modo de visualização */}
              <div className="flex border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-white hover:bg-gray-100'
                  }`}
                  title="Visualização em Grade"
                >
                  <FiGrid size={20} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-white hover:bg-gray-100'
                  }`}
                  title="Visualização em Lista"
                >
                  <FiList size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar de Filtros (Desktop) */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-28 bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <FiSliders className="text-primary-500" />
                <h2 className="font-bold text-lg">Filtros</h2>
              </div>
              <FiltersSidebar />
            </div>
          </aside>

          {/* Mobile Filters Modal */}
          {showFilters && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div 
                className="absolute inset-0 bg-black/50"
                onClick={() => setShowFilters(false)}
              />
              <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white overflow-y-auto">
                <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    <FiSliders className="text-primary-500" />
                    Filtros
                  </h2>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <FiX size={24} />
                  </button>
                </div>
                <div className="p-4">
                  <FiltersSidebar />
                </div>
                <div className="sticky bottom-0 bg-white border-t p-4">
                  <button
                    onClick={() => setShowFilters(false)}
                    className="w-full py-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
                  >
                    Ver {totalProducts} Produtos
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Grid de Produtos */}
          <main className="flex-1 min-w-0">
            {/* Tags de filtros ativos */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {searchQuery && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm">
                    Busca: {searchQuery}
                    <button onClick={() => setSearchQuery('')} className="hover:text-primary-900">
                      <FiX size={14} />
                    </button>
                  </span>
                )}
                {selectedCategory && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm">
                    {getCategoryName(selectedCategory)}
                    <button onClick={() => setSelectedCategory('')} className="hover:text-primary-900">
                      <FiX size={14} />
                    </button>
                  </span>
                )}
                {(priceMin || priceMax) && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm">
                    Preço: {priceMin ? `R$${priceMin}` : '0'} - {priceMax ? `R$${priceMax}` : '∞'}
                    <button onClick={() => { setPriceMin(''); setPriceMax('') }} className="hover:text-primary-900">
                      <FiX size={14} />
                    </button>
                  </span>
                )}
                {onlyInStock && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm">
                    Em Estoque
                    <button onClick={() => setOnlyInStock(false)} className="hover:text-green-900">
                      <FiX size={14} />
                    </button>
                  </span>
                )}
                {onlyOnSale && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                    Em Promoção
                    <button onClick={() => setOnlyOnSale(false)} className="hover:text-yellow-900">
                      <FiX size={14} />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Loading */}
            {loading && products.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <FiLoader className="animate-spin text-primary-500 mb-4" size={48} />
                <p className="text-gray-500">Carregando produtos...</p>
              </div>
            )}

            {/* Produtos */}
            {!loading && products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Nenhum produto encontrado
                </h3>
                <p className="text-gray-500 mb-4">
                  Tente ajustar seus filtros ou buscar por outros termos
                </p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Limpar Filtros
                </button>
              </div>
            ) : (
              <>
                <div className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4'
                    : 'space-y-4'
                }>
                  {products.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      layout={viewMode === 'list' ? 'horizontal' : 'vertical'}
                    />
                  ))}
                </div>

                {/* Carregar Mais */}
                {hasMore && !loading && (
                  <div className="text-center mt-8">
                    <button
                      onClick={() => setPage(p => p + 1)}
                      className="px-8 py-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors inline-flex items-center gap-2"
                    >
                      Carregar Mais Produtos
                    </button>
                  </div>
                )}

                {/* Loading mais produtos */}
                {loading && products.length > 0 && (
                  <div className="flex justify-center py-8">
                    <FiLoader className="animate-spin text-primary-500" size={32} />
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
