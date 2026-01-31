/**
 * ESTRUTURA PADRONIZADA DE VARIAÇÕES DE PRODUTOS
 * 
 * Este módulo define uma estrutura universal para armazenar variações de produtos
 * que funciona com qualquer integração (AliExpress, Mercado Livre, Shopee, etc.)
 * 
 * A estrutura é armazenada como JSON no campo `variants` da tabela `product`
 */

// ============================================
// TIPOS
// ============================================

/**
 * Opção individual de uma propriedade de variação
 * Ex: Para "Cor", as opções seriam: Preto, Branco, Azul
 */
export interface VariantOption {
  id: string           // ID único da opção (ex: "193", "350852")
  value: string        // Valor da opção (ex: "Black", "Orange")
  label: string        // Label traduzido (ex: "Preto", "Laranja")
  image?: string       // Imagem específica da opção (se houver)
}

/**
 * Propriedade de variação (atributo que varia entre SKUs)
 * Ex: Cor, Tamanho, Voltagem, Memória
 */
export interface VariantProperty {
  id: string           // ID da propriedade (ex: "14" para cor no AliExpress)
  name: string         // Nome da propriedade (ex: "Cor", "Tamanho")
  type: 'color' | 'size' | 'style' | 'material' | 'voltage' | 'storage' | 'other'
  options: VariantOption[]
}

/**
 * SKU individual - uma combinação específica de variações
 * Ex: Camiseta Azul tamanho M
 */
export interface ProductSku {
  skuId: string              // ID único do SKU no fornecedor
  skuAttr: string            // Atributo de identificação (ex: "14:193#Black;5:100")
  price: number              // Preço do SKU
  originalPrice?: number     // Preço original (sem desconto)
  stock: number              // Estoque disponível
  available: boolean         // Se está disponível para venda
  image?: string             // Imagem específica do SKU
  
  // Valores selecionados para cada propriedade
  properties: {
    propertyId: string       // ID da propriedade (ex: "14")
    propertyName: string     // Nome (ex: "Cor")
    optionId: string         // ID da opção selecionada (ex: "193")
    optionValue: string      // Valor (ex: "Black")
    optionLabel: string      // Label traduzido (ex: "Preto")
  }[]
}

/**
 * Estrutura completa de variações do produto
 * Armazenada como JSON no campo `variants`
 */
export interface ProductVariants {
  version: '1.0'                  // Versão do schema para migrações futuras
  source: 'aliexpress' | 'mercadolivre' | 'shopee' | 'amazon' | 'manual' | 'other'
  sourceProductId: string         // ID do produto na fonte original
  lastUpdated: string             // ISO date da última atualização
  
  // Propriedades de variação disponíveis
  properties: VariantProperty[]
  
  // Lista de SKUs (combinações)
  skus: ProductSku[]
  
  // Metadados opcionais
  metadata?: {
    currency?: string             // Moeda original (CNY, USD, BRL)
    minPrice?: number             // Menor preço entre SKUs
    maxPrice?: number             // Maior preço entre SKUs
    totalStock?: number           // Estoque total somado
    hasImages?: boolean           // Se variações têm imagens
  }
}

// ============================================
// PARSER: ALIEXPRESS
// ============================================

/**
 * Converte resposta da API AliExpress para estrutura padronizada
 */
