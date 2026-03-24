'use client'

import { useState, useEffect, useCallback } from 'react'
import { FiUpload, FiRefreshCw, FiCheck, FiX, FiXCircle, FiExternalLink, FiTrash2, FiPause, FiPlay, FiAlertCircle, FiCheckCircle, FiInfo, FiSearch, FiChevronRight, FiChevronLeft, FiPackage } from 'react-icons/fi'
import { getStatusInfo, formatMLErrors } from '@/lib/mercadolivre'

interface PublishToMarketplaceButtonProps {
  productId: string
  productName?: string
  productGtin?: string
  productBrand?: string
  productModel?: string
  productWeight?: number
  productPkgLength?: number
  productPkgWidth?: number
  productPkgHeight?: number
  existingListings: Array<{
    marketplace: string
    status: string
    listingUrl?: string | null
    lastSyncAt?: Date | null
  }>
}

interface InfoModal {
  isOpen: boolean
  type: 'info' | 'success' | 'error' | 'warning'
  title: string
  message: string
  details?: string[]
  action?: {
    label: string
    onClick: () => void
  }
}

interface CategoryPrediction {
  categoryId: string
  categoryName: string
  domainId: string
  domainName: string
}

interface CategoryInfo {
  id: string
  name: string
  path: string
  requiresCatalog: boolean   // listing_strategy = catalog_required | catalog_only
  catalogAvailable?: boolean // categoria TEM catálogo mas não é obrigatório
  catalogDomain?: string
  listingAllowed: boolean
}

interface RequiredAttribute {
  id: string
  name: string
  type: string
  values: Array<{ id: string; name: string }>
  hint?: string
}

interface CatalogProduct {
  id: string
  name: string
  status: string
  domainId: string
  picture?: string
  attributes: Array<{ id: string; name: string; value: string }>
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  info: string[]
  categoryInfo?: {
    id: string
    name: string
    requiresCatalog: boolean
    catalogDomain?: string
  }
  productData?: {
    suggestedCatalogId?: string
  }
}

const MARKETPLACES = [
  { id: 'mercadolivre', name: 'Mercado Livre', color: 'yellow' },
  { id: 'shopee', name: 'Shopee', color: 'orange' },
  { id: 'amazon', name: 'Amazon', color: 'orange' },
]

