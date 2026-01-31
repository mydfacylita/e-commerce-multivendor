'use client'

import { useState, useEffect } from 'react'
import { FiImage, 
  FiDownload, 
  FiCopy, 
  FiCheck, 
  FiSearch, 
  FiFilter,
  FiGrid,
  FiList,
  FiTag,
  FiPercent,
  FiShare2,
  FiExternalLink,
  FiRefreshCw
} from 'react-icons/fi'
import Image from 'next/image'
import { toast } from 'react-hot-toast'
interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice?: number | null
  images: string
  category?: { id: string; name: string }
  featured: boolean
  active: boolean
  stock: number
}

interface Category {
  id: string
  name: string
}

export default function MarketingPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showOnlyOffers, setShowOnlyOffers] = useState(false)
  
  // All products (loaded once, filtered client-side)
  const [allProducts, setAllProducts] = useState<Product[]>([])

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  // Filtered products based on filters
  useEffect(() => {
    let filtered = [...allProducts]
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(p => p.name.toLowerCase().includes(searchLower))
    }
    
    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter(p => p.category?.id === categoryFilter)
    }
    
    // Only offers filter
    if (showOnlyOffers) {
      filtered = filtered.filter(p => p.comparePrice && p.comparePrice > p.price)
    }
    
    setProducts(filtered)
  }, [allProducts, search, categoryFilter, showOnlyOffers])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      // A API retorna todos os produtos sem paginação
      const response = await fetch('/api/admin/products')
      const data = await response.json()
      
      // A API retorna array direto, não objeto com products
      if (Array.isArray(data)) {
        setAllProducts(data)
        setProducts(data)
      } else if (data.products) {
        setAllProducts(data.products)
        setProducts(data.products)
      } else {
        setAllProducts([])
        setProducts([])
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
      toast.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories')
      const data = await response.json()
      setCategories(data || [])
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
    }
  }

  const getProductImages = (imagesStr: string): string[] => {
    try {
      if (typeof imagesStr === 'string' && imagesStr.trim()) {
        const parsed = JSON.parse(imagesStr)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {
      if (imagesStr && imagesStr.startsWith('http')) {
        return [imagesStr]
      }
    }
    return []
  }

  const copyImageUrl = async (url: string, productId: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(productId)
      toast.success('URL da imagem copiada!')
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      toast.error('Erro ao copiar URL')
    }
  }

  // Copiar todas as URLs de imagens de um produto
  const copyAllImageUrls = async (product: Product) => {
    const images = getProductImages(product.images)
    if (images.length === 0) {
      toast.error('Nenhuma imagem encontrada')
      return
    }
    
    try {
      const allUrls = images.join('\n')
      await navigator.clipboard.writeText(allUrls)
      setCopiedId(product.id)
      toast.success(`${images.length} URL(s) copiada(s)!`)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      toast.error('Erro ao copiar URLs')
    }
  }

  const downloadImage = async (url: string, productName: string, index?: number) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = blobUrl
      const suffix = index !== undefined ? `_${index + 1}` : ''
      link.download = `${productName.replace(/[^a-zA-Z0-9]/g, '_')}${suffix}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
      
      return true
    } catch (error) {
      console.error('Erro ao baixar imagem:', error)
      return false
    }
  }

  // Baixar todas as imagens de um produto
  const downloadAllProductImages = async (product: Product) => {
    const images = getProductImages(product.images)
    if (images.length === 0) {
      toast.error('Nenhuma imagem encontrada')
      return
    }
    
    toast.loading(`Baixando ${images.length} imagem(ns)...`)
    
    let successCount = 0
    for (let i = 0; i < images.length; i++) {
      const success = await downloadImage(images[i], product.name, i)
      if (success) successCount++
      // Delay entre downloads para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    
    toast.dismiss()
    if (successCount === images.length) {
      toast.success(`${successCount} imagem(ns) baixada(s)!`)
    } else {
      toast.success(`${successCount} de ${images.length} imagens baixadas`)
    }
  }

  const downloadAllSelected = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Selecione pelo menos um produto')
      return
    }
    
    // Contar total de imagens
    let totalImages = 0
    for (const productId of selectedProducts) {
      const product = products.find(p => p.id === productId)
      if (product) {
        totalImages += getProductImages(product.images).length
      }
    }
    
    toast.loading(`Baixando ${totalImages} imagem(ns) de ${selectedProducts.length} produto(s)...`)
    
    let downloadedCount = 0
    for (const productId of selectedProducts) {
      const product = products.find(p => p.id === productId)
      if (product) {
        const images = getProductImages(product.images)
        for (let i = 0; i < images.length; i++) {
          const success = await downloadImage(images[i], product.name, i)
          if (success) downloadedCount++
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }
    }
    
    toast.dismiss()
    toast.success(`${downloadedCount} imagem(ns) baixada(s)!`)
  }

  const toggleSelectProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const selectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(products.map(p => p.id))
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price)
  }

  const getDiscountPercent = (price: number, comparePrice?: number | null) => {
    if (!comparePrice || comparePrice <= price) return 0
    return Math.round(((comparePrice - price) / comparePrice) * 100)
  }

  const copyProductInfo = async (product: Product) => {
    const images = getProductImages(product.images)
    const discount = getDiscountPercent(product.price, product.comparePrice)
    
    let text = `🔥 ${product.name}\n`
    if (discount > 0) {
      text += `\n💰 De: ${formatPrice(product.comparePrice!)}`
      text += `\n🏷️ Por: ${formatPrice(product.price)}`
      text += `\n📢 ${discount}% OFF!\n`
    } else {
      text += `\n💰 ${formatPrice(product.price)}\n`
    }
    text += `\n🔗 Link: ${window.location.origin}/produto/${product.slug}`
    if (images.length > 0) {
      text += `\n\n📸 Imagens (${images.length}):`
      images.forEach((img, i) => {
        text += `\n${i + 1}. ${img}`
      })
    }
    
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Informações copiadas para WhatsApp/Redes Sociais!')
    } catch (error) {
      toast.error('Erro ao copiar')
    }
  }

  const generateMarketingCard = (product: Product) => {
    const images = getProductImages(product.images)
    const discount = getDiscountPercent(product.price, product.comparePrice)
    
    // Abre uma nova janela com o card de marketing
    const cardWindow = window.open('', '_blank', 'width=600,height=800')
    if (!cardWindow) return
    
    cardWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Card de Marketing - ${product.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', sans-serif; 
              background: #f0f0f0; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              min-height: 100vh;
              padding: 20px;
            }
            .card {
              width: 400px;
              background: white;
              border-radius: 20px;
              overflow: hidden;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }
            .card-header {
              background: linear-gradient(135deg, #FF6B00, #FF9500);
              color: white;
              padding: 15px 20px;
              text-align: center;
            }
            .badge {
              background: #fff;
              color: #FF6B00;
              padding: 5px 15px;
              border-radius: 20px;
              font-weight: bold;
              display: inline-block;
              font-size: 14px;
            }
            .card-image {
              position: relative;
              height: 300px;
              background: #fff;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .card-image img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
            .discount-badge {
              position: absolute;
              top: 15px;
              right: 15px;
              background: #E53E3E;
              color: white;
              padding: 10px 15px;
              border-radius: 10px;
              font-weight: bold;
              font-size: 18px;
            }
            .card-content {
              padding: 20px;
            }
            .product-name {
              font-size: 18px;
              font-weight: bold;
              color: #333;
              margin-bottom: 15px;
              line-height: 1.3;
            }
            .price-box {
              background: #f8f8f8;
              border-radius: 10px;
              padding: 15px;
              text-align: center;
            }
            .old-price {
              color: #999;
              text-decoration: line-through;
              font-size: 16px;
            }
            .new-price {
              color: #16A34A;
              font-size: 32px;
              font-weight: bold;
              margin: 5px 0;
            }
            .pix-discount {
              background: #16A34A;
              color: white;
              padding: 5px 10px;
              border-radius: 5px;
              font-size: 12px;
              display: inline-block;
              margin-top: 5px;
            }
            .cta-button {
              display: block;
              width: 100%;
              background: linear-gradient(135deg, #2563EB, #1D4ED8);
              color: white;
              text-align: center;
              padding: 15px;
              border-radius: 10px;
              font-weight: bold;
              font-size: 16px;
              margin-top: 15px;
              text-decoration: none;
            }
            .footer {
              text-align: center;
              padding: 15px;
              background: #f8f8f8;
              font-size: 12px;
              color: #666;
            }
            .print-btn {
              background: #333;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
              margin: 20px auto;
              display: block;
            }
            @media print {
              body { background: white; }
              .print-btn { display: none; }
            }
          </style>
        </head>
        <body>
          <div>
            <div class="card">
              <div class="card-header">
                <span class="badge">🔥 OFERTA ESPECIAL</span>
              </div>
              <div class="card-image">
                ${images.length > 0 ? `<img src="${images[0]}" alt="${product.name}">` : '<p>Sem imagem</p>'}
                ${discount > 0 ? `<div class="discount-badge">-${discount}%</div>` : ''}
              </div>
              <div class="card-content">
                <h2 class="product-name">${product.name}</h2>
                <div class="price-box">
                  ${product.comparePrice ? `<p class="old-price">${formatPrice(product.comparePrice)}</p>` : ''}
                  <p class="new-price">${formatPrice(product.price)}</p>
                  <span class="pix-discount">💰 5% OFF no PIX</span>
                </div>
                <a href="${window.location.origin}/produto/${product.slug}" class="cta-button">
                  🛒 COMPRAR AGORA
                </a>
              </div>
              <div class="footer">
                <strong>MYDSHOP</strong> - Sua loja online
              </div>
            </div>
            <button class="print-btn" onclick="window.print()">📷 Salvar/Imprimir Card</button>
          </div>
        </body>
      </html>
    `)
    cardWindow.document.close()
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FiImage className="text-primary-600" />
          Central de Marketing
        </h1>
        <p className="text-gray-600 mt-1">
          Gerencie imagens e crie materiais de divulgação para seus produtos
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <FiImage className="text-blue-600 text-xl" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Produtos</p>
              <p className="text-2xl font-bold">{allProducts.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <FiPercent className="text-green-600 text-xl" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Em Oferta</p>
              <p className="text-2xl font-bold">
                {allProducts.filter(p => p.comparePrice && p.comparePrice > p.price).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-3 rounded-lg">
              <FiTag className="text-orange-600 text-xl" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Destaques</p>
              <p className="text-2xl font-bold">
                {allProducts.filter(p => p.featured).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-lg">
              <FiCheck className="text-purple-600 text-xl" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Selecionados</p>
              <p className="text-2xl font-bold">{selectedProducts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todas Categorias</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          {/* Only Offers Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyOffers}
              onChange={(e) => setShowOnlyOffers(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm">Apenas Ofertas</span>
          </label>

          {/* View Mode */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}
            >
              <FiGrid />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}
            >
              <FiList />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchProducts}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="Atualizar"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-3 items-center">
            <span className="text-sm text-gray-600">
              {selectedProducts.length} produto(s) selecionado(s)
            </span>
            <button
              onClick={downloadAllSelected}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <FiDownload /> Baixar Imagens
            </button>
            <button
              onClick={() => setSelectedProducts([])}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Limpar Seleção
            </button>
          </div>
        )}
      </div>

      {/* Products Grid/List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FiImage className="mx-auto text-4xl text-gray-400 mb-3" />
          <p className="text-gray-600">Nenhum produto encontrado</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {products.map(product => {
            const images = getProductImages(product.images)
            const discount = getDiscountPercent(product.price, product.comparePrice)
            const isSelected = selectedProducts.includes(product.id)
            
            return (
              <div 
                key={product.id} 
                className={`bg-white rounded-lg shadow overflow-hidden transition-all ${
                  isSelected ? 'ring-2 ring-primary-600' : ''
                }`}
              >
                {/* Image */}
                <div className="relative aspect-square bg-gray-100">
                  {images.length > 0 ? (
                    <Image
                      src={images[0]}
                      alt={product.name}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <FiImage size={40} />
                    </div>
                  )}
                  
                  {/* Discount Badge */}
                  {discount > 0 && (
                    <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                      -{discount}%
                    </span>
                  )}
                  
                  {/* Select Checkbox */}
                  <button
                    onClick={() => toggleSelectProduct(product.id)}
                    className={`absolute top-2 right-2 w-6 h-6 rounded border-2 flex items-center justify-center ${
                      isSelected 
                        ? 'bg-primary-600 border-primary-600 text-white' 
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    {isSelected && <FiCheck size={14} />}
                  </button>
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
                    {product.name}
                  </h3>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      {product.comparePrice && product.comparePrice > product.price && (
                        <p className="text-xs text-gray-400 line-through">
                          {formatPrice(product.comparePrice)}
                        </p>
                      )}
                      <p className="text-lg font-bold text-green-600">
                        {formatPrice(product.price)}
                      </p>
                    </div>
                    <div className="text-right">
                      {discount > 0 && (
                        <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                          -{discount}%
                        </span>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {images.length} img
                      </p>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-1 mt-3">
                    {images.length > 0 && (
                      <>
                        <button
                          onClick={() => copyAllImageUrls(product)}
                          className="flex-1 p-2 text-xs bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center gap-1"
                          title={`Copiar ${images.length} URL(s)`}
                        >
                          {copiedId === product.id ? <FiCheck /> : <FiCopy />}
                        </button>
                        <button
                          onClick={() => downloadAllProductImages(product)}
                          className="flex-1 p-2 text-xs bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center gap-1"
                          title={`Baixar ${images.length} imagem(ns)`}
                        >
                          <FiDownload />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => copyProductInfo(product)}
                      className="flex-1 p-2 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded flex items-center justify-center gap-1"
                      title="Copiar para WhatsApp"
                    >
                      <FiShare2 />
                    </button>
                    <button
                      onClick={() => generateMarketingCard(product)}
                      className="flex-1 p-2 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded flex items-center justify-center gap-1"
                      title="Gerar Card"
                    >
                      <FiExternalLink />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // List View
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === products.length}
                    onChange={selectAll}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                </th>
                <th className="p-3 text-left">Imagem</th>
                <th className="p-3 text-left">Produto</th>
                <th className="p-3 text-left">Categoria</th>
                <th className="p-3 text-right">Preço</th>
                <th className="p-3 text-center">Desconto</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map(product => {
                const images = getProductImages(product.images)
                const discount = getDiscountPercent(product.price, product.comparePrice)
                const isSelected = selectedProducts.includes(product.id)
                
                return (
                  <tr key={product.id} className={isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'}>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectProduct(product.id)}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                    </td>
                    <td className="p-3">
                      <div className="w-16 h-16 relative bg-gray-100 rounded">
                        {images.length > 0 ? (
                          <Image
                            src={images[0]}
                            alt={product.name}
                            fill
                            className="object-contain rounded"
                            unoptimized
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400">
                            <FiImage />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">{images.length} imagem(ns)</p>
                    </td>
                    <td className="p-3 text-gray-600">
                      {product.category?.name || '-'}
                    </td>
                    <td className="p-3 text-right">
                      <p className="font-bold text-green-600">{formatPrice(product.price)}</p>
                      {product.comparePrice && product.comparePrice > product.price && (
                        <p className="text-xs text-gray-400 line-through">
                          {formatPrice(product.comparePrice)}
                        </p>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {discount > 0 ? (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-sm font-bold">
                          -{discount}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-1">
                        {images.length > 0 && (
                          <>
                            <button
                              onClick={() => copyAllImageUrls(product)}
                              className="p-2 hover:bg-gray-100 rounded"
                              title={`Copiar ${images.length} URL(s)`}
                            >
                              {copiedId === product.id ? <FiCheck className="text-green-600" /> : <FiCopy />}
                            </button>
                            <button
                              onClick={() => downloadAllProductImages(product)}
                              className="p-2 hover:bg-gray-100 rounded"
                              title={`Baixar ${images.length} imagem(ns)`}
                            >
                              <FiDownload />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => copyProductInfo(product)}
                          className="p-2 hover:bg-green-100 rounded text-green-600"
                          title="WhatsApp"
                        >
                          <FiShare2 />
                        </button>
                        <button
                          onClick={() => generateMarketingCard(product)}
                          className="p-2 hover:bg-blue-100 rounded text-blue-600"
                          title="Card"
                        >
                          <FiExternalLink />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tips Section */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="font-bold text-blue-800 mb-3">💡 Dicas de Marketing</h3>
        <ul className="space-y-2 text-sm text-blue-700">
          <li>📱 <strong>WhatsApp:</strong> Clique no ícone de compartilhar para copiar texto formatado para WhatsApp</li>
          <li>🎨 <strong>Card Marketing:</strong> Gere cards visuais prontos para Instagram e Facebook</li>
          <li>📥 <strong>Download em massa:</strong> Selecione vários produtos e baixe todas as imagens de uma vez</li>
          <li>🏷️ <strong>Ofertas:</strong> Use o filtro "Apenas Ofertas" para ver produtos com desconto</li>
        </ul>
      </div>
    </div>
  )
}
