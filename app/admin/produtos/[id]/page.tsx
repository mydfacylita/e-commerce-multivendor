'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiArrowLeft, FiPackage, FiDollarSign, FiBox, FiTruck, FiTag, FiImage, FiFileText, FiLayers, FiCheck, FiAlertCircle, FiList, FiPlus, FiTrash2 } from 'react-icons/fi'
import toast from 'react-hot-toast'
import ImageUploader from '@/components/admin/ImageUploader'
import ProductVariantsManager from '@/components/admin/ProductVariantsManager'
import ImportedProductVariantsManager from '@/components/admin/ImportedProductVariantsManager'
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

// Definição das abas
type TabId = 'basico' | 'precos' | 'dimensoes' | 'imagens' | 'variacoes' | 'atributos' | 'especificacoes' | 'dropshipping' | 'tributacao'

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
}

const TABS: Tab[] = [
  { id: 'basico', name: 'Dados Básicos', icon: <FiPackage />, description: 'Nome, categoria e descrição' },
  { id: 'precos', name: 'Preços e Custos', icon: <FiDollarSign />, description: 'Custos, margem e venda' },
  { id: 'dimensoes', name: 'Peso e Dimensões', icon: <FiBox />, description: 'Medidas para frete' },
  { id: 'imagens', name: 'Imagens', icon: <FiImage />, description: 'Fotos do produto' },
  { id: 'variacoes', name: 'Variações', icon: <FiLayers />, description: 'Tamanhos e cores' },
  { id: 'atributos', name: 'Atributos', icon: <FiList />, description: 'Características livres' },
  { id: 'especificacoes', name: 'Especificações', icon: <FiTag />, description: 'GTIN, marca, modelo' },
  { id: 'dropshipping', name: 'Dropshipping', icon: <FiTruck />, description: 'Fornecedor externo' },
  { id: 'tributacao', name: 'Tributação', icon: <FiFileText />, description: 'NCM, ICMS para NF-e' },
]

