// ========================================
// BIBLIOTECA DE VALIDAÇÃO E SANITIZAÇÃO
// Proteção contra injeções, XSS e ataques
// ========================================

import { Session } from 'next-auth'
import { prisma } from './prisma'
import DOMPurify from 'isomorphic-dompurify'

// ========================================
// SANITIZAÇÃO DE STRINGS
// ========================================

/**
 * Remove tags HTML e scripts para prevenir XSS
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return ''
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  })
}

/**
 * Sanitiza texto permitindo apenas HTML básico seguro
 */
export function sanitizeRichText(input: string): string {
  if (!input || typeof input !== 'string') return ''
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: []
  })
}

/**
 * Remove caracteres especiais que podem ser usados em SQL injection
 */
export function sanitizeSqlString(input: string): string {
  if (!input || typeof input !== 'string') return ''
  // Remove caracteres perigosos mas preserva acentos e pontuação básica
  return input.replace(/[;'"\\<>{}[\]]/g, '')
}

/**
 * Sanitiza nome de arquivo removendo path traversal
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') return ''
  // Remove path traversal (.., ./, \\, etc)
  return filename
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255)
}

/**
 * Sanitiza URL verificando protocolo seguro
 */
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null
  
  try {
    const parsed = new URL(url)
    // Apenas http e https permitidos
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}

// ========================================
// VALIDAÇÃO DE TIPOS E FORMATOS
// ========================================

/**
 * Valida email com regex robusta
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  return emailRegex.test(email) && email.length <= 254
}

/**
 * Lista de domínios de email temporários/descartáveis conhecidos
 */
const DISPOSABLE_EMAIL_DOMAINS = [
  // Populares
  'tempmail.com', 'temp-mail.org', 'guerrillamail.com', 'guerrillamail.org',
  '10minutemail.com', '10minutemail.net', 'mailinator.com', 'mailinator.net',
  'throwaway.email', 'throwawaymail.com', 'fakeinbox.com', 'trashmail.com',
  'getairmail.com', 'getnada.com', 'mohmal.com', 'yopmail.com', 'yopmail.fr',
  'sharklasers.com', 'guerrillamail.info', 'grr.la', 'spam4.me',
  'dispostable.com', 'mailnesia.com', 'maildrop.cc', 'mintemail.com',
  'mytrashmail.com', 'mt2009.com', 'trash-mail.at', 'trash-mail.com',
  'tempmailaddress.com', 'tempail.com', 'tmpmail.org', 'tmpmail.net',
  'emailondeck.com', 'spamgourmet.com', 'spambox.us', 'spamfree24.org',
  'jetable.org', 'meltmail.com', 'harakirimail.com', 'emailthe.net',
  'mailcatch.com', 'mailnull.com', 'mailsac.com', 'mailslurp.com',
  'disposableaddress.com', 'disposableinbox.com', 'dropmail.me',
  'fakemailgenerator.com', 'guerrillamail.biz', 'hmamail.com',
  'instantemailaddress.com', 'mailforspam.com', 'mytemp.email',
  'putsbox.com', 'receivemail.com', 'receivemail.info', 'spamdecoy.net',
  'spamobox.com', 'tempinbox.com', 'tempinbox.co.uk', 'tempomail.fr',
  'tempr.email', 'wegwerfmail.de', 'wegwerfmail.net', 'wegwerfmail.org',
  // Brasileiros e comuns em fraudes
  'caifrfrr.com.br', 'idiota.com.br', 'burro.com.br', 'falso.com.br',
  'teste.com.br', 'temp.com.br', 'naoexiste.com.br', 'lixo.com.br',
  // Padrões suspeitos
  'test.com', 'example.com', 'fake.com', 'trash.com', 'spam.com',
  'noemail.com', 'nomail.com', 'nowhere.com', 'void.com'
]

/**
 * Verifica se o email é de um domínio descartável/temporário
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  
  const domain = email.toLowerCase().split('@')[1]
  if (!domain) return false
  
  // Verifica domínios exatos
  if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    return true
  }
  
  // Verifica padrões suspeitos no domínio
  const suspiciousPatterns = [
    'tempmail', 'temp-mail', 'throwaway', 'disposable', 'fake',
    'guerrilla', 'mailinator', 'yopmail', 'trashmail', 'spam',
    '10minute', '10min', 'noreply', 'no-reply'
  ]
  
  for (const pattern of suspiciousPatterns) {
    if (domain.includes(pattern)) {
      return true
    }
  }
  
  return false
}

/**
 * Valida email completo (formato + não descartável)
 */
export function isValidEmailComplete(email: string): { valid: boolean; reason?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Email é obrigatório' }
  }
  
  if (!isValidEmail(email)) {
    return { valid: false, reason: 'Formato de email inválido' }
  }
  
  if (isDisposableEmail(email)) {
    return { valid: false, reason: 'Emails temporários não são permitidos' }
  }
  
  // Verifica se o domínio tem pelo menos um ponto (TLD válido)
  const domain = email.split('@')[1]
  if (!domain || !domain.includes('.')) {
    return { valid: false, reason: 'Domínio de email inválido' }
  }
  
  // Verifica extensão mínima do TLD
  const tld = domain.split('.').pop()
  if (!tld || tld.length < 2) {
    return { valid: false, reason: 'Extensão de domínio inválida' }
  }
  
  return { valid: true }
}

/**
 * Valida CPF (apenas formato e dígitos verificadores)
 */
export function isValidCPF(cpf: string): boolean {
  if (!cpf || typeof cpf !== 'string') return false
  
  // Remove formatação
  const cleaned = cpf.replace(/\D/g, '')
  
  if (cleaned.length !== 11) return false
  
  // Rejeita sequências conhecidas
  if (/^(\d)\1{10}$/.test(cleaned)) return false
  
  // Valida dígitos verificadores
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i)
  }
  let digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cleaned.charAt(9))) return false
  
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i)
  }
  digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cleaned.charAt(10))) return false
  
  return true
}

