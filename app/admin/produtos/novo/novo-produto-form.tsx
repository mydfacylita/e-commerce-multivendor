'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiArrowLeft, FiPackage, FiDollarSign, FiBox, FiTruck, FiTag, FiImage, FiFileText, FiLayers, FiCheck, FiAlertCircle } from 'react-icons/fi'
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

interface Supplier {
  id: string
  name: string
  commission: number
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
  suppliers: Supplier[]
}

// Definição das abas
type TabId = 'basico' | 'precos' | 'dimensoes' | 'imagens' | 'variacoes' | 'especificacoes' | 'dropshipping' | 'tributacao'

interface Tab {
  id: TabId
  name: string
  icon: React.ReactNode
  description: string
}

const TABS: Tab[] = [
  { id: 'basico', name: 'Dados Básicos', icon: <FiPackage />, description: 'Nome, categoria e descrição' },
  { id: 'precos', name: 'Preços e Custos', icon: <FiDollarSign />, description: 'Custos, margem e venda' },
  { id: 'dimensoes', name: 'Peso e Dimensões', icon: <FiBox />, description: 'Medidas para frete' },
  { id: 'imagens', name: 'Imagens', icon: <FiImage />, description: 'Fotos do produto' },
  { id: 'variacoes', name: 'Variações', icon: <FiLayers />, description: 'Tamanhos e cores' },
  { id: 'especificacoes', name: 'Especificações', icon: <FiTag />, description: 'GTIN, marca, modelo' },
  { id: 'dropshipping', name: 'Dropshipping', icon: <FiTruck />, description: 'Fornecedor externo' },
  { id: 'tributacao', name: 'Tributação', icon: <FiFileText />, description: 'NCM, ICMS para NF-e' },
]

