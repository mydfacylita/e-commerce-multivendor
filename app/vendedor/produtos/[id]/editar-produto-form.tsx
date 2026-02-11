'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiArrowLeft, FiPackage, FiDollarSign, FiBox, FiTag, FiImage, FiLayers, FiCheck, FiAlertCircle, FiList, FiPlus, FiTrash2, FiLock, FiStar, FiCreditCard } from 'react-icons/fi'
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

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  comparePrice: number | null
  weight: number | null
  weightWithPackage: number | null
  length: number | null
  width: number | null
  height: number | null
  lengthWithPackage: number | null
  widthWithPackage: number | null
  heightWithPackage: number | null
  categoryId: string
  images: string
  stock: number
  featured: boolean
  isDropshipping: boolean
  gtin: string | null
  brand: string | null
  model: string | null
  color: string | null
  mpn: string | null
  sizeType: string | null
  sizeCategory: string | null
  variants: string | null
  technicalSpecs: string | null
  attributes: string | null
  bookTitle: string | null
  bookAuthor: string | null
  bookGenre: string | null
  bookPublisher: string | null
  bookIsbn: string | null
  acceptsCreditCard: boolean | null
  maxInstallments: number | null
  installmentsFreeInterest: number | null
  category: {
    id: string
    name: string
  }
}

interface ProductType {
  id: string
  name: string
  slug: string
  icon?: string
  active: boolean
}

interface ProductAttribute {
  nome: string
  valor: string
}

interface EditarProductFormProps {
  product: Product
  categories: Category[]
  minPrice?: number
}

type TabId = 'basico' | 'precos' | 'dimensoes' | 'imagens' | 'variacoes' | 'atributos' | 'especificacoes' | 'pagamento'

interface Tab {
  id: TabId
  name: string
  icon: React.ReactNode
  description: string
}

const TABS: Tab[] = [
  { id: 'basico', name: 'Dados Básicos', icon: <FiPackage />, description: 'Nome, categoria e descrição' },
  { id: 'precos', name: 'Preços e Estoque', icon: <FiDollarSign />, description: 'Preço de venda e estoque' },
  { id: 'dimensoes', name: 'Peso e Dimensões', icon: <FiBox />, description: 'Medidas para frete' },
  { id: 'imagens', name: 'Imagens', icon: <FiImage />, description: 'Fotos do produto' },
  { id: 'variacoes', name: 'Variações', icon: <FiLayers />, description: 'Tamanhos e cores' },
  { id: 'atributos', name: 'Atributos', icon: <FiList />, description: 'Características livres' },
  { id: 'especificacoes', name: 'Especificações', icon: <FiTag />, description: 'GTIN, marca, modelo' },
  { id: 'pagamento', name: 'Pagamento', icon: <FiCreditCard />, description: 'Regras de parcelamento' },
]

