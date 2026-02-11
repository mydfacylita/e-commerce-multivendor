'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiArrowLeft, FiPackage, FiDollarSign, FiBox, FiTag, FiImage, FiLayers, FiCheck, FiAlertCircle, FiList, FiPlus, FiTrash2, FiLock, FiStar } from 'react-icons/fi'
import toast from 'react-hot-toast'
import ImageUploader from '@/components/admin/ImageUploader'
import ProductVariantsManager from '@/components/admin/ProductVariantsManager'
import AIDescriptionButton from '@/components/admin/AIDescriptionButton'

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

interface SellerPlan {
  name: string
  maxProducts: number
  currentProducts: number
  hasAI: boolean
  hasVariants: boolean
}

interface NovoProductFormProps {
  categories: Category[]
  sellerPlan?: SellerPlan
}

// Definição das abas (sem Dropshipping e Tributação para vendedor)
type TabId = 'basico' | 'precos' | 'dimensoes' | 'imagens' | 'variacoes' | 'atributos' | 'especificacoes'

// Interface para atributos personalizados
interface ProductAttribute {
  nome: string
  valor: string
}

interface Tab {
  id: TabId
  name: string
  icon: React.ReactNode
  description: string
  requiresPlan?: string
}

const TABS: Tab[] = [
  { id: 'basico', name: 'Dados Básicos', icon: <FiPackage />, description: 'Nome, categoria e descrição' },
  { id: 'precos', name: 'Preços e Estoque', icon: <FiDollarSign />, description: 'Preço de venda e estoque' },
  { id: 'dimensoes', name: 'Peso e Dimensões', icon: <FiBox />, description: 'Medidas para frete' },
  { id: 'imagens', name: 'Imagens', icon: <FiImage />, description: 'Fotos do produto' },
  { id: 'variacoes', name: 'Variações', icon: <FiLayers />, description: 'Tamanhos e cores' },
  { id: 'atributos', name: 'Atributos', icon: <FiList />, description: 'Características livres' },
  { id: 'especificacoes', name: 'Especificações', icon: <FiTag />, description: 'GTIN, marca, modelo' },
]

