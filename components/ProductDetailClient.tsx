'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
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

interface SellerStats {
  averageRating: number
  totalReviews: number
  totalProducts: number
  totalSales: number
  memberSince: string
}

interface SellerInfo {
  id: string
  storeName: string
  storeSlug: string
  storeDescription?: string | null
  storeLogo?: string | null
  status: string
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
  seller?: SellerInfo | null
  sellerStats?: SellerStats | null
}

export default function ProductDetailClient({ 
  product, 
  variants,
  multiLevelData,
  processedSpecs,
  processedAttrs,
  selectedSkus = [],
  seller,
  sellerStats
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

        {/* Informações do Vendedor */}
        {seller && (
          <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100">
            <h3 className="font-semibold text-sm text-gray-500 mb-3">🏪 Vendido por</h3>
            <div className="flex items-center gap-3">
              {/* Logo/Avatar do Vendedor */}
              <div className="flex-shrink-0">
                {seller.storeLogo ? (
                  <Image
                    src={seller.storeLogo}
                    alt={seller.storeName}
                    width={48}
                    height={48}
                    className="rounded-lg object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-lg font-bold">
                    {seller.storeName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              {/* Info do Vendedor */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link 
                    href={`/loja/${seller.storeSlug}`}
                    className="font-bold text-gray-900 hover:text-primary-600 transition-colors"
                  >
                    {seller.storeName}
                  </Link>
                  {seller.status === 'ACTIVE' && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verificado
                    </span>
                  )}
                </div>
                
                {/* Estatísticas compactas */}
                {sellerStats && (
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="font-semibold text-gray-700">
                        {sellerStats.averageRating > 0 ? sellerStats.averageRating.toFixed(1) : '-'}
                      </span>
                      <span>({sellerStats.totalReviews})</span>
                    </span>
                    <span className="text-gray-300">|</span>
                    <span>{sellerStats.totalProducts} produtos</span>
                    <span className="text-gray-300">|</span>
                    <span>{sellerStats.totalSales} vendas</span>
                  </div>
                )}
              </div>
              
              {/* Botão Ver Loja */}
              <Link
                href={`/loja/${seller.storeSlug}`}
                className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                Ver loja
              </Link>
            </div>
          </div>
        )}

        {/* Garantias */}
        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <h3 className="font-semibold text-sm text-gray-500 mb-3">🛡️ Garantias</h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <span className="text-green-500">✓</span>
              <span>Dinheiro de volta</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-green-500">✓</span>
              <span>Suporte pós-venda</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-green-500">✓</span>
              <span>Garantia de fábrica</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-green-500">✓</span>
              <span>Compra 100% segura</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
