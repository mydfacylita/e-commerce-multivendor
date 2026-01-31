'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AddToCartButton from './AddToCartButton'
import ProductSizeSelector from './ProductSizeSelector'
import ShippingCalculator from './ShippingCalculator'
import { useCartStore } from '@/lib/store'
import { isSupplierInternacional } from '@/lib/import-tax'
import { FiShoppingBag, FiMinus, FiPlus } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface Variant {
  size: string
  color: string
  colorHex: string
  stock: number
  price?: number
  skuId?: string  // Adicionado para mapear com selectedSkus
}

interface Size {
  size: string
  stock?: number
  price?: number
  sku?: string
}

interface SelectedSku {
  skuId: string
  enabled: boolean
  customStock?: number
  customPrice?: number
  margin?: number
  costPrice?: number
}

interface ProductSelectionWrapperProps {
  product: any
  variants: Variant[] | null
  sizes: Size[] | null
  sizeType?: string
  sizeCategory?: string
  onColorChange?: (color: string | null) => void
  selectedSkus?: SelectedSku[]  // SKUs com preços personalizados
  onPriceChange?: (price: number) => void  // Callback para atualizar preço
  onStockChange?: (stock: number) => void  // Callback para atualizar estoque
}

export default function ProductSelectionWrapper({ 
  product, 
  variants, 
  sizes,
  sizeType = 'adult',
  sizeCategory = 'shoes',
  onColorChange,
  selectedSkus = [],
  onPriceChange,
  onStockChange
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
  
  // Se só tem um tamanho ou é "Único", auto-selecionar
  const autoSelectedSize = availableSizes.length === 1 ? availableSizes[0] : null
  const effectiveSelectedSize = selectedSize || autoSelectedSize

  // Se já selecionou tamanho (ou auto-selecionou), pegar cores disponíveis (APENAS COM ESTOQUE)
  let availableColors: { name: string, hex: string, stock: number }[] = []
  if (hasVariants && effectiveSelectedSize) {
    const colorsWithStock = variants
      .filter(v => v.size === effectiveSelectedSize && v.stock > 0)
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
  console.log('🔄 effectiveSelectedSize:', effectiveSelectedSize)
  
  // Verifica se precisa selecionar tamanho (não precisa se só tem um e já está auto-selecionado)
  const hasSizes = hasVariants || (sizes && sizes.length > 0)
  const needsSizeSelection = availableSizes.length > 1 // Só precisa selecionar se tiver mais de 1 opção
  
  // Obter estoque da variante selecionada ou do produto
  let currentStock = product.stock || 0
  let selectedVariant: Variant | null = null
  
  if (hasVariants && effectiveSelectedSize && selectedColor) {
    selectedVariant = variants.find(v => v.size === effectiveSelectedSize && v.color === selectedColor) || null
    currentStock = selectedVariant?.stock || 0
  } else if (hasSizes && effectiveSelectedSize && !hasVariants && sizes) {
    const sizeItem = sizes.find(s => s.size === effectiveSelectedSize)
    currentStock = sizeItem?.stock || product.stock || 0
  }
  
  // Calcular preço baseado no SKU selecionado
  // Prioridade: 
  //   1) selectedSkus com customPrice (preço de VENDA com margem)
  //   2) product.price fixo (fallback seguro)
  // NUNCA usar variant.price pois é o preço de CUSTO do fornecedor!
  const getCurrentPrice = (): number => {
    // Se tem SKU selecionado, buscar preço customizado (com margem aplicada)
    if (selectedVariant?.skuId && selectedSkus.length > 0) {
      const skuConfig = selectedSkus.find(s => s.skuId === selectedVariant.skuId)
      if (skuConfig?.customPrice) {
        return skuConfig.customPrice
      }
    }
    
    // Para produtos nacionais (sem selectedSkus), pode ter preço na variante
    // Mas só se NÃO for produto importado (identificado por ter selectedSkus configurados)
    if (selectedSkus.length === 0 && selectedVariant?.price) {
      return selectedVariant.price
    }
    
    // Preço padrão do produto (sempre seguro)
    return product.price
  }
  
  const currentPrice = getCurrentPrice()
  
  // Atualizar preço no componente pai quando a seleção muda
  useEffect(() => {
    if (onPriceChange) {
      onPriceChange(currentPrice)
    }
  }, [currentPrice, onPriceChange])
  
  // Atualizar estoque no componente pai quando a seleção muda
  useEffect(() => {
    if (onStockChange) {
      onStockChange(currentStock)
    }
  }, [currentStock, onStockChange])
  
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
  // Para tamanho: só precisa selecionar se tiver mais de uma opção
  const isDisabled = currentStock === 0 || 
    (needsSizeSelection && !selectedSize) ||
    (hasVariants && availableColors.length > 0 && !selectedColor) ||
    !hasStock ||
    quantity > currentStock

  // Função Comprar Agora
  const handleBuyNow = () => {
    if (isDisabled) {
      if (currentStock === 0) {
        toast.error('Produto esgotado!')
      } else if (needsSizeSelection && !selectedSize) {
        toast.error('Por favor, selecione um tamanho!')
      } else if (hasVariants && availableColors.length > 0 && !selectedColor) {
        toast.error('Por favor, selecione uma cor!')
      } else {
        toast.error('Por favor, selecione as opções!')
      }
      return
    }

    // Verificar se é de fornecedor internacional (para fluxo/exibição)
    const shipFromCountry = product.shipFromCountry || null
    const isInternationalSupplier = Boolean(product.supplierId) && 
      isSupplierInternacional(product.supplier?.type)
    
    // Para impostos: só TRUE se é internacional E não vem do Brasil
    const isImported = isInternationalSupplier && shipFromCountry?.toUpperCase() !== 'BR'
    
    // Determinar tipo do item para roteamento
    let itemType: 'ADM' | 'DROP' | 'SELLER' = 'ADM'
    if (product.sellerId) {
      itemType = product.isDropshipping ? 'DROP' : 'SELLER'
    } else if (isInternationalSupplier) {
      itemType = 'DROP' // Produto de fornecedor internacional vai para DROP
    }
    
    // Adicionar ao carrinho com quantidade selecionada
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: currentPrice,  // Usar preço do SKU selecionado
      image: product.images[0] || '/placeholder.jpg',
      quantity: quantity,
      selectedColor: selectedColor || null,
      selectedSize: effectiveSelectedSize || null,
      skuId: selectedVariant?.skuId || null,  // SUB-SKU do fornecedor
      stock: currentStock, // Usar o estoque da variante selecionada
      slug: product.slug,
      isImported: isImported,  // Para cálculo de impostos no checkout
      isInternationalSupplier: isInternationalSupplier,  // Para fluxo/exibição
      supplierId: product.supplierId || null,
      sellerId: product.sellerId || null,
      sellerCep: product.seller?.cep || null,
      itemType: itemType,
      shipFromCountry: shipFromCountry,
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

      {/* Seletor de Tamanhos - só mostra se tiver mais de uma opção */}
      {availableSizes.length > 1 && (
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-3">Tamanhos Disponíveis</h3>
          <div className="flex flex-wrap gap-3">
            {availableSizes.map((size) => (
              <button
                key={size}
                onClick={() => handleSizeChange(size)}
                className={`px-6 py-3 border-2 rounded-lg font-semibold transition-all ${
                  effectiveSelectedSize === size
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-gray-300 bg-white text-gray-800 hover:border-primary-600'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
          {!effectiveSelectedSize && (
            <p className="text-sm text-red-500 mt-2">* Selecione um tamanho</p>
          )}
        </div>
      )}

      {/* Seletor de Cores - mostra se tem cores e tamanho está selecionado (ou auto-selecionado) */}
      {hasVariants && effectiveSelectedSize && availableColors.length > 0 && (
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
          {!selectedColor && availableColors.length > 0 && (
            <p className="text-sm text-red-500 mt-2">* Selecione uma cor</p>
          )}
          {effectiveSelectedSize && availableColors.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Nenhuma cor disponível para o tamanho {effectiveSelectedSize}. Selecione outro tamanho.
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
