/**
 * Utilitário para cálculo de impostos de importação
 * 
 * Regras (Lei 14.902/2024 - Remessa Conforme):
 * - Imposto de Importação: 20% sobre valor do produto
 * - ICMS: Varia por estado (17% a 22%)
 * 
 * Identificação de produto importado:
 * - Produto tem supplierId vinculado a supplier.type = 'aliexpress' ou similar
 * - Ou produto.origem !== '0' (0 = nacional)
 */

// Tabela de alíquotas ICMS por estado (valores atualizados 2024/2025)
export const ICMS_POR_ESTADO: Record<string, number> = {
  // Norte
  'AC': 19.0,  // Acre
  'AM': 20.0,  // Amazonas
  'AP': 18.0,  // Amapá
  'PA': 19.0,  // Pará
  'RO': 19.5,  // Rondônia
  'RR': 20.0,  // Roraima
  'TO': 20.0,  // Tocantins
  
  // Nordeste
  'AL': 19.0,  // Alagoas
  'BA': 20.5,  // Bahia
  'CE': 20.0,  // Ceará
  'MA': 22.0,  // Maranhão
  'PB': 20.0,  // Paraíba
  'PE': 20.5,  // Pernambuco
  'PI': 21.0,  // Piauí
  'RN': 20.0,  // Rio Grande do Norte
  'SE': 19.0,  // Sergipe
  
  // Centro-Oeste
  'DF': 20.0,  // Distrito Federal
  'GO': 19.0,  // Goiás
  'MS': 17.0,  // Mato Grosso do Sul
  'MT': 17.0,  // Mato Grosso
  
  // Sudeste
  'ES': 17.0,  // Espírito Santo
  'MG': 18.0,  // Minas Gerais
  'RJ': 22.0,  // Rio de Janeiro
  'SP': 18.0,  // São Paulo
  
  // Sul
  'PR': 19.5,  // Paraná
  'RS': 17.0,  // Rio Grande do Sul
  'SC': 17.0,  // Santa Catarina
}

