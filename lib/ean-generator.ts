/**
 * Gerador de códigos EAN-13 com dígito verificador
 */

/**
 * Gera um código EAN-13 válido
 * @param prefix Prefixo da empresa (789 = Brasil, ou prefixo GS1)
 * @param sequential Número sequencial do produto
 * @returns Código EAN-13 completo com dígito verificador
 */
export function generateEAN13(prefix: string = '789', sequential?: number): string {
  // Se não fornecer sequencial, gera aleatório
  const seq = sequential || Math.floor(Math.random() * 1000000000)
  
  // Prefixo fixo + sequencial preenchido com zeros
  // Ex: 789 + 000123456 = 789000123456 (12 dígitos)
  const seqStr = seq.toString().padStart(12 - prefix.length, '0').substring(0, 12 - prefix.length)
  const base = prefix + seqStr
  
  // Calcula dígito verificador
  const checkDigit = calculateEAN13CheckDigit(base)
  
  return base + checkDigit
}

/**
 * Calcula o dígito verificador do EAN-13
 * @param base Primeiros 12 dígitos do EAN
 * @returns Dígito verificador (0-9)
 */
export function calculateEAN13CheckDigit(base: string): string {
  if (base.length !== 12) {
    throw new Error('EAN base deve ter 12 dígitos')
  }

  let sum = 0
  
  // Multiplica posições ímpares por 1 e pares por 3
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base[i])
    sum += digit * (i % 2 === 0 ? 1 : 3)
  }
  
  // Dígito verificador = 10 - (soma % 10)
  // Se der 10, usa 0
  const checkDigit = (10 - (sum % 10)) % 10
  
  return checkDigit.toString()
}

/**
 * Valida se um código EAN-13 é válido
 * @param ean Código EAN-13 completo
 * @returns true se válido, false caso contrário
 */
export function validateEAN13(ean: string): boolean {
  // Remove espaços e hífens
  const cleaned = ean.replace(/[\s-]/g, '')
  
  // Verifica se tem 13 dígitos
  if (!/^\d{13}$/.test(cleaned)) {
    return false
  }
  
  // Verifica dígito verificador
  const base = cleaned.substring(0, 12)
  const checkDigit = cleaned.substring(12)
  const calculatedCheckDigit = calculateEAN13CheckDigit(base)
  
  return checkDigit === calculatedCheckDigit
}

/**
 * Formata EAN-13 para exibição
 * @param ean Código EAN-13
 * @returns EAN formatado (ex: 789-1234-5678-9)
 */
export function formatEAN13(ean: string): string {
  const cleaned = ean.replace(/[\s-]/g, '')
  
  if (cleaned.length !== 13) {
    return ean
  }
  
  return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 7)}-${cleaned.substring(7, 12)}-${cleaned.substring(12)}`
}

/**
 * Gera lote de códigos EAN-13
 * @param quantity Quantidade de códigos
 * @param prefix Prefixo (padrão: 789 - Brasil)
 * @param startSequence Número inicial (para manter controle)
 * @returns Array de códigos EAN-13
 */
export function generateEANBatch(
  quantity: number, 
  prefix: string = '789',
  startSequence?: number
): string[] {
  const eans: string[] = []
  const start = startSequence || Math.floor(Math.random() * 100000000)
  
  for (let i = 0; i < quantity; i++) {
    eans.push(generateEAN13(prefix, start + i))
  }
  
  return eans
}

/**
 * Tipos de EAN suportados
 */
export enum EANType {
  OFFICIAL = 'OFFICIAL',  // EAN comprado via GS1
  INTERNAL = 'INTERNAL'   // EAN gerado internamente
}

/**
 * Gera código EAN com metadados
 */
export interface EANCode {
  code: string
  type: EANType
  formatted: string
  valid: boolean
  generatedAt: Date
  prefix: string
}

/**
 * Cria objeto EAN completo
 */
export function createEAN(type: EANType, prefix?: string): EANCode {
  const eanPrefix = prefix || (type === EANType.OFFICIAL ? '789' : '200')
  const code = generateEAN13(eanPrefix)
  
  return {
    code,
    type,
    formatted: formatEAN13(code),
    valid: validateEAN13(code),
    generatedAt: new Date(),
    prefix: eanPrefix
  }
}
