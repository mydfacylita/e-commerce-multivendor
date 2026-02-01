'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiGrid, FiList, FiFilter, FiX, FiChevronDown, FiChevronRight } from 'react-icons/fi'

interface Category {
  id: string
  name: string
  slug: string
  parentId: string | null
  children?: Category[]
}

interface ProductsFilterProps {
  categories: Category[]
  totalProducts: number
  activeCount: number
  inactiveCount: number
  featuredCount: number
  dropshippingCount: number
}

export default function ProductsFilter({
  categories,
  totalProducts,
  activeCount,
  inactiveCount,
  featuredCount,
  dropshippingCount
}: ProductsFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [viewMode, setViewMode] = useState<'list' | 'cards'>(
    (searchParams.get('view') as 'list' | 'cards') || 'list'
  )
  const [showFilters, setShowFilters] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  
  // Filtros atuais
  const currentStatus = searchParams.get('status') || 'all'
  const currentCategory = searchParams.get('category') || ''
  const currentSearch = searchParams.get('search') || ''

  // Construir árvore de categorias
  const buildCategoryTree = (cats: Category[], parentId: string | null = null): Category[] => {
    return cats
      .filter(c => c.parentId === parentId)
      .map(c => ({
        ...c,
        children: buildCategoryTree(cats, c.id)
      }))
  }

  const categoryTree = buildCategoryTree(categories)

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/admin/produtos?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push('/admin/produtos')
  }

  const toggleViewMode = (mode: 'list' | 'cards') => {
    setViewMode(mode)
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', mode)
    router.push(`/admin/produtos?${params.toString()}`)
  }

  const toggleCategoryExpand = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const renderCategoryItem = (category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0
    const isExpanded = expandedCategories.includes(category.id)
    const isSelected = currentCategory === category.id

    return (
      <div key={category.id}>
        <div 
          className={`flex items-center py-2 px-2 rounded cursor-pointer hover:bg-gray-100 ${isSelected ? 'bg-primary-50 text-primary-700' : ''}`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {hasChildren && (
            <button 
              onClick={(e) => { e.stopPropagation(); toggleCategoryExpand(category.id) }}
              className="mr-1 p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
            </button>
          )}
          {!hasChildren && <span className="w-6" />}
          <span 
            onClick={() => updateFilter('category', isSelected ? '' : category.id)}
            className="flex-1 text-sm"
          >
            {level === 0 && '📁 '}
            {level === 1 && '📂 '}
            {level === 2 && '📄 '}
            {level >= 3 && '• '}
            {category.name}
          </span>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {category.children!.map(child => renderCategoryItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const hasActiveFilters = currentStatus !== 'all' || currentCategory || currentSearch

  return (
    <div className="mb-6">
      {/* Barra de filtros e busca */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Busca */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Buscar produtos..."
              defaultValue={currentSearch}
              onChange={(e) => {
                clearTimeout((window as any).searchTimeout)
                ;(window as any).searchTimeout = setTimeout(() => {
                  updateFilter('search', e.target.value)
                }, 500)
              }}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Toggle Filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${showFilters ? 'bg-primary-50 border-primary-500 text-primary-700' : 'hover:bg-gray-50'}`}
          >
            <FiFilter size={18} />
            Filtros
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-primary-500 rounded-full" />
            )}
          </button>

          {/* Toggle View Mode */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'bg-white hover:bg-gray-50'}`}
              title="Visualização em lista"
            >
              <FiList size={20} />
            </button>
            <button
              onClick={() => toggleViewMode('cards')}
              className={`p-2 ${viewMode === 'cards' ? 'bg-primary-500 text-white' : 'bg-white hover:bg-gray-50'}`}
              title="Visualização em cards"
            >
              <FiGrid size={20} />
            </button>
          </div>

          {/* Limpar filtros */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-gray-500 hover:text-red-500"
            >
              <FiX size={16} />
              Limpar
            </button>
          )}
        </div>

        {/* Contadores rápidos */}
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => updateFilter('status', 'all')}
            className={`px-3 py-1 rounded-full text-sm ${currentStatus === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            Todos ({totalProducts})
          </button>
          <button
            onClick={() => updateFilter('status', 'active')}
            className={`px-3 py-1 rounded-full text-sm ${currentStatus === 'active' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
          >
            ✓ Ativos ({activeCount})
          </button>
          <button
            onClick={() => updateFilter('status', 'inactive')}
            className={`px-3 py-1 rounded-full text-sm ${currentStatus === 'inactive' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
          >
            ○ Inativos ({inactiveCount})
          </button>
          <button
            onClick={() => updateFilter('status', 'featured')}
            className={`px-3 py-1 rounded-full text-sm ${currentStatus === 'featured' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800 hover:bg-purple-200'}`}
          >
            ⭐ Destaque ({featuredCount})
          </button>
          <button
            onClick={() => updateFilter('status', 'dropshipping')}
            className={`px-3 py-1 rounded-full text-sm ${currentStatus === 'dropshipping' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}
          >
            🚀 Dropshipping ({dropshippingCount})
          </button>
        </div>
      </div>

      {/* Painel de filtros expandido */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Categorias hierárquicas */}
            <div className="md:col-span-2">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                📁 Categorias
                {currentCategory && (
                  <button 
                    onClick={() => updateFilter('category', '')}
                    className="text-xs text-gray-500 hover:text-red-500"
                  >
                    (limpar)
                  </button>
                )}
              </h3>
              <div className="max-h-64 overflow-y-auto border rounded-lg p-2">
                {categoryTree.length === 0 ? (
                  <p className="text-gray-500 text-sm p-2">Nenhuma categoria</p>
                ) : (
                  categoryTree.map(cat => renderCategoryItem(cat))
                )}
              </div>
            </div>

            {/* Filtros adicionais */}
            <div>
              <h3 className="font-semibold mb-3">⚙️ Opções</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchParams.get('lowStock') === 'true'}
                    onChange={(e) => updateFilter('lowStock', e.target.checked ? 'true' : '')}
                    className="rounded text-primary-500"
                  />
                  <span className="text-sm">Estoque baixo (&lt; 10)</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchParams.get('noStock') === 'true'}
                    onChange={(e) => updateFilter('noStock', e.target.checked ? 'true' : '')}
                    className="rounded text-primary-500"
                  />
                  <span className="text-sm">Sem estoque</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchParams.get('noImage') === 'true'}
                    onChange={(e) => updateFilter('noImage', e.target.checked ? 'true' : '')}
                    className="rounded text-primary-500"
                  />
                  <span className="text-sm">Sem imagem</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