export function parseAliExpressVariants(rawResponse: any): ProductVariants {
  const skuList = rawResponse.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o || []
  const productId = rawResponse.ae_item_base_info_dto?.product_id?.toString() || ''
  
  // Mapear propriedades únicas
  const propertiesMap = new Map<string, VariantProperty>()
  
  // Processar SKUs
  const skus: ProductSku[] = skuList.map((sku: any) => {
    const skuProperties: ProductSku['properties'] = []
    const aeProperties = sku.ae_sku_property_dtos?.ae_sku_property_d_t_o || []
    
    aeProperties.forEach((prop: any) => {
      const propertyId = prop.sku_property_id?.toString() || ''
      const optionId = prop.property_value_id?.toString() || ''
      
      // Adicionar à lista de propriedades únicas
      if (!propertiesMap.has(propertyId)) {
        propertiesMap.set(propertyId, {
          id: propertyId,
          name: prop.sku_property_name || 'Variação',
          type: detectPropertyType(prop.sku_property_name),
          options: []
        })
      }
      
      // Adicionar opção se não existir
      const property = propertiesMap.get(propertyId)!
      if (!property.options.find(o => o.id === optionId)) {
        property.options.push({
          id: optionId,
          value: prop.property_value_definition_name || prop.sku_property_value || '',
          label: prop.sku_property_value || prop.property_value_definition_name || '',
          image: prop.sku_image || undefined
        })
      }
      
      skuProperties.push({
        propertyId,
        propertyName: prop.sku_property_name || 'Variação',
        optionId,
        optionValue: prop.property_value_definition_name || '',
        optionLabel: prop.sku_property_value || ''
      })
    })
    
    const price = parseFloat(sku.offer_sale_price || sku.sku_price || '0')
    const originalPrice = parseFloat(sku.sku_price || sku.offer_sale_price || '0')
    const stock = parseInt(sku.sku_available_stock || sku.s_k_u_available_stock || '0')
    
    // Pegar imagem da primeira propriedade que tenha
    const skuImage = aeProperties.find((p: any) => p.sku_image)?.sku_image
    
    return {
      skuId: sku.sku_id?.toString() || '',
      skuAttr: sku.sku_attr || '',
      price,
      originalPrice: originalPrice !== price ? originalPrice : undefined,
      stock,
      available: stock > 0,
      image: skuImage,
      properties: skuProperties
    }
  })
  
  // Calcular metadados
  const prices = skus.map(s => s.price).filter(p => p > 0)
  const totalStock = skus.reduce((sum, s) => sum + s.stock, 0)
  
  return {
    version: '1.0',
    source: 'aliexpress',
    sourceProductId: productId,
    lastUpdated: new Date().toISOString(),
    properties: Array.from(propertiesMap.values()),
    skus,
    metadata: {
      currency: 'BRL',
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
      totalStock,
      hasImages: skus.some(s => !!s.image)
    }
  }
}

/**
 * Detecta o tipo de propriedade baseado no nome
 */
function detectPropertyType(propertyName: string): VariantProperty['type'] {
  const name = (propertyName || '').toLowerCase()
  
  if (name.includes('cor') || name.includes('color') || name.includes('colour')) {
    return 'color'
  }
  if (name.includes('tamanho') || name.includes('size') || name.includes('tam')) {
    return 'size'
  }
  if (name.includes('estilo') || name.includes('style')) {
    return 'style'
  }
  if (name.includes('material')) {
    return 'material'
  }
  if (name.includes('voltagem') || name.includes('voltage') || name.includes('volt')) {
    return 'voltage'
  }
  if (name.includes('memória') || name.includes('memory') || name.includes('storage') || name.includes('gb')) {
    return 'storage'
  }
  
  return 'other'
}

// ============================================
// PARSER: MERCADO LIVRE
// ============================================

/**
 * Converte resposta da API Mercado Livre para estrutura padronizada
 */