export default function EditarProductForm({ product, categories, minPrice = 0 }: EditarProductFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('basico')
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [priceError, setPriceError] = useState('')

  const parseImages = (): string[] => {
    try {
      const parsed = JSON.parse(product.images)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const parseVariants = (): any[] => {
    try {
      if (!product.variants) return []
      const parsed = JSON.parse(product.variants)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const parseAttributes = (): ProductAttribute[] => {
    try {
      if (!product.attributes) return []
      const parsed = JSON.parse(product.attributes)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const parseTechnicalSpecs = (): any => {
    try {
      if (!product.technicalSpecs) return {}
      return JSON.parse(product.technicalSpecs)
    } catch {
      return {}
    }
  }

  const techSpecs = parseTechnicalSpecs()

  const [formData, setFormData] = useState({
    name: product.name,
    slug: product.slug,
    description: product.description || '',
    price: product.price.toString(),
    comparePrice: product.comparePrice?.toString() || '',
    weight: product.weight?.toString() || '',
    weightWithPackage: product.weightWithPackage?.toString() || '',
    length: product.length?.toString() || '',
    width: product.width?.toString() || '',
    height: product.height?.toString() || '',
    lengthWithPackage: product.lengthWithPackage?.toString() || '',
    widthWithPackage: product.widthWithPackage?.toString() || '',
    heightWithPackage: product.heightWithPackage?.toString() || '',
    categoryId: product.categoryId,
    images: parseImages(),
    stock: product.stock.toString(),
    featured: product.featured,
    productType: techSpecs.product_type || '',
    mlCategoryId: techSpecs.ml_category_id || '',
    gtin: product.gtin || '',
    brand: product.brand || '',
    model: product.model || '',
    color: product.color || '',
    mpn: product.mpn || '',
    sizeType: product.sizeType || '',
    sizeCategory: product.sizeCategory || '',
    colorType: 'Única' as 'Única' | 'Variada',
    variants: product.variants || '',
    ram: techSpecs.memória_ram || '',
    storage: techSpecs.armazenamento || '',
    anatelNumber: techSpecs.anatel || '',
    isDualSim: techSpecs.dual_sim || 'Não',
    carrier: techSpecs.operadora || 'Desbloqueado',
    bookTitle: product.bookTitle || '',
    bookAuthor: product.bookAuthor || '',
    bookGenre: product.bookGenre || '',
    bookPublisher: product.bookPublisher || '',
    bookIsbn: product.bookIsbn || '',
    attributes: parseAttributes(),
    acceptsCreditCard: product.acceptsCreditCard,
    maxInstallments: product.maxInstallments,
    installmentsFreeInterest: product.installmentsFreeInterest,
  })

  const isDropshipping = product.isDropshipping
  const canUseAI = true
  const canUseVariants = true

  useEffect(() => {
    fetchProductTypes()
    const variants = parseVariants()
    if (variants.length > 0) {
      const colors = new Set(variants.map(v => v.color))
      if (colors.size > 1) {
        setFormData(prev => ({ ...prev, colorType: 'Variada' }))
      }
    }
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

  const handlePriceChange = (value: string) => {
    const price = parseFloat(value) || 0
    if (isDropshipping && minPrice > 0 && price < minPrice) {
      setPriceError(`Preço mínimo é R$ ${minPrice.toFixed(2)}`)
    } else {
      setPriceError('')
    }
    setFormData({ ...formData, price: value })
  }

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
      case 'pagamento':
        if (formData.acceptsCreditCard !== null || formData.maxInstallments !== null) return 'complete'
        return 'empty'
      default:
        return 'empty'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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

    if (isDropshipping && minPrice > 0) {
      const price = parseFloat(formData.price) || 0
      if (price < minPrice) {
        toast.error(`O preço deve ser no mínimo R$ ${minPrice.toFixed(2)}`)
        setActiveTab('precos')
        return
      }
    }
    
    setIsLoading(true)

    const slug = formData.slug || formData.name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    const technicalSpecs: any = {}
    if (formData.productType) technicalSpecs.product_type = formData.productType
    if (formData.mlCategoryId) technicalSpecs.ml_category_id = formData.mlCategoryId
    if (formData.ram) technicalSpecs.memória_ram = formData.ram
    if (formData.storage) technicalSpecs.armazenamento = formData.storage
    if (formData.anatelNumber) technicalSpecs.anatel = formData.anatelNumber
    if (formData.isDualSim) technicalSpecs.dual_sim = formData.isDualSim
    if (formData.carrier) technicalSpecs.operadora = formData.carrier

    const payload = isDropshipping ? {
      description: formData.description,
      price: parseFloat(formData.price),
      acceptsCreditCard: formData.acceptsCreditCard,
      maxInstallments: formData.maxInstallments,
      installmentsFreeInterest: formData.installmentsFreeInterest,
    } : {
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
      images: formData.images,
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
      acceptsCreditCard: formData.acceptsCreditCard,
      maxInstallments: formData.maxInstallments,
      installmentsFreeInterest: formData.installmentsFreeInterest,
    }

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao atualizar produto')
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basico':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">📦 Dados Básicos do Produto</h3>
            
            {isDropshipping && (
              <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-orange-700 text-sm flex items-center gap-2">
                  <FiAlertCircle />
                  <strong>Produto de Dropshipping:</strong> Você pode editar apenas a Descrição e o Preço
                </p>
              </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isDropshipping}
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600 ${
                    isDropshipping ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  placeholder="Ex: Camiseta Premium"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  disabled={isDropshipping}
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600 ${
                    isDropshipping ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  placeholder="camiseta-premium"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Categoria *</label>
                <select
                  required
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  disabled={isDropshipping}
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600 ${
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
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">
                  Descrição
                  {isDropshipping && <span className="text-green-600 ml-2">✓ Editável</span>}
                </label>
                {canUseAI && !isDropshipping && (
                  <AIDescriptionButton
                    description={formData.description}
                    productName={formData.name}
                    onDescriptionChange={(desc) => setFormData({ ...formData, description: desc })}
                  />
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

            {!isDropshipping && (
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
            )}
          </div>
        )

      case 'precos':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">💰 Preços e Estoque</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Preço de Venda (R$) *
                  {isDropshipping && <span className="text-green-600 ml-2">✓ Editável</span>}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min={minPrice > 0 ? minPrice : undefined}
                  value={formData.price}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className={`w-full px-4 py-3 border-2 border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600 text-lg font-semibold ${
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
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600 ${
                    isDropshipping ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
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
                  disabled={isDropshipping}
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600 ${
                    isDropshipping ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  placeholder="0"
                />
              </div>
            </div>

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

      case 'dimensoes':
        if (isDropshipping) {
          return (
            <div className="text-center py-12 text-gray-500">
              <FiLock size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Campo bloqueado para produtos de dropshipping</p>
            </div>
          )
        }
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">📦 Peso e Dimensões</h3>
            <p className="text-sm text-gray-600 mb-4">Informações importantes para cálculo de frete</p>
            
            <div className="grid md:grid-cols-2 gap-6">
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

      case 'imagens':
        if (isDropshipping) {
          return (
            <div className="text-center py-12 text-gray-500">
              <FiLock size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Campo bloqueado para produtos de dropshipping</p>
            </div>
          )
        }
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">🖼️ Imagens do Produto</h3>
            <p className="text-sm text-gray-600 mb-4">Adicione até 10 imagens do produto</p>
            <ImageUploader
              images={formData.images}
              onImagesChange={(images) => setFormData({ ...formData, images })}
              maxImages={10}
            />
          </div>
        )

      case 'variacoes':
        if (isDropshipping) {
          return (
            <div className="text-center py-12 text-gray-500">
              <FiLock size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Campo bloqueado para produtos de dropshipping</p>
            </div>
          )
        }
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">🎨 Variações do Produto</h3>
            <p className="text-sm text-gray-600 mb-4">Configure tamanhos, cores e outras variações</p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Tipo de Cor</label>
              <select
                value={formData.colorType}
                onChange={(e) => setFormData({ ...formData, colorType: e.target.value as 'Única' | 'Variada' })}
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
              productImages={formData.images}
              variants={(() => {
                try {
                  if (!formData.variants || formData.variants === '') return []
                  const parsed = JSON.parse(formData.variants)
                  return Array.isArray(parsed) ? parsed : []
                } catch (e) {
                  return []
                }
              })()}
              onVariantsChange={(variants) => setFormData(prev => ({ ...prev, variants: JSON.stringify(variants) }))}
              onSizeTypeChange={(type) => setFormData(prev => ({ ...prev, sizeType: type }))}
              onSizeCategoryChange={(category) => setFormData(prev => ({ ...prev, sizeCategory: category }))}
              onTotalStockChange={(totalStock) => setFormData(prev => ({ ...prev, stock: totalStock.toString() }))}
              basePrice={formData.price ? parseFloat(formData.price) : undefined}
            />
          </div>
        )

      case 'atributos':
        if (isDropshipping) {
          return (
            <div className="text-center py-12 text-gray-500">
              <FiLock size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Campo bloqueado para produtos de dropshipping</p>
            </div>
          )
        }
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">📋 Atributos Personalizados</h3>
            <p className="text-sm text-gray-600 mb-4">Adicione características livres ao seu produto.</p>
            
            <div className="space-y-3">
              {formData.attributes.map((attr, index) => (
                <div key={index} className="flex gap-3 items-start bg-gray-50 p-3 rounded-lg border">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
                    <input
                      type="text"
                      value={attr.nome}
                      onChange={(e) => {
                        const newAttrs = [...formData.attributes]
                        newAttrs[index].nome = e.target.value
                        setFormData({ ...formData, attributes: newAttrs })
                      }}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                      placeholder="Ex: Material"
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
                      placeholder="Ex: Algodão"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newAttrs = formData.attributes.filter((_, i) => i !== index)
                      setFormData({ ...formData, attributes: newAttrs })
                    }}
                    className="mt-6 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setFormData({
                ...formData,
                attributes: [...formData.attributes, { nome: '', valor: '' }]
              })}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              <FiPlus size={18} />
              Adicionar Atributo
            </button>
          </div>
        )

      case 'especificacoes':
        if (isDropshipping) {
          return (
            <div className="text-center py-12 text-gray-500">
              <FiLock size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Campo bloqueado para produtos de dropshipping</p>
            </div>
          )
        }
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">🏷️ Especificações Técnicas</h3>
            
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
                    {productTypes.map((type) => (
                      <option key={type.id} value={type.slug}>{type.icon} {type.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Categoria ML</label>
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

            {formData.productType === 'celular' && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-6">
                <h4 className="font-medium mb-4">📱 Campos para Celulares</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Memória RAM</label>
                    <input type="text" value={formData.ram} onChange={(e) => setFormData({ ...formData, ram: e.target.value })} className="w-full px-4 py-2 border rounded-md" placeholder="8GB" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Armazenamento</label>
                    <input type="text" value={formData.storage} onChange={(e) => setFormData({ ...formData, storage: e.target.value })} className="w-full px-4 py-2 border rounded-md" placeholder="256GB" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Número ANATEL</label>
                    <input type="text" value={formData.anatelNumber} onChange={(e) => setFormData({ ...formData, anatelNumber: e.target.value })} className="w-full px-4 py-2 border rounded-md" placeholder="12345-67-8901" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Dual SIM</label>
                    <select value={formData.isDualSim} onChange={(e) => setFormData({ ...formData, isDualSim: e.target.value })} className="w-full px-4 py-2 border rounded-md">
                      <option value="Não">Não</option>
                      <option value="Sim">Sim</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Operadora</label>
                    <select value={formData.carrier} onChange={(e) => setFormData({ ...formData, carrier: e.target.value })} className="w-full px-4 py-2 border rounded-md">
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

            {formData.productType === 'livro' && (
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mt-6">
                <h4 className="font-medium mb-4">📚 Campos para Livros</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Título</label>
                    <input type="text" value={formData.bookTitle} onChange={(e) => setFormData({ ...formData, bookTitle: e.target.value })} className="w-full px-4 py-2 border rounded-md" placeholder="Clean Code" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Autor</label>
                    <input type="text" value={formData.bookAuthor} onChange={(e) => setFormData({ ...formData, bookAuthor: e.target.value })} className="w-full px-4 py-2 border rounded-md" placeholder="Robert C. Martin" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Editora</label>
                    <input type="text" value={formData.bookPublisher} onChange={(e) => setFormData({ ...formData, bookPublisher: e.target.value })} className="w-full px-4 py-2 border rounded-md" placeholder="Prentice Hall" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Gênero</label>
                    <select value={formData.bookGenre} onChange={(e) => setFormData({ ...formData, bookGenre: e.target.value })} className="w-full px-4 py-2 border rounded-md">
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
                    <input type="text" value={formData.bookIsbn} onChange={(e) => setFormData({ ...formData, bookIsbn: e.target.value })} className="w-full px-4 py-2 border rounded-md" placeholder="978-0132350884" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      case 'pagamento':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">💳 Configurações de Pagamento</h3>
            <p className="text-sm text-gray-500 mb-4">Configure regras específicas de pagamento para este produto.</p>
            
            <div className="grid md:grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Aceita Cartão de Crédito</label>
                <select
                  value={formData.acceptsCreditCard === null ? 'default' : formData.acceptsCreditCard ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, acceptsCreditCard: e.target.value === 'default' ? null : e.target.value === 'true' })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
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
                  onChange={(e) => setFormData({ ...formData, maxInstallments: e.target.value === 'default' ? null : parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
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
                  onChange={(e) => setFormData({ ...formData, installmentsFreeInterest: e.target.value === 'default' ? null : parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
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
        )

      default:
        return null
    }
  }

  return (
    <div className="p-8">
      <Link href="/vendedor/produtos" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <FiArrowLeft className="mr-2" />
        Voltar para Produtos
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Editar Produto</h1>
          <p className="text-gray-600">
            {isDropshipping ? <span className="text-orange-600">Produto de Dropshipping - Edição limitada</span> : 'Atualize as informações do produto'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex gap-6">
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-4">
              <h3 className="font-semibold text-gray-500 uppercase text-xs mb-4">Seções</h3>
              <nav className="space-y-1">
                {TABS.map((tab) => {
                  const status = getTabStatus(tab.id)
                  const isDisabled = isDropshipping && !['basico', 'precos', 'pagamento'].includes(tab.id)
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary-100 text-primary-700 border-l-4 border-primary-600'
                          : isDisabled
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span className={`text-lg ${activeTab === tab.id ? 'text-primary-600' : isDisabled ? 'text-gray-300' : 'text-gray-400'}`}>
                        {isDisabled ? <FiLock /> : tab.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tab.name}</p>
                        <p className="text-xs text-gray-500 truncate">{tab.description}</p>
                      </div>
                      {status === 'complete' && !isDisabled && <FiCheck className="text-green-500 flex-shrink-0" />}
                      {status === 'incomplete' && !isDisabled && <FiAlertCircle className="text-amber-500 flex-shrink-0" />}
                    </button>
                  )
                })}
              </nav>

              <div className="mt-6 pt-4 border-t">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary-600 text-white py-3 rounded-md hover:bg-primary-700 font-semibold disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <FiCheck />
                      Atualizar Produto
                    </>
                  )}
                </button>
                <Link href="/vendedor/produtos" className="w-full mt-2 border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-50 text-center font-medium block">
                  Cancelar
                </Link>
              </div>
            </div>
          </div>

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
