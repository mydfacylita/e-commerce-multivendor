import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { marketplace } = await request.json()

    if (!marketplace) {
      return NextResponse.json(
        { message: 'Marketplace não especificado' },
        { status: 400 }
      )
    }

    // Busca o produto
    const product = await prisma.product.findUnique({
      where: { id: params.id },
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

      // Publica no Mercado Livre
      const mlResult = await publishToMercadoLivre(product)
      
      if (!mlResult.success) {
        return NextResponse.json(
          { message: mlResult.message },
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

async function publishToMercadoLivre(product: any) {
  try {
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
      const refreshResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
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

    // Verifica se tem categoria ML salva no produto
    let categoryId = specs.ml_category_id || 'MLB263532' // Usa a salva ou fallback
    
    // Se não tem categoria salva, usa a API de predição
    if (!specs.ml_category_id) {
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
      const domainResponse = await fetch(
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
    
    // Busca os atributos permitidos para esta categoria
    console.log('[ML Publish] Buscando atributos da categoria', categoryId)
    let categoryAttributes: any[] = []
    try {
      const attrResponse = await fetch(
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
        console.log('[ML Publish] IDs de atributos:', categoryAttributes.map((a: any) => a.id).join(', '))
      }
    } catch (e) {
      console.log('[ML Publish] ⚠️ Erro ao buscar atributos da categoria:', e)
    }
    
    // Monta os atributos mapeando especificações para IDs do ML
    const attributes = []
    
    // Atributos básicos
    if (product.gtin) {
      attributes.push({ id: 'GTIN', value_name: product.gtin })
    }
    
    if (product.brand) {
      attributes.push({ id: 'BRAND', value_name: product.brand })
      attributes.push({ id: 'MANUFACTURER', value_name: product.brand })
    }
    
    if (product.model) {
      attributes.push({ id: 'MODEL', value_name: product.model })
      // ML pode pedir ALPHANUMERIC_MODEL (singular) ou ALPHANUMERIC_MODELS (plural)
      // Mas não aceita ambos - vamos tentar singular primeiro que é mais comum
      attributes.push({ id: 'ALPHANUMERIC_MODEL', value_name: product.model })
    }
    
    if (product.color) {
      attributes.push({ id: 'COLOR', value_name: product.color })
    }

    // Mapeia especificações técnicas para atributos do ML
    const specMapping: any = {
      // Cor
      'cor': 'COLOR',
      'color': 'COLOR',
      'Cor': 'COLOR',
      
      // Modelo
      'modelo': 'MODEL',
      'model': 'MODEL',
      'Modelo': 'MODEL',
      'modelo_alfanumérico': 'ALPHANUMERIC_MODELS',
      
      // Memória RAM
      'memória_ram': 'RAM',
      'memoria_ram': 'RAM',
      'RAM': 'RAM',
      'ram': 'RAM',
      'Memória RAM': 'RAM',
      
      // Armazenamento
      'armazenamento': 'INTERNAL_MEMORY',
      'storage': 'INTERNAL_MEMORY',
      'Armazenamento': 'INTERNAL_MEMORY',
      
      // Homologação ANATEL (para celulares)
      'anatel': 'CELLPHONES_ANATEL_HOMOLOGATION_NUMBER',
      'homologacao_anatel': 'CELLPHONES_ANATEL_HOMOLOGATION_NUMBER',
      'numero_anatel': 'CELLPHONES_ANATEL_HOMOLOGATION_NUMBER',
      
      // Dual SIM
      'dual_sim': 'IS_DUAL_SIM',
      'dual_chip': 'IS_DUAL_SIM',
      
      // Operadora
      'operadora': 'CARRIER',
      'carrier': 'CARRIER',
    }

    // Adiciona atributos das especificações
    console.log('[ML Publish] Especificações encontradas:', specs)
    
    // Ignora atributos específicos de celular se não for celular
    const isCellphone = productType.toLowerCase() === 'celular' || productType.toLowerCase() === 'smartphone'
    
    for (const [key, value] of Object.entries(specs)) {
      // Pula campos internos
      if (key === 'product_type' || key === 'ae_item_property') continue
      
      // Pula atributos de celular se não for celular
      if (!isCellphone && ['dual_sim', 'operadora', 'memória_ram', 'armazenamento', 'anatel'].includes(key)) {
        console.log(`[ML Publish] Ignorando ${key} (não é celular)`)
        continue
      }
      
      const mlAttributeId = specMapping[key]
      if (mlAttributeId && value) {
        // Evita duplicados
        if (!attributes.find(attr => attr.id === mlAttributeId)) {
          console.log(`[ML Publish] Mapeando ${key} -> ${mlAttributeId}: ${value}`)
          attributes.push({
            id: mlAttributeId,
            value_name: String(value)
          })
        }
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
    const listingData: any = {
      title: product.name.substring(0, 60), // ML tem limite de 60 caracteres
      category_id: categoryId, // Categoria baseada no tipo de produto
      price: finalPrice, // Preço com exatamente 2 casas decimais
      currency_id: 'BRL',
      available_quantity: product.stock,
      buying_mode: 'buy_it_now',
      listing_type_id: 'gold_special', // Ou 'gold_pro', 'gold_premium'
      condition: 'new',
      description: {
        plain_text: detailedDescription
      },
      pictures,
      attributes,
      shipping: {
        mode: 'me2',
        free_shipping: false,
        local_pick_up: false,
        dimensions: null // Remove dimensões automáticas que podem causar problemas
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

    // Faz a requisição para a API do Mercado Livre
    const response = await fetch('https://api.mercadolibre.com/items', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(listingData)
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[ML Publish] Erro da API:', data)
      return {
        success: false,
        message: data.message || 'Erro ao publicar no Mercado Livre'
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