export function parseMercadoLivreVariants(item: any): ProductVariants {
  const variations = item.variations || []
  
  // Mapear atributos de variação
  const propertiesMap = new Map<string, VariantProperty>()
  
  const skus: ProductSku[] = variations.map((variation: any) => {
    const skuProperties: ProductSku['properties'] = []
    
    const combinations = variation.attribute_combinations || []
    combinations.forEach((attr: any) => {
      const propertyId = attr.id || ''
      const optionId = attr.value_id || attr.value_name || ''
      
      if (!propertiesMap.has(propertyId)) {
        propertiesMap.set(propertyId, {
          id: propertyId,
          name: attr.name || 'Variação',
          type: detectPropertyType(attr.name),
          options: []
        })
      }
      
      const property = propertiesMap.get(propertyId)!
      if (!property.options.find(o => o.id === optionId)) {
        property.options.push({
          id: optionId,
          value: attr.value_name || '',
          label: attr.value_name || ''
        })
      }
      
      skuProperties.push({
        propertyId,
        propertyName: attr.name || '',
        optionId,
        optionValue: attr.value_name || '',
        optionLabel: attr.value_name || ''
      })
    })
    
    return {
      skuId: variation.id?.toString() || '',
      skuAttr: combinations.map((c: any) => `${c.id}:${c.value_id || c.value_name}`).join(';'),
      price: variation.price || item.price || 0,
      stock: variation.available_quantity || 0,
      available: (variation.available_quantity || 0) > 0,
      image: variation.picture_ids?.[0] ? `https://http2.mlstatic.com/D_${variation.picture_ids[0]}-O.jpg` : undefined,
      properties: skuProperties
    }
  })
  
  const prices = skus.map(s => s.price).filter(p => p > 0)
  const totalStock = skus.reduce((sum, s) => sum + s.stock, 0)
  
  return {
    version: '1.0',
    source: 'mercadolivre',
    sourceProductId: item.id?.toString() || '',
    lastUpdated: new Date().toISOString(),
    properties: Array.from(propertiesMap.values()),
    skus,
    metadata: {
      currency: 'BRL',
      minPrice: prices.length > 0 ? Math.min(...prices) : item.price || 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : item.price || 0,
      totalStock,
      hasImages: skus.some(s => !!s.image)
    }
  }
}

// ============================================
// PARSER: MANUAL / GENÉRICO
// ============================================

/**
 * Cria estrutura de variações manualmente
 */
