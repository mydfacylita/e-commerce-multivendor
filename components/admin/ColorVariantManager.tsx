'use client'

import { useState } from 'react'
import { FiPlus, FiX, FiCheck } from 'react-icons/fi'

interface ColorVariant {
  color: string
  colorHex: string
  stock: number
  price?: number
}

interface ColorVariantManagerProps {
  variants: ColorVariant[]
  onVariantsChange: (variants: ColorVariant[]) => void
  onTotalStockChange: (total: number) => void
  basePrice?: number
}

const PRESET_COLORS = [
  { name: 'Preto', hex: '#000000' },
  { name: 'Branco', hex: '#FFFFFF' },
  { name: 'Cinza', hex: '#6B7280' },
  { name: 'Vermelho', hex: '#EF4444' },
  { name: 'Rosa', hex: '#EC4899' },
  { name: 'Laranja', hex: '#F97316' },
  { name: 'Amarelo', hex: '#EAB308' },
  { name: 'Verde', hex: '#22C55E' },
  { name: 'Azul', hex: '#3B82F6' },
  { name: 'Roxo', hex: '#A855F7' },
  { name: 'Marrom', hex: '#92400E' },
  { name: 'Bege', hex: '#D4B896' },
]

export default function ColorVariantManager({ 
  variants, 
  onVariantsChange, 
  onTotalStockChange,
  basePrice 
}: ColorVariantManagerProps) {
  const [customColor, setCustomColor] = useState('')
  const [customHex, setCustomHex] = useState('#000000')
  const [showCustom, setShowCustom] = useState(false)

  const updateVariants = (newVariants: ColorVariant[]) => {
    onVariantsChange(newVariants)
    const totalStock = newVariants.reduce((sum, v) => sum + (v.stock || 0), 0)
    onTotalStockChange(totalStock)
  }

  const addQuickColor = (colorName: string, colorHex: string) => {
    if (variants.some(v => v.color === colorName)) {
      return // Cor já existe
    }
    updateVariants([...variants, { color: colorName, colorHex, stock: 0 }])
  }

  const addCustomColor = () => {
    if (!customColor.trim()) return
    if (variants.some(v => v.color === customColor.trim())) {
      return // Cor já existe
    }
    updateVariants([...variants, { 
      color: customColor.trim(), 
      colorHex: customHex,
      stock: 0 
    }])
    setCustomColor('')
    setCustomHex('#000000')
    setShowCustom(false)
  }

  const removeVariant = (index: number) => {
    const newVariants = variants.filter((_, i) => i !== index)
    updateVariants(newVariants)
  }

  const updateVariantStock = (index: number, stock: number) => {
    const newVariants = [...variants]
    newVariants[index].stock = stock
    updateVariants(newVariants)
  }

  const updateVariantPrice = (index: number, price: number | undefined) => {
    const newVariants = [...variants]
    newVariants[index].price = price
    updateVariants(newVariants)
  }

  return (
    <div className="border rounded-lg p-6 bg-white">
      <h3 className="font-semibold text-lg mb-4">🎨 Variações de Cor</h3>
      <p className="text-sm text-gray-600 mb-4">
        Adicione as cores disponíveis para este produto. Cada cor pode ter estoque e preço próprio.
      </p>

      {/* Cores Pré-definidas */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Cores Rápidas</label>
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {PRESET_COLORS.map((preset) => {
            const isAdded = variants.some(v => v.color === preset.name)
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => !isAdded && addQuickColor(preset.name, preset.hex)}
                disabled={isAdded}
                className={`
                  relative flex flex-col items-center p-2 rounded-md border-2 transition-all
                  ${isAdded 
                    ? 'border-green-500 bg-green-50 cursor-not-allowed' 
                    : 'border-gray-200 hover:border-primary-400 hover:bg-gray-50'
                  }
                `}
              >
                <div 
                  className="w-8 h-8 rounded-full mb-1 border-2 border-gray-300"
                  style={{ 
                    backgroundColor: preset.hex,
                    boxShadow: preset.hex === '#FFFFFF' ? 'inset 0 0 0 1px rgba(0,0,0,0.1)' : 'none'
                  }}
                />
                <span className="text-xs text-center">{preset.name}</span>
                {isAdded && (
                  <FiCheck className="absolute top-1 right-1 text-green-600 w-4 h-4" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Cor Personalizada */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          {showCustom ? '- Ocultar cor personalizada' : '+ Adicionar cor personalizada'}
        </button>
        
        {showCustom && (
          <div className="mt-2 p-4 border rounded-md bg-gray-50">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1">Nome da Cor</label>
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomColor())}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="Ex: Azul Marinho"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Código Hex</label>
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value)}
                  className="h-[42px] w-16 border rounded-md cursor-pointer"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={addCustomColor}
                  disabled={!customColor.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-300"
                >
                  <FiPlus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Variações Adicionadas */}
      {variants.length > 0 && (
        <div className="space-y-3">
          <label className="block text-sm font-medium">Cores Adicionadas ({variants.length})</label>
          
          {variants.map((variant, index) => (
            <div key={index} className="flex items-center gap-3 p-3 border rounded-md bg-gray-50">
              {/* Preview da Cor */}
              <div 
                className="w-10 h-10 rounded-full border-2 border-gray-300 flex-shrink-0"
                style={{ 
                  backgroundColor: variant.colorHex,
                  boxShadow: variant.colorHex === '#FFFFFF' ? 'inset 0 0 0 1px rgba(0,0,0,0.1)' : 'none'
                }}
              />
              
              {/* Nome da Cor */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{variant.color}</div>
                <div className="text-xs text-gray-500">{variant.colorHex}</div>
              </div>

              {/* Estoque */}
              <div className="w-24">
                <label className="block text-xs text-gray-600 mb-1">Estoque</label>
                <input
                  type="number"
                  min="0"
                  value={variant.stock}
                  onChange={(e) => updateVariantStock(index, parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>

              {/* Preço (opcional) */}
              <div className="w-28">
                <label className="block text-xs text-gray-600 mb-1">
                  Preço {basePrice && '(opcional)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={variant.price || ''}
                  onChange={(e) => updateVariantPrice(index, e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder={basePrice ? `R$ ${basePrice.toFixed(2)}` : 'Preço'}
                  className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>

              {/* Remover */}
              <button
                type="button"
                onClick={() => removeVariant(index)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-md"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          ))}

          {/* Resumo */}
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-md border border-blue-200">
            <span className="text-sm font-medium text-blue-900">
              Total de Cores: {variants.length}
            </span>
            <span className="text-sm font-medium text-blue-900">
              Estoque Total: {variants.reduce((sum, v) => sum + (v.stock || 0), 0)} unidades
            </span>
          </div>
        </div>
      )}

      {variants.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">Nenhuma cor adicionada ainda</p>
          <p className="text-xs mt-1">Selecione cores rápidas ou adicione uma cor personalizada</p>
        </div>
      )}
    </div>
  )
}