/**
 * Valida CNPJ (apenas formato e dígitos verificadores)
 */
export function isValidCNPJ(cnpj: string): boolean {
  if (!cnpj || typeof cnpj !== 'string') return false
  
  const cleaned = cnpj.replace(/\D/g, '')
  
  if (cleaned.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cleaned)) return false
  
  // Valida primeiro dígito
  let length = cleaned.length - 2
  let numbers = cleaned.substring(0, length)
  const digits = cleaned.substring(length)
  let sum = 0
  let pos = length - 7
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(0))) return false
  
  // Valida segundo dígito
  length = length + 1
  numbers = cleaned.substring(0, length)
  sum = 0
  pos = length - 7
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(1))) return false
  
  return true
}

/**
 * Valida telefone brasileiro
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false
  const cleaned = phone.replace(/\D/g, '')
  // (XX) 9XXXX-XXXX ou (XX) XXXX-XXXX
  return /^(\d{2})9?\d{8}$/.test(cleaned)
}

/**
 * Valida CEP brasileiro
 */
export function isValidCEP(cep: string): boolean {
  if (!cep || typeof cep !== 'string') return false
  const cleaned = cep.replace(/\D/g, '')
  return /^\d{8}$/.test(cleaned)
}

/**
 * Valida CEP e verifica se corresponde ao estado informado
 * Retorna { valid: boolean, error?: string, data?: ViaCEPData }
 */
