'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AddToCartButton from './AddToCartButton'
import ProductSizeSelector from './ProductSizeSelector'
import ShippingCalculator from './ShippingCalculator'
import { useCartStore } from '@/lib/store'
import { FiShoppingBag, FiMinus, FiPlus } from 'react-icons/fi'
import toast from 'react-hot-toast'

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
  const [quantity, setQuantity] = useState(1)
  const router = useRouter()
  const addItem = useCartStore((state) => state.addItem)

  // Notificar mudança de cor para componente pai
  const handleColorChange = (color: string | null) => {
    setSelectedColor(color)
    setQuantity(1) // Reset quantidade ao trocar cor
    if (onColorChange) {
      onColorChange(color)
    }
  }

  // Resetar quantidade ao trocar tamanho
  const handleSizeChange = (size: string) => {
    setSelectedSize(size)
    setSelectedColor(null) // Reset cor ao trocar tamanho
    setQuantity(1) // Reset quantidade
  }

  console.log('🎨 ProductSelectionWrapper - variants:', variants)
  console.log('📏 ProductSelectionWrapper - sizes:', sizes)

  // Verifica se precisa selecionar cor (produtos com variants)
  const hasVariants = variants && variants.length > 0 && variants.some(v => v.color)
  
  console.log('✅ hasVariants:', hasVariants)
  
  // Se tem variants, primeiro pegar todos os tamanhos únicos (COM ESTOQUE)
  let availableSizes: string[] = []
  if (hasVariants) {
    availableSizes = Array.from(new Set(
      variants
        .filter(v => v.stock > 0) // Apenas tamanhos com estoque
        .map(v => v.size)
        .filter(Boolean)
    ))
  } else if (sizes && sizes.length > 0) {
    availableSizes = sizes.filter(s => !s.stock || s.stock > 0).map(s => s.size)
  }

  // Se já selecionou tamanho, pegar cores disponíveis para aquele tamanho (APENAS COM ESTOQUE)
  let availableColors: { name: string, hex: string, stock: number }[] = []
  if (hasVariants && selectedSize) {
    const colorsWithStock = variants
      .filter(v => v.size === selectedSize && v.stock > 0)
      .map(v => ({
        name: v.color,
        hex: v.colorHex || '#808080',
        stock: v.stock
      }))
    
    // Remover duplicatas por nome de cor
    const uniqueColorMap = new Map<string, { name: string, hex: string, stock: number }>()
    colorsWithStock.forEach(c => {
      if (!uniqueColorMap.has(c.name)) {
        uniqueColorMap.set(c.name, c)
      }
    })
    availableColors = Array.from(uniqueColorMap.values())
  }
  
  console.log('📦 availableSizes:', availableSizes)
  console.log('🎨 availableColors:', availableColors)
  
  // Verifica se precisa selecionar tamanho
  const hasSizes = hasVariants || (sizes && sizes.length > 0)
  
  // Obter estoque da variante selecionada ou do produto
  let currentStock = product.stock || 0
  let selectedVariant: Variant | null = null
  
  if (hasVariants && selectedSize && selectedColor) {
    selectedVariant = variants.find(v => v.size === selectedSize && v.color === selectedColor) || null
    currentStock = selectedVariant?.stock || 0
  } else if (hasSizes && selectedSize && !hasVariants && sizes) {
    const sizeItem = sizes.find(s => s.size === selectedSize)
    currentStock = sizeItem?.stock || product.stock || 0
  }
  
  // Verifica se a combinação selecionada tem estoque
  const hasStock = currentStock > 0
  
  // Controle de quantidade baseado no estoque da variante
  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1)
  }

  const increaseQuantity = () => {
    if (quantity < currentStock) setQuantity(quantity + 1)
  }
  
  // Desabilita o botão se faltar seleção OU não tiver estoque OU quantidade > estoque
  const isDisabled = currentStock === 0 || 
    (hasSizes && !selectedSize) ||
    (hasVariants && !selectedColor) ||
    !hasStock ||
    quantity > currentStock

  // Função Comprar Agora
  const handleBuyNow = () => {
    if (isDisabled) {
      if (currentStock === 0) {
        toast.error('Produto esgotado!')
      } else if (hasSizes && !selectedSize) {
        toast.error('Por favor, selecione um tamanho!')
      } else if (hasVariants && !selectedColor) {
        toast.error('Por favor, selecione uma cor!')
      } else {
        toast.error('Por favor, selecione cor e tamanho!')
      }
      return
    }

    // Adicionar ao carrinho com quantidade selecionada
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0] || '/placeholder.jpg',
      quantity: quantity,
      selectedColor: selectedColor || null,
      selectedSize: selectedSize || null,
      stock: currentStock, // Usar o estoque da variante selecionada
      slug: product.slug,
    })

    // Redirecionar para checkout
    router.push('/checkout')
  }

  return (
    <>
      {/* Calculadora de Frete - Agora no topo */}
      <div className="mb-6">
        <ShippingCalculator 
          productId={product.id}
          cartValue={product.price * quantity}
        />
      </div>

      {/* Seletor de Tamanhos */}
      {availableSizes.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-3">Tamanhos Disponíveis</h3>
          <div className="flex flex-wrap gap-3">
            {availableSizes.map((size) => (
              <button
                key={size}
                onClick={() => handleSizeChange(size)}
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

      {/* Seletor de Quantidade */}
      <div className="mt-6 mb-4">
        <h3 className="font-semibold text-sm mb-2">Quantidade</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center border-2 rounded-lg">
            <button
              onClick={decreaseQuantity}
              disabled={quantity <= 1}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <FiMinus />
            </button>
            <span className="px-6 py-2 font-semibold text-lg min-w-[60px] text-center">
              {quantity}
            </span>
            <button
              onClick={increaseQuantity}
              disabled={quantity >= currentStock || currentStock === 0}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <FiPlus />
            </button>
          </div>
          <span className="text-sm text-gray-500">
            {hasVariants && selectedSize && selectedColor 
              ? `${currentStock} disponível(is) para ${selectedSize} - ${selectedColor}`
              : hasSizes && selectedSize && !hasVariants
                ? `${currentStock} disponível(is) para ${selectedSize}`
                : hasVariants && !selectedSize
                  ? 'Selecione tamanho e cor'
                  : hasVariants && !selectedColor
                    ? 'Selecione uma cor'
                    : `${currentStock} disponível(is)`}
          </span>
        </div>
      </div>

      {/* Botões de Compra */}
      <div className="space-y-3 mt-6">
        {/* Botão Comprar Agora */}
        <button
          onClick={handleBuyNow}
          disabled={isDisabled}
          className="w-full bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 transition flex items-center justify-center space-x-2 text-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <FiShoppingBag size={24} />
          <span>{currentStock === 0 && selectedSize && selectedColor ? 'Esgotado' : 'Comprar Agora'}</span>
        </button>

        {/* Botão Adicionar ao Carrinho */}
        <AddToCartButton 
          product={product} 
          disabled={isDisabled}
          selectedColor={selectedColor}
          selectedSize={selectedSize}
          quantity={quantity}
          variantStock={currentStock}
        />
      </div>
    </>
  )
}
