import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Breadcrumb from '@/components/Breadcrumb'
import ProductDetailClient from '@/components/ProductDetailClient'
import ProductReviews from '@/components/ProductReviews'
import ProductQuestions from '@/components/ProductQuestions'
import AIProductRecommendations from '@/components/AIProductRecommendations'
import { serializeProduct } from '@/lib/serialize'
import { parseVariantsJson, convertToLegacyFormat, convertToMultiLevel, type LegacyVariant } from '@/lib/product-variants'

// Função para processar especificações baseado no fornecedor
function processSpecifications(specs: any, supplierName?: string): Record<string, string> {
  if (!specs) return {}
  
  // Lista de campos que devem ser ignorados
  const ignoredFields = ['size_info', 'sizeInfo', 'choice']
  
  // Se for AliExpress, extrair attr_name e attr_value
  if (supplierName?.toLowerCase().includes('aliexpress')) {
    // Verificar se tem a estrutura ae_item_property
    const properties = specs.ae_item_property || specs.aeItemProperty || specs
    
    if (Array.isArray(properties)) {
      return properties.reduce((acc: Record<string, string>, item: any) => {
        const name = item.attr_name || item.attrName || 'Atributo'
        const value = item.attr_value || item.attrValue || ''
        
        // Ignorar campos complexos
        if (ignoredFields.some(field => name.toLowerCase().includes(field.toLowerCase()))) {
          return acc
        }
        
        if (value) acc[name] = String(value)
        return acc
      }, {})
    }
  }
  
  // Tratamento genérico para outros fornecedores
  if (typeof specs === 'object' && !Array.isArray(specs)) {
    return Object.entries(specs).reduce((acc: Record<string, string>, [key, value]: [string, any]) => {
      // Ignorar campos complexos
      if (ignoredFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        return acc
      }
      
      acc[key] = typeof value === 'object' ? JSON.stringify(value) : String(value)
      return acc
    }, {})
  }
  
  return {}
}