export async function validateCEPWithState(cep: string, informedState: string): Promise<{
  valid: boolean
  error?: string
  data?: {
    cep: string
    logradouro: string
    bairro: string
    localidade: string
    uf: string
  }
}> {
  if (!cep || typeof cep !== 'string') {
    return { valid: false, error: 'CEP é obrigatório' }
  }
  
  const cleanedCep = cep.replace(/\D/g, '')
  
  if (!/^\d{8}$/.test(cleanedCep)) {
    return { valid: false, error: 'CEP inválido. Deve ter 8 dígitos.' }
  }
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`, {
      signal: AbortSignal.timeout(5000) // Timeout de 5 segundos
    })
    
    if (!response.ok) {
      return { valid: false, error: 'Não foi possível validar o CEP. Tente novamente.' }
    }
    
    const data = await response.json()
    
    if (data.erro) {
      return { valid: false, error: 'CEP não encontrado. Verifique o número informado.' }
    }
    
    // Verificar se o estado corresponde
    const cleanedState = informedState?.toUpperCase().trim()
    
    if (cleanedState && data.uf !== cleanedState) {
      return { 
        valid: false, 
        error: `CEP ${cleanedCep} pertence a ${data.localidade}/${data.uf}, mas foi informado ${cleanedState}. Verifique o endereço.`,
        data 
      }
    }
    
    return { valid: true, data }
  } catch (error) {
    // Em caso de erro de rede, não bloquear mas logar
    console.error('Erro ao validar CEP:', error)
    // Retorna válido mas sem dados - melhor não bloquear por falha de rede
    return { valid: true }
  }
}

/**
 * Valida apenas se o CEP existe (sem verificar estado)
 */
export async function validateCEPExists(cep: string): Promise<{
  valid: boolean
  error?: string
  data?: {
    cep: string
    logradouro: string
    bairro: string
    localidade: string
    uf: string
  }
}> {
  if (!cep || typeof cep !== 'string') {
    return { valid: false, error: 'CEP é obrigatório' }
  }
  
  const cleanedCep = cep.replace(/\D/g, '')
  
  if (!/^\d{8}$/.test(cleanedCep)) {
    return { valid: false, error: 'CEP inválido. Deve ter 8 dígitos.' }
  }
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`, {
      signal: AbortSignal.timeout(5000)
    })
    
    if (!response.ok) {
      return { valid: false, error: 'Não foi possível validar o CEP.' }
    }
    
    const data = await response.json()
    
    if (data.erro) {
      return { valid: false, error: 'CEP não encontrado.' }
    }
    
    return { valid: true, data }
  } catch (error) {
    console.error('Erro ao validar CEP:', error)
    return { valid: true } // Não bloquear por falha de rede
  }
}

/**
 * Valida número decimal positivo
 */
export function isValidPositiveNumber(value: any): boolean {
  const num = Number(value)
  return !isNaN(num) && num > 0 && isFinite(num)
}

/**
 * Valida inteiro positivo
 */
export function isValidPositiveInteger(value: any): boolean {
  const num = Number(value)
  return Number.isInteger(num) && num > 0
}

/**
 * Valida UUID v4
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Valida CUID (gerado pelo Prisma)
 */
export function isValidCUID(cuid: string): boolean {
  if (!cuid || typeof cuid !== 'string') return false
  // CUID v1: começa com 'c' e tem 25 caracteres alfanuméricos
  // CUID v2: começa com 'c' e tem 24-32 caracteres alfanuméricos
  const cuidRegex = /^c[a-z0-9]{20,31}$/i
  return cuidRegex.test(cuid)
}

/**
 * Valida ID genérico (UUID ou CUID)
 */
export function isValidId(id: string): boolean {
  return isValidUUID(id) || isValidCUID(id)
}

/**
 * Valida slug (URL-friendly)
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 200
}

// ========================================
// VALIDAÇÃO DE TAMANHOS E LIMITES
// ========================================

/**
 * Valida tamanho de string
 */
export function isValidLength(str: string, min: number, max: number): boolean {
  if (!str || typeof str !== 'string') return false
  return str.length >= min && str.length <= max
}

/**
 * Valida tamanho de arquivo (em bytes)
 */
export function isValidFileSize(size: number, maxSizeMB: number): boolean {
  if (!size || typeof size !== 'number') return false
  const maxBytes = maxSizeMB * 1024 * 1024
  return size > 0 && size <= maxBytes
}