export function createManualVariants(options: {
  productId: string
  properties: { name: string; type: VariantProperty['type']; options: string[] }[]
  skus: { 
    price: number
    stock: number
    selections: { propertyName: string; optionValue: string }[]
    image?: string
  }[]
}): ProductVariants {
  const propertiesMap = new Map<string, VariantProperty>()
  
  // Criar propriedades
  options.properties.forEach((prop, idx) => {
    propertiesMap.set(prop.name, {
      id: `prop_${idx}`,
      name: prop.name,
      type: prop.type,
      options: prop.options.map((opt, optIdx) => ({
        id: `opt_${idx}_${optIdx}`,
        value: opt,
        label: opt
      }))
    })
  })
  
  // Criar SKUs
  const skus: ProductSku[] = options.skus.map((sku, idx) => {
    const skuProperties: ProductSku['properties'] = sku.selections.map(sel => {
      const prop = propertiesMap.get(sel.propertyName)!
      const opt = prop.options.find(o => o.value === sel.optionValue)!
      return {
        propertyId: prop.id,
        propertyName: prop.name,
        optionId: opt.id,
        optionValue: opt.value,
        optionLabel: opt.label
      }
    })
    
    return {
      skuId: `sku_${idx}`,
      skuAttr: skuProperties.map(p => `${p.propertyId}:${p.optionId}`).join(';'),
      price: sku.price,
      stock: sku.stock,
      available: sku.stock > 0,
      image: sku.image,
      properties: skuProperties
    }
  })
  
  const prices = skus.map(s => s.price)
  
  return {
    version: '1.0',
    source: 'manual',
    sourceProductId: options.productId,
    lastUpdated: new Date().toISOString(),
    properties: Array.from(propertiesMap.values()),
    skus,
    metadata: {
      currency: 'BRL',
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      totalStock: skus.reduce((sum, s) => sum + s.stock, 0),
      hasImages: skus.some(s => !!s.image)
    }
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Busca um SKU específico baseado nas seleções do usuário
 */
export function findSkuBySelections(
  variants: ProductVariants,
  selections: { propertyId: string; optionId: string }[]
): ProductSku | null {
  return variants.skus.find(sku => {
    return selections.every(sel =>
      sku.properties.some(p =>
        p.propertyId === sel.propertyId && p.optionId === sel.optionId
      )
    )
  }) || null
}

/**
 * Retorna SKU com menor preço disponível
 */
export function getCheapestAvailableSku(variants: ProductVariants): ProductSku | null {
  const available = variants.skus.filter(s => s.available && s.stock > 0)
  if (available.length === 0) return null
  
  return available.reduce((min, sku) =>
    sku.price < min.price ? sku : min
  )
}

// ============================================
// CONVERSÃO PARA FORMATO LEGADO
// ============================================

/**
 * Interface do formato legado usado pelo ProductSelectionWrapper
 */
export interface LegacyVariant {
  size: string
  sizeLabel?: string  // Nome original da propriedade: "Pacote", "Memória", "Tamanho", etc.
  color: string
  colorHex: string
  stock: number
  price?: number
  skuId?: string  // ID do SKU para mapear com selectedSkus
}

/**
 * Converte ProductVariants para formato legado
 * Mantém compatibilidade com componentes existentes
 * Suporta qualquer tipo de propriedade (cor, tamanho, memória, pacote, etc.)
 */
export function convertToLegacyFormat(variants: ProductVariants | null): LegacyVariant[] | null {
  if (!variants || !variants.skus || variants.skus.length === 0) {
    return null
  }
  
  // Encontrar propriedade de cor (sempre vai para campo 'color')
  const colorProperty = variants.properties.find(p => p.type === 'color')
  
  // Encontrar segunda propriedade (qualquer tipo que não seja cor vai para 'size')
  // Ordem de prioridade: size > storage > style > voltage > material > other
  const secondProperty = variants.properties.find(p => p.type === 'size') ||
                         variants.properties.find(p => p.type === 'storage') ||
                         variants.properties.find(p => p.type === 'style') ||
                         variants.properties.find(p => p.type === 'voltage') ||
                         variants.properties.find(p => p.type === 'material') ||
                         variants.properties.find(p => p.type === 'other' && p.id !== colorProperty?.id)
  
  // Se não tem cor mas tem outra propriedade, usar a primeira como "cor" e segunda como "size"
  if (!colorProperty && variants.properties.length >= 1) {
    const mainProp = variants.properties[0]
    const secondProp = variants.properties.length > 1 ? variants.properties[1] : null
    
    return variants.skus.map(sku => {
      const mainValue = sku.properties.find(p => p.propertyId === mainProp.id)
      const secondValue = secondProp ? sku.properties.find(p => p.propertyId === secondProp.id) : null
      
      return {
        // Priorizar optionLabel sobre optionValue
        size: secondValue?.optionLabel || secondValue?.optionValue || 'Único',
        sizeLabel: secondProp?.name || 'Modelo',
        color: mainValue?.optionLabel || mainValue?.optionValue || 'Padrão',
        colorHex: guessColorHex(mainValue?.optionLabel || mainValue?.optionValue || ''),
        stock: sku.stock,
        price: sku.price,
        skuId: sku.skuId
      }
    })
  }
  
  return variants.skus.map(sku => {
    // Encontrar cor deste SKU
    const colorProp = sku.properties.find(p => p.propertyId === colorProperty?.id)
    // Encontrar segunda propriedade (pode ser tamanho, memória, pacote, etc.)
    const sizeProp = sku.properties.find(p => p.propertyId === secondProperty?.id)
    
    return {
      // Priorizar optionLabel (128GB) sobre optionValue (Pacote 2)
      size: sizeProp?.optionLabel || sizeProp?.optionValue || 'Único',
      sizeLabel: secondProperty?.name || 'Modelo',
      color: colorProp?.optionLabel || colorProp?.optionValue || 'Padrão',
      colorHex: guessColorHex(colorProp?.optionLabel || colorProp?.optionValue || ''),
      stock: sku.stock,
      price: sku.price,
      skuId: sku.skuId
    }
  })
}

/**
 * Tenta adivinhar o código hex baseado no nome da cor
 */
function guessColorHex(colorName: string): string {
  const colorMap: Record<string, string> = {
    // Português
    'preto': '#000000',
    'branco': '#FFFFFF',
    'vermelho': '#FF0000',
    'azul': '#0000FF',
    'verde': '#00FF00',
    'amarelo': '#FFFF00',
    'laranja': '#FFA500',
    'rosa': '#FFC0CB',
    'roxo': '#800080',
    'marrom': '#8B4513',
    'cinza': '#808080',
    'bege': '#F5F5DC',
    'dourado': '#FFD700',
    'prata': '#C0C0C0',
    // English
    'black': '#000000',
    'white': '#FFFFFF',
    'red': '#FF0000',
    'blue': '#0000FF',
    'green': '#00FF00',
    'yellow': '#FFFF00',
    'orange': '#FFA500',
    'pink': '#FFC0CB',
    'purple': '#800080',
    'brown': '#8B4513',
    'gray': '#808080',
    'grey': '#808080',
    'beige': '#F5F5DC',
    'gold': '#FFD700',
    'silver': '#C0C0C0',
    'navy': '#000080',
    'khaki': '#C3B091'
  }
  
  const lowerName = colorName.toLowerCase()
  
  // Procura correspondência exata ou parcial
  for (const [key, hex] of Object.entries(colorMap)) {
    if (lowerName.includes(key)) {
      return hex
    }
  }
  
  return '#808080' // Cinza padrão
}

/**
 * Verifica se produto tem variações
 */
export function hasVariations(variants: ProductVariants | null | undefined): boolean {
  if (!variants) return false
  return variants.properties.length > 0 && variants.skus.length > 1
}

/**
 * Parse seguro de variants JSON
 */
export function parseVariantsJson(variantsJson: string | null | undefined): ProductVariants | null {
  if (!variantsJson) return null
  
  try {
    const parsed = JSON.parse(variantsJson)
    // Verificar se tem a estrutura esperada
    if (parsed.version && parsed.skus && Array.isArray(parsed.skus)) {
      return parsed as ProductVariants
    }
    return null
  } catch {
    return null
  }
}

/**
 * Serializa variants para salvar no banco
 */
export function stringifyVariants(variants: ProductVariants): string {
  return JSON.stringify(variants)
}

// ============================================
// EXEMPLO DE USO
// ============================================

/*
// Importar produto do AliExpress
const rawResponse = await fetchAliExpressProduct('1005008583452856')
const variants = parseAliExpressVariants(rawResponse)
const variantsJson = stringifyVariants(variants)

await prisma.product.create({
  data: {
    name: 'Smartwatch LAXASFIT',
    price: variants.metadata?.minPrice || 0,
    variants: variantsJson,
    // ... outros campos
  }
})

// No frontend - usuário seleciona variações
const selectedSku = findSkuBySelections(variants, [
  { propertyId: '14', optionId: '193' }  // Cor: Preto
])

console.log(selectedSku)
// {
//   skuId: '12000045832559002',
//   skuAttr: '14:193#Black',
//   price: 42.59,
//   stock: 387,
//   available: true,
//   image: 'https://...',
//   properties: [{ propertyId: '14', propertyName: 'cor', optionId: '193', optionValue: 'Black', optionLabel: 'Preto' }]
// }
*/

// ============================================
// GERADOR DE SELECTED SKUS
// ============================================

/**
 * Interface para SKUs selecionados (formato simples usado pelo sistema)
 */
export interface SelectedSkuItem {
  skuId: string
  enabled: boolean
  customPrice: number
  margin: number
  costPrice: number
}

/**
 * Gera o array de selectedSkus a partir de ProductVariants
 * Usado na importação para preencher o campo selectedSkus do produto
 * 
 * @param variants - Estrutura padronizada de variantes
 * @param marginPercent - Margem em porcentagem (default: 50 = 50%)
 * @returns Array de SelectedSkuItem pronto para salvar no banco
 */
export function generateSelectedSkus(variants: ProductVariants, marginPercent: number = 50): SelectedSkuItem[] {
  const multiplier = 1 + (marginPercent / 100) // 50% = 1.5x
  return variants.skus.map(sku => ({
    skuId: sku.skuId,
    enabled: true,
    customPrice: Math.round(sku.price * multiplier * 100) / 100,
    margin: marginPercent,
    costPrice: sku.price
  }))
}

/**
 * Serializa selectedSkus para salvar no banco
 */
export function stringifySelectedSkus(skus: SelectedSkuItem[]): string {
  return JSON.stringify(skus)
}

/**
 * Parse selectedSkus do banco de dados
 */
export function parseSelectedSkus(json: string | null): SelectedSkuItem[] {
  if (!json) return []
  try {
    return JSON.parse(json)
  } catch {
    return []
  }
}
