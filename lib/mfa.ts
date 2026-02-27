/**
 * 🔑 MFA — MULTI-FACTOR AUTHENTICATION (TOTP RFC 6238)
 * ISO 27001 Controle A.9.4 — Autenticação forte para acesso privilegiado
 *
 * Implementa TOTP (Time-based One-Time Password) sem dependências externas,
 * usando apenas o módulo nativo `crypto` do Node.js.
 *
 * Compatível com Google Authenticator, Authy, Microsoft Authenticator.
 */

import { createHmac, randomBytes } from 'crypto'

// ─────────────────────────────────────────────────────────────
// Constantes TOTP (RFC 6238)
// ─────────────────────────────────────────────────────────────
const TOTP_PERIOD = 30           // janela de 30 segundos
const TOTP_DIGITS = 6            // código de 6 dígitos
const TOTP_WINDOW = 1            // aceita ±1 janela (tolerância de relógio)
const SECRET_BYTES = 20          // 160 bits = 32 chars base32

// Alfabeto Base32 (RFC 4648)
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

// ─────────────────────────────────────────────────────────────
// Base32 encode/decode
// ─────────────────────────────────────────────────────────────
function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i]
    bits += 8
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31]
  }
  // Padding
  while (output.length % 8 !== 0) output += '='
  return output
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, '')
  const bytes: number[] = []
  let bits = 0
  let value = 0
  for (const char of clean) {
    const idx = BASE32_CHARS.indexOf(char)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

// ─────────────────────────────────────────────────────────────
// TOTP core
// ─────────────────────────────────────────────────────────────
function generateHOTP(secret: string, counter: number): string {
  const key = base32Decode(secret)
  const buf = Buffer.alloc(8)
  let tmp = counter
  for (let i = 7; i >= 0; i--) {
    buf[i] = tmp & 0xff
    tmp >>= 8
  }
  const hmac = createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % Math.pow(10, TOTP_DIGITS)
  return code.toString().padStart(TOTP_DIGITS, '0')
}

function getCounter(timestamp?: number): number {
  return Math.floor((timestamp ?? Date.now()) / 1000 / TOTP_PERIOD)
}

// ─────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────

/**
 * Gera um secret TOTP aleatório (Base32).
 */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(SECRET_BYTES))
}

/**
 * Gera o código TOTP atual para um secret.
 */
export function generateTotpCode(secret: string): string {
  return generateHOTP(secret, getCounter())
}

/**
 * Verifica se o código OTP é válido para o secret.
 * Aceita ±TOTP_WINDOW janelas (tolerância de clock skew).
 */
export function verifyTotp(secret: string, token: string): boolean {
  const clean = token.replace(/\s/g, '')
  if (!/^\d{6}$/.test(clean)) return false
  const counter = getCounter()
  for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
    if (generateHOTP(secret, counter + i) === clean) return true
  }
  return false
}

/**
 * Gera a URL otpauth:// para QR code (padrão Google Authenticator).
 */
export function generateOtpauthUrl(options: {
  secret: string
  email: string
  issuer?: string
}): string {
  const issuer = options.issuer ?? 'MydShop'
  const label = encodeURIComponent(`${issuer}:${options.email}`)
  const params = new URLSearchParams({
    secret: options.secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD),
  })
  return `otpauth://totp/${label}?${params.toString()}`
}

/**
 * Gera URL do QR Code via Charts API do Google.
 * (sem necessidade de instalar biblioteca qrcode)
 */
export function generateQrCodeUrl(otpauthUrl: string): string {
  const encoded = encodeURIComponent(otpauthUrl)
  return `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encoded}&choe=UTF-8`
}

/**
 * Gera 8 códigos de backup de uso único (para recuperação sem MFA).
 */
export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () =>
    randomBytes(4).toString('hex').toUpperCase().match(/.{4}/g)!.join('-')
  )
}

/**
 * Hash de um backup code para armazenamento seguro (sem texto plano).
 */
export function hashBackupCode(code: string): string {
  const { createHash } = require('crypto')
  return createHash('sha256').update(code.replace(/\s|-/g, '').toUpperCase()).digest('hex')
}
