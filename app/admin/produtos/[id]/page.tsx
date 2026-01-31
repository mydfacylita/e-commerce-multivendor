'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiArrowLeft } from 'react-icons/fi'
import toast from 'react-hot-toast'
import ImageUploader from '@/components/admin/ImageUploader'
import ProductVariantsManager from '@/components/admin/ProductVariantsManager'
import ImportedProductVariantsManager, { type SelectedSku } from '@/components/admin/ImportedProductVariantsManager'

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

export default function EditarProdutoPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
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
    productType: '', // Tipo de produto
    mlCategoryId: '', // Categoria do Mercado Livre
    gtin: '',
    brand: '',
    model: '',
    color: '',
    mpn: '',
    // Campos para Mercado Livre - Celulares
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
    // Campos para Tamanhos e Variações
    sizeType: '',
    sizeCategory: '',
    colorType: 'Única' as 'Única' | 'Variada',
    variants: '',  // JSON array com tamanho x cor (para produtos nacionais) ou estrutura importada
    selectedSkus: '' as string,  // SKUs selecionados para venda (produtos importados)
    supplierName: '' as string,  // Nome do fornecedor para identificar produto importado
    // Campos de Tributação (NF-e)
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

        console.log('🔍 PRODUTO DO BANCO:', {
          id: product.id,
          name: product.name,
          images_type: typeof product.images,
          images_value: product.images,
          sizes_type: typeof product.sizes,
          sizes_value: product.sizes,
          variants_type: typeof product.variants,
          variants_value: product.variants
        })

        // Garantir que categories é sempre um array
        setCategories(Array.isArray(categoriesData) ? categoriesData : [])
        // A API retorna { suppliers: [...] }
        setSuppliers(suppliersData?.suppliers || (Array.isArray(suppliersData) ? suppliersData : []))
        setProductTypes(Array.isArray(productTypesData) ? productTypesData : [])

        // Parse technical specs se existir
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

        // Parse images de forma segura - lida com JSON duplo
        let imagesArray: string[] = []
        if (product.images) {
          if (Array.isArray(product.images)) {
            // Já é array, mas pode ter JSON aninhado
            imagesArray = product.images.map((img: any) => {
              if (typeof img === 'string') {
                // Tenta fazer parse se for JSON string
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
              // Parse recursivo para JSON duplo
              while (typeof parsed === 'string') {
                parsed = JSON.parse(parsed)
              }
              imagesArray = Array.isArray(parsed) ? parsed : [parsed]
            } catch {
              imagesArray = product.images.split('\n').filter((img: string) => img.trim())
            }
          }
        }

        // Parse variants (tamanho x cor) de forma segura - lida com JSON aninhado
        let variantsString = ''
        if (product.variants) {
          if (Array.isArray(product.variants)) {
            // Já é array, pode ter JSON aninhado
            const cleanVariants = product.variants.map((v: any) => {
              if (typeof v === 'string') {
                try {
                  return JSON.parse(v)
                } catch {
                  return v
                }
              }
              return v
            }).flat()
            variantsString = JSON.stringify(cleanVariants, null, 2)
          } else if (typeof product.variants === 'string') {
            try {
              let parsed = product.variants
              // Parse recursivo para JSON duplo/triplo
              while (typeof parsed === 'string') {
                parsed = JSON.parse(parsed)
              }
              variantsString = JSON.stringify(parsed, null, 2)
            } catch (e) {
              console.error('Erro ao parsear variants:', e)
              variantsString = product.variants
            }
          }
        }
        // Se não tem variants mas tem sizes, converte sizes antigas para variants
        else if (product.sizes) {
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
          } catch (e) {
            console.error('Erro ao converter sizes antigas:', e)
          }
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
          // Campos de Tributação (NF-e)
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
    if (cost && price) {
      const margin = ((price - cost) / price) * 100
      return margin.toFixed(2)
    }
    return '0'
  }



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-')
    const imageArray = formData.images

    const cost = parseFloat(formData.costPrice) || 0
    const price = parseFloat(formData.price) || 0
    const margin = cost && price ? ((price - cost) / price) * 100 : 0

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
          images: imageArray,
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
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Erro ao atualizar produto:', errorData)
        throw new Error('Erro ao atualizar produto')
      }

      const result = await response.json()
      console.log('✅ Produto atualizado com sucesso:', result)
      toast.success('Produto atualizado com sucesso!')
      
      // Aguarda um pouco para garantir que o toast seja exibido
      setTimeout(() => {
        router.push('/admin/produtos')
      }, 500)
    } catch (error) {
      console.error('❌ Erro no handleSubmit:', error)
      toast.error('Erro ao atualizar produto')
    } finally {
      setIsLoading(false)
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
      <Link
        href="/admin/produtos"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
      >
        <FiArrowLeft className="mr-2" />
        Voltar
      </Link>

      <h1 className="text-3xl font-bold mb-8">Editar Produto</h1>

      <form onSubmit={handleSubmit} className="max-w-4xl bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Nome do Produto *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Slug</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
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
              {Array.isArray(categories) && categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.parent ? `${category.parent.name} > ${category.name}` : category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Descrição</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
            rows={4}
          />
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold text-lg mb-4">💰 Preços e Margem</h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Preço de Custo (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Preço de Venda (R$) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Margem de Lucro</label>
              <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-md font-bold text-green-700 text-lg">
                {calculateMargin()}%
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Estoque *</label>
              <input
                type="number"
                required
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                disabled={formData.sizeCategory !== ''}
              />
              {formData.sizeCategory && (
                <p className="text-xs text-blue-600 mt-1">
                  ℹ️ Estoque calculado automaticamente pela soma dos tamanhos
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold text-lg mb-4">📦 Informações de Dropshipping</h3>
          
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
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">URL do Produto no Fornecedor</label>
              <input
                type="url"
                value={formData.supplierUrl}
                onChange={(e) => setFormData({ ...formData, supplierUrl: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>
          </div>
        </div>

        {/* PESO E DIMENSÕES */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="text-lg font-bold mb-4 text-blue-900">📦 Peso e Dimensões</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Peso sem embalagem (kg)</label>
              <input
                type="number"
                step="0.001"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="1.200"
              />
              <p className="text-xs text-gray-500 mt-1">Ex: 1.200 = 1kg 200g | 0.950 = 950g</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Peso com embalagem (kg) *</label>
              <input
                type="number"
                step="0.001"
                value={formData.weightWithPackage}
                onChange={(e) => setFormData({ ...formData, weightWithPackage: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="1.300"
              />
              <p className="text-xs text-blue-600 mt-1">Usado no cálculo de frete</p>
            </div>
          </div>

          <p className="text-sm font-medium mb-2 text-blue-900">Dimensões sem embalagem (cm)</p>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs mb-1">Comprimento</label>
              <input
                type="number"
                step="0.1"
                value={formData.length}
                onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                placeholder="20.0"
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Largura</label>
              <input
                type="number"
                step="0.1"
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                placeholder="15.0"
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Altura</label>
              <input
                type="number"
                step="0.1"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                placeholder="5.0"
              />
            </div>
          </div>

          <p className="text-sm font-medium mb-2 text-blue-900">Dimensões com embalagem (cm)</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs mb-1">Comprimento</label>
              <input
                type="number"
                step="0.1"
                value={formData.lengthWithPackage}
                onChange={(e) => setFormData({ ...formData, lengthWithPackage: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                placeholder="22.0"
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Largura</label>
              <input
                type="number"
                step="0.1"
                value={formData.widthWithPackage}
                onChange={(e) => setFormData({ ...formData, widthWithPackage: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                placeholder="17.0"
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Altura</label>
              <input
                type="number"
                step="0.1"
                value={formData.heightWithPackage}
                onChange={(e) => setFormData({ ...formData, heightWithPackage: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                placeholder="7.0"
              />
            </div>
          </div>
        </div>

        {/* Tipo de Produto */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">🏷️ Tipo de Produto</h3>
            <Link 
              href="/admin/tipos-produtos"
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              Gerenciar Tipos
            </Link>
          </div>
          <p className="text-sm text-gray-600 mb-4">Selecione o tipo para mostrar campos específicos</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Produto</label>
              <select
                value={formData.productType}
                onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white"
              >
                <option value="">Selecione o tipo de produto...</option>
                {productTypes.filter(type => type.active).map((type) => (
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
                className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="Ex: MLB1055, MLB263532..."
              />
              <p className="text-xs text-gray-500 mt-1">Se souber a categoria exata do ML, informe aqui</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold text-lg mb-4">🏷️ Especificações Técnicas (Marketplaces)</h3>
          <p className="text-sm text-gray-600 mb-4">
            Campos opcionais para integração com Mercado Livre, Shopee e Amazon
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">GTIN / EAN / Código de Barras</label>
              <input
                type="text"
                value={formData.gtin}
                onChange={(e) => setFormData({ ...formData, gtin: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="7891234567890"
              />
              <p className="text-xs text-gray-500 mt-1">13 dígitos - Obrigatório no ML para eletrônicos</p>
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
              <p className="text-xs text-gray-500 mt-1">Nome da marca do fabricante</p>
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
              <p className="text-xs text-gray-500 mt-1">Modelo específico do produto</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Cor</label>
              <select
                value={formData.colorType}
                onChange={(e) => {
                  setFormData({ ...formData, colorType: e.target.value as 'Única' | 'Variada' })
                  // Se mudar para "Única", limpa as variações
                  if (e.target.value === 'Única') {
                    setFormData(prev => ({ ...prev, colorVariants: '' }))
                  }
                }}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
              >
                <option value="Única">Única (uma cor)</option>
                <option value="Variada">Variada (múltiplas cores)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.colorType === 'Única' 
                  ? 'Produto com uma única cor' 
                  : 'Produto disponível em várias cores'}
              </p>
            </div>

            {formData.colorType === 'Única' && (
              <div>
                <label className="block text-sm font-medium mb-2">Cor do Produto</label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="Preto, Azul, Vermelho..."
                />
                <p className="text-xs text-gray-500 mt-1">Informe a cor principal do produto</p>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">MPN (Manufacturer Part Number)</label>
              <input
                type="text"
                value={formData.mpn}
                onChange={(e) => setFormData({ ...formData, mpn: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="SM-S911BZKQZTO"
              />
              <p className="text-xs text-gray-500 mt-1">Código do fabricante (opcional)</p>
            </div>
          </div>
          
        </div>

        {/* Sistema Integrado de Variações (Tamanho × Cor) */}
        {/* Se produto importado de fornecedor, usa o gerenciador de SKUs importados */}
        {formData.supplierName || formData.supplierId ? (
          <ImportedProductVariantsManager
            productId={params.id}
            variantsJson={formData.variants}
            selectedSkus={(() => {
              try {
                if (!formData.selectedSkus) return []
                return JSON.parse(formData.selectedSkus)
              } catch {
                return []
              }
            })()}
            supplierName={formData.supplierName || 'AliExpress'}
            onVariantsChange={(selectedSkus) => {
              setFormData(prev => ({ ...prev, selectedSkus: JSON.stringify(selectedSkus) }))
            }}
          />
        ) : (
          <ProductVariantsManager
            sizeType={formData.sizeType}
            sizeCategory={formData.sizeCategory}
            colorType={formData.colorType}
            singleColor={formData.color}
            productImages={formData.images}
            variants={(() => {
              try {
                if (!formData.variants || formData.variants === '') return []
                // Parse recursivo para JSON aninhado
                let parsed = formData.variants
                while (typeof parsed === 'string') {
                  parsed = JSON.parse(parsed)
                }
                return Array.isArray(parsed) ? parsed : []
              } catch (e) {
                console.error('Erro ao parsear variants no componente:', e, formData.variants)
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
        )}
        

        {/* Campos específicos para Celulares - Mercado Livre */}
        {formData.productType === 'celular' && (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">📱 Campos Específicos - Celulares</h3>
          <p className="text-sm text-gray-600 mb-4">Campos obrigatórios para publicação de celulares no Mercado Livre</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Memória RAM</label>
              <input
                type="text"
                value={formData.ram}
                onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
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
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
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
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="12345-67-8901"
              />
              <p className="text-xs text-gray-500 mt-1">Número de homologação da ANATEL (obrigatório para celulares)</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Dual SIM / Dual Chip</label>
              <select
                value={formData.isDualSim}
                onChange={(e) => setFormData({ ...formData, isDualSim: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
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
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
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

        {/* Seção específica para Livros */}
        {formData.productType === 'livro' && (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">📚 Informações do Livro</h3>
          <p className="text-sm text-gray-600 mb-4">
            Campos obrigatórios para publicação de livros no Mercado Livre
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Título do Livro *</label>
              <input
                type="text"
                required
                value={formData.bookTitle}
                onChange={(e) => setFormData({ ...formData, bookTitle: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="Clean Code: A Handbook of Agile Software Craftsmanship"
              />
              <p className="text-xs text-gray-500 mt-1">Título completo do livro</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Autor(es) *</label>
              <input
                type="text"
                required
                value={formData.bookAuthor}
                onChange={(e) => setFormData({ ...formData, bookAuthor: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="Robert C. Martin"
              />
              <p className="text-xs text-gray-500 mt-1">Nome do autor ou autores</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Gênero do Livro *</label>
              <select
                required
                value={formData.bookGenre}
                onChange={(e) => setFormData({ ...formData, bookGenre: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
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
                required
                value={formData.bookPublisher}
                onChange={(e) => setFormData({ ...formData, bookPublisher: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
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
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="978-0132350884"
              />
              <p className="text-xs text-gray-500 mt-1">ISBN-10 ou ISBN-13 (pode ser usado como GTIN)</p>
            </div>
          </div>
        </div>
        )}

        {/* Tributação Fiscal (NF-e) */}
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <h3 className="font-semibold text-lg mb-2">📋 Tributação Fiscal (NF-e)</h3>
          <p className="text-sm text-gray-600 mb-4">
            Campos para emissão de Nota Fiscal. Deixe em branco para usar as regras padrão.
          </p>
          
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">NCM *</label>
              <input
                type="text"
                value={formData.ncm}
                onChange={(e) => setFormData({ ...formData, ncm: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="00000000"
                maxLength={8}
              />
              <p className="text-xs text-gray-500 mt-1">8 dígitos obrigatório para NF-e</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">CEST (opcional)</label>
              <input
                type="text"
                value={formData.cest}
                onChange={(e) => setFormData({ ...formData, cest: e.target.value.replace(/\D/g, '').slice(0, 7) })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="0000000"
                maxLength={7}
              />
              <p className="text-xs text-gray-500 mt-1">7 dígitos para ST</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Origem do Produto</label>
              <select
                value={formData.origem}
                onChange={(e) => setFormData({ ...formData, origem: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
              >
                <option value="0">0 - Nacional</option>
                <option value="1">1 - Estrangeira - Importação direta</option>
                <option value="2">2 - Estrangeira - Mercado interno</option>
                <option value="3">3 - Nacional, conteúdo import. &gt; 40%</option>
                <option value="4">4 - Nacional, conforme processos básicos</option>
                <option value="5">5 - Nacional, conteúdo import. ≤ 40%</option>
                <option value="6">6 - Estrangeira - Import. sem similar (CAMEX)</option>
                <option value="7">7 - Estrangeira - Mercado sem similar (CAMEX)</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Unidade Comercial</label>
              <select
                value={formData.unidadeComercial}
                onChange={(e) => setFormData({ ...formData, unidadeComercial: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
              >
                <option value="UN">UN - Unidade</option>
                <option value="PC">PC - Peça</option>
                <option value="CX">CX - Caixa</option>
                <option value="KG">KG - Quilograma</option>
                <option value="G">G - Grama</option>
                <option value="L">L - Litro</option>
                <option value="ML">ML - Mililitro</option>
                <option value="M">M - Metro</option>
                <option value="CM">CM - Centímetro</option>
                <option value="M2">M2 - Metro Quadrado</option>
                <option value="M3">M3 - Metro Cúbico</option>
                <option value="PAR">PAR - Par</option>
                <option value="DUZIA">DUZIA - Dúzia</option>
                <option value="KIT">KIT - Kit</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tributação Especial</label>
              <select
                value={formData.tributacaoEspecial}
                onChange={(e) => setFormData({ ...formData, tributacaoEspecial: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
              >
                <option value="normal">Normal - Usa regra padrão</option>
                <option value="monofasico">Monofásico - PIS/COFINS já recolhido</option>
                <option value="st">Substituição Tributária</option>
                <option value="isento">Isento</option>
                <option value="imune">Imune</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Para cosméticos, bebidas, combustíveis, etc.</p>
            </div>
          </div>

          {/* Campos avançados - colapsáveis */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-primary-600 hover:text-primary-700">
              ⚙️ Configurações Avançadas de Tributação (sobrescrevem regras padrão)
            </summary>
            <div className="mt-4 p-4 bg-white rounded border">
              <p className="text-xs text-amber-600 mb-4">
                ⚠️ Só preencha se este produto tiver tributação diferente das regras padrão configuradas em Nota Fiscal.
              </p>
              
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">CST/CSOSN ICMS</label>
                  <select
                    value={formData.cstIcms}
                    onChange={(e) => setFormData({ ...formData, cstIcms: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  >
                    <option value="">Usar regra padrão</option>
                    <optgroup label="Regime Normal (CST)">
                      <option value="00">00 - Tributada integralmente</option>
                      <option value="10">10 - Tributada com ST</option>
                      <option value="20">20 - Redução de base</option>
                      <option value="30">30 - Isenta/não trib. com ST</option>
                      <option value="40">40 - Isenta</option>
                      <option value="41">41 - Não tributada</option>
                      <option value="50">50 - Suspensão</option>
                      <option value="51">51 - Diferimento</option>
                      <option value="60">60 - ICMS cobrado por ST</option>
                      <option value="70">70 - Redução + ST</option>
                      <option value="90">90 - Outras</option>
                    </optgroup>
                    <optgroup label="Simples Nacional (CSOSN)">
                      <option value="101">101 - Tributada com crédito</option>
                      <option value="102">102 - Tributada sem crédito</option>
                      <option value="103">103 - Isenção por faixa</option>
                      <option value="201">201 - Com ST e crédito</option>
                      <option value="202">202 - Com ST sem crédito</option>
                      <option value="203">203 - Isenção + ST</option>
                      <option value="300">300 - Imune</option>
                      <option value="400">400 - Não tributada</option>
                      <option value="500">500 - ICMS cobrado por ST</option>
                      <option value="900">900 - Outros</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Alíquota ICMS (%)</label>
                  <input
                    type="text"
                    value={formData.aliquotaIcms}
                    onChange={(e) => setFormData({ ...formData, aliquotaIcms: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="Ex: 18"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Redução BC (%)</label>
                  <input
                    type="text"
                    value={formData.reducaoBcIcms}
                    onChange={(e) => setFormData({ ...formData, reducaoBcIcms: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="Ex: 33.33"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">CST PIS</label>
                  <select
                    value={formData.cstPis}
                    onChange={(e) => setFormData({ ...formData, cstPis: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  >
                    <option value="">Usar padrão</option>
                    <option value="01">01 - Tributável</option>
                    <option value="04">04 - Monofásico</option>
                    <option value="05">05 - ST</option>
                    <option value="06">06 - Alíquota Zero</option>
                    <option value="07">07 - Isenta</option>
                    <option value="08">08 - Sem Incidência</option>
                    <option value="09">09 - Suspensão</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Alíq. PIS (%)</label>
                  <input
                    type="text"
                    value={formData.aliquotaPis}
                    onChange={(e) => setFormData({ ...formData, aliquotaPis: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="1.65"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">CST COFINS</label>
                  <select
                    value={formData.cstCofins}
                    onChange={(e) => setFormData({ ...formData, cstCofins: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  >
                    <option value="">Usar padrão</option>
                    <option value="01">01 - Tributável</option>
                    <option value="04">04 - Monofásico</option>
                    <option value="05">05 - ST</option>
                    <option value="06">06 - Alíquota Zero</option>
                    <option value="07">07 - Isenta</option>
                    <option value="08">08 - Sem Incidência</option>
                    <option value="09">09 - Suspensão</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Alíq. COFINS (%)</label>
                  <input
                    type="text"
                    value={formData.aliquotaCofins}
                    onChange={(e) => setFormData({ ...formData, aliquotaCofins: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="7.60"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">CFOP Venda Interna</label>
                  <input
                    type="text"
                    value={formData.cfopInterno}
                    onChange={(e) => setFormData({ ...formData, cfopInterno: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="5102"
                    maxLength={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">CFOP Venda Interestadual</label>
                  <input
                    type="text"
                    value={formData.cfopInterestadual}
                    onChange={(e) => setFormData({ ...formData, cfopInterestadual: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="6102"
                    maxLength={4}
                  />
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* Upload de Imagens */}
        <ImageUploader
          images={formData.images}
          onImagesChange={(images) => setFormData({ ...formData, images })}
          maxImages={10}
        />

        <div className="flex items-center">
          <input
            type="checkbox"
            id="featured"
            checked={formData.featured}
            onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="featured" className="ml-2 text-sm font-medium">
            Produto em destaque
          </label>
        </div>

        <div className="flex space-x-4 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-primary-600 text-white py-3 rounded-md hover:bg-primary-700 font-semibold disabled:bg-gray-400"
          >
            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
          <Link
            href="/admin/produtos"
            className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-md hover:bg-gray-50 text-center font-semibold"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}