export default function PublishToMarketplaceButton({ 
  productId,
  productName = '',
  productGtin = '',
  productBrand = '',
  productModel = '',
  productWeight,
  productPkgLength,
  productPkgWidth,
  productPkgHeight,
  existingListings 
}: PublishToMarketplaceButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [selectedMarketplace, setSelectedMarketplace] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [modal, setModal] = useState<InfoModal>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  })

  // ========== NOVOS ESTADOS PARA FLUXO INTELIGENTE ==========
  const [currentStep, setCurrentStep] = useState(1)
  const [categorySearch, setCategorySearch] = useState('')
  const [categoryPredictions, setCategoryPredictions] = useState<CategoryPrediction[]>([])
  const [selectedCategory, setSelectedCategory] = useState<CategoryInfo | null>(null)
  const [requiredAttributes, setRequiredAttributes] = useState<RequiredAttribute[]>([])
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([])
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<CatalogProduct | null>(null)
  const [searchingCategories, setSearchingCategories] = useState(false)
  const [searchingCatalog, setSearchingCatalog] = useState(false)
  const [catalogSearched, setCatalogSearched] = useState(false)
  const [catalogQuery, setCatalogQuery] = useState('')
  const [loadingCategory, setLoadingCategory] = useState(false)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [validating, setValidating] = useState(false)

  // ========== SHOPEE LOGISTICS ==========
  interface ShopeeChannel { id: number; name: string; enabled: boolean; codEnabled: boolean; preferred: boolean; feeType: string }
  const [shopeeChannels, setShopeeChannels] = useState<ShopeeChannel[]>([])
  const [selectedChannelIds, setSelectedChannelIds] = useState<number[]>([])
  const [loadingLogistics, setLoadingLogistics] = useState(false)

  // ========== SHOPEE FORM DATA ==========
  const [shopeeFormData, setShopeeFormData] = useState({
    categoryId: 0,
    categoryName: '',
    itemName: productName.substring(0, 120),
    brand: productBrand,
    weight: productWeight ? String(productWeight) : '',
    pkgLength: productPkgLength ? String(productPkgLength) : '',
    pkgWidth: productPkgWidth ? String(productPkgWidth) : '',
    pkgHeight: productPkgHeight ? String(productPkgHeight) : '',
  })
  const [shopeeAttributes, setShopeeAttributes] = useState<any[]>([])
  const [shopeeAttrValues, setShopeeAttrValues] = useState<Record<number, string | number>>({})
  const [shopeeCategoryQuery, setShopeeCategoryQuery] = useState('')
  const [shopeeCategoryResults, setShopeeCategoryResults] = useState<any[]>([])
  const [loadingShopeeCats, setLoadingShopeeCats] = useState(false)
  const [loadingShopeeAttrs, setLoadingShopeeAttrs] = useState(false)

  const showInfoModal = (config: Omit<InfoModal, 'isOpen'>) => {
    setModal({ ...config, isOpen: true })
  }

  const closeInfoModal = () => {
    setModal({ ...modal, isOpen: false })
  }

  // ========== FUNÇÕES DO FLUXO INTELIGENTE ==========

  // Resetar modal ao abrir
  const resetModal = () => {
    setCurrentStep(1)
    setSelectedMarketplace('')
    setCategorySearch('')
    setCategoryPredictions([])
    setSelectedCategory(null)
    setRequiredAttributes([])
    setCatalogProducts([])
    setSelectedCatalogProduct(null)
    setValidation(null)
    setCatalogSearched(false)
    setCatalogQuery('')
    setShopeeChannels([])
    setSelectedChannelIds([])
    setShopeeFormData({
      categoryId: 0,
      categoryName: '',
      itemName: productName.substring(0, 120),
      brand: productBrand,
      weight: productWeight ? String(productWeight) : '',
      pkgLength: productPkgLength ? String(productPkgLength) : '',
      pkgWidth: productPkgWidth ? String(productPkgWidth) : '',
      pkgHeight: productPkgHeight ? String(productPkgHeight) : '',
    })
    setShopeeAttributes([])
    setShopeeAttrValues({})
    setShopeeCategoryQuery('')
    setShopeeCategoryResults([])
  }

  // Selecionar categoria Shopee e carregar atributos
  const selectShopeeCategory = async (cat: { id: number; name: string }) => {
    setShopeeFormData(prev => ({ ...prev, categoryId: cat.id, categoryName: cat.name }))
    setShopeeCategoryResults([])
    setShopeeCategoryQuery('')
    setLoadingShopeeAttrs(true)
    setShopeeAttributes([])
    setShopeeAttrValues({})
    try {
      const res = await fetch(`/api/admin/marketplaces/shopee/attributes?categoryId=${cat.id}`)
      const data = await res.json()
      if (data.attributes) {
        setShopeeAttributes(data.attributes)
        // Pre-fill attribute values from product data based on attribute name
        const prefill: Record<number, string | number> = {}
        for (const attr of data.attributes) {
          const name = attr.name.toLowerCase()
          if (name.includes('brand') || name.includes('marca')) {
            if (productBrand) {
              const match = attr.values.find((v: any) => v.name.toLowerCase() === productBrand.toLowerCase())
              if (match) prefill[attr.id] = match.id
              else if (attr.values.length === 0) prefill[attr.id] = productBrand
            }
          } else if (name.includes('model')) {
            const modelVal = productModel || productName
            if (modelVal) {
              const match = attr.values.find((v: any) => v.name.toLowerCase() === modelVal.toLowerCase())
              if (match) prefill[attr.id] = match.id
              else if (attr.values.length === 0) prefill[attr.id] = modelVal.substring(0, 100)
            }
          }
        }
        if (Object.keys(prefill).length > 0) setShopeeAttrValues(prefill)
      }
    } catch (e) {
      console.error('Erro ao carregar atributos Shopee:', e)
    } finally {
      setLoadingShopeeAttrs(false)
    }
  }

  // Carregar canais logísticos da Shopee
  const loadShopeeLogistics = async () => {
    setLoadingLogistics(true)
    try {
      const res = await fetch('/api/admin/marketplaces/shopee/logistics')
      const data = await res.json()
      if (data.channels) {
        setShopeeChannels(data.channels)
        // Pré-selecionar os que já estão habilitados na Shopee
        setSelectedChannelIds(data.channels.filter((c: any) => c.enabled).map((c: any) => c.id))
      }
    } catch (e) {
      console.error('Erro ao carregar logística Shopee:', e)
    } finally {
      setLoadingLogistics(false)
    }
  }

  // Buscar categorias por predição
  const searchCategories = useCallback(async (query: string) => {
    if (query.length < 3) {
      setCategoryPredictions([])
      return
    }
    
    setSearchingCategories(true)
    try {
      const response = await fetch(`/api/admin/mercadolivre/categories?query=${encodeURIComponent(query)}`)
      const data = await response.json()
      
      if (data.predictions) {
        setCategoryPredictions(data.predictions)
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
    } finally {
      setSearchingCategories(false)
    }
  }, [])

  // Debounce para busca de categorias
  useEffect(() => {
    const timer = setTimeout(() => {
      if (categorySearch) {
        searchCategories(categorySearch)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [categorySearch, searchCategories])

  // Iniciar busca com nome do produto quando abre o modal
  useEffect(() => {
    if (showModal && productName && currentStep === 2 && categoryPredictions.length === 0) {
      setCategorySearch(productName)
      searchCategories(productName)
    }
  }, [showModal, productName, currentStep, searchCategories, categoryPredictions.length])

  // Selecionar uma categoria e carregar seus detalhes
  const selectCategory = async (categoryId: string) => {
    setLoadingCategory(true)
    try {
      const response = await fetch(`/api/admin/mercadolivre/categories?categoryId=${categoryId}`)
      const data = await response.json()
      
      if (data.category) {
        setSelectedCategory(data.category)
        setRequiredAttributes(data.requiredAttributes || [])
        
        // Busca catálogo automaticamente APENAS quando é obrigatório
        // Quando é opcional (catalogAvailable mas !requiresCatalog), o usuário escolhe se quer usar
        if (data.category.requiresCatalog) {
          setCatalogQuery(productName)
          searchCatalog(data.category.id, data.category.catalogDomain, productName)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar categoria:', error)
      showInfoModal({
        type: 'error',
        title: 'Erro ao Carregar Categoria',
        message: 'Não foi possível carregar os detalhes da categoria.'
      })
    } finally {
      setLoadingCategory(false)
    }
  }

  // Buscar produtos no catálogo
  const searchCatalog = async (catId?: string, domId?: string, customQuery?: string) => {
    setSearchingCatalog(true)
    setCatalogSearched(false)
    const resolvedCatId = catId || selectedCategory?.id
    const resolvedDomId = domId || selectedCategory?.catalogDomain
    const resolvedQuery = customQuery ?? catalogQuery
    try {
      const response = await fetch('/api/admin/mercadolivre/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gtin: productGtin,
          title: productName,
          categoryId: resolvedCatId,
          domainId: resolvedDomId,
          query: resolvedQuery || productName
        })
      })
      
      const data = await response.json()
      if (data.found && data.products) {
        setCatalogProducts(data.products)
      } else {
        setCatalogProducts([])
      }
    } catch (error) {
      console.error('Erro ao buscar catálogo:', error)
    } finally {
      setSearchingCatalog(false)
      setCatalogSearched(true)
    }
  }

  // Validar produto antes de publicar
  const validateProduct = async () => {
    setValidating(true)
    try {
      const response = await fetch('/api/admin/mercadolivre/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          categoryId: selectedCategory?.id,
          catalogProductId: selectedCatalogProduct?.id
        })
      })
      
      const data = await response.json()
      setValidation(data)
      return data.valid
    } catch (error) {
      console.error('Erro ao validar:', error)
      return false
    } finally {
      setValidating(false)
    }
  }

  // Debounce busca de categorias Shopee
  useEffect(() => {
    if (shopeeCategoryQuery.length < 2) { setShopeeCategoryResults([]); return }
    const timer = setTimeout(async () => {
      setLoadingShopeeCats(true)
      try {
        const res = await fetch(`/api/admin/marketplaces/shopee/categories?query=${encodeURIComponent(shopeeCategoryQuery)}`)
        const d = await res.json()
        if (d.categories) setShopeeCategoryResults(d.categories)
      } catch {}
      finally { setLoadingShopeeCats(false) }
    }, 500)
    return () => clearTimeout(timer)
  }, [shopeeCategoryQuery])

  // Avançar para o próximo passo
  const nextStep = async () => {
    if (currentStep === 1) {
      if (!selectedMarketplace) {
        showInfoModal({
          type: 'warning',
          title: 'Selecione um Marketplace',
          message: 'Escolha onde deseja publicar o produto.'
        })
        return
      }
      // Shopee: vai para step 2 (formulário de dados)
      if (selectedMarketplace === 'shopee') {
        setCurrentStep(2)
        return
      }
      // Amazon e outros: pula para confirmar
      if (selectedMarketplace !== 'mercadolivre') {
        setCurrentStep(3)
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      // Shopee: validar formulário e ir para logística
      if (selectedMarketplace === 'shopee') {
        if (!shopeeFormData.categoryId) {
          showInfoModal({ type: 'warning', title: 'Selecione uma Categoria', message: 'Escolha a categoria do produto na Shopee antes de continuar.' })
          return
        }
        if (!shopeeFormData.itemName.trim()) {
          showInfoModal({ type: 'warning', title: 'Nome obrigatório', message: 'Preencha o nome do produto.' })
          return
        }
        if (!shopeeFormData.weight) {
          showInfoModal({ type: 'warning', title: 'Peso obrigatório', message: 'Informe o peso do produto em kg.' })
          return
        }
        // Validar atributos obrigatórios
        const missingAttrs = shopeeAttributes.filter(a =>
          a.isMandatory && (shopeeAttrValues[a.id] === undefined || shopeeAttrValues[a.id] === '')
        )
        if (missingAttrs.length > 0) {
          showInfoModal({
            type: 'warning',
            title: 'Atributos obrigatórios não preenchidos',
            message: `Preencha os campos obrigatórios da categoria antes de continuar:`,
            details: missingAttrs.map(a => `• ${a.name}`)
          })
          return
        }
        setCurrentStep(3)
        loadShopeeLogistics()
        return
      }
      if (!selectedCategory) {
        showInfoModal({
          type: 'warning',
          title: 'Selecione uma Categoria',
          message: 'Escolha a categoria do Mercado Livre para seu produto.'
        })
        return
      }
      // Só bloqueia se catálogo for OBRIGATÓRIO e encontrou produtos mas não selecionou
      if (selectedCategory.requiresCatalog && !selectedCatalogProduct && catalogProducts.length > 0) {
        showInfoModal({
          type: 'warning',
          title: 'Selecione um Produto do Catálogo',
          message: 'Esta categoria exige vinculação com o catálogo do ML. Selecione o produto correto antes de avançar.',
          details: ['• Clique no produto correto na lista abaixo', '• Depois clique em "Próximo" novamente']
        })
        return
      }
      // Catálogo opcional ou não encontrado — avança normalmente
      setCurrentStep(3)
      validateProduct()
    } else if (currentStep === 3 && selectedMarketplace === 'shopee') {
      // Shopee passo 3: validar logística e ir para confirmar
      if (selectedChannelIds.length === 0) {
        showInfoModal({
          type: 'warning',
          title: 'Selecione pelo menos um método de envio',
          message: 'A Shopee exige que pelo menos um canal de entrega seja ativado para o produto.'
        })
        return
      }
      setCurrentStep(4)
    }
  }

  // Voltar para o passo anterior
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Função para traduzir erros da API para mensagens amigáveis
  const translateApiError = (error: any): string => {
    if (!error) return 'Erro desconhecido'
    
    const message = error.message || ''
    const code = error.code || ''
    
    // Erros do Mercado Livre
    if (code.includes('price.invalid') || message.includes('minimum of price')) {
      const minPrice = message.match(/minimum of price (\d+\.?\d*)/)?.[1] || '?'
      return `Preço muito baixo! O Mercado Livre exige mínimo de R$ ${minPrice}`
    }
    
    if (code.includes('pictures.invalid') || message.includes('pictures')) {
      return 'As imagens do produto não atendem aos requisitos do marketplace'
    }
    
    if (code.includes('category_id.invalid') || message.includes('category')) {
      return 'A categoria selecionada não é válida para este marketplace'
    }
    
    if (code.includes('title.invalid') || message.includes('title')) {
      return 'O título do produto não atende aos requisitos (muito longo ou contém palavras proibidas)'
    }
    
    if (code.includes('description.invalid') || message.includes('description')) {
      return 'A descrição do produto precisa ser ajustada (muito longa ou contém informações proibidas)'
    }
    
    if (code.includes('shipping.invalid') || message.includes('shipping')) {
      return 'Configurações de frete inválidas para este produto'
    }
    
    if (code.includes('attributes.invalid') || message.includes('attributes')) {
      return 'Alguns atributos obrigatórios estão faltando ou são inválidos'
    }
    
    if (code.includes('variations.invalid') || message.includes('variations')) {
      return 'As variações do produto não estão configuradas corretamente'
    }
    
    // Erros de autorização/credenciais
    if (code.includes('unauthorized') || code.includes('invalid_token') || message.includes('unauthorized')) {
      return 'Suas credenciais do marketplace expiraram ou são inválidas'
    }
    
    if (code.includes('forbidden') || message.includes('forbidden')) {
      return 'Você não tem permissão para realizar esta operação no marketplace'
    }
    
    // Erros de marketplace não encontrado/pausado
    if (code.includes('not_found') || message.includes('not found')) {
      return 'O anúncio não foi encontrado no marketplace (pode ter sido removido)'
    }
    
    if (code.includes('paused') || message.includes('paused')) {
      return 'O anúncio está pausado no marketplace'
    }
    
    if (code.includes('closed') || message.includes('closed')) {
      return 'O anúncio foi encerrado no marketplace'
    }
    
    // Erros de estoque
    if (code.includes('stock') || message.includes('available_quantity')) {
      return 'Problemas com a quantidade disponível em estoque'
    }
    
    // Traduzir mensagens comuns em inglês
    if (message.includes('Invalid request') || message.includes('Bad request')) {
      return 'Dados do produto inválidos para este marketplace'
    }
    
    if (message.includes('Internal server error')) {
      return 'Erro temporário no marketplace. Tente novamente em alguns minutos'
    }
    
    if (message.includes('Too many requests')) {
      return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente'
    }
    
    if (message.includes('Service unavailable')) {
      return 'O marketplace está temporariamente indisponível'
    }
    
    // Se não conseguir traduzir, retorna a mensagem original mais amigável
    return `Erro do marketplace: ${message || code || 'Verifique os dados do produto'}`
  }

  const handlePublish = async () => {
    if (!selectedMarketplace) {
      showInfoModal({
        type: 'warning',
        title: 'Marketplace Não Selecionado',
        message: 'Você precisa selecionar um marketplace antes de publicar.',
        details: [
          '• Escolha entre Mercado Livre, Shopee ou Amazon',
          '• Certifique-se de que o marketplace está configurado',
          '• Verifique se você tem permissão para publicar'
        ]
      })
      return
    }

    // Verificar se a validação foi feita e se há erros
    if (validation && !validation.valid) {
      showInfoModal({
        type: 'error',
        title: 'Produto Não Validado',
        message: 'O produto possui erros que impedem a publicação.',
        details: validation.errors.map(e => `• ${e}`)
      })
      return
    }

    if (loading) return

    try {
      setLoading(true)
      const response = await fetch(`/api/admin/products/${productId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          marketplace: selectedMarketplace,
          // Passar a categoria e catálogo selecionados no modal
          mlCategoryId: selectedCategory?.id,
          catalogProductId: selectedCatalogProduct?.id,
          logisticChannels: selectedChannelIds,
          shopeeFormData: selectedMarketplace === 'shopee' ? {
            categoryId: shopeeFormData.categoryId,
            itemName: shopeeFormData.itemName.trim(),
            brand: shopeeFormData.brand.trim(),
            weight: parseFloat(shopeeFormData.weight) || undefined,
            pkgLength: parseFloat(shopeeFormData.pkgLength) || undefined,
            pkgWidth: parseFloat(shopeeFormData.pkgWidth) || undefined,
            pkgHeight: parseFloat(shopeeFormData.pkgHeight) || undefined,
            attributes: shopeeAttributes
              .filter(attr => shopeeAttrValues[attr.id] !== undefined && shopeeAttrValues[attr.id] !== '')
              .map(attr => ({
                attribute_id: attr.id,
                attribute_value_list: attr.values.length > 0
                  ? [{ value_id: Number(shopeeAttrValues[attr.id]) }]
                  : [{ original_value: String(shopeeAttrValues[attr.id]).substring(0, 256) }]
              })),
          } : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Tratar erros específicos usando tradução
        if (data.cause && Array.isArray(data.cause) && data.cause.length > 0) {
          // Separar avisos ("ignored because it is not modifiable") de erros reais bloqueantes
          const blocking = data.cause.filter((err: any) => 
            !String(err.message || '').toLowerCase().includes('ignored because it is not modifiable')
          )
          const warnings = data.cause.filter((err: any) =>
            String(err.message || '').toLowerCase().includes('ignored because it is not modifiable')
          )
          const causeList = blocking.length > 0 ? blocking : data.cause
          const errors = [
            ...causeList.map((err: any) => `• ${translateApiError(err)}`),
            ...(warnings.length > 0 ? [`ℹ️ Avisos ignorados (não bloqueantes): ${warnings.length} atributo(s) não modificável(is)`] : [])
          ]
          const hasAuthError = data.cause.some((err: any) => 
            err.code?.includes('unauthorized') || err.code?.includes('invalid_token')
          )

          // Determinar dicas específicas baseadas nos erros
          const tips = []
          if (hasAuthError) {
            tips.push(
              '🔑 Problemas de autorização:',
              '• Vá em Configurações > Integrações',
              '• Reconecte sua conta do Mercado Livre',
              '• Verifique se suas permissões estão corretas'
            )
          } else {
            tips.push(
              '💡 Como corrigir:',
              '• Edite o produto e ajuste as informações necessárias',
              '• Verifique se todas as imagens estão corretas',
              '• Confirme que a categoria está mapeada',
              '• Tente publicar novamente após as correções'
            )
          }

          showInfoModal({
            type: 'error',
            title: hasAuthError ? 'Problema de Autorização' : 'Validação do Marketplace Falhou',
            message: data.message || 'O marketplace rejeitou o produto pelos seguintes motivos:',
            details: [
              ...errors,
              '',
              ...tips
            ],
            action: {
              label: 'Entendi',
              onClick: closeInfoModal
            }
          })
          return
        }

        // Verificar erro de campos inválidos (geralmente significa que precisa de catálogo)
        const isInvalidFieldsError = data.message?.includes('invalid_fields') || 
          data.cause?.some((c: any) => c.code?.includes('invalid_fields'))

        const isCatalogRequired =
          isInvalidFieldsError ||
          data.message?.toLowerCase().includes('catálogo') ||
          data.message?.toLowerCase().includes('catalog') ||
          data.details?.toLowerCase?.()?.includes('catalog_required')
        
        if (isCatalogRequired && !selectedCatalogProduct) {
          showInfoModal({
            type: 'error',
            title: 'Catálogo Obrigatório',
            message: data.message?.includes('invalid_fields')
              ? 'Esta categoria exige que o produto seja vinculado ao catálogo do Mercado Livre.'
              : (data.message || 'Esta categoria exige publicação via catálogo.'),
            details: [
              '💡 Como resolver:',
              '• Feche este aviso',
              '• Na etapa "Confirmar", clique em "Buscar no Catálogo ML"',
              '• Encontre e selecione o produto correto',
              '• Clique em "Publicar Agora" novamente',
            ],
            action: {
              label: 'Voltar e Selecionar Catálogo',
              onClick: () => {
                closeInfoModal()
                setCurrentStep(2)
              }
            }
          })
          return
        }

        // Erro genérico
        const errorDetails = []
        
        // Adicionar mensagem principal
        if (data.message) {
          errorDetails.push(`• ${data.message}`)
        }
        
        // Adicionar causa detalhada se disponível
        if (data.cause && Array.isArray(data.cause)) {
          data.cause.forEach((c: any) => {
            if (c.code) errorDetails.push(`• Código: ${c.code}`)
            if (c.message) errorDetails.push(`  ${c.message}`)
          })
        }
        
        // Dicas gerais
        errorDetails.push('')
        errorDetails.push('💡 Dicas:')
        errorDetails.push('• Verifique se o marketplace está configurado')
        errorDetails.push('• Certifique-se de que o produto tem todas as informações necessárias')
        errorDetails.push('• Verifique se você tem autorização para publicar')
        
        showInfoModal({
          type: 'error',
          title: 'Erro ao Publicar Produto',
          message: 'Não foi possível publicar o produto no marketplace.',
          details: errorDetails,
          action: {
            label: 'OK',
            onClick: closeInfoModal
          }
        })
        return
      }

      showInfoModal({
        type: 'success',
        title: 'Produto Publicado!',
        message: `Produto publicado com sucesso no ${MARKETPLACES.find(m => m.id === selectedMarketplace)?.name}!`,
        details: [
          '✓ Anúncio criado no marketplace',
          '✓ Sincronização ativa',
          '✓ O produto já está visível para os compradores'
        ],
        action: {
          label: 'OK',
          onClick: () => {
            closeInfoModal()
            window.location.reload()
          }
        }
      })
    } catch (error) {
      console.error('Erro ao publicar:', error)
      showInfoModal({
        type: 'error',
        title: 'Erro de Conexão',
        message: 'Não foi possível conectar ao servidor para publicar o produto.',
        details: [
          '🌐 Problemas de conectividade:',
          '• Verifique sua conexão com a internet', 
          '• O servidor pode estar temporariamente indisponível',
          '• Tente novamente em alguns minutos',
          '',
          '🔧 Se o problema persistir:',
          '• Atualize a página e tente novamente',
          '• Entre em contato com o suporte técnico'
        ],
        action: {
          label: 'Tentar Novamente',
          onClick: () => {
            closeInfoModal()
            handlePublish()
          }
        }
      })
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async (marketplace: string) => {
    try {
      setSyncing(marketplace)
      const response = await fetch(`/api/admin/products/${productId}/sync-listing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketplace }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Tratar erros específicos usando tradução
        const errorDetails = []
        let hasAuthError = false
        
        if (data.cause && Array.isArray(data.cause)) {
          data.cause.forEach((err: any) => {
            errorDetails.push(`• ${translateApiError(err)}`)
            if (err.code?.includes('unauthorized') || err.code?.includes('invalid_token')) {
              hasAuthError = true
            }
          })
        }

        if (errorDetails.length === 0) {
          const errorMsg = translateApiError(data)
          errorDetails.push(`• ${errorMsg}`)
          
          // Adicionar dicas específicas
          if (hasAuthError || data.error?.includes('unauthorized')) {
            errorDetails.push(
              '',
              '🔑 Reconecte sua conta:',
              '• Vá em Configurações > Integrações',
              '• Autorize novamente o marketplace'
            )
          } else {
            errorDetails.push(
              '',
              '🔍 Verificações recomendadas:',
              '• Confirme se o anúncio ainda existe',
              '• Verifique sua conexão com a internet',
              '• Tente novamente em alguns minutos'
            )
          }
        }

        showInfoModal({
          type: 'error',
          title: 'Erro ao Sincronizar',
          message: data.message || 'Não foi possível sincronizar o anúncio.',
          details: errorDetails.filter(Boolean),
          action: {
            label: 'OK',
            onClick: closeInfoModal
          }
        })
        return
      }

      showInfoModal({
        type: 'success',
        title: 'Sincronização Concluída!',
        message: 'O anúncio foi sincronizado com sucesso.',
        details: [
          '✓ Preços atualizados',
          '✓ Estoque sincronizado',
          '✓ Informações do produto atualizadas'
        ],
        action: {
          label: 'OK',
          onClick: () => {
            closeInfoModal()
            window.location.reload()
          }
        }
      })
    } catch (error) {
      console.error('Erro ao sincronizar:', error)
      showInfoModal({
        type: 'error',
        title: 'Erro de Conexão',
        message: 'Não foi possível conectar ao servidor para sincronizar.',
        details: [
          '🌐 Problemas de conectividade:',
          '• Verifique sua conexão com a internet',
          '• O servidor pode estar temporariamente indisponível',
          '• Tente novamente em alguns instantes',
          '',
          '🔧 Se o problema persistir:',
          '• Atualize a página e tente novamente',
          '• Verifique se o marketplace está funcionando',
          '• Entre em contato com o suporte se necessário'
        ],
        action: {
          label: 'Tentar Novamente',
          onClick: () => {
            closeInfoModal()
            handleSync(marketplace)
          }
        }
      })
      console.error('Erro:', error)
    } finally {
      setSyncing(null)
    }
  }

  const handleDelete = async (marketplace: string) => {
    if (confirmDelete !== marketplace) {
      showInfoModal({
        type: 'warning',
        title: 'Confirmar Exclusão',
        message: `Tem certeza que deseja excluir o anúncio do ${MARKETPLACES.find(m => m.id === marketplace)?.name}?`,
        details: [
          '⚠️ Esta ação não pode ser desfeita',
          '• O anúncio será removido do marketplace',
          '• Você precisará republicar o produto para reativá-lo',
          '• Os dados de vendas anteriores serão mantidos'
        ],
        action: {
          label: 'Sim, Excluir',
          onClick: () => {
            closeInfoModal()
            setConfirmDelete(marketplace)
            handleDelete(marketplace)
          }
        }
      })
      return
    }

    try {
      setDeleting(marketplace)
      const response = await fetch(`/api/admin/products/${productId}/delete-listing`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketplace }),
      })

      const data = await response.json()

      if (!response.ok) {
        showInfoModal({
          type: 'error',
          title: 'Erro ao Excluir Anúncio',
          message: data.message || 'Não foi possível excluir o anúncio.',
          details: [
            '• Verifique se você tem permissão para excluir',
            '• O anúncio pode já ter sido removido',
            '• Consulte os logs para mais detalhes'
          ],
          action: {
            label: 'OK',
            onClick: closeInfoModal
          }
        })
        return
      }

      showInfoModal({
        type: 'success',
        title: 'Anúncio Excluído!',
        message: 'O anúncio foi removido do marketplace com sucesso.',
        details: [
          '✓ Anúncio removido',
          '✓ Produto não está mais visível aos compradores',
          '✓ Você pode republicar quando quiser'
        ],
        action: {
          label: 'OK',
          onClick: () => {
            closeInfoModal()
            window.location.reload()
          }
        }
      })
    } catch (error) {
      showInfoModal({
        type: 'error',
        title: 'Erro de Conexão',
        message: 'Não foi possível conectar ao servidor para excluir o anúncio.',
        details: [
          '• Verifique sua conexão com a internet',
          '• Tente novamente em alguns instantes'
        ],
        action: {
          label: 'OK',
          onClick: closeInfoModal
        }
      })
      console.error('Erro:', error)
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  const handleToggle = async (marketplace: string, currentStatus: string) => {
    // Verifica se pode ativar baseado no status
    const statusInfo = getStatusInfo(currentStatus)
    
    if (currentStatus === 'under_review') {
      showInfoModal({
        type: 'warning',
        title: '🔍 Anúncio em Análise',
        message: statusInfo.description,
        details: [
          '⏳ O que está acontecendo:',
          '• O Mercado Livre está revisando seu anúncio',
          '• Este processo pode levar de algumas horas até 24h',
          '• Você receberá notificação quando for aprovado',
          '',
          '🚫 O que NÃO fazer:',
          '• Não tente modificar o anúncio agora',
          '• Não tente ativar/pausar enquanto está em revisão',
          '• Não crie um novo anúncio do mesmo produto',
          '',
          '✅ O que fazer:',
          '• Aguarde pacientemente a aprovação',
          '• Verifique sua caixa de emails do ML',
          '• Use o botão "Sincronizar" para atualizar o status'
        ],
        action: {
          label: 'Entendi',
          onClick: closeInfoModal
        }
      })
      return
    }
    
    if (!statusInfo.canActivate && currentStatus !== 'active') {
      showInfoModal({
        type: 'error',
        title: `${statusInfo.icon} ${statusInfo.label}`,
        message: statusInfo.description,
        details: [
          '❌ Este anúncio não pode ser ativado no momento',
          '• Status atual: ' + statusInfo.label,
          '• Sincronize para verificar atualizações',
          '• Entre em contato com o marketplace se necessário'
        ],
        action: {
          label: 'OK',
          onClick: closeInfoModal
        }
      })
      return
    }
    
    const action = currentStatus === 'active' ? 'pause' : 'activate'
    const actionText = action === 'pause' ? 'pausar' : 'ativar'
    
    try {
      setToggling(marketplace)
      const response = await fetch(`/api/admin/products/${productId}/pause-listing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketplace, action }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Usa formatMLErrors para mensagens detalhadas
        const errorInfo = data.cause ? formatMLErrors(data) : { 
          message: data.message || `Não foi possível ${actionText} o anúncio`,
          details: null 
        }
        
        showInfoModal({
          type: 'error',
          title: 'Erro ao Alterar Status',
          message: errorInfo.message,
          details: [
            '',
            '💡 Possíveis soluções:',
            '• Verifique sua conexão com o marketplace',
            '• Certifique-se de que suas credenciais estão válidas',
            '• Sincronize o anúncio para atualizar o status',
            '• Tente novamente em alguns instantes'
          ],
          action: {
            label: 'OK',
            onClick: closeInfoModal
          }
        })
        return
      }

      showInfoModal({
        type: 'success',
        title: action === 'pause' ? 'Anúncio Pausado' : 'Anúncio Ativado',
        message: data.message || `Anúncio ${action === 'pause' ? 'pausado' : 'ativado'} com sucesso!`,
        details: action === 'pause' ? [
          '✓ Anúncio não está mais visível',
          '✓ Você pode reativar quando quiser',
          '✓ Os dados são mantidos'
        ] : [
          '✓ Anúncio está visível novamente',
          '✓ Compradores podem visualizar o produto',
          '✓ Vendas habilitadas'
        ],
        action: {
          label: 'OK',
          onClick: () => {
            closeInfoModal()
            window.location.reload()
          }
        }
      })
    } catch (error) {
      showInfoModal({
        type: 'error',
        title: 'Erro de Conexão',
        message: `Não foi possível ${actionText} o anúncio.`,
        details: [
          '• Verifique sua conexão com a internet',
          '• Tente novamente em alguns instantes'
        ],
        action: {
          label: 'OK',
          onClick: closeInfoModal
        }
      })
      console.error('Erro:', error)
    } finally {
      setToggling(null)
    }
  }

  const getListingStatus = (marketplace: string) => {
    return existingListings.find(l => l.marketplace === marketplace)
  }

  return (
    <>
      <button
        onClick={() => {
          resetModal()
          setShowModal(true)
        }}
        className="p-2 text-green-600 hover:bg-green-50 rounded-md"
        title="Publicar em marketplace"
      >
        <FiUpload size={18} />
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header com indicador de passos */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Publicar em Marketplaces</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <FiX size={20} />
                </button>
              </div>
              
              {/* Indicador de Passos */}
              {(() => {
                const totalSteps = selectedMarketplace === 'shopee' ? 4 : 3
                const stepLabels = selectedMarketplace === 'shopee'
                  ? ['Marketplace', 'Dados', 'Envio', 'Confirmar']
                  : ['Marketplace', 'Categoria', 'Confirmar']
                return (
                  <>
                    <div className="flex items-center justify-center space-x-2">
                      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
                        <div key={step} className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${currentStep >= step ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {currentStep > step ? <FiCheck size={16} /> : step}
                          </div>
                          {step < totalSteps && (
                            <div className={`w-10 h-1 mx-1 ${currentStep > step ? 'bg-primary-600' : 'bg-gray-200'}`} />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-center text-xs text-gray-500 mt-2 gap-6">
                      {stepLabels.map((label, i) => (
                        <span key={i} className={currentStep >= i + 1 ? 'text-primary-600 font-medium' : ''}>{label}</span>
                      ))}
                    </div>
                  </>
                )
              })()}
            </div>
            
            {/* Conteúdo do Modal */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Listagens existentes - sempre visível */}
              {existingListings.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Anúncios Ativos</h3>
                  <div className="space-y-2">
                    {existingListings.map((listing) => {
                      const marketplace = MARKETPLACES.find(m => m.id === listing.marketplace)
                      return (
                        <div 
                          key={listing.marketplace}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="font-medium">{marketplace?.name}</span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                listing.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : listing.status === 'paused'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {listing.status === 'active' ? 'Ativo' : 
                               listing.status === 'paused' ? 'Pausado' : 
                               listing.status}
                            </span>
                            {listing.lastSyncAt && (
                              <span className="text-xs text-gray-500">
                                Sync: {new Date(listing.lastSyncAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {listing.listingUrl && (
                              <a
                                href={listing.listingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                                title="Ver anúncio"
                            >
                              <FiExternalLink size={16} />
                            </a>
                          )}
                          <button
                            onClick={() => handleToggle(listing.marketplace, listing.status)}
                            disabled={toggling === listing.marketplace}
                            className={`p-2 rounded-md disabled:opacity-50 ${
                              listing.status === 'active'
                                ? 'text-yellow-600 hover:bg-yellow-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={listing.status === 'active' ? 'Pausar anúncio' : 'Ativar anúncio'}
                          >
                            {toggling === listing.marketplace ? (
                              <FiRefreshCw size={16} className="animate-spin" />
                            ) : listing.status === 'active' ? (
                              <FiPause size={16} />
                            ) : (
                              <FiPlay size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => handleSync(listing.marketplace)}
                            disabled={syncing === listing.marketplace}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md disabled:opacity-50"
                            title="Sincronizar"
                          >
                            <FiRefreshCw 
                              size={16} 
                              className={syncing === listing.marketplace ? 'animate-spin' : ''}
                            />
                          </button>
                          <button
                            onClick={() => handleDelete(listing.marketplace)}
                            disabled={deleting === listing.marketplace}
                            className={`p-2 rounded-md disabled:opacity-50 ${
                              confirmDelete === listing.marketplace
                                ? 'text-white bg-red-600 hover:bg-red-700'
                                : 'text-red-600 hover:bg-red-50'
                            }`}
                            title={confirmDelete === listing.marketplace ? 'Clique novamente para confirmar' : 'Excluir anúncio'}
                          >
                            {deleting === listing.marketplace ? (
                              <FiRefreshCw size={16} className="animate-spin" />
                            ) : (
                              <FiTrash2 size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

{/* PASSO 1: Seletor de marketplace */}
              {currentStep === 1 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Selecione o Marketplace
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {MARKETPLACES.filter(m => !getListingStatus(m.id)).map((marketplace) => (
                      <button
                        key={marketplace.id}
                        onClick={() => setSelectedMarketplace(marketplace.id)}
                        className={`p-4 border-2 rounded-lg text-center transition-all ${
                          selectedMarketplace === marketplace.id
                            ? 'border-primary-600 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="font-medium">{marketplace.name}</span>
                      </button>
                    ))}
                  </div>
                  
                  {selectedMarketplace === 'mercadolivre' && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-md">
                      <h4 className="font-semibold mb-2">✨ Publicação Inteligente</h4>
                      <p className="text-sm text-gray-700">
                        Vamos te ajudar a escolher a categoria correta e verificar se o produto 
                        precisa de vinculação com o catálogo do Mercado Livre antes de publicar.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* PASSO 2: Formulário de dados para Shopee */}
              {currentStep === 2 && selectedMarketplace === 'shopee' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Dados para Publicação na Shopee</h3>
                    <p className="text-sm text-gray-500">Preencha os dados antes de publicar. Isso evita erros de atributos obrigatórios.</p>
                  </div>

                  {/* Seleção de Categoria */}
                  <div>
                    <label className="block text-sm font-semibold mb-1">Categoria Shopee <span className="text-red-500">*</span></label>
                    {shopeeFormData.categoryId > 0 ? (
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-300 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-green-800">{shopeeFormData.categoryName}</p>
                          <p className="text-xs text-gray-500">ID: {shopeeFormData.categoryId}</p>
                        </div>
                        <button
                          onClick={() => {
                            setShopeeFormData(prev => ({ ...prev, categoryId: 0, categoryName: '' }))
                            setShopeeAttributes([])
                            setShopeeAttrValues({})
                          }}
                          className="text-xs text-red-500 hover:underline"
                        >Alterar</button>
                      </div>
                    ) : (
                      <div>
                        <div className="relative">
                          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                          <input
                            type="text"
                            value={shopeeCategoryQuery}
                            onChange={e => setShopeeCategoryQuery(e.target.value)}
                            placeholder="Digite para buscar categoria..."
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                          />
                          {loadingShopeeCats && <FiRefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-orange-400" size={14} />}
                        </div>
                        {shopeeCategoryResults.length > 0 && (
                          <div className="border rounded-md max-h-48 overflow-y-auto mt-1 shadow-sm">
                            {shopeeCategoryResults.map((cat: any) => (
                              <button
                                key={cat.id}
                                onClick={() => selectShopeeCategory(cat)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-orange-50 border-b last:border-0 flex items-center justify-between"
                              >
                                <span>{cat.name}</span>
                                <FiChevronRight className="text-gray-400" size={14} />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Atributos da categoria */}
                  {loadingShopeeAttrs && (
                    <div className="text-center py-4">
                      <FiRefreshCw className="animate-spin mx-auto text-orange-500" size={20} />
                      <p className="text-xs text-gray-500 mt-1">Carregando atributos da categoria...</p>
                    </div>
                  )}

                  {!loadingShopeeAttrs && shopeeAttributes.length > 0 && (
                    <div className="space-y-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-orange-800">Atributos Obrigatórios da Categoria</h4>
                      {shopeeAttributes.filter(a => a.isMandatory).map((attr: any) => (
                        <div key={attr.id}>
                          <label className="block text-sm font-medium mb-1">
                            {attr.name} <span className="text-red-500">*</span>
                          </label>
                          {attr.values.length > 0 ? (
                            <select
                              value={shopeeAttrValues[attr.id] || ''}
                              onChange={e => setShopeeAttrValues(prev => ({ ...prev, [attr.id]: e.target.value }))}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
                            >
                              <option value="">-- Selecione --</option>
                              {attr.values.map((v: any) => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={shopeeAttrValues[attr.id] || ''}
                              onChange={e => setShopeeAttrValues(prev => ({ ...prev, [attr.id]: e.target.value }))}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
                              placeholder={`${attr.name}...`}
                            />
                          )}
                        </div>
                      ))}
                      {shopeeAttributes.filter(a => !a.isMandatory).length > 0 && (
                        <details className="pt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer select-none">
                            Atributos opcionais ({shopeeAttributes.filter(a => !a.isMandatory).length})
                          </summary>
                          <div className="space-y-3 mt-2">
                            {shopeeAttributes.filter(a => !a.isMandatory).map((attr: any) => (
                              <div key={attr.id}>
                                <label className="block text-sm font-medium mb-1">{attr.name}</label>
                                {attr.values.length > 0 ? (
                                  <select
                                    value={shopeeAttrValues[attr.id] || ''}
                                    onChange={e => setShopeeAttrValues(prev => ({ ...prev, [attr.id]: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                  >
                                    <option value="">-- Não informar --</option>
                                    {attr.values.map((v: any) => (
                                      <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={shopeeAttrValues[attr.id] || ''}
                                    onChange={e => setShopeeAttrValues(prev => ({ ...prev, [attr.id]: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    placeholder={`${attr.name}...`}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  )}

                  {/* Dados do produto */}
                  <div className="pt-3 border-t border-gray-200 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">Dados do Produto</h4>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Nome do produto <span className="text-red-500">*</span>
                        <span className="text-gray-400 font-normal ml-1">(até 120 caracteres)</span>
                      </label>
                      <input
                        type="text"
                        maxLength={120}
                        value={shopeeFormData.itemName}
                        onChange={e => setShopeeFormData(prev => ({ ...prev, itemName: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
                        placeholder="Nome do produto..."
                      />
                      <p className="text-xs text-gray-400 mt-0.5 text-right">{shopeeFormData.itemName.length}/120</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Marca</label>
                      <input
                        type="text"
                        value={shopeeFormData.brand}
                        onChange={e => setShopeeFormData(prev => ({ ...prev, brand: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
                        placeholder="Ex: Samsung, Xiaomi, Sem marca..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Peso (kg) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={shopeeFormData.weight}
                          onChange={e => setShopeeFormData(prev => ({ ...prev, weight: e.target.value.replace(',', '.') }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
                          placeholder="Ex: 0.5"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Dimensões da embalagem (cm)</label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={shopeeFormData.pkgLength}
                            onChange={e => setShopeeFormData(prev => ({ ...prev, pkgLength: e.target.value.replace(',', '.') }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            placeholder="Comp."
                          />
                          <p className="text-xs text-gray-400 mt-0.5 text-center">Comprimento</p>
                        </div>
                        <div>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={shopeeFormData.pkgWidth}
                            onChange={e => setShopeeFormData(prev => ({ ...prev, pkgWidth: e.target.value.replace(',', '.') }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            placeholder="Larg."
                          />
                          <p className="text-xs text-gray-400 mt-0.5 text-center">Largura</p>
                        </div>
                        <div>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={shopeeFormData.pkgHeight}
                            onChange={e => setShopeeFormData(prev => ({ ...prev, pkgHeight: e.target.value.replace(',', '.') }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            placeholder="Alt."
                          />
                          <p className="text-xs text-gray-400 mt-0.5 text-center">Altura</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PASSO 3: Logística para Shopee */}
              {currentStep === 3 && selectedMarketplace === 'shopee' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Métodos de Envio</h3>
                    <p className="text-sm text-gray-500">Selecione quais canais de entrega deseja ativar para este produto na Shopee.</p>
                  </div>

                  {loadingLogistics && (
                    <div className="text-center py-8">
                      <FiRefreshCw className="animate-spin mx-auto text-orange-500" size={28} />
                      <p className="mt-2 text-sm text-gray-500">Carregando opções de envio...</p>
                    </div>
                  )}

                  {!loadingLogistics && shopeeChannels.length === 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                      <p className="font-medium">Nenhum canal encontrado.</p>
                      <p className="mt-1">Verifique se sua conta Shopee possui métodos de envio configurados no Seller Centre.</p>
                      <button onClick={loadShopeeLogistics} className="mt-2 text-orange-600 underline text-xs">Tentar novamente</button>
                    </div>
                  )}

                  {!loadingLogistics && shopeeChannels.length > 0 && (
                    <div className="space-y-2">
                      {shopeeChannels.map(channel => (
                        <label
                          key={channel.id}
                          className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            selectedChannelIds.includes(channel.id)
                              ? 'border-orange-400 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-orange-500"
                            checked={selectedChannelIds.includes(channel.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedChannelIds(prev => [...prev, channel.id])
                              } else {
                                setSelectedChannelIds(prev => prev.filter(id => id !== channel.id))
                              }
                            }}
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{channel.name}</p>
                            <p className="text-xs text-gray-400">
                              ID: {channel.id}
                              {channel.codEnabled && ' • COD habilitado'}
                              {channel.preferred && ' • Preferencial'}
                            </p>
                          </div>
                          {selectedChannelIds.includes(channel.id) && (
                            <FiCheckCircle className="text-orange-500 flex-shrink-0" size={18} />
                          )}
                        </label>
                      ))}
                      <p className="text-xs text-gray-400 pt-1">
                        {selectedChannelIds.length} de {shopeeChannels.length} canal(is) selecionado(s)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* PASSO 2: Seleção de Categoria do ML */}
              {currentStep === 2 && selectedMarketplace === 'mercadolivre' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Buscar Categoria do Mercado Livre
                    </label>
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        placeholder="Digite o nome do produto para sugerir categorias..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                      {searchingCategories && (
                        <FiRefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 animate-spin text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Lista de categorias sugeridas */}
                  {categoryPredictions.length > 0 && !selectedCategory && (
                    <div className="border rounded-md max-h-60 overflow-y-auto">
                      {categoryPredictions.map((prediction) => (
                        <button
                          key={prediction.categoryId}
                          onClick={() => selectCategory(prediction.categoryId)}
                          disabled={loadingCategory}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium text-sm">{prediction.categoryName}</p>
                            <p className="text-xs text-gray-500">{prediction.domainName}</p>
                          </div>
                          <FiChevronRight className="text-gray-400" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Categoria selecionada */}
                  {selectedCategory && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium flex items-center">
                            <FiCheckCircle className="text-green-600 mr-2" />
                            Categoria Selecionada
                          </p>
                          <p className="text-sm text-gray-700 mt-1">{selectedCategory.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{selectedCategory.path}</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedCategory(null)
                            setCatalogProducts([])
                            setSelectedCatalogProduct(null)
                            setCatalogSearched(false)
                            setCatalogQuery('')
                          }}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Alterar
                        </button>
                      </div>

                      {/* Aviso se catálogo OBRIGATÓRIO */}
                      {selectedCategory.requiresCatalog && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-sm text-yellow-800 flex items-start">
                            <FiAlertCircle className="mr-2 mt-0.5 flex-shrink-0" />
                            Esta categoria <strong>exige</strong> vinculação com o catálogo do ML
                          </p>
                        </div>
                      )}
                      {/* Aviso catálogo DISPONÍVEL mas opcional */}
                      {!selectedCategory.requiresCatalog && selectedCategory.catalogAvailable && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-sm text-blue-800 flex items-start">
                            <FiAlertCircle className="mr-2 mt-0.5 flex-shrink-0" />
                            Esta categoria tem catálogo disponível, mas você pode publicar com <strong>seu próprio título e fotos</strong> sem usar o catálogo.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Busca de catálogo — mostra quando obrigatório OU quando disponível e usuário quer usar */}
                  {(selectedCategory?.requiresCatalog || selectedCategory?.catalogAvailable) && (
                    <div className="p-4 bg-gray-50 rounded-md">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium flex items-center text-gray-800">
                          <FiPackage className="mr-2" />
                          {selectedCategory?.requiresCatalog ? 'Selecionar no Catálogo ML (obrigatório)' : 'Usar Catálogo ML (opcional)'}
                        </h4>
                        {selectedCatalogProduct && (
                          <button
                            onClick={() => { setSelectedCatalogProduct(null) }}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Remover seleção
                          </button>
                        )}
                      </div>

                      {/* Produto selecionado */}
                      {selectedCatalogProduct && (
                        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-300 rounded-md mb-3">
                          {selectedCatalogProduct.picture && (
                            <img src={selectedCatalogProduct.picture} alt={selectedCatalogProduct.name} className="w-12 h-12 object-cover rounded" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-green-800">{selectedCatalogProduct.name}</p>
                            <p className="text-xs text-gray-500">ID: {selectedCatalogProduct.id}</p>
                          </div>
                          <FiCheckCircle className="text-green-600 flex-shrink-0" size={20} />
                        </div>
                      )}

                      {/* Campo de busca */}
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          placeholder={`Buscar modelo no catálogo ML...`}
                          value={catalogQuery}
                          onChange={(e) => setCatalogQuery(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') searchCatalog(undefined, undefined, catalogQuery) }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => searchCatalog(undefined, undefined, catalogQuery)}
                          disabled={searchingCatalog}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          {searchingCatalog ? <FiRefreshCw className="animate-spin" size={14} /> : <FiSearch size={14} />}
                          {searchingCatalog ? 'Buscando...' : 'Buscar'}
                        </button>
                      </div>

                      {/* Lista de resultados */}
                      {searchingCatalog && (
                        <div className="text-center py-4 text-sm text-blue-600 flex items-center justify-center gap-2">
                          <FiRefreshCw className="animate-spin" size={14} /> Buscando templates no catálogo...
                        </div>
                      )}

                      {!searchingCatalog && catalogProducts.length > 0 && (
                        <div className="space-y-2 max-h-56 overflow-y-auto">
                          <p className="text-xs text-gray-500 mb-1">{catalogProducts.length} template(s) encontrado(s). Selecione o que corresponde ao seu produto:</p>
                          {catalogProducts.map((product: any) => (
                            <button
                              key={product.id}
                              onClick={() => setSelectedCatalogProduct(product)}
                              className={`w-full p-3 text-left border rounded-md transition-all flex items-center gap-3 ${
                                selectedCatalogProduct?.id === product.id
                                  ? 'border-green-500 bg-green-50'
                                  : product.gtinMatch
                                  ? 'border-blue-400 bg-blue-50'
                                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                              }`}
                            >
                              {product.picture && (
                                <img src={product.picture} alt={product.name} className="w-12 h-12 object-cover rounded flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{product.name}</p>
                                <p className="text-xs text-gray-400">ID: {product.id}</p>
                                {product.gtinMatch && (
                                  <span className="text-xs text-blue-600 font-semibold">✓ Corresponde ao GTIN do produto</span>
                                )}
                              </div>
                              {selectedCatalogProduct?.id === product.id && (
                                <FiCheckCircle className="text-green-600 flex-shrink-0" size={18} />
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {!searchingCatalog && catalogSearched && catalogProducts.length === 0 && (
                        <div className="text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded p-3">
                          <p className="font-semibold">Nenhum template encontrado.</p>
                          <p className="mt-1">Tente buscar pelo nome do modelo exato (ex: "Galaxy Watch 7") ou por uma palavra-chave diferente.</p>
                          <p className="mt-1 text-xs text-gray-500">Você também pode avançar sem selecionar catálogo e o sistema tentará publicar normalmente.</p>
                        </div>
                      )}

                      {!catalogSearched && !searchingCatalog && (
                        <p className="text-xs text-gray-400 text-center py-2">Digite um termo e clique em Buscar para ver os templates disponíveis nesta categoria.</p>
                      )}

                      {/* Opção de PULAR catálogo — só aparece quando não é obrigatório */}
                      {!selectedCategory?.requiresCatalog && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-2">
                            Não quer usar o catálogo? Publique com <strong>seu próprio título, fotos e descrição</strong>:
                          </p>
                          <button
                            onClick={() => {
                              setSelectedCatalogProduct(null)
                              setCatalogProducts([])
                              setCatalogSearched(false)
                              setCatalogQuery('')
                              // Avança direto para step 3 sem catálogo
                              setCurrentStep(3)
                              validateProduct()
                            }}
                            className="w-full py-2 px-4 border border-gray-400 text-gray-700 rounded-md text-sm hover:bg-gray-100 flex items-center justify-center gap-2"
                          >
                            <FiXCircle size={14} />
                            Publicar sem catálogo (usar minhas fotos e descrição)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* PASSO 3 (ML/outros) / PASSO 4 (Shopee): Validação e Confirmação */}
              {((currentStep === 3 && selectedMarketplace !== 'shopee') || (currentStep === 4 && selectedMarketplace === 'shopee')) && (
                <div className="space-y-4">
                  {/* Para Shopee: card de confirmação simples */}
                  {selectedMarketplace === 'shopee' && (
                    <div className="space-y-3">
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <h4 className="font-medium text-orange-800 flex items-center gap-2 mb-3">
                          <FiCheckCircle />
                          Pronto para publicar na Shopee
                        </h4>
                        <ul className="text-sm text-orange-700 space-y-1">
                          <li>• Nome: <strong>{productName.substring(0, 60)}{productName.length > 60 ? '...' : ''}</strong></li>
                          <li>• As imagens e descrição do produto serão enviadas automaticamente</li>
                          <li>• Após publicar, o produto ficará como <strong>NORMAL</strong> na Shopee</li>
                          <li>• Você poderá editar categoria e logística diretamente no painel da Shopee</li>
                        </ul>
                      </div>
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                        ℹ️ A categoria e métodos de envio poderão ser ajustados depois no Seller Centre da Shopee.
                      </div>
                    </div>
                  )}

                  {/* Para ML: fluxo de validação existente */}
                  {selectedMarketplace === 'mercadolivre' && (validating ? (
                    <div className="text-center py-8">
                      <FiRefreshCw className="animate-spin mx-auto text-primary-600" size={32} />
                      <p className="mt-3 text-gray-600">Validando produto...</p>
                    </div>
                  ) : validation ? (
                    <>
                      {/* Resumo da validação */}
                      <div className={`p-4 rounded-md ${validation.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <h4 className={`font-medium flex items-center ${validation.valid ? 'text-green-800' : 'text-red-800'}`}>
                          {validation.valid ? (
                            <>
                              <FiCheckCircle className="mr-2" />
                              Produto pronto para publicação!
                            </>
                          ) : (
                            <>
                              <FiAlertCircle className="mr-2" />
                              Existem problemas a resolver
                            </>
                          )}
                        </h4>
                      </div>

                      {/* Erros */}
                      {validation.errors.length > 0 && (
                        <div className="p-4 bg-red-50 rounded-md">
                          <h5 className="font-medium text-red-800 mb-2">Erros que impedem a publicação:</h5>
                          <ul className="space-y-1">
                            {validation.errors.map((error, i) => (
                              <li key={i} className="text-sm text-red-700 flex items-start">
                                <FiX className="mr-2 mt-0.5 flex-shrink-0" size={14} />
                                {error}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Avisos */}
                      {validation.warnings.length > 0 && (
                        <div className="p-4 bg-yellow-50 rounded-md">
                          <h5 className="font-medium text-yellow-800 mb-2">Avisos (não impedem publicação):</h5>
                          <ul className="space-y-1">
                            {validation.warnings.map((warning, i) => (
                              <li key={i} className="text-sm text-yellow-700 flex items-start">
                                <FiAlertCircle className="mr-2 mt-0.5 flex-shrink-0" size={14} />
                                {warning}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Informações */}
                      {validation.info.length > 0 && (
                        <div className="p-4 bg-blue-50 rounded-md">
                          <h5 className="font-medium text-blue-800 mb-2">Informações do produto:</h5>
                          <ul className="space-y-1">
                            {validation.info.map((info, i) => (
                              <li key={i} className="text-sm text-blue-700">
                                {info}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Seleção de catálogo no Step 3 — apenas se exige OU se ainda quer escolher */}
                      {selectedCategory?.requiresCatalog && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                          <h5 className="font-medium text-blue-800 flex items-center mb-3">
                            <FiPackage className="mr-2" />
                            {selectedCatalogProduct ? 'Catálogo vinculado' : 'Vincular ao Catálogo ML (obrigatório)'}
                          </h5>

                          {/* Produto selecionado */}
                          {selectedCatalogProduct && (
                            <div className="flex items-center gap-3 p-3 bg-white border border-green-300 rounded-md mb-3">
                              {selectedCatalogProduct.picture && (
                                <img src={selectedCatalogProduct.picture} alt={selectedCatalogProduct.name} className="w-12 h-12 object-cover rounded" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate text-green-800">{selectedCatalogProduct.name}</p>
                                <p className="text-xs text-gray-500">ID: {selectedCatalogProduct.id}</p>
                              </div>
                              <FiCheckCircle className="text-green-600 flex-shrink-0" size={20} />
                              <button
                                onClick={() => { setSelectedCatalogProduct(null); setTimeout(validateProduct, 300) }}
                                className="text-xs text-red-500 hover:underline ml-2"
                              >
                                Remover
                              </button>
                            </div>
                          )}

                          {/* Campo de busca */}
                          <div className="flex gap-2 mb-3">
                            <input
                              type="text"
                              placeholder="Buscar modelo no catálogo ML..."
                              value={catalogQuery}
                              onChange={(e) => setCatalogQuery(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') searchCatalog(undefined, undefined, catalogQuery) }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => searchCatalog(undefined, undefined, catalogQuery)}
                              disabled={searchingCatalog}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                            >
                              {searchingCatalog ? <FiRefreshCw className="animate-spin" size={14} /> : <FiSearch size={14} />}
                              {searchingCatalog ? 'Buscando...' : 'Buscar'}
                            </button>
                          </div>

                          {/* Lista de resultados */}
                          {!searchingCatalog && catalogProducts.length > 0 && (
                            <div className="space-y-2 max-h-52 overflow-y-auto">
                              <p className="text-xs text-gray-500 mb-1">{catalogProducts.length} template(s). Selecione o que corresponde ao seu produto:</p>
                              {catalogProducts.map((cp: any) => (
                                <button
                                  key={cp.id}
                                  onClick={() => { setSelectedCatalogProduct(cp); setTimeout(validateProduct, 300) }}
                                  className={`w-full p-3 text-left border rounded-md transition-all flex items-center gap-3 ${
                                    selectedCatalogProduct?.id === cp.id
                                      ? 'border-green-500 bg-green-50'
                                      : cp.gtinMatch
                                      ? 'border-blue-400 bg-blue-50'
                                      : 'border-gray-200 hover:border-blue-300 hover:bg-white'
                                  }`}
                                >
                                  {cp.picture && <img src={cp.picture} alt={cp.name} className="w-12 h-12 object-cover rounded flex-shrink-0" />}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{cp.name}</p>
                                    <p className="text-xs text-gray-400">ID: {cp.id}</p>
                                    {cp.gtinMatch && <span className="text-xs text-blue-600 font-semibold">✓ Corresponde ao GTIN do produto</span>}
                                  </div>
                                  {selectedCatalogProduct?.id === cp.id && <FiCheckCircle className="text-green-600 flex-shrink-0" size={18} />}
                                </button>
                              ))}
                            </div>
                          )}

                          {searchingCatalog && (
                            <p className="text-sm text-blue-600 flex items-center gap-2">
                              <FiRefreshCw className="animate-spin" size={14} /> Buscando no catálogo ML...
                            </p>
                          )}

                          {!searchingCatalog && catalogSearched && catalogProducts.length === 0 && (
                            <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-3">
                              Nenhum template encontrado. Tente buscar pelo nome do modelo exato (ex: "Galaxy Watch 7").
                            </p>
                          )}

                          {!catalogSearched && !searchingCatalog && (
                            <p className="text-xs text-gray-400 text-center">Digite um termo e clique em Buscar.</p>
                          )}
                        </div>
                      )}

                      {/* Resumo da categoria e catálogo selecionados */}
                      {selectedCategory && (
                        <div className="p-4 bg-gray-50 rounded-md">
                          <h5 className="font-medium text-gray-800 mb-2">Configurações selecionadas:</h5>
                          <ul className="text-sm text-gray-700 space-y-1">
                            <li>• Categoria: {selectedCategory.name}</li>
                            {selectedCatalogProduct && (
                              <li>• Catálogo: {selectedCatalogProduct.name} <span className="text-green-600">(vinculado)</span></li>
                            )}
                            {selectedCategory.requiresCatalog && !selectedCatalogProduct && (
                              <li className="text-yellow-700">• Catálogo: não selecionado (recomendado para esta categoria)</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <FiAlertCircle className="mx-auto text-gray-400" size={32} />
                      <p className="mt-3 text-gray-600">Não foi possível validar o produto</p>
                      <button
                        onClick={validateProduct}
                        className="mt-2 text-primary-600 hover:underline"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer com botões de ação */}
            <div className="border-t p-4 flex justify-between">
              <button
                onClick={currentStep === 1 ? () => setShowModal(false) : prevStep}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md flex items-center"
                disabled={loading}
              >
                {currentStep > 1 && <FiChevronLeft className="mr-1" />}
                {currentStep === 1 ? 'Cancelar' : 'Voltar'}
              </button>
              
              <div className="flex space-x-3">
                {(selectedMarketplace === 'shopee' ? currentStep < 4 : currentStep < 3) ? (
                  <button
                    onClick={nextStep}
                    disabled={
                      (currentStep === 1 && !selectedMarketplace) ||
                      (currentStep === 2 && selectedMarketplace === 'shopee' && !shopeeFormData.categoryId) ||
                      (currentStep === 3 && selectedMarketplace === 'shopee' && selectedChannelIds.length === 0) ||
                      (currentStep === 2 && selectedMarketplace === 'mercadolivre' && !selectedCategory) ||
                      loadingCategory ||
                      loadingLogistics ||
                      loadingShopeeAttrs
                    }
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {loadingCategory ? (
                      <>
                        <FiRefreshCw className="animate-spin mr-2" size={16} />
                        Carregando...
                      </>
                    ) : (
                      <>
                        Próximo
                        <FiChevronRight className="ml-1" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handlePublish}
                    disabled={(selectedMarketplace === 'mercadolivre' && !validation?.valid) || loading}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {loading ? (
                      <>
                        <FiRefreshCw className="animate-spin mr-2" size={18} />
                        Publicando...
                      </>
                    ) : (
                      <>
                        <FiUpload className="mr-2" size={18} />
                        Publicar Agora
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Informações Centralizado */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Cabeçalho do Modal */}
            <div className={`p-6 rounded-t-lg ${
              modal.type === 'success' ? 'bg-green-50 border-b-4 border-green-500' :
              modal.type === 'error' ? 'bg-red-50 border-b-4 border-red-500' :
              modal.type === 'warning' ? 'bg-yellow-50 border-b-4 border-yellow-500' :
              'bg-blue-50 border-b-4 border-blue-500'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {modal.type === 'success' && (
                    <FiCheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                  )}
                  {modal.type === 'error' && (
                    <FiX className="w-8 h-8 text-red-600 flex-shrink-0" />
                  )}
                  {modal.type === 'warning' && (
                    <FiAlertCircle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
                  )}
                  {modal.type === 'info' && (
                    <FiInfo className="w-8 h-8 text-blue-600 flex-shrink-0" />
                  )}
                  <h3 className={`text-xl font-bold ${
                    modal.type === 'success' ? 'text-green-900' :
                    modal.type === 'error' ? 'text-red-900' :
                    modal.type === 'warning' ? 'text-yellow-900' :
                    'text-blue-900'
                  }`}>
                    {modal.title}
                  </h3>
                </div>
                <button
                  onClick={closeInfoModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6">
              <p className="text-gray-700 text-base mb-4">
                {modal.message}
              </p>

              {modal.details && modal.details.length > 0 && (
                <div className="bg-gray-50 rounded-md p-4 mb-4">
                  <ul className="space-y-2">
                    {modal.details.map((detail, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <span className="mr-2">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={closeInfoModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Fechar
                </button>
                {modal.action && (
                  <button
                    onClick={modal.action.onClick}
                    className={`px-4 py-2 rounded-md font-medium text-white transition-colors ${
                      modal.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                      modal.type === 'error' ? 'bg-red-600 hover:bg-red-700' :
                      modal.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                      'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {modal.action.label}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
