/**
 * Correios CWS API Integration (REST)
 * 
 * Nova API REST dos Correios para:
 * - Geração de token de autenticação
 * - Pré-postagem (criação de etiquetas)
 * - Rastreamento
 * 
 * Documentação: https://cws.correios.com.br
 */

import { prisma } from './prisma'

interface CorreiosCredentials {
  usuario: string
  codigoAcesso: string
  cartaoPostagem: string
  cnpj: string
  cepOrigem: string
}

interface CorreiosToken {
  token: string
  expiraEm: Date
}

interface DestinatarioData {
  nome: string
  cpfCnpj?: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: string
  cep: string
  telefone?: string
  email?: string
}

interface RemetenteData {
  nome: string
  cnpj: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: string
  cep: string
  telefone?: string
  email?: string
}

interface ObjetoPostalData {
  peso: number // em gramas
  altura: number // em cm
  largura: number // em cm
  comprimento: number // em cm
  valorDeclarado?: number
  codigoServico: string // 03220 = SEDEX, 03298 = PAC
}

interface PrePostagemResult {
  success: boolean
  codigoRastreio?: string
  idPrePostagem?: string
  error?: string
}

interface EtiquetaResult {
  success: boolean
  etiqueta?: string
  urlEtiqueta?: string
  pdfBuffer?: Buffer
  idRecibo?: string
  error?: string
}

// Cache do token em memória
let cachedToken: CorreiosToken | null = null

class CorreiosCWSService {
  private baseUrl = 'https://api.correios.com.br'
  
  /**
   * Obter região com base no estado
   */
  private getRegiao(uf: string): string {
    const regioes: Record<string, string> = {
      'AC': 'Norte', 'AP': 'Norte', 'AM': 'Norte', 'PA': 'Norte', 'RO': 'Norte', 'RR': 'Norte', 'TO': 'Norte',
      'AL': 'Nordeste', 'BA': 'Nordeste', 'CE': 'Nordeste', 'MA': 'Nordeste', 'PB': 'Nordeste', 
      'PE': 'Nordeste', 'PI': 'Nordeste', 'RN': 'Nordeste', 'SE': 'Nordeste',
      'DF': 'Centro-Oeste', 'GO': 'Centro-Oeste', 'MT': 'Centro-Oeste', 'MS': 'Centro-Oeste',
      'ES': 'Sudeste', 'MG': 'Sudeste', 'RJ': 'Sudeste', 'SP': 'Sudeste',
      'PR': 'Sul', 'RS': 'Sul', 'SC': 'Sul'
    }
    return regioes[uf?.toUpperCase()] || 'Sudeste'
  }
  
  /**
   * Buscar credenciais do banco de dados
   */
  async getCredentials(): Promise<CorreiosCredentials | null> {
    try {
      const configs = await prisma.systemConfig.findMany({
        where: {
          key: {
            in: [
              'correios.usuario',
              'correios.codigoAcesso',
              'correios.cartaoPostagem',
              'correios.cnpj',
              'correios.cepOrigem'
            ]
          }
        }
      })

      const configMap: Record<string, string> = {}
      configs.forEach((c: { key: string; value: string }) => {
        const key = c.key.replace('correios.', '')
        configMap[key] = c.value
      })

      if (!configMap.usuario || !configMap.codigoAcesso || !configMap.cartaoPostagem) {
        console.error('[CorreiosCWS] Credenciais incompletas:', Object.keys(configMap))
        return null
      }

      return {
        usuario: configMap.usuario,
        codigoAcesso: configMap.codigoAcesso,
        cartaoPostagem: configMap.cartaoPostagem,
        cnpj: configMap.cnpj || configMap.usuario,
        cepOrigem: configMap.cepOrigem || ''
      }
    } catch (error) {
      console.error('[CorreiosCWS] Erro ao buscar credenciais:', error)
      return null
    }
  }