// Função para processar atributos baseado no fornecedor
function processAttributes(attrs: any, supplierName?: string): Record<string, string> {
  if (!attrs) return {}
  
  // Se for AliExpress e for objeto com propriedades específicas
  if (supplierName?.toLowerCase().includes('aliexpress')) {
    if (typeof attrs === 'object' && !Array.isArray(attrs)) {
      const processed: Record<string, string> = {}
      
      // Verificar se tem ae_item_base_info_dto
      const baseInfo = attrs.ae_item_base_info_dto || attrs.aeItemBaseInfoDto || attrs
      
      // Lista de campos que devem ser ignorados (muito complexos ou inúteis)
      const ignoredFields = [
        'mobile_detail', 'mobileDetail', 
        'module_list', 'moduleList', 
        'package_info_dto', 'packageInfoDto'
      ]
      
      for (const [key, value] of Object.entries(baseInfo)) {
        // Ignorar campos complexos
        if (ignoredFields.includes(key)) continue
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Não processar objetos complexos, pular
          continue
        } else if (Array.isArray(value)) {
          // Não processar arrays, pular
          continue
        } else if (value && typeof value !== 'object') {
          // Formatar nome da chave (remover underscores e capitalizar)
          const formattedKey = key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
          
          // Se for o campo detail, limpar HTML e limitar tamanho
          if (key === 'detail') {
            const cleanDetail = String(value)
              .replace(/<[^>]*>/g, '') // Remove HTML tags
              .replace(/&nbsp;/g, ' ') // Remove &nbsp;
              .replace(/\s+/g, ' ') // Remove espaços múltiplos
              .trim()
              .substring(0, 500) // Limita a 500 caracteres
            
            if (cleanDetail.length > 0) {
              processed[formattedKey] = cleanDetail + (cleanDetail.length === 500 ? '...' : '')
            }
          } else {
            processed[formattedKey] = String(value)
          }
        }
      }
      
      return processed
    }
  }
  
  // Tratamento genérico
  if (typeof attrs === 'object') {
    return Object.entries(attrs).reduce((acc: Record<string, string>, [key, value]: [string, any]) => {
      if (typeof value === 'object' && value !== null) {
        const val = value.attr_value || value.attrValue || value.value
        if (val) acc[key] = String(val)
      } else if (value) {
        acc[key] = String(value)
      }
      return acc
    }, {})
  }
  
  return {}
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  
  const productRaw = await prisma.product.findUnique({
    where: { 
      slug: slug,
      active: true  // Apenas produtos ativos
    },
    include: { 
      category: {
        include: {
          parent: {
            include: {
              parent: true  // Até 3 níveis de hierarquia
            }
          }
        }
      },
      supplier: true,  // Incluir informações do fornecedor
      seller: true  // Informações do vendedor (stats calculados separadamente)
    },
  })

  if (!productRaw) {
    notFound()
  }

  // Serialize product to convert JSON strings to objects
  const product = serializeProduct(productRaw)

  // Buscar produtos relacionados da mesma categoria
  const relatedProductsRaw = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      active: true,
      NOT: {
        id: product.id  // Excluir o produto atual
      }
    },
    take: 4,
    include: {
      category: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  const relatedProducts = relatedProductsRaw.map(serializeProduct)

  // Buscar avaliações do produto
  const reviewsData = await prisma.productReview.findMany({
    where: {
      productId: product.id,
      isApproved: true
    },
    include: {
      user: {
        select: { name: true, image: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  })
  const reviewStats = await prisma.productReview.aggregate({
    where: {
      productId: product.id,
      isApproved: true
    },
    _avg: { rating: true },
    _count: { rating: true }
  })

  // Distribuição de notas
  const ratingDistribution = await prisma.productReview.groupBy({
    by: ['rating'],
    where: {
      productId: product.id,
      isApproved: true
    },
    _count: { rating: true }
  })

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  ratingDistribution.forEach(r => {
    distribution[r.rating as keyof typeof distribution] = r._count.rating
  })

  const reviewsStats = {
    averageRating: reviewStats._avg.rating || 0,
    totalReviews: reviewStats._count.rating,
    distribution
  }

  // Buscar perguntas do produto
  const questionsData = await prisma.productQuestion.findMany({
    where: {
      productId: product.id,
      isPublic: true,
      isApproved: true
    },
    include: {
      user: {
        select: { name: true, image: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  })

  // Estatísticas de perguntas
  const totalQuestions = questionsData.length
  const answeredCount = questionsData.filter(q => q.answer).length
  const unansweredCount = totalQuestions - answeredCount

  const questionsStats = {
    totalQuestions,
    answeredCount,
    unansweredCount
  }

  // Buscar estatísticas de reputação do vendedor
  let sellerStats = null
  if (productRaw.seller) {
    // Buscar média de avaliações de todos os produtos do vendedor
    const sellerReviewStats = await prisma.productReview.aggregate({
      where: {
        product: {
          sellerId: productRaw.seller.id
        },
        isApproved: true
      },
      _avg: { rating: true },
      _count: { rating: true }
    })
    
    // Contar apenas produtos ATIVOS do vendedor
    const activeProductsCount = await prisma.product.count({
      where: {
        sellerId: productRaw.seller.id,
        active: true
      }
    })
    
    // Contar apenas vendas CONCRETIZADAS (pagas/enviadas/entregues)
    const completedSalesCount = await prisma.order.count({
      where: {
        sellerId: productRaw.seller.id,
        paymentStatus: {
          in: ['PAID', 'COMPLETED']
        },
        status: {
          in: ['PROCESSING', 'SHIPPED', 'DELIVERED']
        }
      }
    })
    
    // Calcular tempo desde o cadastro
    const sellerCreatedAt = productRaw.seller.createdAt
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - sellerCreatedAt.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const diffMonths = Math.floor(diffDays / 30)
    const diffYears = Math.floor(diffDays / 365)
    
    let memberSince = ''
    if (diffYears >= 1) {
      memberSince = `${diffYears} ano${diffYears > 1 ? 's' : ''}`
    } else if (diffMonths >= 1) {
      memberSince = `${diffMonths} ${diffMonths > 1 ? 'meses' : 'mês'}`
    } else {
      memberSince = `${diffDays} dia${diffDays > 1 ? 's' : ''}`
    }
    
    sellerStats = {
      averageRating: sellerReviewStats._avg.rating || 0,
      totalReviews: sellerReviewStats._count.rating,
      totalProducts: activeProductsCount,
      totalSales: completedSalesCount,
      memberSince
    }
  }

  // Log do que vem do banco
  console.log('📦 Produto do banco - ID:', product.id)
  console.log('📦 Campo images:', product.images)
  console.log('📦 Tipo do campo images:', typeof product.images)
  console.log('📦 Campo variants (raw):', productRaw.variants)
  console.log('📦 Campo sizes (raw):', productRaw.sizes)

  // Processar especificações e atributos baseado no fornecedor
  const processedSpecs = processSpecifications(product.specifications, product.supplier?.name)
  const processedAttrs = processAttributes(product.attributes, product.supplier?.name)
  
  // Parse de variants com suporte ao novo formato padronizado e formato legado
  let variants: LegacyVariant[] | null = null
  let multiLevelData: ReturnType<typeof convertToMultiLevel> = null
  
  if (product.variants) {
    try {
      // Tentar novo formato padronizado primeiro
      const standardVariants = parseVariantsJson(
        typeof product.variants === 'string' ? product.variants : JSON.stringify(product.variants)
      )
      
      if (standardVariants) {
        // Converter para formato multi-nível (novo) para exibição dinâmica
        multiLevelData = convertToMultiLevel(standardVariants)
        console.log('✅ MultiLevel properties:', multiLevelData?.properties.map(p => p.name))
        
        // Converter para formato legado usado pelo ProductSelectionWrapper (fallback)
        variants = convertToLegacyFormat(standardVariants)
        console.log('✅ Variants (novo formato) convertidos:', variants?.length)
      } else {
        // Fallback para formato legado antigo
        let parsed = product.variants
        // Parse recursivo para JSON duplo/triplo
        while (typeof parsed === 'string') {
          parsed = JSON.parse(parsed)
        }
        
        // Verificar se já está no formato legado
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (parsed[0].size !== undefined || parsed[0].color !== undefined) {
            variants = parsed as LegacyVariant[]
            console.log('✅ Variants (formato legado) parseados:', variants)
          }
        }
      }
    } catch (e) {
      console.error('❌ Erro ao parsear variants:', e)
      variants = null
    }
  } else {
    console.log('⚠️ Produto sem campo variants')
  }
  
  // Parse de selectedSkus (SKUs com preços personalizados)
  let selectedSkus: any[] = []
  if (productRaw.selectedSkus) {
    try {
      let parsed: any = productRaw.selectedSkus
      while (typeof parsed === 'string') {
        parsed = JSON.parse(parsed)
      }
      if (Array.isArray(parsed)) {
        selectedSkus = parsed.filter((s: any) => s.enabled) // Apenas SKUs habilitados
        console.log('✅ SelectedSkus parseados:', selectedSkus.length, 'ativos')
      }
    } catch (e) {
      console.error('❌ Erro ao parsear selectedSkus:', e)
    }
  }
  
  // Filtrar variants baseado nos selectedSkus habilitados
  // Se tem selectedSkus configurados, só mostrar SKUs que estão enabled
  if (variants && selectedSkus.length > 0) {
    const enabledSkuIds = new Set(selectedSkus.map((s: any) => s.skuId))
    variants = variants.filter((v: any) => {
      // Se a variante tem skuId, verificar se está habilitada
      if (v.skuId) {
        return enabledSkuIds.has(v.skuId)
      }
      // Se não tem skuId (formato legado), manter
      return true
    })
    console.log('✅ Variants filtradas:', variants.length, 'disponíveis')
  }

  return (
    <>
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb de navegação com hierarquia completa */}
      <Breadcrumb 
        items={[
          // Montar hierarquia de categorias (do nível mais alto para o mais baixo)
          ...(product.category.parent?.parent ? [{
            label: product.category.parent.parent.name,
            href: `/categorias/${product.category.parent.parent.slug}`
          }] : []),
          ...(product.category.parent ? [{
            label: product.category.parent.name,
            href: `/categorias/${product.category.parent.slug}`
          }] : []),
          { 
            label: product.category.name, 
            href: `/categorias/${product.category.slug}` 
          },
          { 
            label: product.name, 
            href: `/produtos/${product.slug}` 
          }
        ]} 
      />

      {/* Card único com sombra sutil */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
        <ProductDetailClient
          product={product}
          variants={variants}
          multiLevelData={multiLevelData}
          processedSpecs={processedSpecs}
          processedAttrs={processedAttrs}
          selectedSkus={selectedSkus}
          seller={productRaw.seller ? {
            id: productRaw.seller.id,
            storeName: productRaw.seller.storeName,
            storeSlug: productRaw.seller.storeSlug,
            storeDescription: productRaw.seller.storeDescription,
            storeLogo: productRaw.seller.storeLogo,
            status: productRaw.seller.status
          } : null}
          sellerStats={sellerStats}
        />

        {/* Produtos Relacionados */}
        {relatedProducts.length > 0 && (
          <div className="mt-8 pt-8 border-t border-gray-100">
            <h2 className="text-2xl font-bold mb-6">🔥 Produtos Relacionados</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => {
                const imageUrl = Array.isArray(relatedProduct.images) && relatedProduct.images.length > 0 
                  ? relatedProduct.images[0] 
                  : '/placeholder-product.jpg'
                
                const discount = relatedProduct.comparePrice
                  ? Math.round(((relatedProduct.comparePrice - relatedProduct.price) / relatedProduct.comparePrice) * 100)
                  : 0

                return (
                  <Link 
                    key={relatedProduct.id} 
                    href={`/produtos/${relatedProduct.slug}`}
                    className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden group"
                  >
                    <div className="relative h-48 bg-gray-100">
                      <Image
                        src={imageUrl}
                        alt={relatedProduct.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      {discount > 0 && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                          -{discount}%
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 h-12">
                        {relatedProduct.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-primary-600">
                          R$ {relatedProduct.price.toFixed(2)}
                        </span>
                        {relatedProduct.comparePrice && (
                          <span className="text-sm text-gray-400 line-through">
                            R$ {relatedProduct.comparePrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Seção de Avaliações */}
        <div className="mt-8 pt-8 border-t border-gray-100">
          <ProductReviews
            productId={product.id}
            initialReviews={reviewsData.map(r => ({
              id: r.id,
              rating: r.rating,
              title: r.title || undefined,
              comment: r.comment || undefined,
              pros: r.pros || undefined,
              cons: r.cons || undefined,
              images: r.images ? (typeof r.images === 'string' ? JSON.parse(r.images) : r.images) : [],
              isVerified: r.isVerified,
              helpfulCount: r.helpfulCount,
              sellerReply: r.sellerReply || undefined,
              sellerReplyAt: r.sellerReplyAt?.toISOString(),
              createdAt: r.createdAt.toISOString(),
              user: {
                name: r.user.name || 'Anônimo',
                image: r.user.image || undefined
              }
            }))}
            initialStats={reviewsStats}
          />
        </div>

        {/* Seção de Perguntas e Respostas */}
        <div className="mt-8 pt-8 border-t border-gray-100">
          <ProductQuestions
            productId={product.id}
            initialQuestions={questionsData.map(q => ({
              id: q.id,
              question: q.question,
              answer: q.answer || undefined,
              answeredAt: q.answeredAt?.toISOString(),
              createdAt: q.createdAt.toISOString(),
              user: {
                name: q.user.name || 'Anônimo',
                image: q.user.image || undefined
              }
            }))}
            initialStats={questionsStats}
          />
        </div>
      </div>

      {/* Recomendações IA — fora do card branco para layout full-width */}
    </div>
    <AIProductRecommendations productId={product.id} />
    <div className="max-w-7xl mx-auto px-4 pb-8" />
    </>
  )
}
