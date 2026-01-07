import { Product } from '@prisma/client'

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
  }
}

export function serializeProducts(products: any[]) {
  return products.map(serializeProduct)
}
