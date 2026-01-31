'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiArrowLeft, FiUpload, FiX, FiEdit2 } from 'react-icons/fi'
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

interface ProductType {
  id: string
  name: string
  slug: string
  icon?: string
  active: boolean
}

interface NovoProductFormProps {
  categories: Category[]
}

export default function NovoProductForm({ categories }: NovoProductFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [imageUrl, setImageUrl] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [showImageEditor, setShowImageEditor] = useState(false)
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    comparePrice: '',
    categoryId: '',
    stock: '',
    featured: false,
    productType: '',
    mlCategoryId: '',
    gtin: '',
    brand: '',
    model: '',
    color: '',
    specifications: '',
    // Campos para Celulares
    ram: '',
    storage: '',
    anatelNumber: '',
    isDualSim: 'Não',
    carrier: 'Desbloqueado',
    // Campos para Livros
    bookTitle: '',
    bookAuthor: '',
    bookGenre: '',
    bookPublisher: '',
    bookIsbn: '',
  })

  useEffect(() => {
    fetchProductTypes()
  }, [])

  const fetchProductTypes = async () => {
    try {
      const response = await fetch('/api/admin/product-types')
      const data = await response.json()
      const types = Array.isArray(data) ? data : []
      setProductTypes(types.filter((type: ProductType) => type.active))
    } catch (error) {
      console.error('Erro ao carregar tipos:', error)
      setProductTypes([])
    }
  }

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
    
    if (images.length === 0) {
      toast.error('Adicione pelo menos uma imagem do produto')
      return
    }

    setIsLoading(true)

    const slug = formData.slug || formData.name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // Monta especificações técnicas
    const technicalSpecs: any = {}
    if (formData.productType) technicalSpecs.product_type = formData.productType
    if (formData.mlCategoryId) technicalSpecs.ml_category_id = formData.mlCategoryId
    if (formData.ram) technicalSpecs.memória_ram = formData.ram
    if (formData.storage) technicalSpecs.armazenamento = formData.storage
    if (formData.anatelNumber) technicalSpecs.anatel = formData.anatelNumber
    if (formData.isDualSim) technicalSpecs.dual_sim = formData.isDualSim
    if (formData.carrier) technicalSpecs.operadora = formData.carrier

    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          slug,
          description: formData.description,
          price: parseFloat(formData.price),
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
          technicalSpecs: Object.keys(technicalSpecs).length > 0 ? JSON.stringify(technicalSpecs) : null,
          bookTitle: formData.bookTitle || null,
          bookAuthor: formData.bookAuthor || null,
          bookGenre: formData.bookGenre || null,
          bookPublisher: formData.bookPublisher || null,
          bookIsbn: formData.bookIsbn || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Erro ao criar produto')
      }

      toast.success('Produto criado com sucesso!')
      router.push('/vendedor/produtos')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar produto')
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

      <h1 className="text-3xl font-bold mb-2">Novo Produto</h1>
      <p className="text-gray-600 mb-8">Cadastre um novo produto no seu estoque</p>

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
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Ex: Tênis Esportivo Nike Air"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Slug (URL)
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="tenis-esportivo-nike-air"
              />
              <p className="text-xs text-gray-500 mt-1">Deixe em branco para gerar automaticamente</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Categoria <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
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
              <label className="block text-sm font-medium mb-2">Descrição</label>
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
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Preço Comparação (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.comparePrice}
                onChange={(e) => setFormData({ ...formData, comparePrice: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">Preço "De:" para mostrar desconto</p>
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
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="0"
              />
            </div>
          </div>

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
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Produtos em destaque aparecem na home e têm mais visibilidade
            </p>
          </div>
        </div>

        {/* Imagens do Produto */}
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
            <p className="text-xs text-gray-500 mt-1">
              Adicione até 10 imagens do seu produto
            </p>
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

          {images.length === 0 && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <FiUpload size={48} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600">Nenhuma imagem adicionada</p>
              <p className="text-sm text-gray-500">Adicione pelo menos 1 imagem</p>
            </div>
          )}
        </div>

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

        {/* Especificações Técnicas */}
        <div className="border-t pt-6">
          <h3 className="font-semibold text-lg mb-4">🏷️ Tipo de Produto</h3>
          <p className="text-sm text-gray-600 mb-4">Selecione o tipo para mostrar campos específicos</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Produto</label>
              <select
                value={formData.productType}
                onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
              >
                <option value="">Selecione o tipo de produto...</option>
                {Array.isArray(productTypes) && productTypes.map((type) => (
                  <option key={type.id} value={type.slug}>
                    {type.icon} {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Categoria Mercado Livre (Opcional)</label>
              <input
                type="text"
                value={formData.mlCategoryId}
                onChange={(e) => setFormData({ ...formData, mlCategoryId: e.target.value })}
                className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Ex: MLB1055, MLB263532..."
              />
              <p className="text-xs text-gray-500 mt-1">Se souber a categoria exata do ML, informe aqui</p>
            </div>
          </div>
        </div>

        {/* Campos específicos para Celulares */}
        {formData.productType === 'celular' && (
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold mb-4">📱 Campos Específicos - Celulares</h3>
          <p className="text-sm text-gray-600 mb-4">Campos obrigatórios para publicação de celulares no Mercado Livre</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Memória RAM</label>
              <input
                type="text"
                value={formData.ram}
                onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="8GB, 12GB, 16GB..."
              />
              <p className="text-xs text-gray-500 mt-1">Memória RAM do dispositivo</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Armazenamento</label>
              <input
                type="text"
                value={formData.storage}
                onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="128GB, 256GB, 512GB..."
              />
              <p className="text-xs text-gray-500 mt-1">Capacidade de armazenamento interno</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Número ANATEL</label>
              <input
                type="text"
                value={formData.anatelNumber}
                onChange={(e) => setFormData({ ...formData, anatelNumber: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="12345-67-8901"
              />
              <p className="text-xs text-gray-500 mt-1">Número de homologação da ANATEL (obrigatório para celulares)</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Dual SIM / Dual Chip</label>
              <select
                value={formData.isDualSim}
                onChange={(e) => setFormData({ ...formData, isDualSim: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Suporta dois chips?</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Operadora</label>
              <select
                value={formData.carrier}
                onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="Desbloqueado">Desbloqueado</option>
                <option value="Vivo">Vivo</option>
                <option value="Claro">Claro</option>
                <option value="TIM">TIM</option>
                <option value="Oi">Oi</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Operadora vinculada (se houver)</p>
            </div>
          </div>
        </div>
        )}

        {/* Campos específicos para Livros */}
        {formData.productType === 'livro' && (
        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
          <h3 className="text-lg font-semibold mb-4">📚 Informações do Livro</h3>
          <p className="text-sm text-gray-600 mb-4">
            Campos obrigatórios para publicação de livros no Mercado Livre
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Título do Livro *</label>
              <input
                type="text"
                value={formData.bookTitle}
                onChange={(e) => setFormData({ ...formData, bookTitle: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="Clean Code: A Handbook of Agile Software Craftsmanship"
              />
              <p className="text-xs text-gray-500 mt-1">Título completo do livro</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Autor(es) *</label>
              <input
                type="text"
                value={formData.bookAuthor}
                onChange={(e) => setFormData({ ...formData, bookAuthor: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="Robert C. Martin"
              />
              <p className="text-xs text-gray-500 mt-1">Nome do autor ou autores</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Gênero do Livro *</label>
              <select
                value={formData.bookGenre}
                onChange={(e) => setFormData({ ...formData, bookGenre: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              >
                <option value="">Selecione o gênero</option>
                <option value="Ficção">Ficção</option>
                <option value="Não-ficção">Não-ficção</option>
                <option value="Romance">Romance</option>
                <option value="Suspense">Suspense</option>
                <option value="Técnico">Técnico</option>
                <option value="Educacional">Educacional</option>
                <option value="Autoajuda">Autoajuda</option>
                <option value="Biografia">Biografia</option>
                <option value="Infantil">Infantil</option>
                <option value="Outros">Outros</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Categoria/gênero literário</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Editora *</label>
              <input
                type="text"
                value={formData.bookPublisher}
                onChange={(e) => setFormData({ ...formData, bookPublisher: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="Prentice Hall"
              />
              <p className="text-xs text-gray-500 mt-1">Nome da editora</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">ISBN (Código de Barras)</label>
              <input
                type="text"
                value={formData.bookIsbn}
                onChange={(e) => setFormData({ ...formData, bookIsbn: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="978-0-13-235088-4"
              />
              <p className="text-xs text-gray-500 mt-1">ISBN-10 ou ISBN-13</p>
            </div>
          </div>
        </div>
        )}

        {/* Especificações Técnicas Gerais */}
        <div className="border-t pt-6">
          <h3 className="font-semibold text-lg mb-4">🔧 Especificações Técnicas (Opcional)</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                GTIN / EAN / Código de Barras
              </label>
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
              <label className="block text-sm font-medium mb-2">
                Especificações Técnicas (Opcional)
              </label>
              <textarea
                value={formData.specifications}
                onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                rows={3}
                placeholder="Temes com bom aproveitamento, Útil para caminhadas"
              />
              <p className="text-xs text-gray-500 mt-1">Uma especificação por linha</p>
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
            {isLoading ? 'Cadastrando...' : 'Cadastrar Produto'}
          </button>
        </div>
      </form>
    </div>
  )
}
