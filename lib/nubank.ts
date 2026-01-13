import { prisma } from '../lib/prisma'

// Lib para integração com Nubank PJ
export class NubankService {
  private clientId: string
  private clientSecret: string
  private environment: string
  private baseUrl: string
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null

  constructor(clientId: string, clientSecret: string, environment: 'production' | 'sandbox' = 'production') {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.environment = environment
    this.baseUrl = environment === 'production' 
      ? 'https://api.nubank.com.br/v1'
      : 'https://sandbox.nubank.com.br/v1'
  }

  // Autenticação OAuth2
  private async authenticate() {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken
    }

    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret
      })
    })

    if (!response.ok) {
      throw new Error(`Nubank authentication failed: ${response.statusText}`)
    }

    const data = await response.json()
    this.accessToken = data.access_token
    this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000))
    
    return this.accessToken
  }

  // Transferência PIX
  async transferPix(params: {
    amount: number
    pixKey: string
    pixKeyType: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP'
    description: string
    externalId: string
  }) {
    const token = await this.authenticate()

    const payload = {
      amount: params.amount,
      currency: 'BRL',
      pix: {
        key: params.pixKey,
        key_type: params.pixKeyType
      },
      description: params.description,
      external_id: params.externalId,
      idempotency_key: params.externalId
    }

    const response = await fetch(`${this.baseUrl}/transfers/pix`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Nubank transfer failed')
    }

    return result
  }

  // Consultar transação
  async getTransaction(transactionId: string) {
    const token = await this.authenticate()

    const response = await fetch(`${this.baseUrl}/transfers/${transactionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to get transaction')
    }

    return response.json()
  }

  // Consultar saldo
  async getBalance() {
    const token = await this.authenticate()

    const response = await fetch(`${this.baseUrl}/accounts/balance`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to get balance')
    }

    return response.json()
  }
}

// Função helper para obter instância do Nubank
export async function getNubankService() {
  const gateway = await prisma.paymentGateway.findUnique({
    where: { gateway: 'NUBANK' }
  })

  if (!gateway || !gateway.isActive) {
    throw new Error('Nubank gateway not configured or inactive')
  }

  // CRÍTICO: Prisma retorna config como STRING, precisa fazer parse
  let config = gateway.config
  if (typeof config === 'string') {
    console.log('⚠️  [NUBANK] Config é STRING, fazendo parse...')
    config = JSON.parse(config)
  }
  
  if (!config.clientId || !config.clientSecret) {
    throw new Error('Nubank credentials not configured')
  }

  return new NubankService(
    config.clientId,
    config.clientSecret,
    config.environment || 'production'
  )
}
