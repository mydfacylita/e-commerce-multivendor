'use client'

import { useState, useEffect, useRef } from 'react'
import { FiPrinter, FiSearch, FiPlus, FiMinus, FiTrash2, FiSettings, FiDownload } from 'react-icons/fi'
import JsBarcode from 'jsbarcode'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface Product {
  id: string
  name: string
  price: number
  comparePrice?: number
  gtin?: string
  sku?: string
  brand?: string
}

interface LabelItem {
  product: Product
  quantity: number
}

interface LabelConfig {
  showPrice: boolean
  showBarcode: boolean
  showBrand: boolean
  showSku: boolean
  showLogo: boolean
  labelSize: 'small' | 'medium' | 'large'
  columns: number
}

// Logo padrão da empresa
const COMPANY_LOGO = '/logo.png'

export default function EtiquetasProdutosPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [labelItems, setLabelItems] = useState<LabelItem[]>([])
  const [loading, setLoading] = useState(false)
  const [logoBase64, setLogoBase64] = useState<string>('')
  const [config, setConfig] = useState<LabelConfig>({
    showPrice: true,
    showBarcode: true,
    showBrand: true,
    showSku: false,
    showLogo: true,
    labelSize: 'medium',
    columns: 3
  })
  const [showConfig, setShowConfig] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  // Carregar logo como base64
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch(COMPANY_LOGO)
        const blob = await response.blob()
        const reader = new FileReader()
        reader.onloadend = () => {
          setLogoBase64(reader.result as string)
        }
        reader.readAsDataURL(blob)
      } catch (e) {
        console.log('Logo não encontrada')
      }
    }
    loadLogo()
  }, [])

  // Buscar produtos
  const searchProducts = async () => {
    if (!searchTerm.trim()) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/products/search?q=${encodeURIComponent(searchTerm)}&limit=20`)
      const data = await res.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  // Adicionar produto à lista
  const addProduct = (product: Product) => {
    const existing = labelItems.find(item => item.product.id === product.id)
    if (existing) {
      setLabelItems(items => 
        items.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      )
    } else {
      setLabelItems(items => [...items, { product, quantity: 1 }])
    }
  }

  // Remover produto da lista
  const removeProduct = (productId: string) => {
    setLabelItems(items => items.filter(item => item.product.id !== productId))
  }

  // Alterar quantidade
  const updateQuantity = (productId: string, delta: number) => {
    setLabelItems(items => 
      items.map(item => {
        if (item.product.id === productId) {
          const newQty = Math.max(1, item.quantity + delta)
          return { ...item, quantity: newQty }
        }
        return item
      })
    )
  }

  // Total de etiquetas
  const totalLabels = labelItems.reduce((sum, item) => sum + item.quantity, 0)

  // Gerar código de barras
  const generateBarcode = (code: string, elementId: string) => {
    try {
      JsBarcode(`#${elementId}`, code, {
        format: 'EAN13',
        width: 1.5,
        height: 40,
        displayValue: true,
        fontSize: 10,
        margin: 2
      })
    } catch {
      // Tentar CODE128 se EAN13 falhar
      try {
        JsBarcode(`#${elementId}`, code, {
          format: 'CODE128',
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 10,
          margin: 2
        })
      } catch (e) {
        console.error('Erro ao gerar código de barras:', e)
      }
    }
  }

  // Gerar código de barras como imagem base64
  const generateBarcodeImage = (code: string): string => {
    if (!code || code.length < 3) return ''
    
    try {
      const canvas = document.createElement('canvas')
      // Limpar código - remover caracteres não alfanuméricos
      const cleanCode = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      
      if (!cleanCode) return ''
      
      JsBarcode(canvas, cleanCode, {
        format: 'CODE128',
        width: 2,
        height: 50,
        displayValue: false,
        margin: 5,
        background: '#ffffff'
      })
      return canvas.toDataURL('image/png')
    } catch (e) {
      console.error('Erro ao gerar código de barras:', e, 'Código:', code)
      return ''
    }
  }

  // Imprimir etiquetas
  const printLabels = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const labelSizes = {
      small: { width: '50mm', height: '30mm', fontSize: '7px', priceSize: '11px', nameSize: '8px' },
      medium: { width: '60mm', height: '38mm', fontSize: '8px', priceSize: '13px', nameSize: '9px' },
      large: { width: '70mm', height: '45mm', fontSize: '9px', priceSize: '15px', nameSize: '10px' }
    }
    const size = labelSizes[config.labelSize]

    // Gerar HTML das etiquetas
    let labelsHtml = ''
    
    labelItems.forEach(item => {
      // Usar GTIN se disponível, senão usar ID do produto
      const gtin = item.product.gtin?.replace(/\D/g, '') || ''
      const barcodeCode = gtin.length >= 8 ? gtin : item.product.id.slice(-12).toUpperCase()
      
      // Gerar código de barras como imagem base64 (uma vez por produto)
      const barcodeImg = config.showBarcode ? generateBarcodeImage(barcodeCode) : ''
      const displayCode = gtin.length >= 8 ? gtin : `SKU: ${item.product.id.slice(-8).toUpperCase()}`
      
      for (let i = 0; i < item.quantity; i++) {
        labelsHtml += `
          <div class="label">
            <div class="label-header">
              <div class="header-left">
                ${config.showBrand && item.product.brand ? `<div class="brand">${item.product.brand.toUpperCase()}</div>` : ''}
              </div>
              ${config.showLogo && logoBase64 ? `<img src="${logoBase64}" class="logo" alt="Logo" />` : ''}
            </div>
            <div class="label-content">
              <div class="name">${item.product.name.substring(0, 35)}</div>
              ${config.showPrice ? `
                <div class="price-row">
                  ${item.product.comparePrice ? `<span class="old-price">R$ ${item.product.comparePrice.toFixed(2)}</span>` : ''}
                  <span class="price">R$ ${item.product.price.toFixed(2)}</span>
                </div>
              ` : ''}
              ${barcodeImg ? `
                <div class="barcode-area">
                  <img src="${barcodeImg}" alt="Código de barras" class="barcode-img" />
                  <div class="gtin">${displayCode}</div>
                </div>
              ` : ''}
            </div>
          </div>
        `
      }
    })

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiquetas de Produtos - MYDSHOP</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, Helvetica, sans-serif;
            padding: 3mm;
          }
          .labels-container {
            display: flex;
            flex-wrap: wrap;
            gap: 2mm;
          }
          .label {
            width: ${size.width};
            min-height: ${size.height};
            border: 1px dashed #999;
            padding: 2mm;
            page-break-inside: avoid;
            background: white;
          }
          .label-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1mm;
          }
          .header-left {
            flex: 1;
          }
          .logo {
            width: 15mm;
            height: auto;
            max-height: 8mm;
            object-fit: contain;
          }
          .label-content {
            display: flex;
            flex-direction: column;
            flex: 1;
          }
          .brand {
            font-size: ${size.fontSize};
            color: #333;
            font-weight: bold;
          }
          .name {
            font-size: ${size.nameSize};
            font-weight: normal;
            line-height: 1.3;
            margin-bottom: 2mm;
            word-wrap: break-word;
          }
          .price-row {
            display: flex;
            align-items: center;
            gap: 3mm;
            margin-bottom: 2mm;
          }
          .old-price {
            font-size: ${size.fontSize};
            color: #999;
            text-decoration: line-through;
          }
          .price {
            font-size: ${size.priceSize};
            font-weight: bold;
            color: #d32f2f;
          }
          .barcode-area {
            margin-top: auto;
            text-align: center;
          }
          .barcode-img {
            max-width: 100%;
            height: 35px;
          }
          .gtin {
            font-family: 'Courier New', monospace;
            font-size: 9px;
            letter-spacing: 1.5px;
            margin-top: 1mm;
          }
          @media print {
            body { padding: 0; }
            .label { border: 1px dashed #ccc; }
          }
        </style>
      </head>
      <body>
        <div class="labels-container">
          ${labelsHtml}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        <` + `/script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            🏷️ Etiquetadora de Produtos
          </h1>
          <p className="text-gray-600 mt-1">
            Crie e imprima etiquetas com código de barras para seus produtos
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <FiSettings /> Configurações
          </button>
          <button
            onClick={printLabels}
            disabled={labelItems.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            <FiPrinter /> Imprimir ({totalLabels} etiquetas)
          </button>
        </div>
      </div>

      {/* Configurações */}
      {showConfig && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">⚙️ Configurações de Etiqueta</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showPrice}
                onChange={e => setConfig({ ...config, showPrice: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span>Mostrar Preço</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showBarcode}
                onChange={e => setConfig({ ...config, showBarcode: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span>Código de Barras</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showBrand}
                onChange={e => setConfig({ ...config, showBrand: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span>Mostrar Marca</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showSku}
                onChange={e => setConfig({ ...config, showSku: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span>Mostrar SKU</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showLogo}
                onChange={e => setConfig({ ...config, showLogo: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span>Mostrar Logo</span>
            </label>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Tamanho da Etiqueta</label>
            <div className="flex gap-3">
              {(['small', 'medium', 'large'] as const).map(size => (
                <button
                  key={size}
                  onClick={() => setConfig({ ...config, labelSize: size })}
                  className={`px-4 py-2 rounded-lg border ${
                    config.labelSize === size 
                      ? 'border-primary-600 bg-primary-50 text-primary-700' 
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {size === 'small' ? '📏 Pequena (40x25mm)' : 
                   size === 'medium' ? '📐 Média (50x30mm)' : 
                   '📎 Grande (60x40mm)'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Busca de Produtos */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold mb-4">🔍 Buscar Produtos</h2>
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchProducts()}
                placeholder="Nome, SKU ou código de barras..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <button
              onClick={searchProducts}
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300"
            >
              <FiSearch />
            </button>
          </div>

          {/* Resultados */}
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {loading && (
              <div className="text-center py-8 text-gray-500">
                Buscando...
              </div>
            )}
            {!loading && products.length === 0 && searchTerm && (
              <div className="text-center py-8 text-gray-500">
                Nenhum produto encontrado
              </div>
            )}
            {products.map(product => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.name}</p>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="font-bold text-primary-600">R$ {product.price.toFixed(2)}</span>
                    {product.gtin && <span>EAN: {product.gtin}</span>}
                    {product.brand && <span>{product.brand}</span>}
                  </div>
                </div>
                <button
                  onClick={() => addProduct(product)}
                  className="ml-3 p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                >
                  <FiPlus />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Lista de Etiquetas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">🏷️ Etiquetas a Imprimir</h2>
            {labelItems.length > 0 && (
              <button
                onClick={() => setLabelItems([])}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                Limpar tudo
              </button>
            )}
          </div>

          {labelItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-5xl mb-3">🏷️</div>
              <p>Adicione produtos para gerar etiquetas</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {labelItems.map(item => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.product.name}</p>
                    <p className="text-sm text-primary-600 font-bold">
                      R$ {item.product.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      <FiMinus size={14} />
                    </button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      <FiPlus size={14} />
                    </button>
                    <button
                      onClick={() => removeProduct(item.product.id)}
                      className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 ml-2"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resumo */}
          {labelItems.length > 0 && (
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <div>
                <span className="text-gray-600">Total:</span>
                <span className="ml-2 font-bold text-lg">{totalLabels} etiquetas</span>
                <span className="text-gray-500 text-sm ml-2">
                  ({labelItems.length} produtos)
                </span>
              </div>
              <button
                onClick={printLabels}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <FiPrinter /> Imprimir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      {labelItems.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold mb-4">👁️ Pré-visualização</h2>
          <div className="flex flex-wrap gap-3 p-4 bg-gray-100 rounded-lg">
            {labelItems.slice(0, 6).map(item => (
              <div
                key={item.product.id}
                className="bg-white border border-dashed border-gray-300 p-2 rounded"
                style={{
                  width: config.labelSize === 'small' ? '150px' : 
                         config.labelSize === 'medium' ? '190px' : '230px',
                  minHeight: config.labelSize === 'small' ? '95px' : 
                             config.labelSize === 'medium' ? '115px' : '150px'
                }}
              >
                {config.showBrand && item.product.brand && (
                  <p className="text-[8px] text-gray-500 uppercase">{item.product.brand}</p>
                )}
                <p className="text-[10px] font-bold leading-tight line-clamp-2">
                  {item.product.name}
                </p>
                {config.showSku && item.product.sku && (
                  <p className="text-[7px] text-gray-400">SKU: {item.product.sku}</p>
                )}
                {config.showPrice && (
                  <div className="flex items-center gap-1 mt-1">
                    {item.product.comparePrice && (
                      <span className="text-[8px] text-gray-400 line-through">
                        R$ {item.product.comparePrice.toFixed(2)}
                      </span>
                    )}
                    <span className="text-[12px] font-bold text-red-600">
                      R$ {item.product.price.toFixed(2)}
                    </span>
                  </div>
                )}
                {config.showBarcode && item.product.gtin && (
                  <div className="mt-1 text-center">
                    <div className="text-[6px] font-mono bg-gray-100 px-1 py-0.5 rounded">
                      {item.product.gtin}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {labelItems.length > 6 && (
              <div className="flex items-center justify-center text-gray-500 text-sm">
                +{totalLabels - 6} etiquetas...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
