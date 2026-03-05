'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AddToCartButton from './AddToCartButton'
import ProductSizeSelector from './ProductSizeSelector'
import { useCartStore } from '@/lib/store'
import { isSupplierInternacional } from '@/lib/import-tax'
import { FiShoppingBag, FiMinus, FiPlus } from 'react-icons/fi'
import toast from 'react-hot-toast'

// ========================================
// 🌍 MAPA DE TRADUÇÕES INGLÊS → PORTUGUÊS
// ========================================
const TRANSLATIONS: Record<string, string> = {
  // Nomes de propriedades
  'Color': 'Cor',
  'color': 'Cor',
  'Size': 'Tamanho',
  'size': 'Tamanho',
  'Ships From': 'Envia De',
  'Ship From': 'Envia De',
  'ships from': 'Envia De',
  'ship from': 'Envia De',
  'Shoe Size': 'Tamanho do Sapato',
  'shoe size': 'Tamanho do Sapato',
  'Bundle': 'Kit',
  'bundle': 'Kit',
  'Style': 'Estilo',
  'style': 'Estilo',
  'Length': 'Comprimento',
  'length': 'Comprimento',
  'Material': 'Material',
  'material': 'Material',
  'Pattern': 'Padrão',
  'pattern': 'Padrão',
  'Type': 'Tipo',
  'type': 'Tipo',
  'Model': 'Modelo',
  'model': 'Modelo',
  'Version': 'Versão',
  'version': 'Versão',
  'Quantity': 'Quantidade',
  'quantity': 'Quantidade',
  'Package': 'Pacote',
  'package': 'Pacote',
  'Plug Type': 'Tipo de Plugue',
  'plug type': 'Tipo de Plugue',
  'Power': 'Potência',
  'power': 'Potência',
  'Voltage': 'Voltagem',
  'voltage': 'Voltagem',
  
  // Valores de opções - Países/Locais
  'China': 'China',
  'China Mainland': 'China',
  'CN': 'China',
  'United States': 'Estados Unidos',
  'US': 'Estados Unidos',
  'USA': 'Estados Unidos',
  'Spain': 'Espanha',
  'ES': 'Espanha',
  'Poland': 'Polônia',
  'PL': 'Polônia',
  'France': 'França',
  'FR': 'França',
  'Germany': 'Alemanha',
  'DE': 'Alemanha',
  'Italy': 'Itália',
  'IT': 'Itália',
  'Russia': 'Rússia',
  'RU': 'Rússia',
  'Brazil': 'Brasil',
  'BR': 'Brasil',
  'Australia': 'Austrália',
  'AU': 'Austrália',
  'United Kingdom': 'Reino Unido',
  'UK': 'Reino Unido',
  'Japan': 'Japão',
  'JP': 'Japão',
  'Korea': 'Coreia',
  'KR': 'Coreia',
  'Turkey': 'Turquia',
  'TR': 'Turquia',
  'Belgium': 'Bélgica',
  'BE': 'Bélgica',
  'Czech Republic': 'República Tcheca',
  'CZ': 'República Tcheca',
  'Saudi Arabia': 'Arábia Saudita',
  'SA': 'Arábia Saudita',
  'Thailand': 'Tailândia',
  'TH': 'Tailândia',
  
  // Valores de opções - Cores comuns
  'White': 'Branco',
  'white': 'Branco',
  'Black': 'Preto',
  'black': 'Preto',
  'Red': 'Vermelho',
  'red': 'Vermelho',
  'Blue': 'Azul',
  'blue': 'Azul',
  'Green': 'Verde',
  'green': 'Verde',
  'Yellow': 'Amarelo',
  'yellow': 'Amarelo',
  'Purple': 'Roxo',
  'purple': 'Roxo',
  'Pink': 'Rosa',
  'pink': 'Rosa',
  'Orange': 'Laranja',
  'orange': 'Laranja',
  'gray': 'Cinza',
  'Grey': 'Cinza',
  'grey': 'Cinza',
  'Gray': 'Cinza',
  'Brown': 'Marrom',
  'brown': 'Marrom',
  'Beige': 'Bege',
  'beige': 'Bege',
  'Navy': 'Azul Marinho',
  'navy': 'Azul Marinho',
  'Navy Blue': 'Azul Marinho',
  'Khaki': 'Cáqui',
  'khaki': 'Cáqui',
  'Gold': 'Dourado',
  'gold': 'Dourado',
  'Silver': 'Prata',
  'silver': 'Prata',
  'Rose Gold': 'Rosé',
  'rose gold': 'Rosé',
  'Champagne': 'Champanhe',
  'champagne': 'Champanhe',
  'Light Blue': 'Azul Claro',
  'Dark Blue': 'Azul Escuro',
  'Light Green': 'Verde Claro',
  'Dark Green': 'Verde Escuro',
  'Light Gray': 'Cinza Claro',
  'Dark Gray': 'Cinza Escuro',
  'Multicolor': 'Multicolor',
  'multicolor': 'Multicolor',
  'Transparent': 'Transparente',
  'transparent': 'Transparente',
  'Clear': 'Transparente',
  'clear': 'Transparente',
  
  // Valores de opções - Materiais
  'Cotton': 'Algodão',
  'cotton': 'Algodão',
  'Polyester': 'Poliéster',
  'polyester': 'Poliéster',
  'Leather': 'Couro',
  'leather': 'Couro',
  'PU Leather': 'Couro Sintético',
  'Silk': 'Seda',
  'silk': 'Seda',
  'Wool': 'Lã',
  'wool': 'Lã',
  'Linen': 'Linho',
  'linen': 'Linho',
  'Nylon': 'Nylon',
  'nylon': 'Nylon',
  'Velvet': 'Veludo',
  'velvet': 'Veludo',
  'Denim': 'Jeans',
  'denim': 'Jeans',
  'Rubber': 'Borracha',
  'rubber': 'Borracha',
  'Plastic': 'Plástico',
  'plastic': 'Plástico',
  'Metal': 'Metal',
  'metal': 'Metal',
  'Wood': 'Madeira',
  'wood': 'Madeira',
  'Glass': 'Vidro',
  'glass': 'Vidro',
  'Stainless Steel': 'Aço Inox',
  'stainless steel': 'Aço Inox',
  
  // Valores de opções - Tamanhos comuns
  'Small': 'Pequeno',
  'small': 'Pequeno',
  'Medium': 'Médio',
  'medium': 'Médio',
  'Large': 'Grande',
  'large': 'Grande',
  'X-Large': 'Extra Grande',
  'Extra Large': 'Extra Grande',
  'X-Small': 'Extra Pequeno',
  'Extra Small': 'Extra Pequeno',
  'One Size': 'Tamanho Único',
  'one size': 'Tamanho Único',
  'Free Size': 'Tamanho Único',
  'free size': 'Tamanho Único',
  
  // Outros termos comuns
  'Default': 'Padrão',
  'default': 'Padrão',
  'Standard': 'Padrão',
  'standard': 'Padrão',
  'None': 'Nenhum',
  'none': 'Nenhum',
  'With': 'Com',
  'with': 'Com',
  'Without': 'Sem',
  'without': 'Sem',
  'Set': 'Conjunto',
  'set': 'Conjunto',
  'Pair': 'Par',
  'pair': 'Par',
  'Pack': 'Pacote',
  'pack': 'Pacote',
  'Box': 'Caixa',
  'box': 'Caixa',
  'Piece': 'Unidade',
  'piece': 'Unidade',
  'Pieces': 'Unidades',
  'pieces': 'Unidades',
  'EU Plug': 'Plug EU',
  'US Plug': 'Plug US',
  'UK Plug': 'Plug UK',
  'AU Plug': 'Plug AU',
  'BR Plug': 'Plug BR',
}