/**
 * Valida tipo MIME de imagem
 */
export function isValidImageMime(mime: string): boolean {
  if (!mime || typeof mime !== 'string') return false
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  return allowedMimes.includes(mime.toLowerCase())
}

/**
 * Valida extensão de arquivo de imagem
 */
export function isValidImageExtension(filename: string): boolean {
  if (!filename || typeof filename !== 'string') return false
  const ext = filename.toLowerCase().split('.').pop()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')
}

// ========================================
// VALIDAÇÃO DE PERMISSÕES
// ========================================

/**
 * Verifica se usuário é admin
 */
export async function isAdmin(session: Session | null): Promise<boolean> {
  if (!session?.user?.id) return false
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  })
  
  return user?.role === 'ADMIN'
}

/**
 * Verifica se usuário é seller ativo
 */
export async function isActiveSeller(session: Session | null): Promise<boolean> {
  if (!session?.user?.id) return false
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { seller: true }
  })
  
  return user?.role === 'SELLER' && user?.seller?.status === 'ACTIVE'
}

/**
 * Verifica se seller possui plano ativo
 */
export async function hasActivePlan(sellerId: string): Promise<boolean> {
  if (!sellerId) return false
  
  const subscription = await prisma.subscription.findFirst({
    where: {
      sellerId,
      status: { in: ['TRIAL', 'ACTIVE'] }
    }
  })
  
  return !!subscription
}

/**
 * Verifica se usuário tem permissão sobre um recurso específico
 */
export async function canAccessResource(
  session: Session | null,
  resourceId: string,
  resourceType: 'product' | 'order' | 'seller'
): Promise<boolean> {
  if (!session?.user?.id) return false
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { seller: true }
  })
  
  if (!user) return false
  
  // Admin tem acesso total
  if (user.role === 'ADMIN') return true
  
  // Verifica ownership baseado no tipo de recurso
  switch (resourceType) {
    case 'product': {
      const product = await prisma.product.findUnique({
        where: { id: resourceId },
        select: { sellerId: true }
      })
      return product?.sellerId === user.seller?.id || product?.sellerId === user.workForSellerId
    }
    
    case 'order': {
      const order = await prisma.order.findUnique({
        where: { id: resourceId },
        include: { items: true }
      })
      // Verifica se algum item do pedido pertence ao seller
      return order?.items.some(item => 
        item.sellerId === user.seller?.id || item.sellerId === user.workForSellerId
      ) || false
    }
    
    case 'seller': {
      return resourceId === user.seller?.id || resourceId === user.workForSellerId
    }
    
    default:
      return false
  }
}

// ========================================
// VALIDAÇÃO DE DADOS DE PRODUTOS
// ========================================

export interface ProductValidationRules {
  name: { min: number; max: number }
  description: { min: number; max: number }
  price: { min: number; max: number }
  stock: { min: number; max: number }
  sku: { min: number; max: number }
  images: { min: number; max: number; maxSizeMB: number }
}

export const PRODUCT_VALIDATION_RULES: ProductValidationRules = {
  name: { min: 3, max: 200 },
  description: { min: 10, max: 5000 },
  price: { min: 0.01, max: 999999.99 },
  stock: { min: 0, max: 999999 },
  sku: { min: 3, max: 50 },
  images: { min: 1, max: 10, maxSizeMB: 5 }
}

/**
 * Valida dados de produto completos
 */
