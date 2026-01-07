import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import AddToCartButton from '@/components/AddToCartButton'
import ProductVariantSelector from '@/components/ProductVariantSelector'
import ProductImageGallery from '@/components/ProductImageGallery'
import ShippingCalculator from '@/components/ShippingCalculator'
import { serializeProduct } from '@/lib/serialize'

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

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const productRaw = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: { 
      category: true,
      supplier: true  // Incluir informações do fornecedor
    },
  })

  if (!productRaw) {
    notFound()
  }

  // Serialize product to convert JSON strings to objects
  const product = serializeProduct(productRaw)

  // Log do que vem do banco
  console.log('📦 Produto do banco - ID:', product.id)
  console.log('📦 Campo images:', product.images)
  console.log('📦 Tipo do campo images:', typeof product.images)

  // Processar especificações e atributos baseado no fornecedor
  const processedSpecs = processSpecifications(product.specifications, product.supplier?.name)
  const processedAttrs = processAttributes(product.attributes, product.supplier?.name)
  const variants = product.variants || null

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        <ProductImageGallery images={product.images} productName={product.name} />

        <div>
          {/* Botão de adicionar ao carrinho fixo no topo da coluna direita */}
          <div className="mb-8">
            <AddToCartButton product={product} />
          </div>

          <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
          <div className="flex items-center space-x-4 mb-6">
            <span className="text-4xl font-bold text-primary-600">
              R$ {product.price.toFixed(2)}
            </span>
            {product.comparePrice && (
              <span className="text-2xl text-gray-400 line-through">
                R$ {product.comparePrice.toFixed(2)}
              </span>
            )}
          </div>
          <div className="mb-6">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
              product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {product.stock > 0 ? `${product.stock} em estoque` : 'Esgotado'}
            </span>
          </div>
          <p className="text-gray-600 mb-6">{product.description}</p>
          <div className="mb-6">
            <span className="text-sm text-gray-500">Categoria: </span>
            <span className="text-primary-600 font-semibold">{product.category.name}</span>
          </div>
          {/* Seletor de Variantes (cores, tamanhos, etc) */}
          <ProductVariantSelector 
            variants={variants} 
            supplierName={product.supplier?.name}
          />
          {/* Variações antigas (manter como fallback) */}
          {variants && variants.length > 0 && !product.supplier?.name?.toLowerCase().includes('aliexpress') && (
            <div className="mb-6 border-t pt-6">
              <h3 className="font-semibold text-lg mb-3">Opções Disponíveis</h3>
              <div className="space-y-3">
                {variants.map((variant: any, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{variant.color || variant.size || variant.name}:</span>
                    <span className="text-sm font-semibold">{variant.value}</span>
                    {variant.price && (
                      <span className="text-sm text-primary-600 ml-2">
                        R$ {parseFloat(variant.price).toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Especificações */}
          {Object.keys(processedSpecs).length > 0 && (
            <div className="mb-6 border-t pt-6">
              <h3 className="font-semibold text-lg mb-3">📋 Especificações</h3>
              <dl className="grid grid-cols-2 gap-3">
                {Object.entries(processedSpecs).map(([key, value]: [string, any]) => (
                  <div key={key} className="bg-gray-50 p-3 rounded">
                    <dt className="text-xs text-gray-500 uppercase">{key}</dt>
                    <dd className="text-sm font-medium mt-1">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {/* Atributos extras */}
          {Object.keys(processedAttrs).length > 0 && (
            <div className="mb-6 border-t pt-6">
              <h3 className="font-semibold text-lg mb-3">ℹ️ Informações Adicionais</h3>
              <ul className="space-y-2">
                {Object.entries(processedAttrs).map(([key, value]: [string, any]) => (
                  <li key={key} className="flex items-start">
                    <span className="text-sm text-gray-600 min-w-[120px]">{key}:</span>
                    <span className="text-sm font-medium">{value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Bloco de frete, pagamento e garantias abaixo das infos do produto */}
          <div className="space-y-6 mt-8">
            <ShippingCalculator />
            <div className="border-t pt-6">
              <h3 className="font-semibold text-lg mb-4">💳 Formas de Pagamento</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-2xl">💳</span>
                  <div>
                    <p className="font-semibold text-gray-800">Cartão de Crédito</p>
                    <p className="text-sm text-gray-600">Visa, Mastercard, Elo, Amex - Até 12x sem juros</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-2xl">💰</span>
                  <div>
                    <p className="font-semibold text-gray-800">PIX</p>
                    <p className="text-sm text-gray-600">Aprovação imediata - 5% de desconto</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="font-semibold text-gray-800">Boleto Bancário</p>
                    <p className="text-sm text-gray-600">À vista - Vencimento em 3 dias</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t pt-6">
              <h3 className="font-semibold text-lg mb-4">🛡️ Garantias</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="text-green-600">✓</span>
                  <span>Produto conforme anunciado ou seu dinheiro de volta</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="text-green-600">✓</span>
                  <span>Suporte completo pós-venda</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="text-green-600">✓</span>
                  <span>Garantia contra defeitos de fabricação</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="text-green-600">✓</span>
                  <span>Compra 100% segura e protegida</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