// Função para traduzir texto
function translateText(text: string): string {
  if (!text) return text
  
  // Verifica tradução direta
  if (TRANSLATIONS[text]) {
    return TRANSLATIONS[text]
  }
  
  // Tenta traduzir partes do texto (ex: "White Velvet" → "Branco Veludo")
  let translated = text
  for (const [en, pt] of Object.entries(TRANSLATIONS)) {
    if (translated.toLowerCase().includes(en.toLowerCase())) {
      const regex = new RegExp(en, 'gi')
      translated = translated.replace(regex, pt)
    }
  }
  
  return translated
}

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

// Novo formato multi-nível
interface MultiLevelData {
  properties: {
    id: string
    name: string
    type: string
    options: {
      id: string
      value: string
      label: string
      image?: string
    }[]
  }[]
  variants: {
    skuId: string
    stock: number
    price?: number
    available: boolean
    image?: string
    properties: {
      name: string
      value: string
      propertyId: string
      optionId: string
      image?: string
    }[]
  }[]
}

interface ProductSelectionWrapperProps {
  product: any
  variants: Variant[] | null
  multiLevelData?: MultiLevelData | null
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
  multiLevelData,
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
  // Estado para seleções multi-nível: { propertyId: optionValue }
  const [multiSelections, setMultiSelections] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState(1)
  const router = useRouter()
  const addItem = useCartStore((state) => state.addItem)

