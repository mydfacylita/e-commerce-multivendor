'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiArrowLeft, FiUpload, FiX, FiAlertCircle, FiEdit2 } from 'react-icons/fi'
import toast from 'react-hot-toast'
import ImageBackgroundEditor from '@/components/ImageBackgroundEditor'

interface Category {
  id: string
  name: string
  parent?: {
    id: string
    name: string
  } | null
}

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  comparePrice: number | null
  categoryId: string
  images: string
  stock: number
  featured: boolean
  isDropshipping: boolean
  gtin: string | null
  brand: string | null
  model: string | null
  color: string | null
  specifications: string | null
  attributes: string | null
  bookTitle: string | null
  bookAuthor: string | null
  bookGenre: string | null
  bookPublisher: string | null
  bookIsbn: string | null
  // Configurações de pagamento
  acceptsCreditCard: boolean | null
  maxInstallments: number | null
  installmentsFreeInterest: number | null
  category: {
    id: string
    name: string
  }
}

interface EditarProductFormProps {
  product: Product
  categories: Category[]
  minPrice?: number // Preço mínimo para produtos dropshipping
}

export default function EditarProductForm({ product, categories, minPrice = 0 }: EditarProductFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [priceError, setPriceError] = useState('')
  
  // Validar preço quando mudar
  const handlePriceChange = (value: string) => {
    const price = parseFloat(value) || 0
    if (product.isDropshipping && minPrice > 0 && price < minPrice) {
      setPriceError(`Preço mínimo é R$ ${minPrice.toFixed(2)}`)
    } else {
      setPriceError('')
    }
    setFormData({ ...formData, price: value })
  }
  const [imageUrl, setImageUrl] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [showImageEditor, setShowImageEditor] = useState(false)
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: product.name,
    slug: product.slug,
    description: product.description || '',
    price: product.price.toString(),
    comparePrice: product.comparePrice?.toString() || '',
    categoryId: product.categoryId,
    stock: product.stock.toString(),
    featured: product.featured,
    gtin: product.gtin || '',
    brand: product.brand || '',
    model: product.model || '',
    color: product.color || '',
    specifications: product.specifications || '',
    // Configurações de pagamento
    acceptsCreditCard: product.acceptsCreditCard,
    maxInstallments: product.maxInstallments,
    installmentsFreeInterest: product.installmentsFreeInterest,
  })

  const isDropshipping = product.isDropshipping

  useEffect(() => {
    // Carregar imagens
    try {
      const parsedImages = JSON.parse(product.images)
      setImages(Array.isArray(parsedImages) ? parsedImages : [])
    } catch {
      setImages([])
    }
  }, [product.images])

  const handleAddImage = () => {
    if (imageUrl.trim() && images.length < 10) {
      setImages([...images, imageUrl.trim()])
      setImageUrl('')
    } else if (images.length >= 10) {
      toast.error('Máximo de 10 imagens permitidas')
    }
  }

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleEditImage = (index: number) => {
    setEditingImageIndex(index)
    setShowImageEditor(true)
  }

  const handleImageProcessed = (imageUrl: string) => {
    if (editingImageIndex !== null) {
      // Substituir imagem existente
      const newImages = [...images]
      newImages[editingImageIndex] = imageUrl
      setImages(newImages)
      setEditingImageIndex(null)
    } else {
      // Adicionar nova imagem
      setImages([...images, imageUrl])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isDropshipping && images.length === 0) {
      toast.error('Adicione pelo menos uma imagem do produto')
      return
    }

    // Validar preço mínimo para dropshipping
    if (isDropshipping && minPrice > 0) {
      const price = parseFloat(formData.price) || 0
      if (price < minPrice) {
        toast.error(`O preço deve ser no mínimo R$ ${minPrice.toFixed(2)}`)
        return
      }
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Dropshipping: apenas descrição e preço
          description: formData.description,
          price: parseFloat(formData.price),
          // Configurações de pagamento (sempre podem ser editadas)
          acceptsCreditCard: formData.acceptsCreditCard,
          maxInstallments: formData.maxInstallments,
          installmentsFreeInterest: formData.installmentsFreeInterest,
          // Produtos próprios: todos os campos
          ...(!isDropshipping && {
            name: formData.name,
            slug: formData.slug,
            comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : null,
            categoryId: formData.categoryId,
            images,
            stock: parseInt(formData.stock),
            featured: formData.featured,
            gtin: formData.gtin || null,
            brand: formData.brand || null,
            model: formData.model || null,
            color: formData.color || null,
            specifications: formData.specifications || null,
          }),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Erro ao atualizar produto')
      }

      toast.success('Produto atualizado com sucesso!')
      router.push('/vendedor/produtos')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar produto')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8">
      <Link
        href="/vendedor/produtos"
        className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
      >
        <FiArrowLeft className="mr-2" />
        Voltar para Produtos
      </Link>

      <h1 className="text-3xl font-bold mb-2">Editar Produto</h1>
      <p className="text-gray-600 mb-8">
        {isDropshipping ? (
          <span className="text-orange-600 font-medium">
            <FiAlertCircle className="inline mr-1" />
            Produto de Dropshipping - Você pode editar apenas a Descrição e o Preço
          </span>
        ) : (
          'Atualize as informações do produto'
        )}
      </p>

      <form onSubmit={handleSubmit} className="max-w-4xl bg-white rounded-lg shadow-md p-6 space-y-6">
        
        {/* Informações Básicas */}
        <div>
          <h3 className="font-semibold text-lg mb-4">📝 Informações Básicas</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Nome do Produto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isDropshipping}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  isDropshipping ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder="Ex: Tênis Esportivo Nike Air"
              />
              {isDropshipping && (
                <p className="text-xs text-orange-600 mt-1">Campo bloqueado para produtos de dropshipping</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Slug (URL)</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                disabled={isDropshipping}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  isDropshipping ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder="tenis-esportivo-nike-air"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Categoria <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                disabled={isDropshipping}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  isDropshipping ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.parent ? `${category.parent.name} > ${category.name}` : category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Descrição
                {isDropshipping && <span className="text-green-600 ml-2">✓ Editável</span>}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                rows={4}
                placeholder="Descrição detalhada do produto..."
              />
            </div>
          </div>
        </div>

        {/* Preços */}
        <div className="border-t pt-6">
          <h3 className="font-semibold text-lg mb-4">💰 Preços e Estoque</h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Preço de Venda (R$) <span className="text-red-500">*</span>
                {isDropshipping && <span className="text-green-600 ml-2">✓ Editável</span>}
              </label>
              <input
                type="number"
                step="0.01"
                required
                min={minPrice > 0 ? minPrice : undefined}
                value={formData.price}
                onChange={(e) => handlePriceChange(e.target.value)}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  priceError ? 'border-red-500' : ''
                }`}
                placeholder="0.00"
              />
              {isDropshipping && minPrice > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Preço mínimo: <strong className="text-red-600">R$ {minPrice.toFixed(2)}</strong>
                </p>
              )}
              {priceError && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <FiAlertCircle /> {priceError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Preço Comparação (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formData.comparePrice}
                onChange={(e) => setFormData({ ...formData, comparePrice: e.target.value })}
                disabled={isDropshipping}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  isDropshipping ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Estoque <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                disabled={isDropshipping}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  isDropshipping ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder="0"
              />
            </div>
          </div>

          {!isDropshipping && (
            <div className="mt-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium">Produto em destaque</span>
              </label>
            </div>
          )}
        </div>

        {/* Imagens */}
        {!isDropshipping && (
          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">📷 Imagens do Produto</h3>
            
            {/* Botão para abrir editor de imagem */}
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-800">✨ Editor de Imagem com Fundo Branco</h4>
                  <p className="text-sm text-blue-600">Remova o fundo da imagem e deixe branco profissional</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingImageIndex(null)
                    setShowImageEditor(true)
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition flex items-center gap-2 shadow-md"
                >
                  <FiEdit2 />
                  Abrir Editor
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                <FiUpload className="inline mr-1" />
                Adicionar Imagem (URL)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddImage())}
                  className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="https://exemplo.com/imagem.jpg"
                />
                <button
                  type="button"
                  onClick={handleAddImage}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Adicionar
                </button>
              </div>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {images.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={img}
                      alt={`Produto ${index + 1}`}
                      className="w-full h-32 object-cover rounded-md border"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-image.png'
                      }}
                    />
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => handleEditImage(index)}
                        className="bg-blue-500 text-white rounded-full p-1"
                        title="Editar fundo"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="bg-red-500 text-white rounded-full p-1"
                        title="Remover"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                    {index === 0 && (
                      <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                        Principal
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Editor de Imagem Modal */}
            {showImageEditor && (
              <ImageBackgroundEditor
                onImageProcessed={handleImageProcessed}
                onClose={() => {
                  setShowImageEditor(false)
                  setEditingImageIndex(null)
                }}
                initialImage={editingImageIndex !== null ? images[editingImageIndex] : undefined}
              />
            )}
          </div>
        )}

        {/* Especificações Técnicas */}
        {!isDropshipping && (
          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">🔧 Especificações Técnicas (Opcional)</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">GTIN / EAN</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.gtin}
                    onChange={(e) => setFormData({ ...formData, gtin: e.target.value })}
                    className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="7891234567890"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/vendedor/ean/generate', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ quantity: 1, type: 'INTERNAL' })
                        })
                        const data = await res.json()
                        if (data.success && data.eans[0]) {
                          setFormData({ ...formData, gtin: data.eans[0] })
                          toast.success('EAN gerado com sucesso!')
                        } else {
                          toast.error(data.message || 'Erro ao gerar EAN')
                        }
                      } catch (error) {
                        toast.error('Erro ao gerar EAN')
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap"
                  >
                    Gerar EAN
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Clique em "Gerar EAN" para criar um código de barras gratuito
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Marca</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Samsung, Nike, Apple..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Modelo</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Galaxy S23, Air Max..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Cor</label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Preto, Branco, Azul..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Especificações Técnicas</label>
                <textarea
                  value={formData.specifications}
                  onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  rows={3}
                  placeholder="Uma especificação por linha"
                />
              </div>
            </div>
          </div>
        )}

        {/* Configurações de Pagamento */}
        <div className="border-t pt-6">
          <h3 className="font-semibold text-lg mb-4">💳 Configurações de Pagamento</h3>
          <p className="text-sm text-gray-500 mb-4">
            Configure regras específicas de pagamento para este produto. 
            Se deixar "Usar padrão", as regras do sistema serão aplicadas.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Aceita Cartão de Crédito</label>
              <select
                value={formData.acceptsCreditCard === null ? 'default' : formData.acceptsCreditCard ? 'true' : 'false'}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  acceptsCreditCard: e.target.value === 'default' ? null : e.target.value === 'true' 
                })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="default">Usar padrão do sistema</option>
                <option value="true">Sim, aceita cartão</option>
                <option value="false">Não aceita cartão (apenas PIX/Boleto)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Máximo de Parcelas</label>
              <select
                value={formData.maxInstallments === null ? 'default' : formData.maxInstallments}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  maxInstallments: e.target.value === 'default' ? null : parseInt(e.target.value) 
                })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="default">Usar padrão do sistema</option>
                <option value="1">À vista (1x)</option>
                <option value="2">Até 2x</option>
                <option value="3">Até 3x</option>
                <option value="4">Até 4x</option>
                <option value="5">Até 5x</option>
                <option value="6">Até 6x</option>
                <option value="10">Até 10x</option>
                <option value="12">Até 12x</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Parcelas Sem Juros</label>
              <select
                value={formData.installmentsFreeInterest === null ? 'default' : formData.installmentsFreeInterest}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  installmentsFreeInterest: e.target.value === 'default' ? null : parseInt(e.target.value) 
                })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="default">Usar padrão do sistema</option>
                <option value="1">Apenas à vista</option>
                <option value="2">Até 2x sem juros</option>
                <option value="3">Até 3x sem juros</option>
                <option value="4">Até 4x sem juros</option>
                <option value="5">Até 5x sem juros</option>
                <option value="6">Até 6x sem juros</option>
                <option value="10">Até 10x sem juros</option>
                <option value="12">Até 12x sem juros</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">Você absorve os juros nessas parcelas</p>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="border-t pt-6 flex gap-4">
          <Link
            href="/vendedor/produtos"
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Atualizando...' : 'Atualizar Produto'}
          </button>
        </div>
      </form>
    </div>
  )
}
