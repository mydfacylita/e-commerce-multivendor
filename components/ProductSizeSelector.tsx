'use client'

import { useState } from 'react'

interface Size {
  size: string           // Ex: "37", "38", "M", "G"
  stock?: number         // Estoque disponível para este tamanho
  price?: number         // Preço específico para este tamanho (opcional)
  sku?: string          // SKU específico para este tamanho
}

interface ProductSizeSelectorProps {
  sizes: Size[]
  sizeType?: string      // 'adult', 'children', 'baby', 'unisex'
  sizeCategory?: string  // 'shoes', 'clothing', 'accessories'
  onSizeChange?: (selectedSize: Size | null) => void
}

export default function ProductSizeSelector({ 
  sizes, 
  sizeType = 'adult',
  sizeCategory = 'shoes',
  onSizeChange 
}: ProductSizeSelectorProps) {
  const [selectedSize, setSelectedSize] = useState<Size | null>(null)

  const handleSizeClick = (size: Size) => {
    // Não permite selecionar tamanhos sem estoque
    if (size.stock !== undefined && size.stock === 0) return
    
    const newSize = selectedSize?.size === size.size ? null : size
    setSelectedSize(newSize)
    onSizeChange?.(newSize)
  }

  // Labels para ajudar o usuário
  const getLabel = () => {
    if (sizeCategory === 'shoes') {
      if (sizeType === 'adult') return 'Tamanhos Disponíveis - Adulto'
      if (sizeType === 'children') return 'Tamanhos Disponíveis - Infantil'
      if (sizeType === 'baby') return 'Tamanhos Disponíveis - Bebê'
    }
    if (sizeCategory === 'clothing') {
      return 'Tamanhos Disponíveis'
    }
    return 'Tamanhos Disponíveis'
  }

  if (!sizes || sizes.length === 0) return null

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg">{getLabel()}</h3>
        {selectedSize && (
          <span className="text-sm text-primary-600 font-medium">
            Selecionado: {selectedSize.size}
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {sizes.map((size, index) => {
          const isOutOfStock = size.stock !== undefined && size.stock === 0
          const isSelected = selectedSize?.size === size.size

          return (
            <button
              key={`${size.size}-${index}`}
              onClick={() => handleSizeClick(size)}
              disabled={isOutOfStock}
              className={`
                relative px-3 py-2 border-2 rounded-lg font-semibold text-sm
                transition-all duration-200
                ${isSelected 
                  ? 'border-primary-600 bg-primary-50 text-primary-700' 
                  : 'border-gray-300 bg-white text-gray-700 hover:border-primary-400'
                }
                ${isOutOfStock 
                  ? 'opacity-40 cursor-not-allowed line-through' 
                  : 'cursor-pointer hover:shadow-md'
                }
              `}
              title={isOutOfStock ? 'Esgotado' : `Tamanho ${size.size}`}
            >
              {size.size}
              {size.price && size.price !== 0 && (
                <span className="block text-xs text-gray-500 mt-1">
                  +R$ {size.price.toFixed(2)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Link para guia de medidas */}
      {sizeCategory === 'shoes' && (
        <a 
          href="#" 
          onClick={(e) => {
            e.preventDefault()
            // Aqui você pode abrir um modal com a tabela de medidas
            alert('Guia de medidas em desenvolvimento')
          }}
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-3"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Guia de Medidas
        </a>
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

      {!selectedSize && sizes.length > 0 && (
        <p className="text-sm text-gray-500 mt-3">
          Selecione um tamanho para adicionar ao carrinho
        </p>
      )}
    </div>
  )
}
