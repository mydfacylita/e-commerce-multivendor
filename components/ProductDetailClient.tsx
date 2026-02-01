'use client'

import { useState, useMemo } from 'react'
import ProductImageGallery from './ProductImageGallery'
import ProductSelectionWrapper from './ProductSelectionWrapper'
import ProductInfoTabs from './ProductInfoTabs'

// Formatar moeda brasileira
const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Limpar HTML da descrição
const cleanHtmlDescription = (html: string): string => {
  if (!html) return ''
  
  // Se for texto puro (sem tags HTML), retornar como está
  if (!/<[^>]+>/.test(html)) {
    return html
  }
  
  // Remover tags HTML mantendo o texto
  let clean = html
    .replace(/<br\s*\/?>/gi, '\n')               // Converter <br> em quebra de linha
    .replace(/<\/p>/gi, '\n\n')                   // Converter </p> em parágrafo
    .replace(/<\/li>/gi, '\n')                    // Converter </li> em quebra de linha  
    .replace(/<li[^>]*>/gi, '• ')                 // Converter <li> em bullet
    .replace(/<\/?(h[1-6]|div|ul|ol|p|span|strong|b|i|em|a|table|tr|td|th|thead|tbody)[^>]*>/gi, ' ') // Remover outras tags
    .replace(/<[^>]*>/g, '')                      // Remover qualquer tag restante
    .replace(/&nbsp;/g, ' ')                      // Substituir &nbsp;
    .replace(/&amp;/g, '&')                       // Substituir &amp;
    .replace(/&lt;/g, '<')                        // Substituir &lt;
    .replace(/&gt;/g, '>')                        // Substituir &gt;
    .replace(/&quot;/g, '"')                      // Substituir &quot;
    .replace(/&#39;/g, "'")                       // Substituir &#39;
    .replace(/\s+/g, ' ')                         // Múltiplos espaços para um
    .replace(/\n\s+/g, '\n')                      // Espaços após quebra de linha
    .replace(/\n{3,}/g, '\n\n')                   // Máximo 2 quebras de linha seguidas
    .trim()
  
  // Limitar tamanho
  if (clean.length > 500) {
    clean = clean.substring(0, 500) + '...'
  }
  
  return clean
}

interface SelectedSku {
  skuId: string
  enabled: boolean
  customStock?: number
  customPrice?: number
  margin?: number
  costPrice?: number
}

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

interface ProductDetailClientProps {
  product: any
  variants: any
  multiLevelData?: MultiLevelData | null
  processedSpecs: any
  processedAttrs: any
  selectedSkus?: SelectedSku[]
}

export default function ProductDetailClient({ 
  product, 
  variants,
  multiLevelData,
  processedSpecs,
  processedAttrs,
  selectedSkus = []
}: ProductDetailClientProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number>(product.price)
  const [currentStock, setCurrentStock] = useState<number>(product.stock || 0)
  
  // Limpar descrição HTML para exibição
  const cleanDescription = useMemo(() => {
    return cleanHtmlDescription(product.description || '')
  }, [product.description])

  // Callback para atualizar preço quando SKU muda
  const handlePriceChange = (price: number) => {
    setCurrentPrice(price)
  }

  // Callback para atualizar estoque quando SKU muda
  const handleStockChange = (stock: number) => {
    setCurrentStock(stock)
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <ProductImageGallery 
          images={product.images} 
          productName={product.name}
          selectedColor={selectedColor}
          variants={variants}
        />
        
        {/* Abas de Informações e Características */}
        <ProductInfoTabs 
          product={product}
          processedSpecs={processedSpecs}
          processedAttrs={processedAttrs}
        />
      </div>

      <div>
        <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
        <div className="flex items-center space-x-4 mb-6">
          <span className="text-4xl font-bold text-primary-600">
            {formatCurrency(currentPrice)}
          </span>
          {product.comparePrice && product.comparePrice > currentPrice && (
            <span className="text-2xl text-gray-400 line-through">
              {formatCurrency(product.comparePrice)}
            </span>
          )}
        </div>
        <div className="mb-6">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
            currentStock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {currentStock > 0 ? `${currentStock} em estoque` : 'Esgotado'}
          </span>
        </div>
        {cleanDescription && (
          <p className="text-gray-600 mb-6 whitespace-pre-line">{cleanDescription}</p>
        )}
        
        {/* Componente wrapper com seleção de cor/tamanho e botão */}
        <ProductSelectionWrapper
          product={product}
          variants={variants}
          multiLevelData={multiLevelData}
          sizes={product.sizes}
          sizeType={product.sizeType || 'adult'}
          sizeCategory={product.sizeCategory || 'shoes'}
          onColorChange={setSelectedColor}
          selectedSkus={selectedSkus}
          onPriceChange={handlePriceChange}
          onStockChange={handleStockChange}
        />
      </div>
    </div>
  )
}