export default function NovoProductForm({ categories, suppliers }: NovoProductFormProps) {
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
    costPrice: '',
    shippingCost: '',
    taxCost: '',
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
    supplierId: '',
    supplierSku: '',
    supplierUrl: '',
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
    // Campos de Tributação
    ncm: '',
    cest: '',
    origem: '0',
    cstIcms: '',
    aliquotaIcms: '',
    reducaoBcIcms: '',
    cstPis: '',
    aliquotaPis: '',
    cstCofins: '',
    aliquotaCofins: '',
    cfopInterno: '',
    cfopInterestadual: '',
    unidadeComercial: 'UN',
    unidadeTributavel: 'UN',
    tributacaoEspecial: 'normal',
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

  const calculateTotalCost = () => {
    const cost = parseFloat(formData.costPrice) || 0
    const shipping = parseFloat(formData.shippingCost) || 0
    const tax = parseFloat(formData.taxCost) || 0
    return (cost + shipping + tax).toFixed(2)
  }

  const calculateMargin = () => {
    const totalCost = parseFloat(calculateTotalCost())
    const price = parseFloat(formData.price) || 0
    if (totalCost && price && totalCost > 0) {
      const margin = ((price - totalCost) / totalCost) * 100
      return margin.toFixed(2)
    }
    return '0'
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
      case 'especificacoes':
        if (formData.gtin || formData.brand) return 'complete'
        return 'empty'
      case 'dropshipping':
        if (formData.supplierId) return 'complete'
        return 'empty'
      case 'tributacao':
        if (formData.ncm) return 'complete'
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

    const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-')
    const imageArray = Array.isArray(formData.images) ? formData.images : []

    const cost = parseFloat(formData.costPrice) || 0
    const shipping = parseFloat(formData.shippingCost) || 0
    const tax = parseFloat(formData.taxCost) || 0
    const totalCost = cost + shipping + tax
    const price = parseFloat(formData.price) || 0
    const margin = totalCost && price && totalCost > 0 ? ((price - totalCost) / totalCost) * 100 : 0

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
      costPrice: cost || null,
      shippingCost: shipping || null,
      taxCost: tax || null,
      totalCost: totalCost || null,
      margin: margin || null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      weightWithPackage: formData.weightWithPackage ? parseFloat(formData.weightWithPackage) : null,
      length: formData.length ? parseFloat(formData.length) : null,
      width: formData.width ? parseFloat(formData.width) : null,
      height: formData.height ? parseFloat(formData.height) : null,
      lengthWithPackage: formData.lengthWithPackage ? parseFloat(formData.lengthWithPackage) : null,
      widthWithPackage: formData.widthWithPackage ? parseFloat(formData.widthWithPackage) : null,
      heightWithPackage: formData.heightWithPackage ? parseFloat(formData.heightWithPackage) : null,
      categoryId: formData.categoryId,
      supplierId: formData.supplierId || null,
      supplierSku: formData.supplierSku || null,
      supplierUrl: formData.supplierUrl || null,
      images: imageArray,
      stock: parseInt(formData.stock),
      featured: formData.featured,
      gtin: formData.gtin || null,
      brand: formData.brand || null,
      model: formData.model || null,
      color: formData.color || null,
      mpn: formData.mpn || null,
      technicalSpecs: Object.keys(technicalSpecs).length > 0 ? JSON.stringify(technicalSpecs) : null,
      variants: formData.variants ? formData.variants : null,
      sizeType: formData.sizeType || null,
      sizeCategory: formData.sizeCategory || null,
      bookTitle: formData.bookTitle || null,
      bookAuthor: formData.bookAuthor || null,
      bookGenre: formData.bookGenre || null,
      bookPublisher: formData.bookPublisher || null,
      bookIsbn: formData.bookIsbn || null,
    }

    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Erro ao criar produto')
      }

      toast.success('Produto criado com sucesso!')
      router.push('/admin/produtos')
    } catch (error) {
      toast.error('Erro ao criar produto')
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
                  <AIDescriptionButton
                    description={formData.description}
                    productName={formData.name}
                    onDescriptionChange={(desc) => setFormData({ ...formData, description: desc })}
                  />
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
                  ⭐ Produto em destaque na página inicial
                </label>
              </div>
            </div>
          </div>
        )

      // ==========================================
      // ABA: PREÇOS E CUSTOS
      // ==========================================
      case 'precos':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">💰 Preços e Custos</h3>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Custo do Produto (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">Preço base do fornecedor</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Frete (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.shippingCost}
                  onChange={(e) => setFormData({ ...formData, shippingCost: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">Custo do frete</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Impostos (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.taxCost}
                  onChange={(e) => setFormData({ ...formData, taxCost: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">Taxas/impostos</p>
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-800">Custo Total</p>
                  <p className="text-2xl font-bold text-orange-700">R$ {calculateTotalCost()}</p>
                </div>
                <p className="text-xs text-orange-600">Produto + Frete + Impostos</p>
              </div>
            </div>

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
                <label className="block text-sm font-medium mb-2">Margem de Lucro</label>
                <div className="px-4 py-3 bg-green-50 border-2 border-green-200 rounded-md">
                  <p className="text-2xl font-bold text-green-700">{calculateMargin()}%</p>
                </div>
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
                <p className="text-xs text-gray-500 mt-1">Preço "De:" para promoção</p>
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
                  <label className="block text-sm font-medium mb-2 text-blue-900">Peso (kg) *</label>
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
          </div>
        )

      // ==========================================
      // ABA: ESPECIFICAÇÕES
      // ==========================================
      case 'especificacoes':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">🏷️ Especificações Técnicas</h3>
            <p className="text-sm text-gray-600 mb-4">Campos para integração com Mercado Livre, Shopee e Amazon</p>
            
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
                  <p className="text-xs text-gray-500 mt-1">
                    <Link href="/admin/tipos-produtos" className="text-primary-600 hover:underline">
                      Gerenciar tipos de produtos
                    </Link>
                  </p>
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
                <input
                  type="text"
                  value={formData.gtin}
                  onChange={(e) => setFormData({ ...formData, gtin: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="7891234567890"
                />
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

      // ==========================================
      // ABA: DROPSHIPPING
      // ==========================================
      case 'dropshipping':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">🚚 Informações de Dropshipping</h3>
            <p className="text-sm text-gray-600 mb-4">Configure se este produto é de um fornecedor externo</p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Fornecedor</label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  <option value="">Nenhum (produto próprio)</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name} - Comissão: {supplier.commission}%
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">SKU do Fornecedor</label>
                <input
                  type="text"
                  value={formData.supplierSku}
                  onChange={(e) => setFormData({ ...formData, supplierSku: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="SKU-12345"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">URL do Produto no Fornecedor</label>
                <input
                  type="url"
                  value={formData.supplierUrl}
                  onChange={(e) => setFormData({ ...formData, supplierUrl: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="https://fornecedor.com/produto"
                />
              </div>
            </div>
          </div>
        )

      // ==========================================
      // ABA: TRIBUTAÇÃO
      // ==========================================
      case 'tributacao':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">📋 Tributação Fiscal (NF-e)</h3>
            <p className="text-sm text-gray-600 mb-4">Campos para emissão de Nota Fiscal</p>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">NCM *</label>
                <input
                  type="text"
                  value={formData.ncm}
                  onChange={(e) => setFormData({ ...formData, ncm: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="00000000"
                  maxLength={8}
                />
                <p className="text-xs text-gray-500 mt-1">8 dígitos</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">CEST</label>
                <input
                  type="text"
                  value={formData.cest}
                  onChange={(e) => setFormData({ ...formData, cest: e.target.value.replace(/\D/g, '').slice(0, 7) })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="0000000"
                  maxLength={7}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Origem</label>
                <select
                  value={formData.origem}
                  onChange={(e) => setFormData({ ...formData, origem: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  <option value="0">0 - Nacional</option>
                  <option value="1">1 - Importação direta</option>
                  <option value="2">2 - Mercado interno</option>
                  <option value="3">3 - Nacional, conteúdo import. &gt; 40%</option>
                  <option value="5">5 - Nacional, conteúdo import. ≤ 40%</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Unidade Comercial</label>
                <select
                  value={formData.unidadeComercial}
                  onChange={(e) => setFormData({ ...formData, unidadeComercial: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  <option value="UN">UN - Unidade</option>
                  <option value="PC">PC - Peça</option>
                  <option value="CX">CX - Caixa</option>
                  <option value="KG">KG - Quilograma</option>
                  <option value="PAR">PAR - Par</option>
                  <option value="KIT">KIT - Kit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tributação Especial</label>
                <select
                  value={formData.tributacaoEspecial}
                  onChange={(e) => setFormData({ ...formData, tributacaoEspecial: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  <option value="normal">Normal</option>
                  <option value="monofasico">Monofásico</option>
                  <option value="st">Substituição Tributária</option>
                  <option value="isento">Isento</option>
                </select>
              </div>
            </div>

            {/* Campos avançados */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-primary-600 hover:text-primary-700">
                ⚙️ Configurações Avançadas de Tributação
              </summary>
              <div className="mt-4 p-4 bg-gray-50 rounded border">
                <p className="text-xs text-amber-600 mb-4">
                  ⚠️ Só preencha se este produto tiver tributação diferente das regras padrão.
                </p>
                
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">CST/CSOSN ICMS</label>
                    <select
                      value={formData.cstIcms}
                      onChange={(e) => setFormData({ ...formData, cstIcms: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Usar padrão</option>
                      <option value="00">00 - Tributada</option>
                      <option value="40">40 - Isenta</option>
                      <option value="60">60 - ICMS ST</option>
                      <option value="102">102 - SN sem crédito</option>
                      <option value="500">500 - ICMS ST</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Alíquota ICMS (%)</label>
                    <input
                      type="text"
                      value={formData.aliquotaIcms}
                      onChange={(e) => setFormData({ ...formData, aliquotaIcms: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="18"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Redução BC (%)</label>
                    <input
                      type="text"
                      value={formData.reducaoBcIcms}
                      onChange={(e) => setFormData({ ...formData, reducaoBcIcms: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="33.33"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">CST PIS</label>
                    <select
                      value={formData.cstPis}
                      onChange={(e) => setFormData({ ...formData, cstPis: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Usar padrão</option>
                      <option value="01">01 - Tributável</option>
                      <option value="04">04 - Monofásico</option>
                      <option value="06">06 - Alíquota Zero</option>
                      <option value="07">07 - Isenta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Alíq. PIS (%)</label>
                    <input
                      type="text"
                      value={formData.aliquotaPis}
                      onChange={(e) => setFormData({ ...formData, aliquotaPis: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="1.65"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">CST COFINS</label>
                    <select
                      value={formData.cstCofins}
                      onChange={(e) => setFormData({ ...formData, cstCofins: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Usar padrão</option>
                      <option value="01">01 - Tributável</option>
                      <option value="04">04 - Monofásico</option>
                      <option value="06">06 - Alíquota Zero</option>
                      <option value="07">07 - Isenta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Alíq. COFINS (%)</label>
                    <input
                      type="text"
                      value={formData.aliquotaCofins}
                      onChange={(e) => setFormData({ ...formData, aliquotaCofins: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="7.60"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">CFOP Interno</label>
                    <input
                      type="text"
                      value={formData.cfopInterno}
                      onChange={(e) => setFormData({ ...formData, cfopInterno: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="5102"
                      maxLength={4}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">CFOP Interestadual</label>
                    <input
                      type="text"
                      value={formData.cfopInterestadual}
                      onChange={(e) => setFormData({ ...formData, cfopInterestadual: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="6102"
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>
            </details>
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
    <div>
      <Link
        href="/admin/produtos"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
      >
        <FiArrowLeft className="mr-2" />
        Voltar para Produtos
      </Link>

      <h1 className="text-3xl font-bold mb-8">Novo Produto</h1>

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
                  disabled={isLoading}
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
                  href="/admin/produtos"
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