  // Determinar se usa multi-nível (quando há mais de 2 propriedades ou estrutura multi-nível)
  const useMultiLevel = multiLevelData && multiLevelData.properties.length > 2

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
  } else if (hasVariants && !effectiveSelectedSize) {
    // Produto só com cores (sem tamanho definido) - pegar todas as cores únicas
    const colorsWithStock = variants
      .filter(v => v.stock > 0)
      .map(v => ({
        name: v.color,
        hex: v.colorHex || '#808080',
        stock: v.stock
      }))
    
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
  
  // ============================================
  // LÓGICA MULTI-NÍVEL (para produtos com 3+ propriedades)
  // ============================================
  
  // Handler para seleção multi-nível
  const handleMultiSelect = (propertyId: string, optionValue: string) => {
    setMultiSelections(prev => ({ ...prev, [propertyId]: optionValue }))
    setQuantity(1)
  }

  // Encontrar SKU multi-nível selecionado
  let multiLevelSelectedVariant: MultiLevelData['variants'][0] | null = null
  let multiLevelStock = 0
  let multiLevelSkuId: string | null = null

  if (useMultiLevel && multiLevelData) {
    // Verificar se todas as propriedades foram selecionadas
    const allSelected = multiLevelData.properties.every(p => multiSelections[p.id])
    
    if (allSelected) {
      // Buscar SKU que corresponde a todas as seleções
      multiLevelSelectedVariant = multiLevelData.variants.find(v => {
        return v.properties.every(prop => {
          const selectedValue = multiSelections[prop.propertyId]
          return selectedValue === prop.value
        })
      }) || null
      
      if (multiLevelSelectedVariant) {
        multiLevelStock = multiLevelSelectedVariant.stock
        multiLevelSkuId = multiLevelSelectedVariant.skuId
      }
    }
  }

  // Opções disponíveis para cada propriedade no multi-nível (filtradas por seleções anteriores)
  const getAvailableOptionsForProperty = (propertyId: string): { id: string, value: string, label: string, image?: string, available: boolean }[] => {
    if (!multiLevelData) return []
    
    const property = multiLevelData.properties.find(p => p.id === propertyId)
    if (!property) return []

    // Filtrar variantes baseado nas seleções anteriores
    const propertyIndex = multiLevelData.properties.findIndex(p => p.id === propertyId)
    const previousProperties = multiLevelData.properties.slice(0, propertyIndex)
    
    // SKUs que correspondem às seleções anteriores
    const matchingVariants = multiLevelData.variants.filter(v => {
      return previousProperties.every(pp => {
        const selected = multiSelections[pp.id]
        if (!selected) return true // Se não selecionou ainda, aceita todas
        const propValue = v.properties.find(vp => vp.propertyId === pp.id)
        return propValue?.value === selected
      })
    })

    // Valores únicos disponíveis para esta propriedade
    const availableValues = new Set<string>()
    matchingVariants.forEach(v => {
      const prop = v.properties.find(vp => vp.propertyId === propertyId)
      if (prop && v.stock > 0) {
        availableValues.add(prop.value)
      }
    })

    return property.options.map(opt => ({
      ...opt,
      available: availableValues.has(opt.label || opt.value)
    }))
  }

  // Verificar quantas propriedades foram selecionadas (multi-nível)
  const multiLevelSelectionsCount = Object.keys(multiSelections).length
  const multiLevelTotalProperties = multiLevelData?.properties.length || 0
  const allMultiLevelSelected = useMultiLevel && multiLevelSelectionsCount === multiLevelTotalProperties
  
  // Verifica se precisa selecionar tamanho (não precisa se só tem um e já está auto-selecionado)
  const hasSizes = hasVariants || (sizes && sizes.length > 0)
  const needsSizeSelection = availableSizes.length > 1 // Só precisa selecionar se tiver mais de 1 opção
  
  // Obter estoque da variante selecionada ou do produto
  let currentStock = product.stock || 0
  let selectedVariant: Variant | null = null
  let effectiveSkuId: string | null = null
  
  // MULTI-NÍVEL: Se está usando multi-nível, usar esses valores
  if (useMultiLevel && allMultiLevelSelected && multiLevelSelectedVariant) {
    currentStock = multiLevelStock
    effectiveSkuId = multiLevelSkuId
  } else if (hasVariants && effectiveSelectedSize && selectedColor) {
    // Buscar variante por size + color
    selectedVariant = variants.find(v => v.size === effectiveSelectedSize && v.color === selectedColor) || null
    
    // Se não encontrou e só tem cor (size = "Único"), buscar apenas por cor
    if (!selectedVariant && effectiveSelectedSize === 'Único') {
      selectedVariant = variants.find(v => v.color === selectedColor) || null
    }
    
    currentStock = selectedVariant?.stock || 0
    effectiveSkuId = selectedVariant?.skuId || null
    
    console.log('🔍 Buscando variante:', { size: effectiveSelectedSize, color: selectedColor })
    console.log('✅ selectedVariant encontrado:', selectedVariant ? { skuId: selectedVariant.skuId, color: selectedVariant.color } : null)
  } else if (hasVariants && selectedColor && !effectiveSelectedSize) {
    // Produto só com cor, sem tamanho - buscar apenas por cor
    selectedVariant = variants.find(v => v.color === selectedColor) || null
    currentStock = selectedVariant?.stock || 0
    effectiveSkuId = selectedVariant?.skuId || null
    console.log('🎨 Produto só com cor - selectedVariant:', selectedVariant ? { skuId: selectedVariant.skuId } : null)
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
    const skuIdToCheck = effectiveSkuId || selectedVariant?.skuId
    
    // Se tem SKU selecionado, buscar preço customizado (com margem aplicada)
    if (skuIdToCheck && selectedSkus.length > 0) {
      const skuConfig = selectedSkus.find(s => s.skuId === skuIdToCheck)
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
  // Para cor: precisa selecionar se tiver cores disponíveis
  const needsColorSelection = !useMultiLevel && hasVariants && availableColors.length > 0 && !selectedColor
  const needsVariantButNotSelected = !useMultiLevel && hasVariants && !selectedVariant // Tem variantes mas nenhuma selecionada
  const needsMultiLevelSelection = useMultiLevel && !allMultiLevelSelected
  
  const isDisabled = currentStock === 0 || 
    (needsSizeSelection && !selectedSize && !useMultiLevel) ||
    needsColorSelection ||
    needsVariantButNotSelected ||
    needsMultiLevelSelection ||
    !hasStock ||
    quantity > currentStock
  
  console.log('🚫 isDisabled:', isDisabled, { 
    needsSizeSelection, selectedSize, 
    needsColorSelection, 
    needsVariantButNotSelected,
    needsMultiLevelSelection,
    useMultiLevel,
    hasStock, currentStock 
  })

  // Função Comprar Agora
  const handleBuyNow = () => {
    if (isDisabled) {
      if (currentStock === 0) {
        toast.error('Produto esgotado!')
      } else if (needsMultiLevelSelection) {
        toast.error('Por favor, selecione todas as opções!')
      } else if (needsSizeSelection && !selectedSize) {
        toast.error('Por favor, selecione um tamanho!')
      } else if (needsColorSelection) {
        toast.error('Por favor, selecione uma cor!')
      } else if (needsVariantButNotSelected) {
        toast.error('Por favor, selecione cor e modelo!')
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

    // Construir descrição das seleções para multi-nível
    let selectionDescription = ''
    if (useMultiLevel && multiLevelData) {
      selectionDescription = multiLevelData.properties
        .map(p => `${p.name}: ${multiSelections[p.id]}`)
        .join(' | ')
    }
    
    // Adicionar ao carrinho com quantidade selecionada
    console.log('🛒 ADICIONANDO AO CARRINHO:')
    console.log('   selectedColor:', selectedColor)
    console.log('   effectiveSelectedSize:', effectiveSelectedSize)
    console.log('   selectedVariant:', selectedVariant)
    console.log('   skuId:', effectiveSkuId || selectedVariant?.skuId)
    console.log('   multiLevelSelections:', multiSelections)
    
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: currentPrice,  // Usar preço do SKU selecionado
      image: product.images[0] || '/placeholder.jpg',
      quantity: quantity,
      selectedColor: useMultiLevel ? selectionDescription : (selectedColor || null),
      selectedSize: useMultiLevel ? null : (effectiveSelectedSize || null),
      skuId: effectiveSkuId || selectedVariant?.skuId || null,  // SUB-SKU do fornecedor
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
      {/* SELETORES MULTI-NÍVEL (para produtos com 3+ propriedades) */}
      {useMultiLevel && multiLevelData && (
        <>
          {multiLevelData.properties.map((property, propIndex) => {
            const options = getAvailableOptionsForProperty(property.id)
            const selectedValue = multiSelections[property.id]
            
            // Só mostra se é a primeira propriedade ou se as anteriores já foram selecionadas
            const previousPropertiesSelected = multiLevelData.properties
              .slice(0, propIndex)
              .every(p => multiSelections[p.id])
            
            if (propIndex > 0 && !previousPropertiesSelected) return null

            return (
              <div key={property.id} className="mb-6">
                <h3 className="font-semibold text-lg mb-3 capitalize">
                  {translateText(property.name)}
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({options.filter(o => o.available).length} Disponíveis)
                  </span>
                </h3>
                <div className="flex flex-wrap gap-3">
                  {options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => option.available && handleMultiSelect(property.id, option.label || option.value)}
                      disabled={!option.available}
                      className={`flex items-center gap-2 px-4 py-3 border-2 rounded-lg transition-all ${
                        selectedValue === (option.label || option.value)
                          ? 'border-primary-600 bg-primary-600 text-white'
                          : option.available
                            ? 'border-gray-300 bg-white text-gray-800 hover:border-primary-600'
                            : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {option.image && (
                        <img 
                          src={option.image} 
                          alt={translateText(option.label || option.value)}
                          className="w-8 h-8 rounded object-cover"
                        />
                      )}
                      <span className="font-medium">{translateText(option.label || option.value)}</span>
                    </button>
                  ))}
                </div>
                {!selectedValue && (
                  <p className="text-sm text-red-500 mt-2">* Selecione {translateText(property.name).toLowerCase()}</p>
                )}
              </div>
            )
          })}
        </>
      )}

      {/* SELETORES LEGADO (para produtos com até 2 propriedades) */}
      {!useMultiLevel && (
        <>
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
        </>
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
          selectedColor={useMultiLevel ? Object.values(multiSelections).join(' | ') : selectedColor}
          selectedSize={useMultiLevel ? null : selectedSize}
          quantity={quantity}
          variantStock={currentStock}
          skuId={effectiveSkuId || selectedVariant?.skuId || null}
        />

        {/* Botão Continuar Comprando */}
        <button
          onClick={async () => {
            // Pegar categoria pai (se existir) ou a própria categoria
            const parentCategory = product?.category?.parent
            const currentCategory = product?.category
            
            // Usar categoria pai se existir, senão usar a atual
            const targetCategory = parentCategory || currentCategory
            const categoryId = targetCategory?.id || product?.categoryId
            const categorySlug = targetCategory?.slug || currentCategory?.slug
            
            if (!categoryId || !categorySlug) {
              router.push('/')
              return
            }
            
            try {
              // Verificar quantos produtos tem na categoria pai
              const response = await fetch(`/api/categories/${categoryId}/products/count`)
              const data = await response.json()
              
              // Se tiver mais de 1 produto na categoria, vai para a categoria
              // Caso contrário, vai para home
              if (data.count && data.count > 1) {
                router.push(`/categorias/${categorySlug}`)
              } else {
                router.push('/')
              }
            } catch (error) {
              // Em caso de erro, vai para home
              router.push('/')
            }
          }}
          className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition flex items-center justify-center space-x-2 font-medium border border-gray-300"
        >
          <FiShoppingBag size={18} />
          <span>Continuar Comprando</span>
        </button>
      </div>
    </>
  )
}
