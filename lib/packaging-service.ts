import { prisma } from '@/lib/prisma'

/**
 * Item do carrinho para cálculo de embalagem
 */
interface CartProduct {
  id: string
  name: string
  quantity: number
  weight: number       // Peso unitário em kg
  length: number       // Comprimento em cm
  width: number        // Largura em cm
  height: number       // Altura em cm
}

/**
 * Embalagem disponível
 */
interface PackagingBox {
  id: string
  name: string
  code: string
  type: string
  innerLength: number
  innerWidth: number
  innerHeight: number
  outerLength: number
  outerWidth: number
  outerHeight: number
  emptyWeight: number
  maxWeight: number
  cost: number
  priority: number
}

/**
 * Resultado do algoritmo de empacotamento
 */
export interface PackagingResult {
  success: boolean
  packaging: {
    id: string
    name: string
    code: string
    type: string
    outerLength: number
    outerWidth: number
    outerHeight: number
    totalWeight: number      // Peso total (produtos + embalagem)
    packagingWeight: number  // Peso da embalagem
    productsWeight: number   // Peso dos produtos
    packagingCost: number    // Custo da embalagem
    volumetricWeight: number // Peso volumétrico (para Correios)
    cubicWeight: number      // Peso cúbico
  } | null
  products: {
    id: string
    name: string
    quantity: number
    weight: number
    dimensions: string
  }[]
  debug: {
    totalProductsVolume: number
    totalProductsWeight: number
    selectedBoxVolume: number
    utilizationPercent: number
    reason: string
  }
}

/**
 * Serviço de Empacotamento Inteligente
 * Seleciona a melhor embalagem para um conjunto de produtos
 */
export class PackagingService {
  
  /**
   * Busca as embalagens ativas do sistema
   */
  static async getAvailablePackaging(): Promise<PackagingBox[]> {
    const boxes = await prisma.packagingBox.findMany({
      where: { isActive: true },
      orderBy: [
        { priority: 'desc' },
        { innerLength: 'asc' } // Menor primeiro para otimização
      ]
    })
    return boxes as PackagingBox[]
  }

  /**
   * Calcula as dimensões consolidadas dos produtos
   * Usa algoritmo de empilhamento simples
   */
  static calculateConsolidatedDimensions(products: CartProduct[]): {
    length: number
    width: number
    height: number
    volume: number
    weight: number
  } {
    if (products.length === 0) {
      return { length: 0, width: 0, height: 0, volume: 0, weight: 0 }
    }

    let totalWeight = 0
    let totalVolume = 0
    let maxLength = 0
    let maxWidth = 0
    let totalHeight = 0

    for (const product of products) {
      const qty = product.quantity || 1
      
      // Peso total
      totalWeight += (product.weight || 0.1) * qty
      
      // Volume total dos produtos
      const prodVolume = (product.length || 10) * (product.width || 10) * (product.height || 5)
      totalVolume += prodVolume * qty
      
      // Maior dimensão horizontal (produtos lado a lado ou empilhados)
      maxLength = Math.max(maxLength, product.length || 10)
      maxWidth = Math.max(maxWidth, product.width || 10)
      
      // Altura acumulada (empilhamento vertical)
      totalHeight += (product.height || 5) * qty
    }

    return {
      length: maxLength,
      width: maxWidth,
      height: totalHeight,
      volume: totalVolume,
      weight: totalWeight
    }
  }