// Tipos de fornecedores internacionais
export const FORNECEDORES_INTERNACIONAIS = [
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

// Taxa de imposto de importação (Lei 14.902/2024)
// NOTA: Este valor pode ser sobrescrito pelas configurações do sistema
export let TAXA_IMPOSTO_IMPORTACAO = 0.20 // 20%

// Cache das configurações de impostos
let taxConfigCache: TaxConfig | null = null
let taxConfigCacheTime = 0
const CACHE_TTL = 60000 // 1 minuto

export interface TaxConfig {
  importEnabled: boolean
  importRate: number        // Ex: 20 (%)
  importBase: 'product_only' | 'product_freight'
  icmsEnabled: boolean
  icmsDefault: number       // Ex: 17 (%)
  icmsUseStateRate: boolean
  icmsRates: Record<string, number>  // Ex: { MA: 22, SP: 18 }
}

/**
 * Busca as configurações de impostos do banco de dados
 * Com cache de 1 minuto para performance
 */
export async function getTaxConfig(): Promise<TaxConfig> {
  const now = Date.now()
  
  // Retornar do cache se ainda válido
  if (taxConfigCache && (now - taxConfigCacheTime) < CACHE_TTL) {
    return taxConfigCache
  }
  
  try {
    // Buscar configurações do banco
    const response = await fetch('/api/config?prefix=tax.', { 
      cache: 'no-store',
      next: { revalidate: 0 }
    })
    
    if (response.ok) {
      const data = await response.json()
      const configs = data.configs || {}
      
      // Extrair alíquotas ICMS por estado
      const icmsRates: Record<string, number> = {}
      Object.keys(configs).forEach(key => {
        if (key.startsWith('tax.icms.')) {
          const state = key.replace('tax.icms.', '')
          icmsRates[state] = parseFloat(configs[key]) || 17
        }
      })
      
      taxConfigCache = {
        importEnabled: configs['tax.importEnabled'] !== false,
        importRate: parseFloat(configs['tax.importRate']) || 20,
        importBase: configs['tax.importBase'] || 'product_freight',
        icmsEnabled: configs['tax.icmsEnabled'] !== false,
        icmsDefault: parseFloat(configs['tax.icmsDefault']) || 17,
        icmsUseStateRate: configs['tax.icmsUseStateRate'] !== false,
        icmsRates: Object.keys(icmsRates).length > 0 ? icmsRates : ICMS_POR_ESTADO,
      }
      
      // Atualizar taxa global
      TAXA_IMPOSTO_IMPORTACAO = taxConfigCache.importRate / 100
      
      taxConfigCacheTime = now
      return taxConfigCache
    }
  } catch (error) {
    console.warn('Erro ao buscar config de impostos, usando padrão:', error)
  }
  
  // Retornar configuração padrão se falhar
  return {
    importEnabled: true,
    importRate: 20,
    importBase: 'product_freight',
    icmsEnabled: true,
    icmsDefault: 17,
    icmsUseStateRate: true,
    icmsRates: ICMS_POR_ESTADO,
  }
}

/**
 * Limpa o cache de configurações (chamar após salvar configs)
 */
export function clearTaxConfigCache() {
  taxConfigCache = null
  taxConfigCacheTime = 0
}

export interface CalculoImpostoResult {
  valorProdutos: number
  impostoImportacao: number
  baseCalculoIcms: number
  icms: number
  totalImpostos: number
  aliquotaIcms: number
  temProdutosImportados: boolean
  estadoDestino: string
}

export interface ProdutoParaCalculo {
  preco: number
  quantidade: number
  isImportado: boolean
  shipFromCountry?: string | null  // País de origem do envio (BR = não paga imposto)
}

/**
 * Verifica se um tipo de fornecedor é internacional
 */
export function isSupplierInternacional(supplierType: string | null | undefined): boolean {
  if (!supplierType) return false
  return FORNECEDORES_INTERNACIONAIS.includes(supplierType.toLowerCase())
}

/**
 * Verifica se um produto é importado baseado nos dados disponíveis
 * 
 * IMPORTANTE: Produtos de fornecedores brasileiros (shipFromCountry = 'BR')
 * NÃO são considerados importados, mesmo que sejam vendidos via AliExpress
 */
export function isProdutoImportado(produto: {
  supplierId?: string | null
  supplierType?: string | null
  origem?: string | null
  shipFromCountry?: string | null  // Novo campo: país de origem do envio
}): boolean {
  // Se o produto vem do Brasil, NÃO é importado (não paga impostos de importação)
  if (produto.shipFromCountry?.toUpperCase() === 'BR') {
    return false
  }
  
  // Se tem fornecedor internacional
  if (produto.supplierId && isSupplierInternacional(produto.supplierType)) {
    return true
  }
  
  // Se origem fiscal indica estrangeiro
  // Códigos: 0=Nacional, 1=Estrangeira importação direta, 2=Estrangeira adquirida mercado interno
  // 3-8: Outros códigos de mercadoria estrangeira ou com conteúdo importado
  if (produto.origem && produto.origem !== '0') {
    return true
  }
  
  return false
}

/**
 * Obtém a alíquota de ICMS para um estado
 * Usa configurações do sistema se disponíveis
 */
export function getAliquotaIcms(uf: string, config?: TaxConfig): number {
  const ufUpper = uf.toUpperCase()
  
  // Se tiver config, usar ela
  if (config) {
    if (!config.icmsEnabled) return 0
    if (config.icmsUseStateRate && config.icmsRates[ufUpper]) {
      return config.icmsRates[ufUpper]
    }
    return config.icmsDefault
  }
  
  // Fallback para tabela estática
  return ICMS_POR_ESTADO[ufUpper] || 17 // Default 17% se não encontrar
}

/**
 * Versão assíncrona que busca configurações automaticamente
 */
export async function getAliquotaIcmsAsync(uf: string): Promise<number> {
  const config = await getTaxConfig()
  return getAliquotaIcms(uf, config)
}

/**
 * Calcula os impostos de importação para uma lista de produtos
 * 
 * Fórmula:
 * 1. Imposto de Importação = Valor dos produtos importados * 20%
 * 2. Base de cálculo ICMS = (Valor produtos + II) / (1 - alíquota ICMS)
 * 3. ICMS = Base de cálculo * alíquota ICMS
 * 
 * Nota: O ICMS é calculado "por dentro", ou seja, o próprio ICMS faz parte da base de cálculo
 */
export function calcularImpostoImportacao(
  produtos: ProdutoParaCalculo[],
  ufDestino: string
): CalculoImpostoResult {
  // Separar produtos importados (excluindo produtos que vêm do Brasil)
  // isImportado já considera shipFromCountry, mas fazemos dupla verificação
  const produtosImportados = produtos.filter(p => 
    p.isImportado && p.shipFromCountry?.toUpperCase() !== 'BR'
  )
  const valorProdutosImportados = produtosImportados.reduce(
    (sum, p) => sum + (p.preco * p.quantidade), 0
  )
  const valorTotalProdutos = produtos.reduce(
    (sum, p) => sum + (p.preco * p.quantidade), 0
  )
  
  // Se não tem produtos importados, não há impostos adicionais
  if (produtosImportados.length === 0) {
    return {
      valorProdutos: valorTotalProdutos,
      impostoImportacao: 0,
      baseCalculoIcms: 0,
      icms: 0,
      totalImpostos: 0,
      aliquotaIcms: 0,
      temProdutosImportados: false,
      estadoDestino: ufDestino
    }
  }
  
  const aliquotaIcms = getAliquotaIcms(ufDestino) / 100
  
  // 1. Imposto de Importação (20%)
  const impostoImportacao = valorProdutosImportados * TAXA_IMPOSTO_IMPORTACAO
  
  // 2. Base de cálculo do ICMS (por dentro)
  // Fórmula: Base = (Valor + II) / (1 - alíquota ICMS)
  const valorComII = valorProdutosImportados + impostoImportacao
  const baseCalculoIcms = valorComII / (1 - aliquotaIcms)
  
  // 3. ICMS
  const icms = baseCalculoIcms * aliquotaIcms
  
  // Total de impostos
  const totalImpostos = impostoImportacao + icms
  
  return {
    valorProdutos: valorTotalProdutos,
    impostoImportacao: Math.round(impostoImportacao * 100) / 100,
    baseCalculoIcms: Math.round(baseCalculoIcms * 100) / 100,
    icms: Math.round(icms * 100) / 100,
    totalImpostos: Math.round(totalImpostos * 100) / 100,
    aliquotaIcms: getAliquotaIcms(ufDestino),
    temProdutosImportados: true,
    estadoDestino: ufDestino
  }
}

/**
 * Formata o valor de imposto para exibição
 */
export function formatarImposto(valor: number): string {
  return valor.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  })
}

