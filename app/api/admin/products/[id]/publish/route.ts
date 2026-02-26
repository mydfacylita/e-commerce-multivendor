import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatMLErrors } from '@/lib/mercadolivre'
import { withAuth } from '@/lib/api-middleware'
import { sanitizeHtml } from '@/lib/validation'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Valida CUID (formato usado pelo Prisma)
function isValidProductId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  // CUID: começa com 'c' e tem 24-32 caracteres alfanuméricos
  return /^c[a-z0-9]{20,31}$/i.test(id)
}

export const POST = withAuth(
  async (request: NextRequest, { session }) => {
    try {
      const params = await getParams(request)
      const productId = params.id
      
      // ===== VALIDAÇÃO DE PRODUCT ID =====
      if (!isValidProductId(productId)) {
        return NextResponse.json(
          { message: 'ID de produto inválido' },
          { status: 400 }
        )
      }

      // ===== PARSING DE DADOS =====
      let data
      try {
        data = await request.json()
      } catch (error) {
        return NextResponse.json(
          { message: 'JSON inválido' },
          { status: 400 }
        )
      }

      const marketplace = sanitizeHtml(data.marketplace || '')
      // Novos parâmetros do modal inteligente
      const mlCategoryId = data.mlCategoryId ? sanitizeHtml(data.mlCategoryId) : null
      const catalogProductId = data.catalogProductId ? sanitizeHtml(data.catalogProductId) : null

      if (!marketplace || !['mercadolivre', 'shopee'].includes(marketplace)) {
        return NextResponse.json(
          { message: 'Marketplace inválido ou não especificado' },
          { status: 400 }
        )
      }

      // ===== BUSCA DO PRODUTO =====
      const product = await prisma.product.findUnique({
        where: { id: productId },
      include: {
        category: true,
        supplier: true,
        marketplaceListings: true
      }
    })

    if (!product) {
      return NextResponse.json(
        { message: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    // Verifica se já está publicado neste marketplace
    const existingListing = product.marketplaceListings.find(
      l => l.marketplace === marketplace
    )

    if (existingListing) {
      return NextResponse.json(
        { message: 'Produto já está publicado neste marketplace' },
        { status: 400 }
      )
    }

    // Valida requisitos por marketplace
    if (marketplace === 'mercadolivre') {
      const validationResult = await validateForMercadoLivre(product)
      if (!validationResult.valid) {
        return NextResponse.json(
          { message: validationResult.message },
          { status: 400 }
        )
      }

      // Publica no Mercado Livre - passa categoria e catálogo do modal
      console.log('[ML API] Categoria do modal:', mlCategoryId)
      console.log('[ML API] Catálogo do modal:', catalogProductId)
      
      const mlResult = await publishToMercadoLivre(product, { mlCategoryId, catalogProductId })
      
      if (!mlResult.success) {
        console.error('[ML API] Erro ao publicar:', mlResult.message)
        console.error('[ML API] Causa:', mlResult.cause)
        return NextResponse.json(
          { 
            message: mlResult.message,
            cause: mlResult.cause,
            details: mlResult.details
          },
          { status: 400 }
        )
      }

      // Salva a listagem no banco
      await prisma.marketplaceListing.create({
        data: {
          productId: product.id,
          marketplace: 'mercadolivre',
          listingId: mlResult.listingId!,
          status: mlResult.status!,
          title: mlResult.title,
          price: product.price,
          stock: product.stock,
          listingUrl: mlResult.listingUrl,
          lastSyncAt: new Date(),
          syncEnabled: true,
        }
      })

      return NextResponse.json({
        message: 'Produto publicado com sucesso no Mercado Livre',
        listingId: mlResult.listingId,
        listingUrl: mlResult.listingUrl
      })
    }

    if (marketplace === 'shopee') {
      return NextResponse.json(
        { message: 'Integração com Shopee em desenvolvimento' },
        { status: 501 }
      )
    }

      return NextResponse.json(
        { message: 'Marketplace não suportado' },
        { status: 400 }
      )
    } catch (error) {
      console.error('[Publish] Erro:', error)
      return NextResponse.json(
        { message: 'Erro ao publicar produto', error: String(error) },
        { status: 500 }
      )
    }
  },
  { 
    requireAdmin: true,
    rateLimit: { maxRequests: 20, windowMs: 60000 }
  }
)

// Helper para extrair params do Next.js App Router
async function getParams(request: NextRequest) {
  const url = new URL(request.url)
  const pathParts = url.pathname.split('/')
  const id = pathParts[pathParts.length - 2] // ID está antes de 'publish'
  return { id }
}

async function validateForMercadoLivre(product: any) {
  const errors: string[] = []

  // GTIN não é mais obrigatório - ML permite produtos sem código universal

  if (!product.brand) {
    errors.push('Marca é obrigatória')
  }

  if (!product.images || product.images.length === 0) {
    errors.push('Pelo menos uma imagem é obrigatória')
  }

  if (!product.description) {
    errors.push('Descrição é obrigatória')
  }

  if (product.price <= 0) {
    errors.push('Preço deve ser maior que zero')
  }

  if (errors.length > 0) {
    return {
      valid: false,
      message: 'Validação falhou: ' + errors.join(', ')
    }
  }

  return { valid: true }
}

async function publishToMercadoLivre(
  product: any, 
  options?: { mlCategoryId?: string | null; catalogProductId?: string | null }
) {
  const { mlCategoryId, catalogProductId } = options || {}
  try {
    // Helper para fazer fetch com retry e timeout maior
    const fetchWithRetry = async (url: string, options: any, maxRetries = 3) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout
          
          const response = await fetch(url, {
            ...options,
            signal: controller.signal
          })
          
          clearTimeout(timeout)
          return response
        } catch (error: any) {
          const isLastAttempt = i === maxRetries - 1
          if (isLastAttempt) throw error
          
          const waitTime = Math.pow(2, i) * 1000 // Exponential backoff: 1s, 2s, 4s
          console.log(`[ML Publish] Tentativa ${i + 1} falhou, aguardando ${waitTime}ms...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
      throw new Error('Max retries reached')
    }
    
    // Função para validar e limpar GTIN/EAN
    const cleanAndValidateGTIN = (gtin: string | null | undefined): string | null => {
      if (!gtin) return null
      
      // Remove espaços, traços e outros caracteres
      const cleaned = gtin.replace(/[\s\-]/g, '').trim()
      
      // Verifica se é numérico
      if (!/^\d+$/.test(cleaned)) {
        console.log('[ML Publish] ⚠️ GTIN contém caracteres não numéricos:', gtin)
        return null
      }
      
      // GTIN deve ter 8, 12, 13 ou 14 dígitos
      if (![8, 12, 13, 14].includes(cleaned.length)) {
        console.log('[ML Publish] ⚠️ GTIN com tamanho inválido:', cleaned.length, 'dígitos')
        
        // Se for ISBN-10 (10 dígitos), converte para ISBN-13
        if (cleaned.length === 10) {
          const isbn13 = '978' + cleaned.substring(0, 9)
          // Calcula dígito verificador
          let sum = 0
          for (let i = 0; i < 12; i++) {
            sum += parseInt(isbn13[i]) * (i % 2 === 0 ? 1 : 3)
          }
          const checkDigit = (10 - (sum % 10)) % 10
          const result = isbn13 + checkDigit
          console.log('[ML Publish] ✅ ISBN-10 convertido para ISBN-13:', cleaned, '→', result)
          return result
        }
        
        return null
      }
      
      // Valida dígito verificador para GTIN-13
      if (cleaned.length === 13) {
        let sum = 0
        for (let i = 0; i < 12; i++) {
          sum += parseInt(cleaned[i]) * (i % 2 === 0 ? 1 : 3)
        }
        const checkDigit = (10 - (sum % 10)) % 10
        const providedCheckDigit = parseInt(cleaned[12])
        
        if (checkDigit !== providedCheckDigit) {
          console.log('[ML Publish] ⚠️ GTIN com dígito verificador inválido')
          console.log('[ML Publish]    Esperado:', checkDigit, 'Recebido:', providedCheckDigit)
          // NÃO corrige automaticamente — usar o original conforme cadastrado pelo usuário
          // Corrigir geraria um ISBN diferente que pode mapear para outro produto
          console.log('[ML Publish] ⚠️ Usando GTIN original sem correção para evitar mapeamento errado')
          return cleaned
        }
      }
      
      console.log('[ML Publish] ✅ GTIN válido:', cleaned)
      return cleaned
    }
    
    // Busca credenciais do Mercado Livre
    const mlAuth = await prisma.mercadoLivreAuth.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (!mlAuth) {
      return {
        success: false,
        message: 'Conta do Mercado Livre não conectada'
      }
    }

    // Verifica se o token expirou
    const now = new Date()
    let accessToken = mlAuth.accessToken

    if (mlAuth.expiresAt && now >= mlAuth.expiresAt) {
      console.log('[ML Publish] Token expirado, renovando...')
      
      // Busca credenciais
      const credentials = await (prisma as any).mercadoLivreCredentials.findFirst()
      
      if (!credentials || !mlAuth.refreshToken) {
        return {
          success: false,
          message: 'Token expirado. Por favor, reconecte sua conta do Mercado Livre'
        }
      }

      // Renova o token
      const refreshResponse = await fetchWithRetry('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          refresh_token: mlAuth.refreshToken,
        }),
      })

      if (!refreshResponse.ok) {
        console.error('[ML Publish] Erro ao renovar token:', await refreshResponse.text())
        return {
          success: false,
          message: 'Erro ao renovar token. Por favor, reconecte sua conta do Mercado Livre'
        }
      }

      const refreshData = await refreshResponse.json()
      
      // Atualiza o token no banco
      const newExpiresAt = new Date()
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshData.expires_in)

      await prisma.mercadoLivreAuth.update({
        where: { id: mlAuth.id },
        data: {
          accessToken: refreshData.access_token,
          refreshToken: refreshData.refresh_token,
          expiresAt: newExpiresAt,
        }
      })

      accessToken = refreshData.access_token
      console.log('[ML Publish] Token renovado com sucesso')
    }

    // Prepara as imagens
    let images: string[] = []
    try {
      images = Array.isArray(product.images) 
        ? product.images 
        : JSON.parse(product.images)
    } catch (e) {
      console.error('[ML Publish] Erro ao parsear imagens:', e)
      images = []
    }

    // Valida e filtra imagens válidas
    const validImages = images.filter((url: string) => {
      if (!url || typeof url !== 'string') return false
      return url.startsWith('http://') || url.startsWith('https://')
    })

    if (validImages.length === 0) {
      console.warn('[ML Publish] ⚠️ Nenhuma imagem válida encontrada!')
    }

    const pictures = validImages.map((url: string) => ({ source: url }))
    console.log(`[ML Publish] ${pictures.length} imagens preparadas para publicação`)

    // Parse das especificações técnicas
    let specs: any = {}
    let productType = ''
    try {
      if (product.specifications) {
        specs = typeof product.specifications === 'string' 
          ? JSON.parse(product.specifications) 
          : product.specifications
      }
      if (product.technicalSpecs) {
        const techSpecs = typeof product.technicalSpecs === 'string'
          ? JSON.parse(product.technicalSpecs)
          : product.technicalSpecs
        specs = { ...specs, ...techSpecs }
        productType = techSpecs.product_type || ''
      }
    } catch (e) {
      console.error('[ML Publish] Erro ao parsear especificações:', e)
    }

    console.log('[ML Publish] Tipo de produto:', productType)

    // PRIORIDADE 1: Categoria selecionada no modal
    // PRIORIDADE 2: Categoria salva no produto (specs.ml_category_id)
    // PRIORIDADE 3: Predição automática
    let categoryId = mlCategoryId || specs.ml_category_id || 'MLB263532'
    
    if (mlCategoryId) {
      console.log('[ML Publish] ✅ Usando categoria selecionada no modal:', mlCategoryId)
    } else if (!specs.ml_category_id) {
      console.log('[ML Publish] Categoria não especificada, usando predição...')
      try {
      // Monta termo de busca inteligente baseado no tipo e dados do produto
      const searchTerms: string[] = []
      
      // Adiciona o tipo traduzido
      const typeTranslations: Record<string, string> = {
        'celular': 'smartphone celular',
        'smartphone': 'smartphone celular',
        'notebook': 'notebook computador',
        'laptop': 'notebook laptop',
        'tablet': 'tablet',
        'relogio': 'relógio inteligente smartwatch',
        'smartwatch': 'smartwatch relógio inteligente',
        'fone': 'fone ouvido',
        'headset': 'fone ouvido headset',
        'camera': 'câmera fotográfica',
      }
      
      if (productType && typeTranslations[productType.toLowerCase()]) {
        searchTerms.push(typeTranslations[productType.toLowerCase()])
      }
      
      if (product.brand) searchTerms.push(product.brand)
      if (product.model) searchTerms.push(product.model)
      
      const searchTerm = searchTerms.join(' ').trim() || product.name
      
      console.log('[ML Publish] Buscando categoria com termo:', searchTerm)
      
      // Usa domain_discovery conforme documentação (mais preciso que category_predictor)
      const domainResponse = await fetchWithRetry(
        `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?limit=1&q=${encodeURIComponent(searchTerm)}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      
      if (domainResponse.ok) {
        const domains = await domainResponse.json()
        if (domains && domains.length > 0 && domains[0].category_id) {
          categoryId = domains[0].category_id
          console.log('[ML Publish] ✅ Categoria descoberta via domain_discovery:')
          console.log('  - Domain:', domains[0].domain_name)
          console.log('  - Category ID:', categoryId)
          console.log('  - Category Name:', domains[0].category_name)
        } else {
          console.log('[ML Publish] ⚠️  Domain discovery retornou vazio')
          categoryId = 'MLB263532' // Fallback
        }
      } else {
        const errorText = await domainResponse.text()
        console.log('[ML Publish] ⚠️  Domain discovery falhou:', domainResponse.status, errorText)
        categoryId = 'MLB263532' // Fallback
      }
    } catch (e) {
      console.log('[ML Publish] ⚠️  Erro no domain discovery:', e)
      categoryId = 'MLB263532' // Fallback
    }
    } else {
      console.log('[ML Publish] ✅ Usando categoria salva no produto:', categoryId)
    }
    
    console.log('[ML Publish] Categoria final:', categoryId)
    
    // DEBUG: Consultar configuração da categoria no ML
    let categoryCatalogDomain: string | null = null
    try {
      const catDebugResp = await fetchWithRetry(
        `https://api.mercadolibre.com/categories/${categoryId}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      )
      if (catDebugResp.ok) {
        const catDebug = await catDebugResp.json()
        categoryCatalogDomain = catDebug.settings?.catalog_domain || null
        console.log('[ML Publish] ===== DEBUG CATEGORIA =====')
        console.log('[ML Publish] Nome:', catDebug.name)
        console.log('[ML Publish] listing_strategy:', catDebug.settings?.listing_strategy || 'não definido')
        console.log('[ML Publish] catalog_domain:', categoryCatalogDomain || 'não tem')
        console.log('[ML Publish] listing_allowed:', catDebug.settings?.listing_allowed)
        console.log('[ML Publish] ===========================')
      }
    } catch (e) {
      console.log('[ML Publish] Erro ao debug categoria:', e)
    }
    
    const finalCatalogProductId: string | null = catalogProductId || null

    if (finalCatalogProductId) {
      console.log('[ML Publish] Catálogo selecionado no modal:', finalCatalogProductId)
    } else {
      console.log('[ML Publish] Publicando como anúncio normal (sem catálogo)')
    }
    
    // Busca os atributos permitidos para esta categoria
    console.log('[ML Publish] Buscando atributos da categoria', categoryId)
    let categoryAttributes: any[] = []
    let bookGenreValues: any[] = []
    
    try {
      const attrResponse = await fetchWithRetry(
        `https://api.mercadolibre.com/categories/${categoryId}/attributes`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      )
      
      if (attrResponse.ok) {
        categoryAttributes = await attrResponse.json()
        console.log('[ML Publish] ✅ Encontrados', categoryAttributes.length, 'atributos permitidos na categoria')
        
        // Identifica atributos OBRIGATÓRIOS da categoria
        const requiredAttrs = categoryAttributes.filter((a: any) => 
          a.tags?.required || a.relevance === 1 || a.attribute_group_id === 'MAIN'
        )
        if (requiredAttrs.length > 0) {
          console.log('[ML Publish] ⚠️ ATRIBUTOS OBRIGATÓRIOS da categoria:')
          requiredAttrs.forEach((a: any) => {
            console.log(`   - ${a.id}: ${a.name} (${a.value_type})`)
          })
        }
        
        console.log('[ML Publish] IDs de atributos:', categoryAttributes.map((a: any) => a.id).join(', '))
        
        // Busca valores permitidos para BOOK_GENRE
        const bookGenreAttr = categoryAttributes.find((attr: any) => attr.id === 'BOOK_GENRE')
        if (bookGenreAttr && bookGenreAttr.values) {
          bookGenreValues = bookGenreAttr.values
          console.log('[ML Publish] ✅ Valores permitidos para BOOK_GENRE:')
          bookGenreValues.forEach((v: any) => {
            console.log(`   - ${v.name} (ID: ${v.id})`)
          })
        }
      }
    } catch (e) {
      console.log('[ML Publish] ⚠️ Erro ao buscar atributos da categoria:', e)
    }
    
    // Monta os atributos mapeando especificações para IDs do ML
    const attributes = []
    
    // Log detalhado dos campos do produto antes de montar atributos
    console.log('[ML Publish] ===== DADOS DO PRODUTO =====')
    console.log('[ML Publish] ID:', product.id)
    console.log('[ML Publish] Nome:', product.name)
    console.log('[ML Publish] GTIN:', product.gtin, '(tipo:', typeof product.gtin, ')')
    console.log('[ML Publish] Brand:', product.brand)
    console.log('[ML Publish] Model:', product.model)
    console.log('[ML Publish] Color:', product.color)
    console.log('[ML Publish] Book Title:', product.bookTitle)
    console.log('[ML Publish] Book Author:', product.bookAuthor)
    console.log('[ML Publish] Book Genre:', product.bookGenre)
    console.log('[ML Publish] Book Publisher:', product.bookPublisher)
    console.log('[ML Publish] Book ISBN:', product.bookIsbn)
    console.log('[ML Publish] ============================')
    
    // GTIN - obrigatório para livros e eletrônicos
    const validGtin = cleanAndValidateGTIN(product.gtin)
    if (validGtin) {
      attributes.push({ id: 'GTIN', value_name: validGtin })
      console.log('[ML Publish] ✅ GTIN adicionado:', validGtin)
    } else {
      console.log('[ML Publish] ❌ GTIN NÃO ENCONTRADO OU INVÁLIDO!')
      if (product.gtin) {
        console.log('[ML Publish]    Valor original:', product.gtin)
      }
    }
    
    if (product.brand) {
      attributes.push({ id: 'BRAND', value_name: product.brand })
      attributes.push({ id: 'MANUFACTURER', value_name: product.brand })
    }
    
    // FAMILY_NAME / LINE - Linha/Família do produto (obrigatório para algumas categorias como smartwatches)
    // O ML chama de "family_name" no erro mas o ID do atributo é "LINE"
    // Usa o modelo, ou extrai do nome do produto
    let familyName = product.model || ''
    if (!familyName) {
      // Tenta extrair família do nome do produto (ex: "Fone Bluetooth TWS i12" -> "i12")
      const nameWords = product.name.split(' ')
      // Busca por palavras que parecem ser modelo/família (letras + números)
      const modelPattern = nameWords.find((w: string) => /^[A-Za-z]+\d+.*$/.test(w) || /^\d+[A-Za-z]+.*$/.test(w))
      if (modelPattern) {
        familyName = modelPattern
      } else {
        // Usa as últimas 2 palavras significativas do nome
        familyName = nameWords.slice(-2).join(' ')
      }
    }
    if (familyName) {
      // LINE é o atributo correto para família/linha do produto
      // FAMILY_NAME não é um ID de atributo válido no ML — só existe como campo do body
      attributes.push({ id: 'LINE', value_name: familyName })
      console.log('[ML Publish] ✅ LINE adicionado:', familyName)
    }
    
    if (product.model) {
      attributes.push({ id: 'MODEL', value_name: product.model })
      // ML usa ALPHANUMERIC_MODELS (plural) — singular é inválido e causa body.invalid_fields
      attributes.push({ id: 'ALPHANUMERIC_MODELS', value_name: product.model })
    }
    
    if (product.color) {
      attributes.push({ id: 'COLOR', value_name: product.color })
    }

    // ===== CAMPOS DE LIVROS (MLB437616 e similares) =====
    console.log('[ML Publish] ===== PROCESSANDO CAMPOS DE LIVRO =====')
    
    // GTIN já foi adicionado acima, mas vamos garantir para livros
    const hasGtin = attributes.find(attr => attr.id === 'GTIN')
    if (!hasGtin) {
      console.log('[ML Publish] ⚠️ GTIN não foi adicionado anteriormente, tentando adicionar agora...')
      if (product.gtin && product.gtin.trim()) {
        attributes.push({ id: 'GTIN', value_name: product.gtin.trim() })
        console.log('[ML Publish] ✅ GTIN adicionado para livro:', product.gtin.trim())
      } else {
        console.log('[ML Publish] ❌ IMPOSSÍVEL adicionar GTIN - campo vazio no produto!')
      }
    } else {
      console.log('[ML Publish] ✅ GTIN já está nos atributos')
    }
    
    if (product.bookTitle && product.bookTitle.trim()) {
      attributes.push({ id: 'BOOK_TITLE', value_name: product.bookTitle.trim() })
      console.log('[ML Publish] ✅ BOOK_TITLE adicionado:', product.bookTitle.trim())
    } else {
      console.log('[ML Publish] ⚠️ BOOK_TITLE vazio!')
    }
    
    if (product.bookAuthor && product.bookAuthor.trim()) {
      attributes.push({ id: 'AUTHOR', value_name: product.bookAuthor.trim() })
      console.log('[ML Publish] ✅ AUTHOR adicionado:', product.bookAuthor.trim())
    } else {
      console.log('[ML Publish] ⚠️ AUTHOR vazio!')
    }
    
    // BOOK_GENRE: ML usa valores pré-definidos. Tenta buscar dinamicamente ou usa fallback
    if (product.bookGenre) {
      let genreId = null
      
      // Se temos os valores da API, busca o ID correto
      if (bookGenreValues.length > 0) {
        // Busca por correspondência exata ou parcial (case-insensitive)
        const normalizedGenre = product.bookGenre.toLowerCase().trim()
        const match = bookGenreValues.find((v: any) => 
          v.name.toLowerCase() === normalizedGenre ||
          v.name.toLowerCase().includes(normalizedGenre) ||
          normalizedGenre.includes(v.name.toLowerCase())
        )
        
        if (match) {
          genreId = match.id
          console.log('[ML Publish] ✅ BOOK_GENRE encontrado na API:', product.bookGenre, '→', match.name, '(ID:', genreId, ')')
        }
      }
      
      // Se não encontrou na API, usa mapeamento manual (fallback)
      if (!genreId) {
        const genreMapping: Record<string, string> = {
          'biografia': '15549126',
          'romance': '15549127',
          'ficção': '15549128',
          'autoajuda': '15549129',
          'história': '15549130',
          'infantil': '15549131',
          'técnico': '15549132',
          'didático': '15549133',
          'religioso': '15549134',
          'poesia': '15549135',
          'aventura': '15549136',
          'terror': '15549137',
          'suspense': '15549138',
          'policial': '15549139',
          'fantasia': '15549140',
          'ficção científica': '15549141',
          'hq': '15549142',
          'quadrinhos': '15549142',
          'culinária': '15549143',
          'arte': '15549144',
        }
        
        genreId = genreMapping[product.bookGenre.toLowerCase().trim()]
        
        if (genreId) {
          console.log('[ML Publish] ✅ BOOK_GENRE mapeado manualmente:', product.bookGenre, '→', genreId)
        } else {
          console.log('[ML Publish] ⚠️ Gênero não encontrado, usando primeiro valor disponível ou "Outros"')
          // Usa o primeiro valor disponível ou um ID genérico
          genreId = bookGenreValues.length > 0 ? bookGenreValues[0].id : '15549145'
        }
      }
      
      attributes.push({ id: 'BOOK_GENRE', value_id: genreId })
    }
    
    if (product.bookPublisher && product.bookPublisher.trim()) {
      attributes.push({ id: 'PUBLISHER', value_name: product.bookPublisher.trim() })
      console.log('[ML Publish] ✅ PUBLISHER adicionado:', product.bookPublisher.trim())
    } else {
      console.log('[ML Publish] ⚠️ PUBLISHER vazio!')
    }
    
    if (product.bookIsbn && product.bookIsbn.trim()) {
      attributes.push({ id: 'ISBN', value_name: product.bookIsbn.trim() })
      console.log('[ML Publish] ✅ ISBN adicionado:', product.bookIsbn.trim())
    } else {
      console.log('[ML Publish] ⚠️ ISBN vazio (opcional)')
    }
    
    console.log('[ML Publish] ===== FIM CAMPOS DE LIVRO =====')

    // Helper: normaliza chave de atributo → lowercase, sem acentos, underscores, sem chars especiais
    const normalizeAttrKey = (k: string): string =>
      k.toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')

    // Mapeia especificações técnicas e atributos personalizados para IDs do Mercado Livre
    // Chaves já estão normalizadas (lowercase, sem acentos, underscores)
    // Valor pode ser string (ID único) ou string[] (múltiplos IDs possíveis para categorias distintas)
    // O filtro allowedIds da categoria eliminará automaticamente os IDs inválidos
    const specMapping: Record<string, string | string[]> = {

      // ─── GERAL / UNIVERSAL ────────────────────────────────────────────────
      'cor':                          'COLOR',
      'color':                        'COLOR',
      'colour':                       'COLOR',
      'cor_principal':                'COLOR',
      'main_color':                   'COLOR',

      'marca':                        'BRAND',
      'brand':                        'BRAND',
      'fabricante':                   'BRAND',
      'manufacturer':                 'BRAND',

      'modelo':                       'MODEL',
      'model':                        'MODEL',

      'linha':                        'LINE',
      'line':                         'LINE',
      'familia':                      'LINE',
      'family':                       'LINE',
      'linha_do_produto':             'LINE',
      'familia_do_produto':           'LINE',

      'garantia':                     'WARRANTY_TYPE',
      'warranty':                     'WARRANTY_TYPE',
      'tipo_de_garantia':             'WARRANTY_TYPE',
      'prazo_garantia':               'WARRANTY_TYPE',

      'modelo_alfanumerico':          'ALPHANUMERIC_MODELS',
      'alphanumeric_model':           'ALPHANUMERIC_MODELS',
      'codigo_modelo':                'ALPHANUMERIC_MODELS',
      'part_number':                  'ALPHANUMERIC_MODELS',
      'cod_modelo':                   'ALPHANUMERIC_MODELS',
      'sku_fabricante':               'ALPHANUMERIC_MODELS',

      'material':                     'MATERIAL',
      'material_principal':           'MATERIAL',
      'composicao':                   'MATERIAL',
      'composition':                  'MATERIAL',

      'tipo':                         'TYPE',
      'type':                         'TYPE',

      // ─── DIMENSÕES / EMBALAGEM ────────────────────────────────────────────
      'largura':                      'TOTAL_WIDTH',
      'width':                        'TOTAL_WIDTH',
      'largura_total':                'TOTAL_WIDTH',
      'total_width':                  'TOTAL_WIDTH',

      'altura':                       'TOTAL_HEIGHT',
      'height':                       'TOTAL_HEIGHT',
      'altura_total':                 'TOTAL_HEIGHT',
      'total_height':                 'TOTAL_HEIGHT',

      'comprimento':                  'TOTAL_LENGTH',
      'length':                       'TOTAL_LENGTH',
      'comprimento_total':            'TOTAL_LENGTH',
      'total_length':                 'TOTAL_LENGTH',

      'profundidade':                 'TOTAL_DEPTH',
      'depth':                        'TOTAL_DEPTH',

      'espessura':                    'THICKNESS',
      'thickness':                    'THICKNESS',

      'diametro':                     'TOTAL_DIAMETER',
      'diameter':                     'TOTAL_DIAMETER',
      'diametro_total':               'TOTAL_DIAMETER',
      'total_diameter':               'TOTAL_DIAMETER',

      'peso':                         'PACKAGE_WEIGHT',
      'weight':                       'PACKAGE_WEIGHT',
      'peso_embalagem':               'PACKAGE_WEIGHT',
      'package_weight':               'PACKAGE_WEIGHT',

      'peso_liquido':                 'NET_WEIGHT',
      'net_weight':                   'NET_WEIGHT',

      'altura_embalagem':             'PACKAGE_HEIGHT',
      'package_height':               'PACKAGE_HEIGHT',
      'largura_embalagem':            'PACKAGE_WIDTH',
      'package_width':                'PACKAGE_WIDTH',
      'comprimento_embalagem':        'PACKAGE_LENGTH',
      'package_length':               'PACKAGE_LENGTH',

      // ─── ELÉTRICA ──────────────────────────────────────────────────────────
      'voltagem':                     'VOLTAGE',
      'voltage':                      'VOLTAGE',
      'tensao':                       'VOLTAGE',
      'volts':                        'VOLTAGE',
      'bivolt':                       'VOLTAGE',

      'potencia':                     'POWER',
      'power':                        'POWER',
      'watts':                        'POWER',
      'watt':                         'POWER',

      'eficiencia_energetica':        'ENERGY_EFFICIENCY',
      'energy_efficiency':            'ENERGY_EFFICIENCY',
      'consumo':                      'ENERGY_EFFICIENCY',
      'classe_energetica':            'ENERGY_EFFICIENCY',

      // ─── CONECTIVIDADE ─────────────────────────────────────────────────────
      'conectividade':                'CONNECTIVITY',
      'connectivity':                 'CONNECTIVITY',
      'conexao':                      'CONNECTIVITY',
      'tipo_conexao':                 'CONNECTIVITY',
      'interface':                    'CONNECTIVITY',

      'wifi':                         'WITH_WI_FI',
      'wi_fi':                        'WITH_WI_FI',
      'com_wifi':                     'WITH_WI_FI',
      'tem_wifi':                     'WITH_WI_FI',
      'with_wi_fi':                   'WITH_WI_FI',
      'wireless':                     'WITH_WI_FI',

      'bluetooth':                    'WITH_BLUETOOTH',
      'com_bluetooth':                'WITH_BLUETOOTH',
      'tem_bluetooth':                'WITH_BLUETOOTH',

      'portas_hdmi':                  'HDMI_PORTS',
      'hdmi_ports':                   'HDMI_PORTS',
      'quantidade_hdmi':              'HDMI_PORTS',
      'hdmi':                         'HDMI_PORTS',

      'portas_usb':                   'USB_PORTS',
      'usb_ports':                    'USB_PORTS',
      'quantidade_usb':               'USB_PORTS',

      'com_usb':                      'WITH_USB',
      'with_usb':                     'WITH_USB',
      'tem_usb':                      'WITH_USB',
      'carregamento_usb':             'WITH_USB',

      // ─── NOTEBOOKS / LAPTOPS / PCS ─────────────────────────────────────────
      // IDs válidos para notebooks ML: PROCESSOR_MODEL e CPU_MODEL (depende da categoria)
      'processador':                  ['PROCESSOR_MODEL', 'CPU_MODEL'],
      'processor':                    ['PROCESSOR_MODEL', 'CPU_MODEL'],
      'cpu':                          ['PROCESSOR_MODEL', 'CPU_MODEL'],
      'cpu_model':                    ['PROCESSOR_MODEL', 'CPU_MODEL'],
      'modelo_do_processador':        ['PROCESSOR_MODEL', 'CPU_MODEL'],
      'chip':                         ['PROCESSOR_MODEL', 'CPU_MODEL'],
      'chipset':                      ['PROCESSOR_MODEL', 'CPU_MODEL'],

      'marca_do_processador':         ['PROCESSOR_BRAND', 'CPU_BRAND'],
      'marca_processador':            ['PROCESSOR_BRAND', 'CPU_BRAND'],
      'cpu_brand':                    ['PROCESSOR_BRAND', 'CPU_BRAND'],
      'processor_brand':              ['PROCESSOR_BRAND', 'CPU_BRAND'],
      'fabricante_processador':       ['PROCESSOR_BRAND', 'CPU_BRAND'],

      // PROCESSOR_LINE = linha do processador (ex: Celeron, Core i5) - diferente de LINE (familia do produto)
      'linha_do_processador':         'PROCESSOR_LINE',
      'linha_processador':            'PROCESSOR_LINE',

      // DISPLAY_SIZE = tamanho da tela para notebooks/monitores, SCREEN_SIZE para outros
      'tamanho_da_tela':              ['DISPLAY_SIZE', 'SCREEN_SIZE'],
      'tamanho_de_tela':              ['DISPLAY_SIZE', 'SCREEN_SIZE'],
      'screen_size':                  ['DISPLAY_SIZE', 'SCREEN_SIZE'],
      'tela':                         ['DISPLAY_SIZE', 'SCREEN_SIZE'],
      'display':                      ['DISPLAY_SIZE', 'SCREEN_SIZE'],
      'tamanho_display':              ['DISPLAY_SIZE', 'SCREEN_SIZE'],
      'tamanho_do_monitor':           ['DISPLAY_SIZE', 'SCREEN_SIZE'],

      'memoria_ram':                  'RAM',
      'ram':                          'RAM',
      'memoria':                      'RAM',
      'memory':                       'RAM',

      'armazenamento':                'INTERNAL_MEMORY',
      'storage':                      'INTERNAL_MEMORY',
      'hd':                           'INTERNAL_MEMORY',
      'ssd':                          'INTERNAL_MEMORY',
      'hdd':                          'INTERNAL_MEMORY',
      'nvme':                         'INTERNAL_MEMORY',
      'capacidade_armazenamento':     'INTERNAL_MEMORY',
      'espaco_armazenamento':         'INTERNAL_MEMORY',

      'sistema_operacional':          'OPERATING_SYSTEM',
      'operating_system':             'OPERATING_SYSTEM',
      'sistema':                      'OPERATING_SYSTEM',
      'os':                           'OPERATING_SYSTEM',

      'placa_de_video':               'GPU',
      'gpu':                          'GPU',
      'placa_video':                  'GPU',
      'grafica':                      'GPU',
      'video_card':                   'GPU',
      'placa_grafica':                'GPU',

      'velocidade_processador':       'PROCESSOR_SPEED',
      'processor_speed':              'PROCESSOR_SPEED',
      'clock':                        'PROCESSOR_SPEED',
      'frequencia_processador':       'PROCESSOR_SPEED',
      'ghz':                          'PROCESSOR_SPEED',
      'mhz':                          'PROCESSOR_SPEED',

      'bateria':                      'BATTERY_CAPACITY',
      'battery':                      'BATTERY_CAPACITY',
      'capacidade_bateria':           'BATTERY_CAPACITY',
      'battery_capacity':             'BATTERY_CAPACITY',
      'autonomia':                    'BATTERY_CAPACITY',
      'mah':                          'BATTERY_CAPACITY',

      // ─── CELULARES / SMARTPHONES ───────────────────────────────────────────
      'dual_sim':                     'IS_DUAL_SIM',
      'dual_chip':                    'IS_DUAL_SIM',
      'dois_chips':                   'IS_DUAL_SIM',

      'operadora':                    'CARRIER',
      'carrier':                      'CARRIER',

      'anatel':                       'CELLPHONES_ANATEL_HOMOLOGATION_NUMBER',
      'homologacao_anatel':           'CELLPHONES_ANATEL_HOMOLOGATION_NUMBER',
      'numero_anatel':                'CELLPHONES_ANATEL_HOMOLOGATION_NUMBER',
      'certificacao_anatel':          'CELLPHONES_ANATEL_HOMOLOGATION_NUMBER',
      'numero_homologacao':           'CELLPHONES_ANATEL_HOMOLOGATION_NUMBER',

      'rede':                         'NETWORK_TECHNOLOGY',
      'network':                      'NETWORK_TECHNOLOGY',
      'tecnologia_rede':              'NETWORK_TECHNOLOGY',
      '5g':                           'NETWORK_TECHNOLOGY',
      '4g':                           'NETWORK_TECHNOLOGY',

      'camera_traseira':              'MAIN_CAMERA_RESOLUTION',
      'camera_principal':             'MAIN_CAMERA_RESOLUTION',
      'resolucao_camera':             'MAIN_CAMERA_RESOLUTION',

      'camera_frontal':               'FRONT_CAMERA_RESOLUTION',
      'selfie':                       'FRONT_CAMERA_RESOLUTION',

      // ─── TVs / MONITORES ───────────────────────────────────────────────────
      'resolucao':                    'RESOLUTION',
      'resolution':                   'RESOLUTION',
      'definicao':                    'RESOLUTION',

      'smart_tv':                     'SMART_TV',
      'e_smart':                      'SMART_TV',
      'possui_smart':                 'SMART_TV',
      'smart_tv_sistema':             'SMART_TV',

      'hdr':                          'HDR_TECHNOLOGY',
      'hdr_technology':               'HDR_TECHNOLOGY',
      'tecnologia_hdr':               'HDR_TECHNOLOGY',

      'taxa_de_atualizacao':          'REFRESH_RATE',
      'taxa_atualizacao':             'REFRESH_RATE',
      'refresh_rate':                 'REFRESH_RATE',
      'hz':                           'REFRESH_RATE',
      'hertz':                        'REFRESH_RATE',

      'tecnologia_tela':              'SCREEN_TECHNOLOGY',
      'screen_technology':            'SCREEN_TECHNOLOGY',
      'tipo_tela':                    'SCREEN_TECHNOLOGY',
      'painel':                       'SCREEN_TECHNOLOGY',
      'panel':                        'SCREEN_TECHNOLOGY',
      'tecnologia_display':           'SCREEN_TECHNOLOGY',

      // ─── ÁUDIO (headphones, caixas de som) ─────────────────────────────────
      'cancelamento_de_ruido':        'WITH_NOISE_CANCELLATION',
      'cancelamento_ruido':           'WITH_NOISE_CANCELLATION',
      'noise_cancellation':           'WITH_NOISE_CANCELLATION',
      'anc':                          'WITH_NOISE_CANCELLATION',

      'microfone':                    'WITH_MICROPHONE',
      'microphone':                   'WITH_MICROPHONE',
      'com_microfone':                'WITH_MICROPHONE',

      'impedancia':                   'IMPEDANCE',
      'impedance':                    'IMPEDANCE',

      'resposta_de_frequencia':       'FREQUENCY_RESPONSE',
      'frequency_response':           'FREQUENCY_RESPONSE',

      // ─── CÂMERAS ───────────────────────────────────────────────────────────
      'megapixels':                   'MEGAPIXELS',
      'mp':                           'MEGAPIXELS',

      'zoom_optico':                  'OPTICAL_ZOOM',
      'optical_zoom':                 'OPTICAL_ZOOM',
      'zoom':                         'OPTICAL_ZOOM',

      'sensor':                       'SENSOR_TYPE',
      'tipo_sensor':                  'SENSOR_TYPE',
      'sensor_type':                  'SENSOR_TYPE',

      // ─── ILUMINAÇÃO (luminárias, lâmpadas) ─────────────────────────────────
      'tecnologia_iluminacao':        'LIGHTING_TECHNOLOGY',
      'lighting_technology':          'LIGHTING_TECHNOLOGY',
      'tipo_led':                     'LIGHTING_TECHNOLOGY',
      'tecnologia_luz':               'LIGHTING_TECHNOLOGY',

      'cor_estrutura':                'STRUCTURE_COLOR',
      'cor_da_estrutura':             'STRUCTURE_COLOR',
      'structure_color':              'STRUCTURE_COLOR',

      'cor_cupula':                   'SCREEN_COLOR',
      'cor_da_cupula':                'SCREEN_COLOR',
      'screen_color':                 'SCREEN_COLOR',
      'cor_tela':                     'SCREEN_COLOR',

      'material_estrutura':           'STRUCTURE_MATERIAL',
      'material_da_estrutura':        'STRUCTURE_MATERIAL',
      'structure_material':           'STRUCTURE_MATERIAL',

      'material_tela':                'SCREEN_MATERIAL',
      'material_cupula':              'SCREEN_MATERIAL',
      'screen_material':              'SCREEN_MATERIAL',

      // ─── VESTUÁRIO / ROUPAS ────────────────────────────────────────────────
      'tamanho_roupa':                'CLOTHING_SIZE',
      'clothing_size':                'CLOTHING_SIZE',
      'tamanho_camiseta':             'CLOTHING_SIZE',
      'tamanho_calcas':               'CLOTHING_SIZE',

      'genero':                       'GENDER',
      'gender':                       'GENDER',
      'sexo':                         'GENDER',

      'faixa_etaria':                 'AGE_GROUP',
      'age_group':                    'AGE_GROUP',
      'publico_alvo':                 'AGE_GROUP',
      'para_quem':                    'AGE_GROUP',

      'tecido':                       'FABRIC',
      'fabric':                       'FABRIC',
      'composicao_do_tecido':         'FABRIC',
      'fibra':                        'FABRIC',

      // ─── CALÇADOS ──────────────────────────────────────────────────────────
      'numero_calcado':               'SHOE_SIZE',
      'numero_do_calcado':            'SHOE_SIZE',
      'shoe_size':                    'SHOE_SIZE',
      'numeracao':                    'SHOE_SIZE',
      'numero':                       'SHOE_SIZE',

      'solado':                       'SOLE_MATERIAL',
      'sole_material':                'SOLE_MATERIAL',

      // ─── ELETRODOMÉSTICOS ──────────────────────────────────────────────────
      'capacidade':                   'CAPACITY',
      'capacity':                     'CAPACITY',
      'litros':                       'CAPACITY',
      'volume':                       'CAPACITY',

      'bocas':                        'NUMBER_OF_BURNERS',
      'queimadores':                  'NUMBER_OF_BURNERS',
      'number_of_burners':            'NUMBER_OF_BURNERS',

      'degelo':                       'DEFROST_SYSTEM',
      'defrost_system':               'DEFROST_SYSTEM',
      'tipo_degelo':                  'DEFROST_SYSTEM',

      // ─── IMPRESSORAS ───────────────────────────────────────────────────────
      'tecnologia_de_impressao':      'PRINTING_TECHNOLOGY',
      'printing_technology':          'PRINTING_TECHNOLOGY',
      'tipo_impressora':              'PRINTING_TECHNOLOGY',

      'com_scanner':                  'WITH_SCANNER',
      'scanner':                      'WITH_SCANNER',
      'with_scanner':                 'WITH_SCANNER',

      'tamanho_maximo_papel':         'MAX_PAPER_SIZE',
      'max_paper_size':               'MAX_PAPER_SIZE',
      'formato_papel':                'MAX_PAPER_SIZE',

      // ─── BELEZA / SAÚDE ────────────────────────────────────────────────────
      'volume_conteudo':              'CONTENT_VOLUME',
      'conteudo':                     'CONTENT_VOLUME',
      'content_volume':               'CONTENT_VOLUME',
      'ml':                           'CONTENT_VOLUME',
      'quantidade_ml':                'CONTENT_VOLUME',

      'tipo_pele':                    'SKIN_TYPE',
      'skin_type':                    'SKIN_TYPE',
      'para_pele':                    'SKIN_TYPE',

      'fragrancia':                   'FRAGRANCE',
      'fragrance':                    'FRAGRANCE',
      'aroma':                        'FRAGRANCE',
      'perfume_type':                 'FRAGRANCE',

      // ─── MÓVEIS / DECORAÇÃO ────────────────────────────────────────────────
      'requer_montagem':              'ASSEMBLY_REQUIRED',
      'com_montagem':                 'ASSEMBLY_REQUIRED',
      'assembly_required':            'ASSEMBLY_REQUIRED',

      'estilo':                       'STYLE',
      'style':                        'STYLE',
      'design':                       'STYLE',

      'acabamento':                   'FINISH',
      'finishing':                    'FINISH',
      'finish':                       'FINISH',

      // ─── GAMES / PERIFÉRICOS ───────────────────────────────────────────────
      'compatibilidade':              'COMPATIBLE_PLATFORM',
      'platform':                     'COMPATIBLE_PLATFORM',
      'plataforma':                   'COMPATIBLE_PLATFORM',
      'para_console':                 'COMPATIBLE_PLATFORM',

      'tipo_switch':                  'SWITCH_TYPE',
      'switch_type':                  'SWITCH_TYPE',

      'dpi':                          'DPI',
      'sensibilidade':                'DPI',

      // ─── FERRAMENTAS ───────────────────────────────────────────────────────
      'fonte_de_energia':             'POWER_SOURCE',
      'power_source':                 'POWER_SOURCE',
      'alimentacao':                  'POWER_SOURCE',

      // ─── LIVROS (complementar ao bloco de livros acima) ────────────────────
      'idioma':                       'LANGUAGE',
      'language':                     'LANGUAGE',
      'numero_de_paginas':            'NUMBER_OF_PAGES',
      'paginas':                      'NUMBER_OF_PAGES',
      'pages':                        'NUMBER_OF_PAGES',
      'edicao':                       'EDITION',
      'edition':                      'EDITION',
    }

    // Adiciona atributos das especificações
    console.log('[ML Publish] Especificações encontradas:', specs)
    
    // Ignora atributos específicos de celular se não for celular
    const isCellphone = productType.toLowerCase() === 'celular' || productType.toLowerCase() === 'smartphone'
    // Atributos exclusivos de celular (não mapear em outros tipos)
    const CELLPHONE_ONLY_ATTRS = ['dual_sim', 'dual_chip', 'dois_chips', 'operadora', 'carrier', 'anatel', 'homologacao_anatel', 'numero_anatel', 'certificacao_anatel', 'numero_homologacao']

    for (const [key, value] of Object.entries(specs)) {
      // Pula campos internos
      if (key === 'product_type' || key === 'ae_item_property') continue

      // Pula atributos exclusivos de celular se não for celular
      const keyNormCheck = normalizeAttrKey(key)
      if (!isCellphone && CELLPHONE_ONLY_ATTRS.includes(keyNormCheck)) {
        console.log(`[ML Publish] Ignorando ${key} (exclusivo de celular)`)
        continue
      }

      const mlAttributeId = specMapping[normalizeAttrKey(key)] || specMapping[key] || specMapping[key.toLowerCase()] || specMapping[key.toLowerCase().replace(/\s+/g, '_')]
      if (mlAttributeId && value) {
        // Suporta ID único (string) ou múltiplos IDs (string[])
        const mlIds = Array.isArray(mlAttributeId) ? mlAttributeId : [mlAttributeId]
        for (const mlId of mlIds) {
          if (!attributes.find(attr => attr.id === mlId)) {
            console.log(`[ML Publish] Mapeando ${key} -> ${mlId}: ${value}`)
            attributes.push({ id: mlId, value_name: String(value) })
          }
        }
      }
    }

    // Adiciona atributos personalizados do produto (product.attributes)
    // Formato: [{ nome: "COM USB", valor: "Não" }]
    if (product.attributes) {
      try {
        const customAttrs = typeof product.attributes === 'string'
          ? JSON.parse(product.attributes)
          : product.attributes
        console.log('[ML Publish] Atributos personalizados encontrados:', customAttrs)
        if (Array.isArray(customAttrs)) {
          for (const attr of customAttrs) {
            const attrName: string = attr.nome || attr.name || ''
            const attrValue: string = attr.valor || attr.value || ''
            if (!attrName || !attrValue) continue
            const mappedId = specMapping[normalizeAttrKey(attrName)] || specMapping[attrName] || specMapping[attrName.toLowerCase()] || specMapping[attrName.toLowerCase().replace(/\s+/g, '_')]
            if (mappedId) {
              const mlIds = Array.isArray(mappedId) ? mappedId : [mappedId]
              for (const mlId of mlIds) {
                if (!attributes.find(a => a.id === mlId)) {
                  console.log(`[ML Publish] Atributo personalizado mapeado: "${attrName}" -> ${mlId}: ${attrValue}`)
                  attributes.push({ id: mlId, value_name: String(attrValue) })
                }
              }
            } else {
              console.log(`[ML Publish] ⚠️ Atributo personalizado sem mapeamento: "${attrName}" = "${attrValue}"`)
            }
          }
        }
      } catch (e) {
        console.error('[ML Publish] Erro ao parsear atributos personalizados:', e)
      }
    }

    // Campos obrigatórios APENAS para celulares
    if (isCellphone) {
      // RAM e Storage para celulares
      if (!attributes.find(attr => attr.id === 'RAM') && specs.memória_ram) {
        attributes.push({ id: 'RAM', value_name: String(specs.memória_ram) })
      }
      
      if (!attributes.find(attr => attr.id === 'INTERNAL_MEMORY') && specs.armazenamento) {
        attributes.push({ id: 'INTERNAL_MEMORY', value_name: String(specs.armazenamento) })
      }
      
      // ANATEL obrigatório para celulares
      if (!attributes.find(attr => attr.id === 'CELLPHONES_ANATEL_HOMOLOGATION_NUMBER') && specs.anatel) {
        attributes.push({ id: 'CELLPHONES_ANATEL_HOMOLOGATION_NUMBER', value_name: String(specs.anatel) })
      }
      
      // Dual SIM e Operadora com valores padrão
      if (!attributes.find(attr => attr.id === 'IS_DUAL_SIM')) {
        attributes.push({ id: 'IS_DUAL_SIM', value_name: specs.dual_sim || 'Não' })
      }
      
      if (!attributes.find(attr => attr.id === 'CARRIER')) {
        attributes.push({ id: 'CARRIER', value_name: specs.operadora || 'Desbloqueado' })
      }
    }

    console.log('[ML Publish] Atributos montados:', JSON.stringify(attributes, null, 2))

    // ── Filtrar atributos: só envia o que a categoria aceita ──────────────
    let finalAttributes = attributes
    if (categoryAttributes.length > 0) {
      const allowedIds = new Set(categoryAttributes.map((a: any) => a.id))
      const before = attributes.length
      finalAttributes = attributes.filter(attr => allowedIds.has(attr.id))
      const removed = attributes
        .filter(attr => !allowedIds.has(attr.id))
        .map(attr => attr.id)
      if (removed.length > 0) {
        console.log(`[ML Publish] ⚠️ ${removed.length} atributos inválidos para a categoria removidos: ${removed.join(', ')}`)
        console.log(`[ML Publish] Atributos: ${before} → ${finalAttributes.length}`)
      }
    } else {
      console.log('[ML Publish] ⚠️ Sem lista de atributos da categoria — enviando todos')
    }

    // Monta descrição detalhada com especificações
    console.log('[ML Publish] Descrição original do produto:', product.description)
    console.log('[ML Publish] Especificações do produto:', product.specifications)
    
    let detailedDescription = ''
    
    // Começa com a descrição do produto se existir
    if (product.description && product.description.trim()) {
      detailedDescription = product.description.trim()
    } else {
      detailedDescription = product.name
    }
    
    // Se tiver specifications (descrição do AliExpress), adiciona
    if (product.specifications) {
      try {
        const specifications = typeof product.specifications === 'string'
          ? JSON.parse(product.specifications)
          : product.specifications
        
        // Se specifications tiver uma descrição textual
        if (specifications.description) {
          detailedDescription = specifications.description
        } else if (specifications.detail) {
          detailedDescription = specifications.detail
        }
      } catch (e) {
        console.log('[ML Publish] Erro ao parsear specifications:', e)
      }
    }
    
    // Adiciona informações principais do produto
    if (product.brand || product.model || product.gtin) {
      detailedDescription += '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      detailedDescription += '\n📦 INFORMAÇÕES DO PRODUTO\n'
      if (product.brand) detailedDescription += `\n🏷️ Marca: ${product.brand}`
      if (product.model) detailedDescription += `\n📱 Modelo: ${product.model}`
      if (product.color) detailedDescription += `\n🎨 Cor: ${product.color}`
      if (product.gtin) detailedDescription += `\n🔢 Código de Barras: ${product.gtin}`
    }
    
    // Adiciona especificações técnicas (excluindo ae_item_property)
    const simpleSpecs = Object.entries(specs).filter(([key]) => 
      !['product_type', 'ae_item_property', 'ml_category_id'].includes(key)
    )
    
    if (simpleSpecs.length > 0) {
      detailedDescription += '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      detailedDescription += '\n⚙️ ESPECIFICAÇÕES TÉCNICAS\n'
      
      for (const [key, value] of simpleSpecs) {
        const fieldName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        detailedDescription += `\n• ${fieldName}: ${value}`
      }
    }
    
    // Adiciona propriedades do AliExpress se disponível
    if (specs.ae_item_property && Array.isArray(specs.ae_item_property)) {
      // Agrupa por categoria de atributo
      const groupedAttrs: Record<string, string[]> = {}
      
      for (const prop of specs.ae_item_property) {
        const attrName = prop.attr_name || 'Outros'
        const attrValue = prop.attr_value
        
        if (!groupedAttrs[attrName]) {
          groupedAttrs[attrName] = []
        }
        if (!groupedAttrs[attrName].includes(attrValue)) {
          groupedAttrs[attrName].push(attrValue)
        }
      }
      
      // Adiciona as propriedades agrupadas de forma mais visual
      const categories = Object.keys(groupedAttrs)
      if (categories.length > 0) {
        detailedDescription += '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━'
        detailedDescription += '\n✨ CARACTERÍSTICAS DETALHADAS\n'
        
        // Separa por categorias importantes
        const importantCategories = ['Nome da marca', 'Sistema', 'Função', 'Tamanho da Tela', 'Resolução', 'Material']
        const otherCategories = categories.filter(c => !importantCategories.includes(c))
        
        // Mostra categorias importantes primeiro
        for (const category of importantCategories) {
          if (groupedAttrs[category]) {
            const values = groupedAttrs[category]
            if (values.length === 1) {
              detailedDescription += `\n\n🔹 ${category}:\n   ${values[0]}`
            } else if (values.length <= 5) {
              detailedDescription += `\n\n🔹 ${category}:\n   ${values.join('\n   ')}`
            } else {
              detailedDescription += `\n\n🔹 ${category}:\n   ${values.slice(0, 5).join('\n   ')}\n   ... e mais ${values.length - 5}`
            }
          }
        }
        
        // Mostra outras categorias de forma compacta
        if (otherCategories.length > 0) {
          detailedDescription += '\n\n🔹 Outras Características:'
          for (const category of otherCategories.slice(0, 10)) {
            const values = groupedAttrs[category]
            if (values.length === 1) {
              detailedDescription += `\n   • ${category}: ${values[0]}`
            } else if (values.length <= 3) {
              detailedDescription += `\n   • ${category}: ${values.join(', ')}`
            }
          }
        }
      }
    }
    
    // Adiciona informações de estoque e garantia
    detailedDescription += '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    detailedDescription += '\n📦 ENTREGA E GARANTIA\n'
    detailedDescription += `\n✅ Produto Novo, Lacrado e com Garantia`
    detailedDescription += `\n📦 Enviamos para todo o Brasil`
    if (product.stock > 0) {
      detailedDescription += `\n✅ Pronta Entrega - ${product.stock} unidade(s) disponível(is)`
    }

    console.log('[ML Publish] Descrição gerada:', detailedDescription.substring(0, 200) + '...')

    // Garante que o preço tenha exatamente 2 casas decimais (ML não aceita mais que isso para BRL)
    let finalPrice = Number(product.price.toFixed(2))
    
    // Verifica preço mínimo da categoria no ML (algumas categorias têm preço mínimo)
    const categoryMinPrices: Record<string, number> = {
      'MLB271612': 8.00,  // Categoria de acessórios
      'MLB1051': 10.00,   // Celulares
      'MLB1000': 5.00,    // Eletrônicos em geral
    }
    
    const minPrice = categoryMinPrices[categoryId]
    if (minPrice && finalPrice < minPrice) {
      console.log(`[ML Publish] ⚠️ Preço ${finalPrice} está abaixo do mínimo da categoria ${categoryId} (R$ ${minPrice})`)
      console.log(`[ML Publish] Ajustando preço para o mínimo: R$ ${minPrice}`)
      finalPrice = minPrice
    }
    
    console.log('[ML Publish] Preço original:', product.price, '→ Preço final:', finalPrice)

    // Monta o payload para criar o anúncio
    let listingData: any
    
    // Se o usuário selecionou produto no catálogo, usa catalog_product_id em vez de title livre
    if (finalCatalogProductId) {
      console.log('[ML Publish] ✅ Usando catálogo do ML com product_id:', finalCatalogProductId)
      
      listingData = {
        site_id: 'MLB',
        category_id: categoryId,
        catalog_product_id: finalCatalogProductId,
        catalog_listing: true,
        family_name: familyName || product.name.substring(0, 60),
        price: finalPrice,
        currency_id: 'BRL',
        available_quantity: product.stock,
        buying_mode: 'buy_it_now',
        listing_type_id: 'gold_special',
        condition: 'new',
        pictures,
        shipping: {
          mode: 'me2',
          free_shipping: false,
          local_pick_up: false
        }
      }
    } else {
      // Anúncio normal sem catálogo
      // ATENÇÃO: categorias com catalog_domain podem exigir family_name OBRIGATÓRIO
      // mesmo sem catalog_product_id (ex: MLB1586 Luminárias de Mesa)
      listingData = {
        category_id: categoryId,
        price: finalPrice,
        currency_id: 'BRL',
        available_quantity: product.stock,
        buying_mode: 'buy_it_now',
        listing_type_id: 'gold_special',
        condition: 'new',
        description: {
          plain_text: detailedDescription
        },
        pictures,
        attributes: finalAttributes,
        shipping: {
          mode: 'me2',
          free_shipping: false,
          local_pick_up: false,
          dimensions: null
        }
      }
      
      // Montar título limpo: nome + marca + modelo
      const titleParts = [
        product.name,
        product.brand && product.brand !== product.name ? product.brand : null,
        product.model && product.model !== product.name ? product.model : null
      ].filter(Boolean)
      const builtTitle = titleParts.join(' ').substring(0, 60)

      if (categoryCatalogDomain && familyName) {
        // Categoria com catalog_domain: ML rejeita 'title' quando family_name presente
        // Enviar SÓ family_name, sem title — mas family_name precisa ser descritivo
        // Usa: nome do produto + modelo (para ser rico o suficiente)
        const descriptiveFamilyName = [
          product.name,
          product.brand && product.brand !== product.name ? product.brand : null,
          familyName !== product.name ? familyName : null
        ].filter(Boolean).join(' ').substring(0, 60)
        listingData.family_name = descriptiveFamilyName
        console.log('[ML Publish] ✅ family_name:', descriptiveFamilyName, '(catalog_domain - SEM title)')
      } else {
        // Categoria tradicional OR sem familyName: enviar title
        listingData.title = builtTitle
        console.log('[ML Publish] ✅ title:', listingData.title)
        // family_name adicional apenas se categoria NÃO tiver catalog_domain
        if (familyName && !categoryCatalogDomain) {
          listingData.family_name = familyName
          console.log('[ML Publish] ✅ family_name:', familyName)
        }
      }

    }

    // Adiciona SKU se disponível (seller_custom_field)
    if (product.supplierSku || product.id) {
      listingData.seller_custom_field = product.supplierSku || product.id
      console.log('[ML Publish] SKU adicionado:', listingData.seller_custom_field)
    }

    // Log detalhado do payload que será enviado
    console.log('[ML Publish] ===== PAYLOAD COMPLETO =====')
    console.log('[ML Publish] Título:', listingData.title)
    console.log('[ML Publish] Categoria:', listingData.category_id)
    console.log('[ML Publish] Preço:', listingData.price)
    console.log('[ML Publish] Estoque:', listingData.available_quantity)
    console.log('[ML Publish] Fotos:', listingData.pictures?.length || 0, 'imagens')
    if (listingData.pictures?.length > 0) {
      console.log('[ML Publish] URLs das fotos:', listingData.pictures.map((p: any) => p.source).join(', '))
    }
    console.log('[ML Publish] Atributos:', listingData.attributes?.length || 0, 'atributos')
    console.log('[ML Publish] Descrição (primeiros 300 chars):', listingData.description?.plain_text?.substring(0, 300))
    console.log('[ML Publish] ========================')
    console.log('[ML Publish] PAYLOAD JSON COMPLETO:')
    console.log(JSON.stringify(listingData, null, 2))
    console.log('[ML Publish] ========================')

    // Faz a requisição para a API do Mercado Livre
    const response = await fetchWithRetry('https://api.mercadolibre.com/items', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(listingData)
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[ML Publish] Erro da API:', JSON.stringify(data, null, 2))
      return {
        success: false,
        message: data.message || 'Erro ao publicar',
        details: data.error || null,
        cause: data.cause || []
      }
    }

    return {
      success: true,
      listingId: data.id,
      status: data.status,
      title: data.title,
      listingUrl: data.permalink,
      message: 'Produto publicado com sucesso'
    }
  } catch (error) {
    console.error('[ML Publish] Erro:', error)
    return {
      success: false,
      message: 'Erro ao publicar no Mercado Livre: ' + String(error)
    }
  }
}