export default function NovoProductForm({ categories, sellerPlan }: NovoProductFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('basico')
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    comparePrice: '',
    // Peso e dimensões
    weight: '',
    weightWithPackage: '',
    length: '',
    width: '',
    height: '',
    lengthWithPackage: '',
    widthWithPackage: '',
    heightWithPackage: '',
    categoryId: '',
    images: [] as string[],
    stock: '',
    featured: false,
    productType: '',
    mlCategoryId: '',
    gtin: '',
    brand: '',
    model: '',
    color: '',
    mpn: '',
    // Campos de variantes
    sizeType: '',
    sizeCategory: '',
    colorType: 'Única' as 'Única' | 'Variada',
    variants: '',
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
    // Atributos personalizados
    attributes: [] as ProductAttribute[],
  })

  // Verificar limites do plano (por enquanto sem restrições)
  const canCreateProduct = true
  const canUseAI = true
  const canUseVariants = true

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

  // Validação por aba
  const getTabStatus = (tabId: TabId): 'complete' | 'incomplete' | 'empty' => {
    switch (tabId) {
      case 'basico':
        if (formData.name && formData.categoryId) return 'complete'
        if (formData.name || formData.categoryId) return 'incomplete'
        return 'empty'
      case 'precos':
        if (formData.price && formData.stock) return 'complete'
        if (formData.price || formData.stock) return 'incomplete'
        return 'empty'
      case 'dimensoes':
        if (formData.weightWithPackage) return 'complete'
        if (formData.weight || formData.length) return 'incomplete'
        return 'empty'
      case 'imagens':
        if (formData.images.length > 0) return 'complete'
        return 'empty'
      case 'variacoes':
        if (formData.variants) return 'complete'
        return 'empty'
      case 'atributos':
        if (formData.attributes.length > 0) return 'complete'
        return 'empty'
      case 'especificacoes':
        if (formData.gtin || formData.brand) return 'complete'
        return 'empty'
      default:
        return 'empty'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validações básicas
    if (!formData.name) {
      toast.error('Nome do produto é obrigatório')
      setActiveTab('basico')
      return
    }
    if (!formData.categoryId) {
      toast.error('Categoria é obrigatória')
      setActiveTab('basico')
      return
    }
    if (!formData.price) {
      toast.error('Preço de venda é obrigatório')
      setActiveTab('precos')
      return
    }
    if (!formData.stock) {
      toast.error('Estoque é obrigatório')
      setActiveTab('precos')
      return
    }
    
    setIsLoading(true)

    const slug = formData.slug || formData.name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const imageArray = Array.isArray(formData.images) ? formData.images : []

    const technicalSpecs: any = {}
    if (formData.productType) technicalSpecs.product_type = formData.productType
    if (formData.mlCategoryId) technicalSpecs.ml_category_id = formData.mlCategoryId
    if (formData.ram) technicalSpecs.memória_ram = formData.ram
    if (formData.storage) technicalSpecs.armazenamento = formData.storage
    if (formData.anatelNumber) technicalSpecs.anatel = formData.anatelNumber
    if (formData.isDualSim) technicalSpecs.dual_sim = formData.isDualSim
    if (formData.carrier) technicalSpecs.operadora = formData.carrier

    const payload = {
      name: formData.name,
      slug,
      description: formData.description,
      price: parseFloat(formData.price),
      comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      weightWithPackage: formData.weightWithPackage ? parseFloat(formData.weightWithPackage) : null,
      length: formData.length ? parseFloat(formData.length) : null,
      width: formData.width ? parseFloat(formData.width) : null,
      height: formData.height ? parseFloat(formData.height) : null,
      lengthWithPackage: formData.lengthWithPackage ? parseFloat(formData.lengthWithPackage) : null,
      widthWithPackage: formData.widthWithPackage ? parseFloat(formData.widthWithPackage) : null,
      heightWithPackage: formData.heightWithPackage ? parseFloat(formData.heightWithPackage) : null,
      categoryId: formData.categoryId,
      images: imageArray,
      stock: parseInt(formData.stock),
      featured: formData.featured,
      gtin: formData.gtin || null,
      brand: formData.brand || null,
      model: formData.model || null,
      color: formData.color || null,
      mpn: formData.mpn || null,
      technicalSpecs: Object.keys(technicalSpecs).length > 0 ? JSON.stringify(technicalSpecs) : null,
      variants: canUseVariants && formData.variants ? formData.variants : null,
      sizeType: formData.sizeType || null,
      sizeCategory: formData.sizeCategory || null,
      bookTitle: formData.bookTitle || null,
      bookAuthor: formData.bookAuthor || null,
      bookGenre: formData.bookGenre || null,
      bookPublisher: formData.bookPublisher || null,
      bookIsbn: formData.bookIsbn || null,
      attributes: formData.attributes.length > 0 ? JSON.stringify(formData.attributes) : null,
    }

    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao criar produto')
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

  // ============================================
  // RENDER CONTEÚDO DE CADA ABA
  // ============================================
  const renderTabContent = () => {
    switch (activeTab) {
      // ==========================================
      // ABA: DADOS BÁSICOS
      // ==========================================
      case 'basico':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">📦 Dados Básicos do Produto</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Nome do Produto *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="Ex: Camiseta Premium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Slug</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="camiseta-premium"
                  />
                  <p className="text-xs text-gray-500 mt-1">Deixe em branco para gerar automaticamente</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Categoria *</label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.parent ? `${category.parent.name} > ${category.name}` : category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Descrição</label>
                  {canUseAI ? (
                    <AIDescriptionButton
                      description={formData.description}
                      productName={formData.name}
                      onDescriptionChange={(desc) => setFormData({ ...formData, description: desc })}
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <FiLock size={14} />
                      <span>IA disponível no plano Pro</span>
                    </div>
                  )}
                </div>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  rows={6}
                  placeholder="Descrição detalhada do produto..."
                />
              </div>

              <div className="mt-6 flex items-center">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="featured" className="ml-2 text-sm font-medium">
                  ⭐ Produto em destaque na minha loja
                </label>
              </div>
            </div>
          </div>
        )

      // ==========================================
      // ABA: PREÇOS E ESTOQUE
      // ==========================================
      case 'precos':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">💰 Preços e Estoque</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Preço de Venda (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600 text-lg font-semibold"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Preço Comparação (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.comparePrice}
                  onChange={(e) => setFormData({ ...formData, comparePrice: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">Preço "De:" para mostrar desconto</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Estoque *</label>
                <input
                  type="number"
                  required
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Prévia de desconto */}
            {formData.price && formData.comparePrice && parseFloat(formData.comparePrice) > parseFloat(formData.price) && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-green-700">
                    {Math.round(((parseFloat(formData.comparePrice) - parseFloat(formData.price)) / parseFloat(formData.comparePrice)) * 100)}% OFF
                  </div>
                  <div className="text-sm text-green-600">
                    <span className="line-through">R$ {parseFloat(formData.comparePrice).toFixed(2)}</span>
                    <span className="ml-2 font-semibold">R$ {parseFloat(formData.price).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      // ==========================================
      // ABA: PESO E DIMENSÕES
      // ==========================================
      case 'dimensoes':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">📦 Peso e Dimensões</h3>
            <p className="text-sm text-gray-600 mb-4">Informações importantes para cálculo de frete</p>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Sem embalagem */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h4 className="font-medium mb-4">📏 Produto (sem embalagem)</h4>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="0.500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs mb-1">Comp. (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.length}
                      onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      placeholder="20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Larg. (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.width}
                      onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      placeholder="15"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Alt. (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      placeholder="5"
                    />
                  </div>
                </div>
              </div>

              {/* Com embalagem */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium mb-4 text-blue-900">📦 Com Embalagem</h4>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-blue-900">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.weightWithPackage}
                    onChange={(e) => setFormData({ ...formData, weightWithPackage: e.target.value })}
                    className="w-full px-4 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="0.600"
                  />
                  <p className="text-xs text-blue-600 mt-1">Usado no cálculo de frete</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs mb-1 text-blue-900">Comp. (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.lengthWithPackage}
                      onChange={(e) => setFormData({ ...formData, lengthWithPackage: e.target.value })}
                      className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm"
                      placeholder="22"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-blue-900">Larg. (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.widthWithPackage}
                      onChange={(e) => setFormData({ ...formData, widthWithPackage: e.target.value })}
                      className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm"
                      placeholder="17"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-blue-900">Alt. (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.heightWithPackage}
                      onChange={(e) => setFormData({ ...formData, heightWithPackage: e.target.value })}
                      className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm"
                      placeholder="7"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      // ==========================================
      // ABA: IMAGENS
      // ==========================================
      case 'imagens':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">🖼️ Imagens do Produto</h3>
            <p className="text-sm text-gray-600 mb-4">Adicione até 10 imagens do produto</p>
            
            <ImageUploader
              images={Array.isArray(formData.images) 
                ? formData.images 
                : String(formData.images).split('\n').filter(img => img.trim())}
              onImagesChange={(images) => setFormData({ ...formData, images })}
              maxImages={10}
            />
          </div>
        )

      // ==========================================
      // ABA: VARIAÇÕES
      // ==========================================
      case 'variacoes':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">🎨 Variações do Produto</h3>
            
            {!canUseVariants ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <FiLock className="mx-auto text-yellow-600 mb-3" size={32} />
                <h4 className="font-semibold text-yellow-800 mb-2">Recurso do Plano Pro</h4>
                <p className="text-sm text-yellow-700 mb-4">
                  Variações de produtos (tamanhos, cores) estão disponíveis no plano Pro.
                </p>
                <Link
                  href="/vendedor/planos"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  <FiStar />
                  Fazer Upgrade
                </Link>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">Configure tamanhos, cores e outras variações</p>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Tipo de Cor</label>
                  <select
                    value={formData.colorType}
                    onChange={(e) => {
                      setFormData({ ...formData, colorType: e.target.value as 'Única' | 'Variada' })
                      if (e.target.value === 'Única') {
                        setFormData(prev => ({ ...prev, variants: '' }))
                      }
                    }}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  >
                    <option value="Única">Única (uma cor)</option>
                    <option value="Variada">Variada (múltiplas cores)</option>
                  </select>
                </div>

                {formData.colorType === 'Única' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Cor do Produto</label>
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                      placeholder="Preto, Azul, Vermelho..."
                    />
                  </div>
                )}

                <ProductVariantsManager
                  sizeType={formData.sizeType}
                  sizeCategory={formData.sizeCategory}
                  colorType={formData.colorType}
                  singleColor={formData.color}
                  productImages={Array.isArray(formData.images) ? formData.images : []}
                  variants={(() => {
                    try {
                      if (!formData.variants || formData.variants === '') return []
                      const parsed = JSON.parse(formData.variants)
                      return Array.isArray(parsed) ? parsed : []
                    } catch (e) {
                      return []
                    }
                  })()}
                  onVariantsChange={(variants) => {
                    setFormData(prev => ({ ...prev, variants: JSON.stringify(variants) }))
                  }}
                  onSizeTypeChange={(type) => {
                    setFormData(prev => ({ ...prev, sizeType: type }))
                  }}
                  onSizeCategoryChange={(category) => {
                    setFormData(prev => ({ ...prev, sizeCategory: category }))
                  }}
                  onTotalStockChange={(totalStock) => {
                    setFormData(prev => ({ ...prev, stock: totalStock.toString() }))
                  }}
                  basePrice={formData.price ? parseFloat(formData.price) : undefined}
                />
              </>
            )}
          </div>
        )

      // ==========================================
      // ABA: ATRIBUTOS PERSONALIZADOS
      // ==========================================
      case 'atributos':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">📋 Atributos Personalizados</h3>
            <p className="text-sm text-gray-600 mb-4">
              Adicione características livres ao seu produto. Ex: Peso, Origem, Material, Sabor, etc.
            </p>
            
            {/* Lista de atributos existentes */}
            <div className="space-y-3">
              {formData.attributes.map((attr, index) => (
                <div key={index} className="flex gap-3 items-start bg-gray-50 p-3 rounded-lg border">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nome do Atributo</label>
                    <input
                      type="text"
                      value={attr.nome}
                      onChange={(e) => {
                        const newAttrs = [...formData.attributes]
                        newAttrs[index].nome = e.target.value
                        setFormData({ ...formData, attributes: newAttrs })
                      }}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                      placeholder="Ex: Peso, Origem, Material..."
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Valor</label>
                    <input
                      type="text"
                      value={attr.valor}
                      onChange={(e) => {
                        const newAttrs = [...formData.attributes]
                        newAttrs[index].valor = e.target.value
                        setFormData({ ...formData, attributes: newAttrs })
                      }}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                      placeholder="Ex: 100g, Brasil, Algodão..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newAttrs = formData.attributes.filter((_, i) => i !== index)
                      setFormData({ ...formData, attributes: newAttrs })
                    }}
                    className="mt-6 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                    title="Remover atributo"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            {/* Botão para adicionar novo atributo */}
            <button
              type="button"
              onClick={() => {
                setFormData({
                  ...formData,
                  attributes: [...formData.attributes, { nome: '', valor: '' }]
                })
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              <FiPlus size={18} />
              Adicionar Atributo
            </button>

            {/* Exemplos de atributos comuns */}
            {formData.attributes.length === 0 && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">💡 Sugestões de Atributos</h4>
                <p className="text-sm text-blue-700 mb-3">Clique para adicionar rapidamente:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { nome: 'Peso', valor: '' },
                    { nome: 'Origem', valor: 'Brasil' },
                    { nome: 'Material', valor: '' },
                    { nome: 'Sabor', valor: '' },
                    { nome: 'Tipo', valor: '' },
                    { nome: 'Composição', valor: '' },
                    { nome: 'Validade', valor: '' },
                    { nome: 'Voltagem', valor: '' },
                    { nome: 'Garantia', valor: '' },
                  ].map((sugestao, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          attributes: [...formData.attributes, { ...sugestao }]
                        })
                      }}
                      className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition-colors"
                    >
                      + {sugestao.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      // ==========================================
      // ABA: ESPECIFICAÇÕES
      // ==========================================
      case 'especificacoes':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">🏷️ Especificações Técnicas</h3>
            <p className="text-sm text-gray-600 mb-4">Campos opcionais para integração com marketplaces</p>
            
            {/* Tipo de Produto */}
            <div className="bg-gray-50 p-4 rounded-lg border mb-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tipo de Produto</label>
                  <select
                    value={formData.productType}
                    onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white"
                  >
                    <option value="">Selecione o tipo...</option>
                    {Array.isArray(productTypes) && productTypes.map((type) => (
                      <option key={type.id} value={type.slug}>
                        {type.icon} {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Categoria ML (Opcional)</label>
                  <input
                    type="text"
                    value={formData.mlCategoryId}
                    onChange={(e) => setFormData({ ...formData, mlCategoryId: e.target.value })}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="Ex: MLB1055"
                  />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">GTIN / EAN</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.gtin}
                    onChange={(e) => setFormData({ ...formData, gtin: e.target.value })}
                    className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
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
                          toast.success('EAN gerado!')
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
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Marca</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="Samsung, Apple, Nike..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Modelo</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="Galaxy S23, Air Max 97..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">MPN</label>
                <input
                  type="text"
                  value={formData.mpn}
                  onChange={(e) => setFormData({ ...formData, mpn: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="SM-S911BZKQZTO"
                />
              </div>
            </div>

            {/* Campos específicos para Celulares */}
            {formData.productType === 'celular' && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-6">
                <h4 className="font-medium mb-4">📱 Campos para Celulares</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Memória RAM</label>
                    <input
                      type="text"
                      value={formData.ram}
                      onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                      className="w-full px-4 py-2 border rounded-md"
                      placeholder="8GB"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Armazenamento</label>
                    <input
                      type="text"
                      value={formData.storage}
                      onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                      className="w-full px-4 py-2 border rounded-md"
                      placeholder="256GB"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Número ANATEL</label>
                    <input
                      type="text"
                      value={formData.anatelNumber}
                      onChange={(e) => setFormData({ ...formData, anatelNumber: e.target.value })}
                      className="w-full px-4 py-2 border rounded-md"
                      placeholder="12345-67-8901"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Dual SIM</label>
                    <select
                      value={formData.isDualSim}
                      onChange={(e) => setFormData({ ...formData, isDualSim: e.target.value })}
                      className="w-full px-4 py-2 border rounded-md"
                    >
                      <option value="Não">Não</option>
                      <option value="Sim">Sim</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Operadora</label>
                    <select
                      value={formData.carrier}
                      onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                      className="w-full px-4 py-2 border rounded-md"
                    >
                      <option value="Desbloqueado">Desbloqueado</option>
                      <option value="Vivo">Vivo</option>
                      <option value="Claro">Claro</option>
                      <option value="TIM">TIM</option>
                      <option value="Oi">Oi</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Campos específicos para Livros */}
            {formData.productType === 'livro' && (
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mt-6">
                <h4 className="font-medium mb-4">📚 Campos para Livros</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Título</label>
                    <input
                      type="text"
                      value={formData.bookTitle}
                      onChange={(e) => setFormData({ ...formData, bookTitle: e.target.value })}
                      className="w-full px-4 py-2 border rounded-md"
                      placeholder="Clean Code"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Autor</label>
                    <input
                      type="text"
                      value={formData.bookAuthor}
                      onChange={(e) => setFormData({ ...formData, bookAuthor: e.target.value })}
                      className="w-full px-4 py-2 border rounded-md"
                      placeholder="Robert C. Martin"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Editora</label>
                    <input
                      type="text"
                      value={formData.bookPublisher}
                      onChange={(e) => setFormData({ ...formData, bookPublisher: e.target.value })}
                      className="w-full px-4 py-2 border rounded-md"
                      placeholder="Prentice Hall"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Gênero</label>
                    <select
                      value={formData.bookGenre}
                      onChange={(e) => setFormData({ ...formData, bookGenre: e.target.value })}
                      className="w-full px-4 py-2 border rounded-md"
                    >
                      <option value="">Selecione</option>
                      <option value="Ficção">Ficção</option>
                      <option value="Não-ficção">Não-ficção</option>
                      <option value="Técnico">Técnico</option>
                      <option value="Autoajuda">Autoajuda</option>
                      <option value="Biografia">Biografia</option>
                      <option value="Infantil">Infantil</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">ISBN</label>
                    <input
                      type="text"
                      value={formData.bookIsbn}
                      onChange={(e) => setFormData({ ...formData, bookIsbn: e.target.value })}
                      className="w-full px-4 py-2 border rounded-md"
                      placeholder="978-0132350884"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  // ============================================
  // RENDER PRINCIPAL
  // ============================================
  return (
    <div className="p-8">
      <Link
        href="/vendedor/produtos"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
      >
        <FiArrowLeft className="mr-2" />
        Voltar para Produtos
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Novo Produto</h1>
          <p className="text-gray-600">Cadastre um novo produto no seu estoque</p>
        </div>
        {sellerPlan && (
          <div className="text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-lg">
            📦 {sellerPlan.currentProducts}/{sellerPlan.maxProducts} produtos • Plano {sellerPlan.name}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex gap-6">
          {/* Sidebar com abas */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-4">
              <h3 className="font-semibold text-gray-500 uppercase text-xs mb-4">Seções</h3>
              <nav className="space-y-1">
                {TABS.map((tab) => {
                  const status = getTabStatus(tab.id)
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary-100 text-primary-700 border-l-4 border-primary-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span className={`text-lg ${activeTab === tab.id ? 'text-primary-600' : 'text-gray-400'}`}>
                        {tab.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tab.name}</p>
                        <p className="text-xs text-gray-500 truncate">{tab.description}</p>
                      </div>
                      {status === 'complete' && (
                        <FiCheck className="text-green-500 flex-shrink-0" />
                      )}
                      {status === 'incomplete' && (
                        <FiAlertCircle className="text-amber-500 flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </nav>

              {/* Botão de submit no sidebar */}
              <div className="mt-6 pt-4 border-t">
                <button
                  type="submit"
                  disabled={isLoading || !canCreateProduct}
                  className="w-full bg-primary-600 text-white py-3 rounded-md hover:bg-primary-700 font-semibold disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Criando...
                    </>
                  ) : (
                    <>
                      <FiCheck />
                      Criar Produto
                    </>
                  )}
                </button>
                <Link
                  href="/vendedor/produtos"
                  className="w-full mt-2 border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-50 text-center font-medium block"
                >
                  Cancelar
                </Link>
              </div>
            </div>
          </div>

          {/* Conteúdo principal */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-md p-6 min-h-[500px]">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
