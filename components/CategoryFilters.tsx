'use client'

import { useState, useEffect } from 'react'
import { FiFilter, FiX, FiChevronDown, FiChevronUp } from 'react-icons/fi'

interface Subcategory {
  id: string
  name: string
  slug: string
  productCount?: number
}

interface CategoryFiltersProps {
  subcategories: Subcategory[]
  currentCategorySlug: string
  minPrice: number
  maxPrice: number
  onFiltersChange: (filters: FilterState) => void
}

export interface FilterState {
  selectedSubcategories: string[]
  priceRange: [number, number]
  sortBy: string
}

export default function CategoryFilters({
  subcategories,
  currentCategorySlug,
  minPrice,
  maxPrice,
  onFiltersChange
}: CategoryFiltersProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([])
  const [priceMin, setPriceMin] = useState(minPrice)
  const [priceMax, setPriceMax] = useState(maxPrice)
  const [sortBy, setSortBy] = useState('newest')
  const [expandedSections, setExpandedSections] = useState({
    subcategories: true,
    price: true,
    sort: false
  })

  // Notificar mudanças nos filtros
  useEffect(() => {
    onFiltersChange({
      selectedSubcategories,
      priceRange: [priceMin, priceMax],
      sortBy
    })
  }, [selectedSubcategories, priceMin, priceMax, sortBy, onFiltersChange])

  const toggleSubcategory = (id: string) => {
    setSelectedSubcategories(prev => 
      prev.includes(id) 
        ? prev.filter(s => s !== id)
        : [...prev, id]
    )
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const clearFilters = () => {
    setSelectedSubcategories([])
    setPriceMin(minPrice)
    setPriceMax(maxPrice)
    setSortBy('newest')
  }

  const hasActiveFilters = selectedSubcategories.length > 0 || 
    priceMin > minPrice || 
    priceMax < maxPrice

  return (
    <>
      {/* Mobile Filter Button */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setIsFilterOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
        >
          <FiFilter />
          Filtros
          {hasActiveFilters && (
            <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
              {selectedSubcategories.length + (priceMin > minPrice || priceMax < maxPrice ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Filter Drawer */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsFilterOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Filtros</h3>
              <button onClick={() => setIsFilterOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <FiX size={20} />
              </button>
            </div>
            <div className="p-4">
              <FilterContent 
                subcategories={subcategories}
                selectedSubcategories={selectedSubcategories}
                toggleSubcategory={toggleSubcategory}
                priceMin={priceMin}
                priceMax={priceMax}
                setPriceMin={setPriceMin}
                setPriceMax={setPriceMax}
                minPrice={minPrice}
                maxPrice={maxPrice}
                sortBy={sortBy}
                setSortBy={setSortBy}
                expandedSections={expandedSections}
                toggleSection={toggleSection}
                clearFilters={clearFilters}
                hasActiveFilters={hasActiveFilters}
              />
            </div>
          </div>
        </div>
      )}

      {/* Desktop Filter Sidebar */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <div className="bg-white rounded-lg shadow-sm border p-4 sticky top-24">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <FiFilter /> Filtros
            </h3>
            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:underline"
              >
                Limpar
              </button>
            )}
          </div>
          <FilterContent 
            subcategories={subcategories}
            selectedSubcategories={selectedSubcategories}
            toggleSubcategory={toggleSubcategory}
            priceMin={priceMin}
            priceMax={priceMax}
            setPriceMin={setPriceMin}
            setPriceMax={setPriceMax}
            minPrice={minPrice}
            maxPrice={maxPrice}
            sortBy={sortBy}
            setSortBy={setSortBy}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            clearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>
      </div>
    </>
  )
}

interface FilterContentProps {
  subcategories: Subcategory[]
  selectedSubcategories: string[]
  toggleSubcategory: (id: string) => void
  priceMin: number
  priceMax: number
  setPriceMin: (value: number) => void
  setPriceMax: (value: number) => void
  minPrice: number
  maxPrice: number
  sortBy: string
  setSortBy: (value: string) => void
  expandedSections: { subcategories: boolean; price: boolean; sort: boolean }
  toggleSection: (section: 'subcategories' | 'price' | 'sort') => void
  clearFilters: () => void
  hasActiveFilters: boolean
}

function FilterContent({
  subcategories,
  selectedSubcategories,
  toggleSubcategory,
  priceMin,
  priceMax,
  setPriceMin,
  setPriceMax,
  minPrice,
  maxPrice,
  sortBy,
  setSortBy,
  expandedSections,
  toggleSection,
}: FilterContentProps) {
  return (
    <div className="space-y-4">
      {/* Subcategorias */}
      {subcategories.length > 0 && (
        <div className="border-b pb-4">
          <button 
            onClick={() => toggleSection('subcategories')}
            className="flex items-center justify-between w-full font-medium mb-3"
          >
            <span>Subcategorias</span>
            {expandedSections.subcategories ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          {expandedSections.subcategories && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {subcategories.map((sub) => (
                <label key={sub.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={selectedSubcategories.includes(sub.id)}
                    onChange={() => toggleSubcategory(sub.id)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{sub.name}</span>
                  {sub.productCount !== undefined && (
                    <span className="text-xs text-gray-400">({sub.productCount})</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Faixa de Preço */}
      <div className="border-b pb-4">
        <button 
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full font-medium mb-3"
        >
          <span>Faixa de Preço</span>
          {expandedSections.price ? <FiChevronUp /> : <FiChevronDown />}
        </button>
        {expandedSections.price && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500">Mínimo</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                  <input
                    type="number"
                    value={priceMin}
                    onChange={(e) => setPriceMin(Number(e.target.value))}
                    min={minPrice}
                    max={priceMax}
                    className="w-full pl-8 pr-2 py-2 border rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              <span className="text-gray-400 mt-4">-</span>
              <div className="flex-1">
                <label className="text-xs text-gray-500">Máximo</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                  <input
                    type="number"
                    value={priceMax}
                    onChange={(e) => setPriceMax(Number(e.target.value))}
                    min={priceMin}
                    max={maxPrice}
                    className="w-full pl-8 pr-2 py-2 border rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Botões de faixas rápidas */}
            <div className="flex flex-wrap gap-1">
              <button 
                onClick={() => { setPriceMin(0); setPriceMax(50); }}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full"
              >
                Até R$ 50
              </button>
              <button 
                onClick={() => { setPriceMin(50); setPriceMax(100); }}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full"
              >
                R$ 50 - 100
              </button>
              <button 
                onClick={() => { setPriceMin(100); setPriceMax(300); }}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full"
              >
                R$ 100 - 300
              </button>
              <button 
                onClick={() => { setPriceMin(300); setPriceMax(maxPrice); }}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full"
              >
                Acima de R$ 300
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ordenação */}
      <div>
        <button 
          onClick={() => toggleSection('sort')}
          className="flex items-center justify-between w-full font-medium mb-3"
        >
          <span>Ordenar por</span>
          {expandedSections.sort ? <FiChevronUp /> : <FiChevronDown />}
        </button>
        {expandedSections.sort && (
          <div className="space-y-2">
            {[
              { value: 'newest', label: 'Mais recentes' },
              { value: 'price_asc', label: 'Menor preço' },
              { value: 'price_desc', label: 'Maior preço' },
              { value: 'name_asc', label: 'A - Z' },
              { value: 'name_desc', label: 'Z - A' },
              { value: 'discount', label: 'Maior desconto' },
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="radio"
                  name="sortBy"
                  value={option.value}
                  checked={sortBy === option.value}
                  onChange={() => setSortBy(option.value)}
                  className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