export function validateProductData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Nome
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Nome do produto é obrigatório')
  } else if (!isValidLength(data.name, PRODUCT_VALIDATION_RULES.name.min, PRODUCT_VALIDATION_RULES.name.max)) {
    errors.push(`Nome deve ter entre ${PRODUCT_VALIDATION_RULES.name.min} e ${PRODUCT_VALIDATION_RULES.name.max} caracteres`)
  }
  
  // Descrição
  if (!data.description || typeof data.description !== 'string') {
    errors.push('Descrição é obrigatória')
  } else if (!isValidLength(data.description, PRODUCT_VALIDATION_RULES.description.min, PRODUCT_VALIDATION_RULES.description.max)) {
    errors.push(`Descrição deve ter entre ${PRODUCT_VALIDATION_RULES.description.min} e ${PRODUCT_VALIDATION_RULES.description.max} caracteres`)
  }
  
  // Preço
  if (data.price === undefined || data.price === null) {
    errors.push('Preço é obrigatório')
  } else {
    const price = Number(data.price)
    if (!isValidPositiveNumber(price)) {
      errors.push('Preço deve ser um número positivo')
    } else if (price < PRODUCT_VALIDATION_RULES.price.min || price > PRODUCT_VALIDATION_RULES.price.max) {
      errors.push(`Preço deve estar entre R$ ${PRODUCT_VALIDATION_RULES.price.min} e R$ ${PRODUCT_VALIDATION_RULES.price.max}`)
    }
  }
  
  // Estoque
  if (data.stock === undefined || data.stock === null) {
    errors.push('Estoque é obrigatório')
  } else {
    const stock = Number(data.stock)
    if (!Number.isInteger(stock) || stock < PRODUCT_VALIDATION_RULES.stock.min) {
      errors.push('Estoque deve ser um número inteiro não negativo')
    } else if (stock > PRODUCT_VALIDATION_RULES.stock.max) {
      errors.push(`Estoque máximo é ${PRODUCT_VALIDATION_RULES.stock.max}`)
    }
  }
  
  // SKU
  if (data.sku && typeof data.sku === 'string') {
    if (!isValidLength(data.sku, PRODUCT_VALIDATION_RULES.sku.min, PRODUCT_VALIDATION_RULES.sku.max)) {
      errors.push(`SKU deve ter entre ${PRODUCT_VALIDATION_RULES.sku.min} e ${PRODUCT_VALIDATION_RULES.sku.max} caracteres`)
    }
  }
  
  // Categoria
  if (!data.categoryId || typeof data.categoryId !== 'string') {
    errors.push('Categoria é obrigatória')
  }
  
  // Imagens
  if (!data.images || !Array.isArray(data.images) || data.images.length === 0) {
    errors.push('Pelo menos uma imagem é obrigatória')
  } else if (data.images.length > PRODUCT_VALIDATION_RULES.images.max) {
    errors.push(`Máximo de ${PRODUCT_VALIDATION_RULES.images.max} imagens permitidas`)
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// ========================================
// RATE LIMITING
// ========================================

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Implementa rate limiting simples em memória
 * Para produção, usar Redis ou similar
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)
  
  // Limpa entrada expirada
  if (entry && now > entry.resetAt) {
    rateLimitStore.delete(identifier)
  }
  
  // Primeira requisição ou janela resetada
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs
    })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs
    }
  }
  
  // Incrementa contador
  entry.count++
  
  // Verifica se excedeu limite
  if (entry.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt
    }
  }
  
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt
  }
}

/**
 * Limpa rate limits expirados periodicamente
 */
export function cleanupRateLimits() {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}

// Limpa a cada 1 minuto
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimits, 60000)
}

// ========================================
// HELPERS DE RESPOSTA
// ========================================

export function unauthorizedResponse(message = 'Não autorizado') {
  return {
    error: message,
    code: 'UNAUTHORIZED'
  }
}

export function forbiddenResponse(message = 'Acesso negado') {
  return {
    error: message,
    code: 'FORBIDDEN'
  }
}

export function validationErrorResponse(errors: string[]) {
  return {
    error: 'Dados inválidos',
    code: 'VALIDATION_ERROR',
    details: errors
  }
}

export function rateLimitResponse(resetAt: number) {
  return {
    error: 'Muitas requisições',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil((resetAt - Date.now()) / 1000)
  }
}
