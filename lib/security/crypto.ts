import crypto from 'crypto';

// Chaves devem estar em variáveis de ambiente
const ENCRYPTION_KEY = process.env.TRANSACTION_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const SIGNING_KEY = process.env.TRANSACTION_SIGNING_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-gcm';
const AUTH_TAG_LENGTH = 16;

/**
 * Criptografa dados sensíveis usando AES-256-GCM
 */
export function encrypt(data: string): { encrypted: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * Descriptografa dados
 */
export function decrypt(encryptedData: string, iv: string, authTag: string): string {
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const decipher = crypto.createDecipheriv(
    ALGORITHM, 
    key, 
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Gera assinatura HMAC para garantir integridade dos dados
 */
export function signData(data: object): string {
  const hmac = crypto.createHmac('sha256', SIGNING_KEY);
  hmac.update(JSON.stringify(data));
  return hmac.digest('hex');
}

/**
 * Verifica assinatura HMAC
 */
export function verifySignature(data: object, signature: string): boolean {
  const expectedSignature = signData(data);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Gera token único para transação (previne replay attacks)
 */
export function generateTransactionToken(
  userId: string, 
  amount: number, 
  destination: string,
  timestamp: number = Date.now()
): string {
  const data = `${userId}:${amount}:${destination}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', SIGNING_KEY);
  hmac.update(data);
  return hmac.digest('hex');
}

/**
 * Verifica token de transação com janela de tempo
 */
export function verifyTransactionToken(
  token: string,
  userId: string,
  amount: number,
  destination: string,
  timestamp: number,
  maxAgeMs: number = 300000 // 5 minutos
): boolean {
  // Verificar se não expirou
  if (Date.now() - timestamp > maxAgeMs) {
    return false;
  }
  
  const expectedToken = generateTransactionToken(userId, amount, destination, timestamp);
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(token, 'hex'),
      Buffer.from(expectedToken, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Hash de senha para PIN de transação
 */
export function hashPin(pin: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pin, useSalt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt: useSalt };
}

/**
 * Verifica PIN
 */
export function verifyPin(pin: string, hash: string, salt: string): boolean {
  const { hash: newHash } = hashPin(pin, salt);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(newHash, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Gera ID único seguro para transação
 */
export function generateSecureTransactionId(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex');
  return `TXN${timestamp}${random}`.toUpperCase();
}

/**
 * Mascara dados sensíveis para logs
 */
export function maskSensitiveData(data: any): any {
  const sensitiveFields = ['pixKey', 'cpf', 'cnpj', 'password', 'pin', 'token', 'authTag'];
  
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const masked = { ...data };
  
  for (const field of sensitiveFields) {
    if (masked[field]) {
      const value = String(masked[field]);
      if (value.length > 4) {
        masked[field] = value.slice(0, 2) + '*'.repeat(value.length - 4) + value.slice(-2);
      } else {
        masked[field] = '****';
      }
    }
  }
  
  return masked;
}