  /**
   * Verifica se os produtos cabem na embalagem
   */
  static fitsInBox(
    productsDimensions: { length: number; width: number; height: number; volume: number; weight: number },
    box: PackagingBox
  ): { fits: boolean; reason: string } {
    
    // Verificar peso máximo
    if (productsDimensions.weight > box.maxWeight) {
      return { fits: false, reason: `Peso ${productsDimensions.weight.toFixed(2)}kg > máximo ${box.maxWeight}kg` }
    }

    // Verificar se cabe nas dimensões internas
    // Tenta diferentes orientações dos produtos
    const orientations = [
      [productsDimensions.length, productsDimensions.width, productsDimensions.height],
      [productsDimensions.length, productsDimensions.height, productsDimensions.width],
      [productsDimensions.width, productsDimensions.length, productsDimensions.height],
      [productsDimensions.width, productsDimensions.height, productsDimensions.length],
      [productsDimensions.height, productsDimensions.length, productsDimensions.width],
      [productsDimensions.height, productsDimensions.width, productsDimensions.length],
    ]

    const boxDimensions = [box.innerLength, box.innerWidth, box.innerHeight].sort((a, b) => b - a)

    for (const [l, w, h] of orientations) {
      const prodDims = [l, w, h].sort((a, b) => b - a)
      
      if (prodDims[0] <= boxDimensions[0] && 
          prodDims[1] <= boxDimensions[1] && 
          prodDims[2] <= boxDimensions[2]) {
        return { fits: true, reason: 'Cabe na embalagem' }
      }
    }

    // Verificar por volume (mais tolerante)
    const boxVolume = box.innerLength * box.innerWidth * box.innerHeight
    if (productsDimensions.volume <= boxVolume * 0.9) { // 90% do volume
      return { fits: true, reason: 'Cabe por volume (reorganizável)' }
    }

    return { 
      fits: false, 
      reason: `Dimensões ${productsDimensions.length}x${productsDimensions.width}x${productsDimensions.height}cm não cabem em ${box.innerLength}x${box.innerWidth}x${box.innerHeight}cm` 
    }
  }