export default function EditarProdutoPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('basico')
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    comparePrice: '',
    costPrice: '',
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
    ram: '',
    storage: '',
    anatelNumber: '',
    isDualSim: 'Não',
    carrier: 'Desbloqueado',
    bookTitle: '',
    bookAuthor: '',
    bookGenre: '',
    bookPublisher: '',
    bookIsbn: '',
    sizeType: '',
    sizeCategory: '',
    colorType: 'Única' as 'Única' | 'Variada',
    variants: '',
    selectedSkus: '' as string,
    supplierName: '' as string,
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
    attributes: [] as ProductAttribute[],
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productRes, categoriesRes, suppliersRes, productTypesRes] = await Promise.all([
          fetch(`/api/admin/products/${params.id}`),
          fetch('/api/admin/categories'),
          fetch('/api/admin/suppliers'),
          fetch('/api/admin/product-types'),
        ])

        if (!productRes.ok) throw new Error('Produto não encontrado')

        const product = await productRes.json()
        const categoriesData = await categoriesRes.json()
        const suppliersData = await suppliersRes.json()
        const productTypesData = await productTypesRes.json()

        setCategories(Array.isArray(categoriesData) ? categoriesData : [])
        setSuppliers(suppliersData?.suppliers || (Array.isArray(suppliersData) ? suppliersData : []))
        setProductTypes(Array.isArray(productTypesData) ? productTypesData : [])

        let techSpecs: any = {}
        try {
          if (product.technicalSpecs) {
            techSpecs = typeof product.technicalSpecs === 'string' 
              ? JSON.parse(product.technicalSpecs)
              : product.technicalSpecs
          }
        } catch (e) {
          console.error('Erro ao parsear technicalSpecs:', e)
        }

        let imagesArray: string[] = []
        if (product.images) {
          if (Array.isArray(product.images)) {
            imagesArray = product.images.map((img: any) => {
              if (typeof img === 'string') {
                try {
                  const parsed = JSON.parse(img)
                  return Array.isArray(parsed) ? parsed : [img]
                } catch {
                  return img
                }
              }
              return img
            }).flat().filter((img: string) => img && img.trim())
          } else if (typeof product.images === 'string') {
            try {
              let parsed = JSON.parse(product.images)
              while (typeof parsed === 'string') {
                parsed = JSON.parse(parsed)
              }
              imagesArray = Array.isArray(parsed) ? parsed : [parsed]
            } catch {
              imagesArray = product.images.split('\n').filter((img: string) => img.trim())
            }
          }
        }

        let variantsString = ''
        if (product.variants) {
          if (Array.isArray(product.variants)) {
            const cleanVariants = product.variants.map((v: any) => {
              if (typeof v === 'string') {
                try { return JSON.parse(v) } catch { return v }
              }
              return v
            }).flat()
            variantsString = JSON.stringify(cleanVariants, null, 2)
          } else if (typeof product.variants === 'string') {
            try {
              let parsed = product.variants
              while (typeof parsed === 'string') { parsed = JSON.parse(parsed) }
              variantsString = JSON.stringify(parsed, null, 2)
            } catch (e) {
              variantsString = product.variants
            }
          }
        } else if (product.sizes) {
          try {
            const oldSizes = typeof product.sizes === 'string' ? JSON.parse(product.sizes) : product.sizes
            if (Array.isArray(oldSizes)) {
              const converted = oldSizes.map((s: any) => ({
                size: s.size || '',
                color: product.color || 'Padrão',
                colorHex: '#808080',
                stock: s.stock || 0,
                price: s.price
              }))
              variantsString = JSON.stringify(converted, null, 2)
            }
          } catch (e) { console.error('Erro ao converter sizes antigas:', e) }
        }

        setFormData({
          name: product.name || '',
          slug: product.slug || '',
          description: product.description || '',
          price: product.price?.toString() || '',
          comparePrice: product.comparePrice?.toString() || '',
          costPrice: product.costPrice?.toString() || '',
          weight: product.weight?.toString() || '',
          weightWithPackage: product.weightWithPackage?.toString() || '',
          length: product.length?.toString() || '',
          width: product.width?.toString() || '',
          height: product.height?.toString() || '',
          lengthWithPackage: product.lengthWithPackage?.toString() || '',
          widthWithPackage: product.widthWithPackage?.toString() || '',
          heightWithPackage: product.heightWithPackage?.toString() || '',
          categoryId: product.categoryId || '',
          supplierId: product.supplierId || '',
          supplierSku: product.supplierSku || '',
          supplierUrl: product.supplierUrl || '',
          images: imagesArray,
          stock: product.stock?.toString() || '',
          featured: product.featured || false,
          productType: techSpecs.product_type || '',
          mlCategoryId: techSpecs.ml_category_id || '',
          gtin: product.gtin || '',
          brand: product.brand || '',
          model: product.model || '',
          color: product.color || '',
          mpn: product.mpn || '',
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
          sizeType: product.sizeType || '',
          sizeCategory: product.sizeCategory || '',
          colorType: variantsString ? 'Variada' : 'Única',
          variants: variantsString,
          selectedSkus: product.selectedSkus || '',
          supplierName: product.supplier?.name || '',
          ncm: product.ncm || '',
          cest: product.cest || '',
          origem: product.origem || '0',
          cstIcms: product.cstIcms || '',
          aliquotaIcms: product.aliquotaIcms?.toString() || '',
          reducaoBcIcms: product.reducaoBcIcms?.toString() || '',
          cstPis: product.cstPis || '',
          aliquotaPis: product.aliquotaPis?.toString() || '',
          cstCofins: product.cstCofins || '',
          aliquotaCofins: product.aliquotaCofins?.toString() || '',
          cfopInterno: product.cfopInterno || '',
          cfopInterestadual: product.cfopInterestadual || '',
          unidadeComercial: product.unidadeComercial || 'UN',
          unidadeTributavel: product.unidadeTributavel || 'UN',
          tributacaoEspecial: product.tributacaoEspecial || 'normal',
          attributes: (() => {
            try {
              if (product.attributes) {
                const parsed = typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes
                return Array.isArray(parsed) ? parsed : []
              }
              return []
            } catch { return [] }
          })(),
        })
      } catch (error) {
        toast.error('Erro ao carregar produto')
        router.push('/admin/produtos')
      } finally {
        setIsFetching(false)
      }
    }
    fetchData()
  }, [params.id, router])

  const calculateMargin = () => {
    const cost = parseFloat(formData.costPrice) || 0
    const price = parseFloat(formData.price) || 0
    if (cost && price && cost > 0) {
      const margin = ((price - cost) / cost) * 100
      return margin.toFixed(2)
    }
    return '0'
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
    
    if (!formData.name) { toast.error('Nome do produto é obrigatório'); setActiveTab('basico'); return }
    if (!formData.categoryId) { toast.error('Categoria é obrigatória'); setActiveTab('basico'); return }
    if (!formData.price) { toast.error('Preço de venda é obrigatório'); setActiveTab('precos'); return }
    if (!formData.stock) { toast.error('Estoque é obrigatório'); setActiveTab('precos'); return }
    
    setIsLoading(true)

    const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-')
    const cost = parseFloat(formData.costPrice) || 0
    const price = parseFloat(formData.price) || 0
    const margin = cost && price && cost > 0 ? ((price - cost) / cost) * 100 : 0

    const technicalSpecs: any = {}
    if (formData.productType) technicalSpecs.product_type = formData.productType
    if (formData.mlCategoryId) technicalSpecs.ml_category_id = formData.mlCategoryId
    if (formData.ram) technicalSpecs.memória_ram = formData.ram
    if (formData.storage) technicalSpecs.armazenamento = formData.storage
    if (formData.anatelNumber) technicalSpecs.anatel = formData.anatelNumber
    if (formData.isDualSim) technicalSpecs.dual_sim = formData.isDualSim
    if (formData.carrier) technicalSpecs.operadora = formData.carrier

    try {
      const response = await fetch(`/api/admin/products/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          slug,
          description: formData.description,
          price: parseFloat(formData.price),
          comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : null,
          costPrice: cost || null,
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
          images: formData.images,
          stock: parseInt(formData.stock),
          featured: formData.featured,
          gtin: formData.gtin || null,
          brand: formData.brand || null,
          technicalSpecs: Object.keys(technicalSpecs).length > 0 ? JSON.stringify(technicalSpecs) : null,
          model: formData.model || null,
          color: formData.color || null,
          mpn: formData.mpn || null,
          bookTitle: formData.bookTitle || null,
          bookAuthor: formData.bookAuthor || null,
          bookGenre: formData.bookGenre || null,
          bookPublisher: formData.bookPublisher || null,
          bookIsbn: formData.bookIsbn || null,
          variants: formData.variants ? formData.variants : null,
          selectedSkus: formData.selectedSkus ? formData.selectedSkus : null,
          sizeType: formData.sizeType || null,
          sizeCategory: formData.sizeCategory || null,
          attributes: formData.attributes.length > 0 ? JSON.stringify(formData.attributes) : null,
        }),
      })

      if (!response.ok) throw new Error('Erro ao atualizar produto')

      toast.success('Produto atualizado com sucesso!')
      setTimeout(() => { router.push('/admin/produtos') }, 500)
    } catch (error) {
      toast.error('Erro ao atualizar produto')
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
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Nome do Produto *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600" placeholder="Ex: Camiseta Premium" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Slug</label>
                <input type="text" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600" placeholder="camiseta-premium" />
                <p className="text-xs text-gray-500 mt-1">Deixe em branco para gerar automaticamente</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Categoria *</label>
                <select required value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600">
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
                <AIDescriptionButton description={formData.description} productName={formData.name} onDescriptionChange={(desc) => setFormData({ ...formData, description: desc })} />
              </div>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600" rows={6} placeholder="Descrição detalhada do produto..." />
            </div>

            <div className="mt-6 flex items-center">
              <input type="checkbox" id="featured" checked={formData.featured} onChange={(e) => setFormData({ ...formData, featured: e.target.checked })} className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
              <label htmlFor="featured" className="ml-2 text-sm font-medium">⭐ Produto em destaque na página inicial</label>
            </div>
          </div>
        )

      case 'precos':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">💰 Preços e Custos</h3>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Custo do Produto (R$)</label>
                <input type="number" step="0.01" value={formData.costPrice} onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600" placeholder="0.00" />
                <p className="text-xs text-gray-500 mt-1">Preço base do fornecedor</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Preço de Venda (R$) *</label>
                <input type="number" step="0.01" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-4 py-3 border-2 border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600 text-lg font-semibold" placeholder="0.00" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Margem de Lucro</label>
                <div className="px-4 py-3 bg-green-50 border-2 border-green-200 rounded-md">
                  <p className="text-2xl font-bold text-green-700">{calculateMargin()}%</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Preço Comparação (R$)</label>
                <input type="number" step="0.01" value={formData.comparePrice} onChange={(e) => setFormData({ ...formData, comparePrice: e.target.value })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600" placeholder="0.00" />
                <p className="text-xs text-gray-500 mt-1">Preço "De:" para promoção</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Estoque *</label>
                <input type="number" required value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600" placeholder="0" disabled={formData.sizeCategory !== ''} />
                {formData.sizeCategory && <p className="text-xs text-blue-600 mt-1">ℹ️ Estoque calculado automaticamente pela soma dos tamanhos</p>}
              </div>
            </div>
          </div>
        )

      case 'dimensoes':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">📦 Peso e Dimensões</h3>
            <p className="text-sm text-gray-600 mb-4">Informações importantes para cálculo de frete</p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h4 className="font-medium mb-4">📏 Produto (sem embalagem)</h4>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Peso (kg)</label>
                  <input type="number" step="0.001" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600" placeholder="0.500" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs mb-1">Comp. (cm)</label>
                    <input type="number" step="0.1" value={formData.length} onChange={(e) => setFormData({ ...formData, length: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="20" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Larg. (cm)</label>
                    <input type="number" step="0.1" value={formData.width} onChange={(e) => setFormData({ ...formData, width: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="15" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Alt. (cm)</label>
                    <input type="number" step="0.1" value={formData.height} onChange={(e) => setFormData({ ...formData, height: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="5" />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium mb-4 text-blue-900">📦 Com Embalagem</h4>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-blue-900">Peso (kg) *</label>
                  <input type="number" step="0.001" value={formData.weightWithPackage} onChange={(e) => setFormData({ ...formData, weightWithPackage: e.target.value })} className="w-full px-4 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="0.600" />
                  <p className="text-xs text-blue-600 mt-1">Usado no cálculo de frete</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs mb-1 text-blue-900">Comp. (cm)</label>
                    <input type="number" step="0.1" value={formData.lengthWithPackage} onChange={(e) => setFormData({ ...formData, lengthWithPackage: e.target.value })} className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm" placeholder="22" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-blue-900">Larg. (cm)</label>
                    <input type="number" step="0.1" value={formData.widthWithPackage} onChange={(e) => setFormData({ ...formData, widthWithPackage: e.target.value })} className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm" placeholder="17" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-blue-900">Alt. (cm)</label>
                    <input type="number" step="0.1" value={formData.heightWithPackage} onChange={(e) => setFormData({ ...formData, heightWithPackage: e.target.value })} className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm" placeholder="7" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'imagens':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">🖼️ Imagens do Produto</h3>
            <p className="text-sm text-gray-600 mb-4">Adicione até 10 imagens do produto</p>
            <ImageUploader images={Array.isArray(formData.images) ? formData.images : String(formData.images).split('\n').filter(img => img.trim())} onImagesChange={(images) => setFormData({ ...formData, images })} maxImages={10} />
          </div>
        )

      case 'variacoes':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">🎨 Variações do Produto</h3>
            <p className="text-sm text-gray-600 mb-4">Configure tamanhos, cores e outras variações</p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Tipo de Cor</label>
              <select value={formData.colorType} onChange={(e) => { setFormData({ ...formData, colorType: e.target.value as 'Única' | 'Variada' }); if (e.target.value === 'Única') { setFormData(prev => ({ ...prev, variants: '' })) } }} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600">
                <option value="Única">Única (uma cor)</option>
                <option value="Variada">Variada (múltiplas cores)</option>
              </select>
            </div>

            {formData.colorType === 'Única' && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Cor do Produto</label>
                <input type="text" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600" placeholder="Preto, Azul, Vermelho..." />
              </div>
            )}

            {formData.supplierName || formData.supplierId ? (
              <ImportedProductVariantsManager productId={params.id} variantsJson={formData.variants} selectedSkus={(() => { try { if (!formData.selectedSkus) return []; return JSON.parse(formData.selectedSkus) } catch { return [] } })()} supplierName={formData.supplierName || 'AliExpress'} onVariantsChange={(selectedSkus) => { setFormData(prev => ({ ...prev, selectedSkus: JSON.stringify(selectedSkus) })) }} />
            ) : (
              <ProductVariantsManager sizeType={formData.sizeType} sizeCategory={formData.sizeCategory} colorType={formData.colorType} singleColor={formData.color} productImages={formData.images} variants={(() => { try { if (!formData.variants || formData.variants === '') return []; let parsed = formData.variants; while (typeof parsed === 'string') { parsed = JSON.parse(parsed) }; return Array.isArray(parsed) ? parsed : [] } catch (e) { return [] } })()} onVariantsChange={(variants) => { setFormData(prev => ({ ...prev, variants: JSON.stringify(variants) })) }} onSizeTypeChange={(type) => { setFormData(prev => ({ ...prev, sizeType: type })) }} onSizeCategoryChange={(category) => { setFormData(prev => ({ ...prev, sizeCategory: category })) }} onTotalStockChange={(totalStock) => { setFormData(prev => ({ ...prev, stock: totalStock.toString() })) }} basePrice={formData.price ? parseFloat(formData.price) : undefined} />
            )}
          </div>
        )

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

      case 'especificacoes':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">🏷️ Especificações Técnicas</h3>
            <p className="text-sm text-gray-600 mb-4">Campos para integração com Mercado Livre, Shopee e Amazon</p>
            
            <div className="bg-gray-50 p-4 rounded-lg border mb-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tipo de Produto</label>
                  <select value={formData.productType} onChange={(e) => setFormData({ ...formData, productType: e.target.value })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white">
                    <option value="">Selecione o tipo...</option>
                    {Array.isArray(productTypes) && productTypes.filter(type => type.active).map((type) => (
                      <option key={type.id} value={type.slug}>{type.icon} {type.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1"><Link href="/admin/tipos-produtos" className="text-primary-600 hover:underline">Gerenciar tipos de produtos</Link></p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Categoria ML (Opcional)</label>
                  <input type="text" value={formData.mlCategoryId} onChange={(e) => setFormData({ ...formData, mlCategoryId: e.target.value })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600" placeholder="Ex: MLB1055" />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">GTIN / EAN</label>
                <input type="text" value={formData.gtin} onChange={(e) => setFormData({ ...formData, gtin: e.target.value })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600" placeholder="7891234567890" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Marca</label>
                <input type="text" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600" placeholder="Samsung, Apple, Nike..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Modelo</label>
                <input type="text" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600" placeholder="Galaxy S23, Air Max 97..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">MPN</label>
                <input type="text" value={formData.mpn} onChange={(e) => setFormData({ ...formData, mpn: e.target.value })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600" placeholder="SM-S911BZKQZTO" />
              </div>
            </div>

            {formData.productType === 'celular' && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-6">
                <h4 className="font-medium mb-4">📱 Campos para Celulares</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-2">Memória RAM</label><input type="text" value={formData.ram} onChange={(e) => setFormData({ ...formData, ram: e.target.value })} className="w-full px-4 py-2 border rounded-md" placeholder="8GB" /></div>
                  <div><label className="block text-sm font-medium mb-2">Armazenamento</label><input type="text" value={formData.storage} onChange={(e) => setFormData({ ...formData, storage: e.target.value })} className="w-full px-4 py-2 border rounded-md" placeholder="256GB" /></div>
                  <div><label className="block text-sm font-medium mb-2">Número ANATEL</label><input type="text" value={formData.anatelNumber} onChange={(e) => setFormData({ ...formData, anatelNumber: e.target.value })} className="w-full px-4 py-2 border rounded-md" placeholder="12345-67-8901" /></div>
                  <div><label className="block text-sm font-medium mb-2">Dual SIM</label><select value={formData.isDualSim} onChange={(e) => setFormData({ ...formData, isDualSim: e.target.value })} className="w-full px-4 py-2 border rounded-md"><option value="Não">Não</option><option value="Sim">Sim</option></select></div>
                  <div><label className="block text-sm font-medium mb-2">Operadora</label><select value={formData.carrier} onChange={(e) => setFormData({ ...formData, carrier: e.target.value })} className="w-full px-4 py-2 border rounded-md"><option value="Desbloqueado">Desbloqueado</option><option value="Vivo">Vivo</option><option value="Claro">Claro</option><option value="TIM">TIM</option><option value="Oi">Oi</option></select></div>
                </div>
              </div>
            )}

            {formData.productType === 'livro' && (
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mt-6">
                <h4 className="font-medium mb-4">📚 Campos para Livros</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2"><label className="block text-sm font-medium mb-2">Título</label><input type="text" value={formData.bookTitle} onChange={(e) => setFormData({ ...formData, bookTitle: e.target.value })} className="w-full px-4 py-2 border rounded-md" placeholder="Clean Code" /></div>
                  <div><label className="block text-sm font-medium mb-2">Autor</label><input type="text" value={formData.bookAuthor} onChange={(e) => setFormData({ ...formData, bookAuthor: e.target.value })} className="w-full px-4 py-2 border rounded-md" placeholder="Robert C. Martin" /></div>
                  <div><label className="block text-sm font-medium mb-2">Editora</label><input type="text" value={formData.bookPublisher} onChange={(e) => setFormData({ ...formData, bookPublisher: e.target.value })} className="w-full px-4 py-2 border rounded-md" placeholder="Prentice Hall" /></div>
                  <div><label className="block text-sm font-medium mb-2">Gênero</label><select value={formData.bookGenre} onChange={(e) => setFormData({ ...formData, bookGenre: e.target.value })} className="w-full px-4 py-2 border rounded-md"><option value="">Selecione</option><option value="Ficção">Ficção</option><option value="Não-ficção">Não-ficção</option><option value="Técnico">Técnico</option><option value="Autoajuda">Autoajuda</option><option value="Biografia">Biografia</option><option value="Infantil">Infantil</option></select></div>
                  <div><label className="block text-sm font-medium mb-2">ISBN</label><input type="text" value={formData.bookIsbn} onChange={(e) => setFormData({ ...formData, bookIsbn: e.target.value })} className="w-full px-4 py-2 border rounded-md" placeholder="978-0132350884" /></div>
                </div>
              </div>
            )}
          </div>
        )

      case 'dropshipping':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">🚚 Informações de Dropshipping</h3>
            <p className="text-sm text-gray-600 mb-4">Configure se este produto é de um fornecedor externo</p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Fornecedor</label>
                <select value={formData.supplierId} onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600">
                  <option value="">Nenhum (produto próprio)</option>
                  {suppliers.map((supplier) => (<option key={supplier.id} value={supplier.id}>{supplier.name} - Comissão: {supplier.commission}%</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">SKU do Fornecedor</label>
                <input type="text" value={formData.supplierSku} onChange={(e) => setFormData({ ...formData, supplierSku: e.target.value })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600" placeholder="SKU-12345" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">URL do Produto no Fornecedor</label>
                <input type="url" value={formData.supplierUrl} onChange={(e) => setFormData({ ...formData, supplierUrl: e.target.value })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600" placeholder="https://fornecedor.com/produto" />
              </div>
            </div>
          </div>
        )

      case 'tributacao':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">📋 Tributação Fiscal (NF-e)</h3>
            <p className="text-sm text-gray-600 mb-4">Campos para emissão de Nota Fiscal</p>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium mb-2">NCM *</label><input type="text" value={formData.ncm} onChange={(e) => setFormData({ ...formData, ncm: e.target.value.replace(/\D/g, '').slice(0, 8) })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600" placeholder="00000000" maxLength={8} /><p className="text-xs text-gray-500 mt-1">8 dígitos</p></div>
              <div><label className="block text-sm font-medium mb-2">CEST</label><input type="text" value={formData.cest} onChange={(e) => setFormData({ ...formData, cest: e.target.value.replace(/\D/g, '').slice(0, 7) })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600" placeholder="0000000" maxLength={7} /></div>
              <div><label className="block text-sm font-medium mb-2">Origem</label><select value={formData.origem} onChange={(e) => setFormData({ ...formData, origem: e.target.value })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"><option value="0">0 - Nacional</option><option value="1">1 - Importação direta</option><option value="2">2 - Mercado interno</option><option value="3">3 - Nacional, import. &gt; 40%</option><option value="5">5 - Nacional, import. ≤ 40%</option></select></div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-2">Unidade Comercial</label><select value={formData.unidadeComercial} onChange={(e) => setFormData({ ...formData, unidadeComercial: e.target.value })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"><option value="UN">UN - Unidade</option><option value="PC">PC - Peça</option><option value="CX">CX - Caixa</option><option value="KG">KG - Quilograma</option><option value="PAR">PAR - Par</option><option value="KIT">KIT - Kit</option></select></div>
              <div><label className="block text-sm font-medium mb-2">Tributação Especial</label><select value={formData.tributacaoEspecial} onChange={(e) => setFormData({ ...formData, tributacaoEspecial: e.target.value })} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"><option value="normal">Normal</option><option value="monofasico">Monofásico</option><option value="st">Substituição Tributária</option><option value="isento">Isento</option></select></div>
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-primary-600 hover:text-primary-700">⚙️ Configurações Avançadas de Tributação</summary>
              <div className="mt-4 p-4 bg-gray-50 rounded border">
                <p className="text-xs text-amber-600 mb-4">⚠️ Só preencha se este produto tiver tributação diferente das regras padrão.</p>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div><label className="block text-sm font-medium mb-1">CST/CSOSN ICMS</label><select value={formData.cstIcms} onChange={(e) => setFormData({ ...formData, cstIcms: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="">Usar padrão</option><option value="00">00 - Tributada</option><option value="40">40 - Isenta</option><option value="60">60 - ICMS ST</option><option value="102">102 - SN sem crédito</option><option value="500">500 - ICMS ST (SN)</option></select></div>
                  <div><label className="block text-sm font-medium mb-1">Alíquota ICMS (%)</label><input type="text" value={formData.aliquotaIcms} onChange={(e) => setFormData({ ...formData, aliquotaIcms: e.target.value })} className="w-full px-3 py-2 border rounded-md" placeholder="18" /></div>
                  <div><label className="block text-sm font-medium mb-1">Redução BC (%)</label><input type="text" value={formData.reducaoBcIcms} onChange={(e) => setFormData({ ...formData, reducaoBcIcms: e.target.value })} className="w-full px-3 py-2 border rounded-md" placeholder="33.33" /></div>
                </div>
                <div className="grid md:grid-cols-4 gap-4 mb-4">
                  <div><label className="block text-sm font-medium mb-1">CST PIS</label><select value={formData.cstPis} onChange={(e) => setFormData({ ...formData, cstPis: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="">Usar padrão</option><option value="01">01 - Tributável</option><option value="04">04 - Monofásico</option><option value="06">06 - Alíquota Zero</option><option value="07">07 - Isenta</option></select></div>
                  <div><label className="block text-sm font-medium mb-1">Alíq. PIS (%)</label><input type="text" value={formData.aliquotaPis} onChange={(e) => setFormData({ ...formData, aliquotaPis: e.target.value })} className="w-full px-3 py-2 border rounded-md" placeholder="1.65" /></div>
                  <div><label className="block text-sm font-medium mb-1">CST COFINS</label><select value={formData.cstCofins} onChange={(e) => setFormData({ ...formData, cstCofins: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="">Usar padrão</option><option value="01">01 - Tributável</option><option value="04">04 - Monofásico</option><option value="06">06 - Alíquota Zero</option><option value="07">07 - Isenta</option></select></div>
                  <div><label className="block text-sm font-medium mb-1">Alíq. COFINS (%)</label><input type="text" value={formData.aliquotaCofins} onChange={(e) => setFormData({ ...formData, aliquotaCofins: e.target.value })} className="w-full px-3 py-2 border rounded-md" placeholder="7.60" /></div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">CFOP Interno</label><input type="text" value={formData.cfopInterno} onChange={(e) => setFormData({ ...formData, cfopInterno: e.target.value.replace(/\D/g, '').slice(0, 4) })} className="w-full px-3 py-2 border rounded-md" placeholder="5102" maxLength={4} /></div>
                  <div><label className="block text-sm font-medium mb-1">CFOP Interestadual</label><input type="text" value={formData.cfopInterestadual} onChange={(e) => setFormData({ ...formData, cfopInterestadual: e.target.value.replace(/\D/g, '').slice(0, 4) })} className="w-full px-3 py-2 border rounded-md" placeholder="6102" maxLength={4} /></div>
                </div>
              </div>
            </details>
          </div>
        )

      default:
        return null
    }
  }

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Link href="/admin/produtos" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <FiArrowLeft className="mr-2" />
        Voltar para Produtos
      </Link>

      <h1 className="text-3xl font-bold mb-8">Editar Produto</h1>

      <form onSubmit={handleSubmit}>
        <div className="flex gap-6">
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-4">
              <h3 className="font-semibold text-gray-500 uppercase text-xs mb-4">Seções</h3>
              <nav className="space-y-1">
                {TABS.map((tab) => {
                  const status = getTabStatus(tab.id)
                  return (
                    <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${activeTab === tab.id ? 'bg-primary-100 text-primary-700 border-l-4 border-primary-600' : 'text-gray-600 hover:bg-gray-100'}`}>
                      <span className={`text-lg ${activeTab === tab.id ? 'text-primary-600' : 'text-gray-400'}`}>{tab.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tab.name}</p>
                        <p className="text-xs text-gray-500 truncate">{tab.description}</p>
                      </div>
                      {status === 'complete' && <FiCheck className="text-green-500 flex-shrink-0" />}
                      {status === 'incomplete' && <FiAlertCircle className="text-amber-500 flex-shrink-0" />}
                    </button>
                  )
                })}
              </nav>

              <div className="mt-6 pt-4 border-t">
                <button type="submit" disabled={isLoading} className="w-full bg-primary-600 text-white py-3 rounded-md hover:bg-primary-700 font-semibold disabled:bg-gray-400 flex items-center justify-center gap-2">
                  {isLoading ? (<><span className="animate-spin">⏳</span>Salvando...</>) : (<><FiCheck />Salvar Alterações</>)}
                </button>
                <Link href="/admin/produtos" className="w-full mt-2 border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-50 text-center font-medium block">Cancelar</Link>
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



