'use client'

import { useState } from 'react'
import AddToCartButton from './AddToCartButton'
import ProductSizeSelector from './ProductSizeSelector'

interface Variant {
  size: string
  color: string
  colorHex: string
  stock: number
  price?: number
}

interface Size {
  size: string
  stock?: number
  price?: number
  sku?: string
}

interface ProductSelectionWrapperProps {
  product: any
  variants: Variant[] | null
  sizes: Size[] | null
  sizeType?: string
  sizeCategory?: string
  onColorChange?: (color: string | null) => void
}

export default function ProductSelectionWrapper({ 
  product, 
  variants, 
  sizes,
  sizeType = 'adult',
  sizeCategory = 'shoes',
  onColorChange
}: ProductSelectionWrapperProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)

  // Notificar mudança de cor para componente pai
  const handleColorChange = (color: string | null) => {
    setSelectedColor(color)
    if (onColorChange) {
      onColorChange(color)
    }
  }

  console.log('🎨 ProductSelectionWrapper - variants:', variants)
  console.log('📏 ProductSelectionWrapper - sizes:', sizes)

  // Verifica se precisa selecionar cor (produtos com variants)
  const hasVariants = variants && variants.length > 0 && variants.some(v => v.color)
  
  console.log('✅ hasVariants:', hasVariants)
  
  // Se tem variants, primeiro pegar todos os tamanhos únicos
  let availableSizes: string[] = []
  if (hasVariants) {
    availableSizes = Array.from(new Set(variants.map(v => v.size).filter(Boolean)))
  } else if (sizes && sizes.length > 0) {
    availableSizes = sizes.map(s => s.size)
  }

  // Se já selecionou tamanho, pegar cores disponíveis para aquele tamanho (APENAS COM ESTOQUE)
  let availableColors: { name: string, hex: string }[] = []
  if (hasVariants && selectedSize) {
    const uniqueColors = Array.from(new Set(
      variants
        .filter(v => v.size === selectedSize && v.stock > 0) // FILTRAR APENAS COM ESTOQUE
        .map(v => v.color)
        .filter(Boolean)
    ))
    availableColors = uniqueColors.map(color => {
      const variant = variants.find(v => v.color === color && v.size === selectedSize)
      return {
        name: color,
        hex: variant?.colorHex || '#808080'
      }
    })
  }
  
  console.log('📦 availableSizes:', availableSizes)
  console.log('🎨 availableColors:', availableColors)
  
  // Verifica se precisa selecionar tamanho
  const hasSizes = hasVariants || (sizes && sizes.length > 0)
  
  // Verifica se a combinação selecionada tem estoque
  let hasStock = true
  if (hasVariants && selectedSize && selectedColor) {
    const variant = variants.find(v => v.size === selectedSize && v.color === selectedColor)
    hasStock = variant ? variant.stock > 0 : false
  }
  
  // Desabilita o botão se faltar seleção OU não tiver estoque
  const isDisabled = product.stock === 0 || 
    (hasSizes && !selectedSize) ||
    (hasVariants && !selectedColor) ||
    !hasStock

  return (
    <>
      {/* Seletor de Tamanhos */}
      {availableSizes.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-3">Tamanhos Disponíveis</h3>
          <div className="flex flex-wrap gap-3">
            {availableSizes.map((size) => (
              <button
                key={size}
                onClick={() => {
                  setSelectedSize(size)
                  handleColorChange(null) // Reset cor ao trocar tamanho
                }}
                className={`px-6 py-3 border-2 rounded-lg font-semibold transition-all ${
                  selectedSize === size
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-gray-300 bg-white text-gray-800 hover:border-primary-600'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
          {!selectedSize && (
            <p className="text-sm text-red-500 mt-2">* Selecione um tamanho</p>
          )}
        </div>
      )}

      {/* Seletor de Cores */}
      {hasVariants && selectedSize && (
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-3">Cores Disponíveis</h3>
          <div className="flex flex-wrap gap-3">
            {availableColors.map((color) => (
              <button
                key={color.name}
                onClick={() => handleColorChange(color.name)}
                className={`flex items-center gap-2 px-4 py-3 border-2 rounded-lg transition-all ${
                  selectedColor === color.name
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-300 bg-white hover:border-primary-600'
                }`}
              >
                <div 
                  className="w-8 h-8 rounded-full border-2 border-gray-300 shadow-sm" 
                  style={{ backgroundColor: color.hex }}
                />
                <span className="font-medium text-gray-800">{color.name}</span>
              </button>
            ))}
          </div>
          {!selectedColor && (
            <p className="text-sm text-red-500 mt-2">* Selecione uma cor</p>
          )}
          {selectedSize && availableColors.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Nenhuma cor disponível para o tamanho {selectedSize}. Selecione outro tamanho.
            </p>
          )}
        </div>
      )}

      {/* Formas de Pagamento */}
      <div className="mt-6 border-t pt-6">
        <h3 className="font-semibold text-lg mb-4">💳 Formas de Pagamento</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <span className="text-2xl">💳</span>
            <div>
              <p className="font-semibold text-gray-800">Cartão de Crédito</p>
              <p className="text-sm text-gray-600">Visa, Mastercard, Elo, Amex - Até 12x sem juros</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <span className="text-2xl">💰</span>
            <div>
              <p className="font-semibold text-gray-800">PIX</p>
              <p className="text-sm text-gray-600">Aprovação imediata - 5% de desconto</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <span className="text-2xl">📄</span>
            <div>
              <p className="font-semibold text-gray-800">Boleto Bancário</p>
              <p className="text-sm text-gray-600">À vista - Vencimento em 3 dias</p>
            </div>
          </div>
        </div>
      </div>

      {/* Botão de adicionar ao carrinho */}
      <div className="mb-8 mt-6">
        <AddToCartButton 
          product={product} 
          disabled={isDisabled}
          selectedColor={selectedColor}
          selectedSize={selectedSize}
        />
      </div>
    </>
  )
}
