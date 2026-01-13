'use client'

import { useState } from 'react'
import { FiPlus, FiTrash2 } from 'react-icons/fi'

interface Size {
  size: string
  stock: number
  price?: number
}

interface SizeManagerProps {
  sizeType: string
  sizeCategory: string
  sizes: Size[]
  onSizesChange: (sizes: Size[]) => void
  onSizeTypeChange: (type: string) => void
  onSizeCategoryChange: (category: string) => void
  onTotalStockChange?: (totalStock: number) => void  // Novo callback para atualizar estoque total
}

// Tamanhos predefinidos
const SHOE_SIZES_ADULT = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46']
const SHOE_SIZES_CHILDREN = ['20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34']
const CLOTHING_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XGG']
const CLOTHING_SIZES_NUMBERS = ['2', '4', '6', '8', '10', '12', '14', '16']

export default function SizeManager({
  sizeType,
  sizeCategory,
  sizes,
  onSizesChange,
  onSizeTypeChange,
  onSizeCategoryChange,
  onTotalStockChange,
}: SizeManagerProps) {
  const [newSize, setNewSize] = useState('')
  const [newStock, setNewStock] = useState('')
  const [newPrice, setNewPrice] = useState('')

  // Calcular estoque total sempre que sizes mudar
  const totalStock = sizes.reduce((sum, size) => sum + (size.stock || 0), 0)

  // Atualizar estoque total no componente pai sempre que mudar
  const updateSizes = (newSizes: Size[]) => {
    console.log('🔧 SizeManager updateSizes called with:', newSizes)
    onSizesChange(newSizes)
    const newTotal = newSizes.reduce((sum, size) => sum + (size.stock || 0), 0)
    console.log('🔧 SizeManager newTotal calculated:', newTotal)
    onTotalStockChange?.(newTotal)
  }

  const getSuggestedSizes = () => {
    if (sizeCategory === 'shoes') {
      return sizeType === 'children' || sizeType === 'baby' 
        ? SHOE_SIZES_CHILDREN 
        : SHOE_SIZES_ADULT
    }
    if (sizeCategory === 'clothing') {
      return CLOTHING_SIZES
    }
    return []
  }

  const addSize = () => {
    if (!newSize.trim()) return

    const sizeExists = sizes.some(s => s.size === newSize.trim())
    if (sizeExists) {
      alert('Este tamanho já foi adicionado!')
      return
    }

    const newSizeObj: Size = {
      size: newSize.trim(),
      stock: parseInt(newStock) || 0,
      price: newPrice ? parseFloat(newPrice) : undefined,
    }

    updateSizes([...sizes, newSizeObj])
    setNewSize('')
    setNewStock('')
    setNewPrice('')
  }

  const addQuickSize = (size: string) => {
    console.log('➕ addQuickSize called with:', size, 'Current sizes:', sizes)
    const sizeExists = sizes.some(s => s.size === size)
    if (sizeExists) {
      console.log('⚠️ Size already exists')
      return
    }

    const newSizeObj: Size = {
      size,
      stock: 0,
    }

    updateSizes([...sizes, newSizeObj])
  }

  const removeSize = (index: number) => {
    const newSizes = sizes.filter((_, i) => i !== index)
    updateSizes(newSizes)
  }

  const updateSizeStock = (index: number, stock: number) => {
    const newSizes = [...sizes]
    newSizes[index].stock = stock
    updateSizes(newSizes)
  }

  const updateSizePrice = (index: number, price: number | undefined) => {
    const newSizes = [...sizes]
    newSizes[index].price = price
    updateSizes(newSizes)
  }

  const suggestedSizes = getSuggestedSizes()
  const unusedSizes = suggestedSizes.filter(s => !sizes.some(size => size.size === s))

  return (
    <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">👟 Tamanhos / Numerações</h3>
        {sizes.length > 0 && (
          <div className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold">
            📦 Estoque Total: {totalStock} unidades
          </div>
        )}
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Configure tamanhos para produtos que necessitam (sapatos, roupas, etc.)
      </p>

      {/* Seletores de Tipo e Categoria */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Categoria do Produto</label>
          <select
            value={sizeCategory}
            onChange={(e) => onSizeCategoryChange(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white"
          >
            <option value="">Não precisa de tamanho</option>
            <option value="shoes">Calçados</option>
            <option value="clothing">Roupas / Vestuário</option>
            <option value="accessories">Acessórios</option>
          </select>
        </div>

        {sizeCategory && (
          <div>
            <label className="block text-sm font-medium mb-2">Tipo de Tamanho</label>
            <select
              value={sizeType}
              onChange={(e) => onSizeTypeChange(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white"
            >
              <option value="adult">Adulto</option>
              <option value="children">Infantil</option>
              <option value="baby">Bebê</option>
              <option value="unisex">Unissex</option>
            </select>
          </div>
        )}
      </div>

      {sizeCategory && (
        <>
          {/* Tamanhos Rápidos */}
          {unusedSizes.length > 0 && (
            <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-medium mb-3">⚡ Adicionar Tamanhos Rápidos:</p>
              <div className="flex flex-wrap gap-2">
                {unusedSizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => addQuickSize(size)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm font-medium transition-colors"
                  >
                    + {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lista de Tamanhos Adicionados */}
          {sizes.length > 0 && (
            <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">📦 Tamanhos Cadastrados ({sizes.length}):</p>
                <p className="text-sm font-bold text-primary-600">
                  Total: {totalStock} {totalStock === 1 ? 'unidade' : 'unidades'}
                </p>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {sizes.map((size, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="w-16 flex-shrink-0">
                      <span className="block text-center font-bold text-lg text-primary-600">
                        {size.size}
                      </span>
                      {totalStock > 0 && (
                        <span className="block text-center text-xs text-gray-500">
                          {((size.stock / totalStock) * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Estoque</label>
                      <input
                        type="number"
                        min="0"
                        value={size.stock}
                        onChange={(e) => updateSizeStock(index, parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">
                        Preço Extra (opcional)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={size.price || ''}
                        onChange={(e) =>
                          updateSizePrice(index, e.target.value ? parseFloat(e.target.value) : undefined)
                        }
                        placeholder="0.00"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeSize(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Remover tamanho"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Adicionar Tamanho Customizado */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm font-medium mb-3">➕ Adicionar Tamanho Personalizado:</p>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Tamanho</label>
                <input
                  type="text"
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSize())}
                  placeholder="Ex: 39, M, G..."
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>

              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Estoque</label>
                <input
                  type="number"
                  min="0"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSize())}
                  placeholder="0"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>

              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Preço Extra</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSize())}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>

              <button
                type="button"
                onClick={addSize}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center gap-2 font-medium"
              >
                <FiPlus size={18} />
                Adicionar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