  /**
   * Seleciona a melhor embalagem para os produtos
   * Prioriza: 1) Caber, 2) Menor custo, 3) Menor tamanho
   */
  static async selectBestPackaging(products: CartProduct[]): Promise<PackagingResult> {
    const boxes = await this.getAvailablePackaging()
    
    if (boxes.length === 0) {
      // Sem embalagens cadastradas, usar dimensões dos produtos
      return this.createDefaultPackagingResult(products)
    }

    const consolidated = this.calculateConsolidatedDimensions(products)
    
    // Encontrar todas as embalagens que cabem
    const validBoxes: { box: PackagingBox; reason: string }[] = []
    
    for (const box of boxes) {
      const { fits, reason } = this.fitsInBox(consolidated, box)
      if (fits) {
        validBoxes.push({ box, reason })
      }
    }

    if (validBoxes.length === 0) {
      // Nenhuma embalagem cabe, usar a maior ou criar custom
      const largestBox = boxes[boxes.length - 1]
      return {
        success: false,
        packaging: largestBox ? {
          id: largestBox.id,
          name: `${largestBox.name} (EXCEDE)`,
          code: largestBox.code,
          type: largestBox.type,
          outerLength: Math.max(largestBox.outerLength, consolidated.length + 2),
          outerWidth: Math.max(largestBox.outerWidth, consolidated.width + 2),
          outerHeight: Math.max(largestBox.outerHeight, consolidated.height + 2),
          totalWeight: consolidated.weight + (largestBox?.emptyWeight || 0.1),
          packagingWeight: largestBox?.emptyWeight || 0.1,
          productsWeight: consolidated.weight,
          packagingCost: largestBox?.cost || 0,
          volumetricWeight: this.calculateVolumetricWeight(
            Math.max(largestBox.outerLength, consolidated.length + 2),
            Math.max(largestBox.outerWidth, consolidated.width + 2),
            Math.max(largestBox.outerHeight, consolidated.height + 2)
          ),
          cubicWeight: this.calculateCubicWeight(consolidated.volume)
        } : null,
        products: products.map(p => ({
          id: p.id,
          name: p.name,
          quantity: p.quantity,
          weight: p.weight,
          dimensions: `${p.length}x${p.width}x${p.height}cm`
        })),
        debug: {
          totalProductsVolume: consolidated.volume,
          totalProductsWeight: consolidated.weight,
          selectedBoxVolume: largestBox ? largestBox.innerLength * largestBox.innerWidth * largestBox.innerHeight : 0,
          utilizationPercent: 100,
          reason: 'Nenhuma embalagem disponível comporta os produtos'
        }
      }
    }

    // Ordenar por custo e tamanho (menor primeiro)
    validBoxes.sort((a, b) => {
      // Primeiro por custo
      if (a.box.cost !== b.box.cost) return a.box.cost - b.box.cost
      // Depois por volume
      const volA = a.box.innerLength * a.box.innerWidth * a.box.innerHeight
      const volB = b.box.innerLength * b.box.innerWidth * b.box.innerHeight
      return volA - volB
    })

    const selected = validBoxes[0]
    const boxVolume = selected.box.innerLength * selected.box.innerWidth * selected.box.innerHeight
    const utilizationPercent = (consolidated.volume / boxVolume) * 100

    return {
      success: true,
      packaging: {
        id: selected.box.id,
        name: selected.box.name,
        code: selected.box.code,
        type: selected.box.type,
        outerLength: selected.box.outerLength,
        outerWidth: selected.box.outerWidth,
        outerHeight: selected.box.outerHeight,
        totalWeight: consolidated.weight + selected.box.emptyWeight,
        packagingWeight: selected.box.emptyWeight,
        productsWeight: consolidated.weight,
        packagingCost: selected.box.cost,
        volumetricWeight: this.calculateVolumetricWeight(
          selected.box.outerLength,
          selected.box.outerWidth,
          selected.box.outerHeight
        ),
        cubicWeight: this.calculateCubicWeight(
          selected.box.outerLength * selected.box.outerWidth * selected.box.outerHeight
        )
      },
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        quantity: p.quantity,
        weight: p.weight,
        dimensions: `${p.length}x${p.width}x${p.height}cm`
      })),
      debug: {
        totalProductsVolume: consolidated.volume,
        totalProductsWeight: consolidated.weight,
        selectedBoxVolume: boxVolume,
        utilizationPercent: Math.round(utilizationPercent),
        reason: selected.reason
      }
    }
  }

  /**
   * Cria resultado padrão quando não há embalagens cadastradas
   */
  private static createDefaultPackagingResult(products: CartProduct[]): PackagingResult {
    const consolidated = this.calculateConsolidatedDimensions(products)
    
    // Adicionar margem para embalagem (2cm cada lado)
    const outerLength = consolidated.length + 4
    const outerWidth = consolidated.width + 4
    const outerHeight = consolidated.height + 4
    const packagingWeight = 0.1 // 100g estimado

    return {
      success: true,
      packaging: {
        id: 'default',
        name: 'Embalagem Padrão',
        code: 'DEFAULT',
        type: 'BOX',
        outerLength,
        outerWidth,
        outerHeight,
        totalWeight: consolidated.weight + packagingWeight,
        packagingWeight,
        productsWeight: consolidated.weight,
        packagingCost: 0,
        volumetricWeight: this.calculateVolumetricWeight(outerLength, outerWidth, outerHeight),
        cubicWeight: this.calculateCubicWeight(outerLength * outerWidth * outerHeight)
      },
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        quantity: p.quantity,
        weight: p.weight,
        dimensions: `${p.length}x${p.width}x${p.height}cm`
      })),
      debug: {
        totalProductsVolume: consolidated.volume,
        totalProductsWeight: consolidated.weight,
        selectedBoxVolume: outerLength * outerWidth * outerHeight,
        utilizationPercent: 80,
        reason: 'Embalagem padrão (sem embalagens cadastradas)'
      }
    }
  }

  /**
   * Calcula peso volumétrico (fórmula Correios: L x A x C / 6000)
   */
  static calculateVolumetricWeight(length: number, width: number, height: number): number {
    return (length * width * height) / 6000
  }

  /**
   * Calcula peso cúbico (volume em m³ * 300)
   */
  static calculateCubicWeight(volumeCm3: number): number {
    const volumeM3 = volumeCm3 / 1000000
    return volumeM3 * 300
  }

  /**
   * Retorna o peso a ser cobrado (maior entre real e volumétrico)
   */
  static getChargeableWeight(realWeight: number, volumetricWeight: number): number {
    return Math.max(realWeight, volumetricWeight)
  }
}

export default PackagingService
