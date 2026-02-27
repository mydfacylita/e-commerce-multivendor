/**
 * 🔐 CRIPTOGRAFIA DE CAMPOS SENSÍVEIS
 * ISO 27701 / LGPD Art.46 — Medidas técnicas adequadas
 *
 * Criptografa dados pessoais sensíveis (CPF, CNPJ, telefone) em repouso
 * usando AES-256-GCM (autenticado, resistente a tampering).
 *
 * Formato armazenado: "iv:authTag:ciphertext" em base64
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16   // 128 bits
const TAG_LENGTH = 16  // 128 bits (GCM auth tag)
const KEY_LENGTH = 32  // 256 bits

// Prefixo que identifica campo criptografado (evita re-cifrar dado já cifrado)
const ENCRYPTED_PREFIX = 'enc:'

/**
 * Deriva chave de 256 bits a partir do NEXTAUTH_SECRET + salt fixo
 * usando scrypt (work factor alto para dificultar brute-force).
 */
function deriveKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET não configurado — não é possível criptografar campos sensíveis')
  }
  // Salt fixo derivado do domínio — não altera entre deploys do mesmo app
  const salt = createHash('sha256')
    .update(`field-encryption-salt-${process.env.NEXTAUTH_URL || 'mydshop'}`)
    .digest()
  return scryptSync(secret, salt, KEY_LENGTH) as Buffer
}

// Cache da chave em memória (derivação é cara)
let _cachedKey: Buffer | null = null
function getKey(): Buffer {
  if (!_cachedKey) {
    _cachedKey = deriveKey()
  }
  return _cachedKey
}

/**
 * Criptografa um campo sensível.
 * Retorna `null` se o valor for null/undefined.
 * Se já estiver criptografado (prefixo "enc:"), retorna inalterado.
 */
export function encryptField(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  if (value.startsWith(ENCRYPTED_PREFIX)) return value  // Já criptografado

  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final()
  ])
  const authTag = cipher.getAuthTag()

  // Formato: "enc:iv.authTag.ciphertext" — tudo base64url
  const result = [
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.')

  return `${ENCRYPTED_PREFIX}${result}`
}

/**
 * Decriptografa um campo sensível.
 * Retorna o valor original sem modificações se não estiver criptografado.
 * Retorna `null` se o valor for null/undefined.
 */
export function decryptField(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  if (!value.startsWith(ENCRYPTED_PREFIX)) return value  // Não criptografado (legado)

  try {
    const parts = value.slice(ENCRYPTED_PREFIX.length).split('.')
    if (parts.length !== 3) throw new Error('Formato inválido')

    const [ivB64, tagB64, dataB64] = parts
    const key = getKey()
    const iv = Buffer.from(ivB64, 'base64url')
    const authTag = Buffer.from(tagB64, 'base64url')
    const encrypted = Buffer.from(dataB64, 'base64url')

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ])

    return decrypted.toString('utf8')
  } catch (err) {
    console.error('[CryptoFields] Falha ao decriptografar campo:', err)
    return null
  }
}

/**
 * Verifica se um campo está criptografado.
 */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX)
}

/**
 * Mascara CPF/CNPJ para exibição: "***.***.***-XX"
 * Usa o valor decriptografado se necessário.
 */
export function maskCpf(value: string | null | undefined): string | null {
  const plain = decryptField(value)
  if (!plain) return null
  const digits = plain.replace(/\D/g, '')
  if (digits.length === 11) {
    return `***.***.${digits.slice(6, 9)}-${digits.slice(9)}`
  }
  if (digits.length === 14) {
    return `**.***.${digits.slice(5, 8)}/${digits.slice(8, 12)}-**`
  }
  return plain
}

/**
 * Mascara telefone para exibição: "(**) *****-XXXX"
 */
export function maskPhone(value: string | null | undefined): string | null {
  const plain = decryptField(value)
  if (!plain) return null
  const digits = plain.replace(/\D/g, '')
  if (digits.length >= 8) {
    return `(**) *****-${digits.slice(-4)}`
  }
  return plain
}