  /**
   * Obter token de autenticação
   */
  async getToken(): Promise<string | null> {
    // Verificar se o token em cache ainda é válido
    if (cachedToken && cachedToken.expiraEm > new Date()) {
      console.log('[CorreiosCWS] Usando token em cache')
      return cachedToken.token
    }

    const credentials = await this.getCredentials()
    if (!credentials) {
      console.error('[CorreiosCWS] Credenciais não configuradas')
      return null
    }

    try {
      // Basic Auth com usuario:codigoAcesso
      const basicAuth = Buffer.from(`${credentials.usuario}:${credentials.codigoAcesso}`).toString('base64')

      console.log('[CorreiosCWS] Obtendo token...')
      
      const response = await fetch(`${this.baseUrl}/token/v1/autentica/cartaopostagem`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`
        },
        body: JSON.stringify({
          numero: credentials.cartaoPostagem
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[CorreiosCWS] Erro ao obter token:', response.status, errorText)
        return null
      }

      const data = await response.json()
      
      // Cachear o token
      cachedToken = {
        token: data.token,
        expiraEm: new Date(data.expiraEm)
      }

      console.log('[CorreiosCWS] Token obtido, expira em:', data.expiraEm)
      return data.token
    } catch (error) {
      console.error('[CorreiosCWS] Erro ao obter token:', error)
      return null
    }
  }

  /**
   * Fazer requisição autenticada para a API
   */
  private async apiRequest(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<any> {
    const token = await this.getToken()
    if (!token) {
      throw new Error('Não foi possível obter token de autenticação')
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`
    
    console.log(`[CorreiosCWS] ${method} ${url}`)

    const response = await fetch(url, {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[CorreiosCWS] Erro API:', response.status, errorText)
      throw new Error(`Erro API Correios: ${response.status} - ${errorText}`)
    }

    return await response.json()
  }

  /**
   * Criar pré-postagem (gera código de rastreio)
   * Payload conforme schema RequestPrePostagemExternaDTO
   */
  async criarPrePostagem(
    destinatario: DestinatarioData,
    remetente: RemetenteData,
    objeto: ObjetoPostalData,
    nfe?: { chave: string; serie?: string; numero?: string },
    declaracaoConteudo?: { conteudo: string; quantidade: number; valor: number }[]
  ): Promise<PrePostagemResult> {
    try {
      const credentials = await this.getCredentials()
      if (!credentials) {
        return { success: false, error: 'Credenciais não configuradas' }
      }

      // Determinar formato do objeto baseado nas dimensões:
      // 1-Envelope: altura <= 2cm (carta/documento fino)
      // 2-Caixa/Pacote: altura > 2cm OU largura > 11cm OU comprimento > 16cm (a maioria dos produtos)
      // 3-Cilindro: formato especial (não usado aqui)
      // Se qualquer dimensão indicar que não é envelope, usar caixa
      const isEnvelope = objeto.altura <= 2 && objeto.largura <= 11 && objeto.comprimento <= 16
      const formatoObjeto = isEnvelope ? '1' : '2'
      
      console.log(`[CorreiosCWS] Dimensões: ${objeto.altura}x${objeto.largura}x${objeto.comprimento}cm, Peso: ${objeto.peso}g -> Formato: ${formatoObjeto === '1' ? 'Envelope' : 'Caixa'}`)
      
      // Função para extrair DDD, telefone fixo e celular
      // Telefone fixo: 8 dígitos (sem o 9 inicial)
      // Celular: 9 dígitos (com o 9 inicial)
      const extrairTelefone = (telefone?: string) => {
        let numeros = telefone?.replace(/\D/g, '') || ''
        // Remover 0 inicial se tiver (0XX -> XX)
        if (numeros.startsWith('0')) {
          numeros = numeros.substring(1)
        }
        
        if (numeros.length >= 10) {
          const ddd = numeros.substring(0, 2)
          const resto = numeros.substring(2)
          
          // Se começa com 9 e tem 9 dígitos após o DDD = celular
          if (resto.length >= 9 && resto.startsWith('9')) {
            return {
              ddd: ddd,
              telefone: resto.substring(1, 9), // Remove o 9, pega 8 dígitos para telefone fixo
              celular: resto.substring(0, 9)   // Mantém o 9, pega 9 dígitos para celular
            }
          } else {
            // Telefone fixo (8 dígitos)
            return {
              ddd: ddd,
              telefone: resto.substring(0, 8),
              celular: resto.substring(0, 9) // Tenta usar como celular também
            }
          }
        }
        return { ddd: '', telefone: '', celular: '' }
      }

      const telRemetente = extrairTelefone(remetente.telefone)
      const telDestinatario = extrairTelefone(destinatario.telefone)
      
      console.log(`[CorreiosCWS] Telefone remetente: DDD=${telRemetente.ddd}, Tel=${telRemetente.telefone}, Cel=${telRemetente.celular}`)
      console.log(`[CorreiosCWS] Telefone destinatário: DDD=${telDestinatario.ddd}, Tel=${telDestinatario.telefone}, Cel=${telDestinatario.celular}`)
      
      // Payload conforme RequestPrePostagemExternaDTO (documentação oficial)
      const payload: any = {
        // Remetente (RemetenteDTO)
        remetente: {
          nome: remetente.nome.substring(0, 50),
          cpfCnpj: remetente.cnpj?.replace(/\D/g, ''),
          dddTelefone: telRemetente.ddd,
          telefone: telRemetente.telefone,
          dddCelular: telRemetente.ddd,
          celular: telRemetente.celular,
          email: remetente.email?.substring(0, 50) || '',
          endereco: {
            cep: remetente.cep?.replace(/\D/g, ''),
            logradouro: remetente.logradouro?.substring(0, 50),
            numero: remetente.numero?.substring(0, 6),
            complemento: remetente.complemento?.substring(0, 30) || '',
            bairro: remetente.bairro?.substring(0, 30),
            cidade: remetente.cidade?.substring(0, 30),
            uf: remetente.uf?.substring(0, 2).toUpperCase()
          }
        },
        
        // Destinatário (DestinatarioDTO)
        destinatario: {
          nome: destinatario.nome.substring(0, 50),
          cpfCnpj: destinatario.cpfCnpj?.replace(/\D/g, '') || '',
          dddTelefone: telDestinatario.ddd,
          telefone: telDestinatario.telefone,
          dddCelular: telDestinatario.ddd,
          celular: telDestinatario.celular,
          email: destinatario.email?.substring(0, 50) || '',
          endereco: {
            cep: destinatario.cep?.replace(/\D/g, ''),
            logradouro: destinatario.logradouro?.substring(0, 50),
            numero: destinatario.numero?.substring(0, 6),
            complemento: destinatario.complemento?.substring(0, 30) || '',
            bairro: destinatario.bairro?.substring(0, 30),
            cidade: destinatario.cidade?.substring(0, 30),
            uf: destinatario.uf?.substring(0, 2).toUpperCase(),
            regiao: this.getRegiao(destinatario.uf)
          }
        },
        
        // Código do serviço
        codigoServico: objeto.codigoServico,
        
        // Peso em gramas (string, max 6 dígitos)
        pesoInformado: String(Math.round(Math.min(objeto.peso, 999999))),
        
        // Formato: 1-Envelope, 2-Caixa/Pacote, 3-Cilindro
        codigoFormatoObjetoInformado: formatoObjeto,
        
        // Dimensões em cm (obrigatório para formato 2-Caixa)
        ...(formatoObjeto === '2' && {
          alturaInformada: String(Math.max(2, Math.min(objeto.altura, 100))),
          larguraInformada: String(Math.max(11, Math.min(objeto.largura, 100))),
          comprimentoInformado: String(Math.max(16, Math.min(objeto.comprimento, 100)))
        }),
        
        // Declaração de conteúdo (obrigatório)
        itensDeclaracaoConteudo: declaracaoConteudo?.map(item => ({
          conteudo: item.conteudo.substring(0, 60),
          quantidade: String(item.quantidade),
          valor: item.valor.toFixed(2)
        })) || [{
          conteudo: 'Mercadoria E-commerce',
          quantidade: '1',
          valor: (objeto.valorDeclarado || 50).toFixed(2)
        }],
        
        // Indica que NÃO é objeto proibido ("1" = permitido)
        cienteObjetoNaoProibido: '1',
        
        // Opcionais
        solicitarColeta: 'N',
        logisticaReversa: 'N'
      }
      
      // NOTA: O serviço adicional 019 (valor declarado) precisa estar vinculado ao contrato.
      // Se não estiver, a API retornará erro.
      // Por ora, deixamos desabilitado. Para habilitar, descomentar:
      // if (objeto.valorDeclarado && objeto.valorDeclarado > 0) {
      //   payload.listaServicoAdicional = [{
      //     codigoServicoAdicional: '019', // Valor declarado
      //     valorDeclarado: objeto.valorDeclarado.toFixed(2)
      //   }]
      // }
      
      // Adicionar NFe se informada (chave de acesso de 44 dígitos)
      if (nfe?.chave) {
        payload.chaveNFe = nfe.chave.replace(/\D/g, '') // Apenas números
        console.log(`[CorreiosCWS] NF-e vinculada: Número ${nfe.numero || 'N/A'}, Série ${nfe.serie || 'N/A'}, Chave: ${nfe.chave.substring(0, 20)}...`)
      }

      console.log('[CorreiosCWS] Criando pré-postagem:', JSON.stringify(payload, null, 2))

      // Usar v1 conforme documentação testada
      const result = await this.apiRequest('/prepostagem/v1/prepostagens', 'POST', payload)

      console.log('[CorreiosCWS] Resultado pré-postagem:', result)

      return {
        success: true,
        codigoRastreio: result.codigoObjeto,
        idPrePostagem: result.id || result.idPrePostagem
      }
    } catch (error: any) {
      console.error('[CorreiosCWS] Erro ao criar pré-postagem:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Solicitar geração de rótulo/etiqueta (fluxo assíncrono)
   * Para objetos registrados, a geração é assíncrona
   * @param idPrePostagem - ID da pré-postagem (não o código de rastreio)
   * @returns idRecibo para consultar o download
   */
  async solicitarRotulo(idPrePostagem: string): Promise<{ success: boolean; idRecibo?: string; error?: string }> {
    try {
      const token = await this.getToken()
      if (!token) {
        return { success: false, error: 'Não foi possível obter token' }
      }

      // Solicitar geração assíncrona do rótulo
      const response = await fetch(
        `${this.baseUrl}/prepostagem/v1/prepostagens/rotulo/assincrono/pdf`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            idsPrePostagem: [idPrePostagem],
            tipoRotulo: 'P',        // P=Padrão
            formatoRotulo: 'ET'     // ET=Etiqueta
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[CorreiosCWS] Erro ao solicitar rótulo:', response.status, errorText)
        return { success: false, error: `Erro ${response.status}: ${errorText}` }
      }

      const result = await response.json()
      console.log('[CorreiosCWS] Rótulo solicitado:', result)

      return {
        success: true,
        idRecibo: result.idRecibo
      }
    } catch (error: any) {
      console.error('[CorreiosCWS] Erro ao solicitar rótulo:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Baixar rótulo gerado (fluxo assíncrono)
   * @param idRecibo - ID do recibo retornado por solicitarRotulo
   * @returns PDF em Buffer
   */
  async baixarRotulo(idRecibo: string): Promise<Buffer | null> {
    try {
      const token = await this.getToken()
      if (!token) {
        return null
      }

      const response = await fetch(
        `${this.baseUrl}/prepostagem/v1/prepostagens/rotulo/download/assincrono/${idRecibo}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[CorreiosCWS] Erro ao baixar rótulo:', response.status, errorText)
        return null
      }

      // A resposta vem como JSON com o PDF em base64 no campo "dados"
      const result = await response.json()
      
      if (result.dados) {
        return Buffer.from(result.dados, 'base64')
      }

      console.error('[CorreiosCWS] Resposta sem dados do PDF:', result)
      return null
    } catch (error) {
      console.error('[CorreiosCWS] Erro ao baixar rótulo:', error)
      return null
    }
  }

  /**
   * Gerar etiqueta (PDF) para uma pré-postagem
   * Fluxo assíncrono completo: solicita + aguarda + baixa
   * @param idPrePostagem - ID da pré-postagem (retornado por criarPrePostagem)
   * @param codigoRastreio - Código de rastreio (opcional, para log)
   */
  async gerarEtiqueta(idPrePostagem: string, codigoRastreio?: string): Promise<EtiquetaResult> {
    try {
      console.log(`[CorreiosCWS] Gerando etiqueta para pré-postagem ${idPrePostagem} (${codigoRastreio || 'N/A'})`)

      // 1. Solicitar geração do rótulo
      const solicitacao = await this.solicitarRotulo(idPrePostagem)
      if (!solicitacao.success || !solicitacao.idRecibo) {
        return { success: false, error: solicitacao.error || 'Falha ao solicitar rótulo' }
      }

      console.log(`[CorreiosCWS] Rótulo solicitado, idRecibo: ${solicitacao.idRecibo}`)

      // 2. Aguardar processamento (3 segundos)
      await new Promise(resolve => setTimeout(resolve, 3000))

      // 3. Baixar o PDF
      const pdfBuffer = await this.baixarRotulo(solicitacao.idRecibo)
      if (!pdfBuffer) {
        return { success: false, error: 'Falha ao baixar rótulo PDF' }
      }

      console.log(`[CorreiosCWS] Etiqueta gerada com sucesso: ${pdfBuffer.length} bytes`)

      return {
        success: true,
        etiqueta: codigoRastreio || idPrePostagem,
        pdfBuffer,
        idRecibo: solicitacao.idRecibo
      }
    } catch (error: any) {
      console.error('[CorreiosCWS] Erro ao gerar etiqueta:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Buscar rótulo/etiqueta em PDF (método de conveniência)
   * @param idPrePostagem - ID da pré-postagem
   */
  async buscarRotuloPDF(idPrePostagem: string): Promise<Buffer | null> {
    try {
      const result = await this.gerarEtiqueta(idPrePostagem)
      return result.success ? result.pdfBuffer || null : null
    } catch (error) {
      console.error('[CorreiosCWS] Erro ao buscar rótulo:', error)
      return null
    }
  }

  /**
   * Rastrear objeto
   */
  async rastrear(codigoRastreio: string): Promise<any> {
    try {
      const result = await this.apiRequest(
        `/srorastro/v1/objetos/${codigoRastreio}?resultado=T`
      )
      return result
    } catch (error: any) {
      console.error('[CorreiosCWS] Erro ao rastrear:', error)
      return null
    }
  }

  /**
   * Rastrear objeto (alias)
   */
  async rastrearObjeto(codigoRastreio: string): Promise<{ success: boolean; eventos?: any[]; error?: string }> {
    try {
      const result = await this.apiRequest(
        `/srorastro/v1/objetos/${codigoRastreio}?resultado=T`
      )
      
      if (result?.objetos?.[0]?.eventos) {
        return {
          success: true,
          eventos: result.objetos[0].eventos
        }
      }
      
      return { success: true, eventos: [] }
    } catch (error: any) {
      console.error('[CorreiosCWS] Erro ao rastrear:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Atualizar pré-postagem existente
   * @param idPrePostagem - ID da pré-postagem
   * @param dados - Novos dados para atualização
   */
  async atualizarPrePostagem(
    idPrePostagem: string,
    dados: {
      destinatario?: {
        nome?: string
        cpfCnpj?: string
        logradouro?: string
        numero?: string
        complemento?: string
        bairro?: string
        cidade?: string
        uf?: string
        cep?: string
        telefone?: string
        email?: string
      }
      peso?: number
      altura?: number
      largura?: number
      comprimento?: number
      nfe?: { chave: string; numero?: string; serie?: string }
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const payload: any = {}

      // Função para extrair DDD, telefone fixo e celular
      const extrairTelefone = (telefone?: string) => {
        let numeros = telefone?.replace(/\D/g, '') || ''
        if (numeros.startsWith('0')) {
          numeros = numeros.substring(1)
        }
        
        if (numeros.length >= 10) {
          const ddd = numeros.substring(0, 2)
          const resto = numeros.substring(2)
          
          if (resto.length >= 9 && resto.startsWith('9')) {
            return {
              ddd: ddd,
              telefone: resto.substring(1, 9),
              celular: resto.substring(0, 9)
            }
          } else {
            return {
              ddd: ddd,
              telefone: resto.substring(0, 8),
              celular: resto.substring(0, 9)
            }
          }
        }
        return { ddd: '', telefone: '', celular: '' }
      }

      if (dados.destinatario) {
        const telDestinatario = extrairTelefone(dados.destinatario.telefone)
        
        payload.destinatario = {
          nome: dados.destinatario.nome?.substring(0, 50),
          cpfCnpj: dados.destinatario.cpfCnpj?.replace(/\D/g, ''),
          dddTelefone: telDestinatario.ddd,
          telefone: telDestinatario.telefone,
          dddCelular: telDestinatario.ddd,
          celular: telDestinatario.celular,
          email: dados.destinatario.email?.substring(0, 50) || '',
          endereco: {
            cep: dados.destinatario.cep?.replace(/\D/g, ''),
            logradouro: dados.destinatario.logradouro?.substring(0, 50),
            numero: dados.destinatario.numero?.substring(0, 6),
            complemento: dados.destinatario.complemento?.substring(0, 30) || '',
            bairro: dados.destinatario.bairro?.substring(0, 30),
            cidade: dados.destinatario.cidade?.substring(0, 30),
            uf: dados.destinatario.uf?.substring(0, 2).toUpperCase(),
            regiao: this.getRegiao(dados.destinatario.uf || '')
          }
        }
      }

      if (dados.peso) {
        payload.pesoInformado = String(Math.round(Math.min(dados.peso, 999999)))
      }

      if (dados.altura || dados.largura || dados.comprimento) {
        payload.alturaInformada = String(Math.max(2, Math.min(dados.altura || 2, 100)))
        payload.larguraInformada = String(Math.max(11, Math.min(dados.largura || 11, 100)))
        payload.comprimentoInformado = String(Math.max(16, Math.min(dados.comprimento || 16, 100)))
      }

      if (dados.nfe?.chave) {
        payload.chaveNFe = dados.nfe.chave.replace(/\D/g, '')
      }

      console.log('[CorreiosCWS] Atualizando pré-postagem:', idPrePostagem, JSON.stringify(payload, null, 2))

      await this.apiRequest(`/prepostagem/v1/prepostagens/${idPrePostagem}`, 'PUT', payload)

      return { success: true }
    } catch (error: any) {
      console.error('[CorreiosCWS] Erro ao atualizar pré-postagem:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Cancelar pré-postagem
   * @param idPrePostagem - ID da pré-postagem a ser cancelada
   */
  async cancelarPrePostagem(idPrePostagem: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[CorreiosCWS] Cancelando pré-postagem:', idPrePostagem)

      await this.apiRequest(`/prepostagem/v1/prepostagens/${idPrePostagem}`, 'DELETE')

      console.log('[CorreiosCWS] Pré-postagem cancelada com sucesso')
      return { success: true }
    } catch (error: any) {
      console.error('[CorreiosCWS] Erro ao cancelar pré-postagem:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Testar conexão com a API
   */
  async testarConexao(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const token = await this.getToken()
      if (!token) {
        return { success: false, message: 'Não foi possível obter token de autenticação' }
      }

      return { 
        success: true, 
        message: 'Conexão com API dos Correios estabelecida com sucesso!',
        data: {
          tokenObtido: true,
          expiraEm: cachedToken?.expiraEm
        }
      }
    } catch (error: any) {
      return { success: false, message: error.message }
    }
  }
}

// Exportar instância única
export const correiosCWS = new CorreiosCWSService()
export { CorreiosCWSService }