/**
 * Gera texto explicativo sobre os impostos
 */
export function gerarTextoExplicativoImpostos(calculo: CalculoImpostoResult): string {
  if (!calculo.temProdutosImportados) {
    return ''
  }
  
  return `Impostos aplicados conforme Lei 14.902/2024 (Remessa Conforme):
• Imposto de Importação: 20% sobre produtos importados
• ICMS ${calculo.estadoDestino}: ${calculo.aliquotaIcms}%`
}

/**
 * Interface estendida para cálculo com frete
 */
export interface ProdutoParaCalculoComFrete extends ProdutoParaCalculo {
  frete?: number
}

/**
 * Calcula impostos de importação usando configurações do sistema
 * Esta é a função recomendada para uso no checkout
 */
export async function calcularImpostosComConfig(
  produtos: ProdutoParaCalculoComFrete[],
  ufDestino: string,
  freteTotal: number = 0
): Promise<CalculoImpostoResult> {
  const config = await getTaxConfig()
  
  // Se impostos estão desabilitados, retornar zero
  if (!config.importEnabled) {
    const valorTotalProdutos = produtos.reduce((sum, p) => sum + (p.preco * p.quantidade), 0)
    return {
      valorProdutos: valorTotalProdutos,
      impostoImportacao: 0,
      baseCalculoIcms: 0,
      icms: 0,
      totalImpostos: 0,
      aliquotaIcms: 0,
      temProdutosImportados: false,
      estadoDestino: ufDestino
    }
  }
  
  // Separar produtos importados
  const produtosImportados = produtos.filter(p => 
    p.isImportado && p.shipFromCountry?.toUpperCase() !== 'BR'
  )
  
  const valorProdutosImportados = produtosImportados.reduce(
    (sum, p) => sum + (p.preco * p.quantidade), 0
  )
  const valorTotalProdutos = produtos.reduce(
    (sum, p) => sum + (p.preco * p.quantidade), 0
  )
  
  if (produtosImportados.length === 0) {
    return {
      valorProdutos: valorTotalProdutos,
      impostoImportacao: 0,
      baseCalculoIcms: 0,
      icms: 0,
      totalImpostos: 0,
      aliquotaIcms: 0,
      temProdutosImportados: false,
      estadoDestino: ufDestino
    }
  }
  
  // Calcular base do imposto de importação
  let baseImportacao = valorProdutosImportados
  if (config.importBase === 'product_freight') {
    // Proporção do frete para produtos importados
    const proporcaoImportados = valorProdutosImportados / valorTotalProdutos
    const freteImportados = freteTotal * proporcaoImportados
    baseImportacao = valorProdutosImportados + freteImportados
  }
  
  // Alíquota de importação
  const taxaII = config.importRate / 100
  const impostoImportacao = baseImportacao * taxaII
  
  // ICMS
  let icms = 0
  let baseCalculoIcms = 0
  const aliquotaIcmsPercent = getAliquotaIcms(ufDestino, config)
  
  if (config.icmsEnabled && aliquotaIcmsPercent > 0) {
    const aliquotaIcms = aliquotaIcmsPercent / 100
    
    // Base ICMS = (Base + II) / (1 - alíquota) - cálculo por dentro
    const valorComII = baseImportacao + impostoImportacao
    baseCalculoIcms = valorComII / (1 - aliquotaIcms)
    icms = baseCalculoIcms * aliquotaIcms
  }
  
  const totalImpostos = impostoImportacao + icms
  
  return {
    valorProdutos: valorTotalProdutos,
    impostoImportacao: Math.round(impostoImportacao * 100) / 100,
    baseCalculoIcms: Math.round(baseCalculoIcms * 100) / 100,
    icms: Math.round(icms * 100) / 100,
    totalImpostos: Math.round(totalImpostos * 100) / 100,
    aliquotaIcms: aliquotaIcmsPercent,
    temProdutosImportados: true,
    estadoDestino: ufDestino
  }
}
