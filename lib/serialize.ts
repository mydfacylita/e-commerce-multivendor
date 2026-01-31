import { Product } from '@prisma/client'

// Tipos de fornecedores internacionais
const FORNECEDORES_INTERNACIONAIS = [
  'aliexpress',
  'alibaba',
  'temu',
  'shein',
  'wish',
  'banggood',
  'gearbest',
  'internacional',
  'china',
  'importado'
]

function safeJsonParse(value: string | null | undefined, fallback: any = null) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch (error) {
    console.warn('Failed to parse JSON:', error)
    return fallback
  }
}

export function serializeProduct(product: any) {
  // Verificar se é de fornecedor internacional (AliExpress, etc)
  const supplierType = product.supplier?.type?.toLowerCase() || ''
  const shipFromCountry = product.shipFromCountry || null
  
  // Flag para fluxo/exibição: TRUE se fornecedor é plataforma internacional
  const isInternationalSupplier = Boolean(product.supplierId) && 
    FORNECEDORES_INTERNACIONAIS.includes(supplierType)
  
  // Flag para impostos: TRUE apenas se é internacional E não vem do Brasil
  const isImported = isInternationalSupplier && shipFromCountry?.toUpperCase() !== 'BR'
  
  // Determinar tipo do item para roteamento
  // DROP = produto de fornecedor externo (AliExpress, etc) - vai para dropshipping
  // SELLER = produto de estoque próprio do vendedor
  // ADM = produto da plataforma (sem vendedor e sem fornecedor externo)
  let itemType: 'ADM' | 'DROP' | 'SELLER' = 'ADM'
  if (product.sellerId) {
    itemType = product.isDropshipping ? 'DROP' : 'SELLER'
  } else if (isInternationalSupplier) {
    // Se tem fornecedor internacional mas não tem vendedor, é DROP direto
    itemType = 'DROP'
  }
  
  return {
    ...product,
    images: typeof product.images === 'string' 
      ? safeJsonParse(product.images, []) 
      : (Array.isArray(product.images) ? product.images : []),
    specifications: product.specifications 
      ? (typeof product.specifications === 'string' ? safeJsonParse(product.specifications) : product.specifications)
      : null,
    variants: product.variants
      ? (typeof product.variants === 'string' ? safeJsonParse(product.variants) : product.variants)
      : null,
    attributes: product.attributes
      ? (typeof product.attributes === 'string' ? safeJsonParse(product.attributes) : product.attributes)
      : null,
    sizes: product.sizes
      ? (typeof product.sizes === 'string' ? safeJsonParse(product.sizes, []) : product.sizes)
      : [],
    isImported, // Para cálculo de impostos (FALSE se shipFromCountry = BR)
    isInternationalSupplier, // Para fluxo/exibição (TRUE se AliExpress, etc)
    itemType, // Tipo do item: ADM, DROP ou SELLER
    sellerId: product.sellerId || null,
    sellerCep: product.seller?.cep || null, // CEP do vendedor para cálculo de frete
    shipFromCountry, // País de origem do envio
  }
}

export function serializeProducts(products: any[]) {
  return products.map(serializeProduct)
}
