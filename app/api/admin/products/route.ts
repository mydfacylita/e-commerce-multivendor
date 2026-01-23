import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logApi } from '@/lib/api-logger'
import { markEANAsUsed } from '@/lib/ean-utils'

export async function POST(req: Request) {
  const startTime = Date.now()
  let statusCode = 200
  let responseData: any = null
  let errorMsg: string | undefined
  
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📦 [INÍCIO] POST /api/admin/products')
    
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      console.log('❌ Não autenticado')
      statusCode = 403
      errorMsg = 'Não autenticado'
      await logApi({
        method: 'POST',
        endpoint: '/api/admin/products',
        statusCode,
        errorMessage: errorMsg,
        duration: Date.now() - startTime
      })
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    // Validar role
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SELLER') {
      console.log('❌ Role não autorizado:', session.user.role)
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    const data = await req.json()
    console.log('📝 Dados recebidos:', { 
      name: data.name, 
      sourceProductId: data.sourceProductId,
      role: session.user.role 
    })
    console.log('📦 Peso e Dimensões recebidos:', {
      weight: data.weight,
      weightWithPackage: data.weightWithPackage,
      dimensions: {
        semEmbalagem: { length: data.length, width: data.width, height: data.height },
        comEmbalagem: { length: data.lengthWithPackage, width: data.widthWithPackage, height: data.heightWithPackage }
      }
    })
    console.log('🎨 Variantes recebidas:', {
      variants: data.variants,
      sizeType: data.sizeType,
      sizeCategory: data.sizeCategory
    })

    // SE FOR VENDEDOR, VALIDAR
    let seller = null
    if (session.user.role === 'SELLER') {
      console.log('\n📍 Validando vendedor...')
      
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          seller: {
            include: { subscription: true }
          },
          workForSeller: {
            include: { subscription: true }
          }
        }
      })

      seller = user?.seller || user?.workForSeller

      if (!seller || seller.status !== 'ACTIVE') {
        console.log('❌ Vendedor inválido')
        return NextResponse.json({ message: 'Vendedor inválido' }, { status: 403 })
      }

      if (!seller.subscription || !['ACTIVE', 'TRIAL'].includes(seller.subscription.status)) {
        console.log('❌ Plano inválido')
        return NextResponse.json({ message: 'Plano inválido' }, { status: 403 })
      }

      if (seller.subscription.endDate < new Date()) {
        console.log('❌ Plano expirado')
        return NextResponse.json({ message: 'Plano expirado' }, { status: 403 })
      }

      console.log('✅ Vendedor validado:', seller.storeName)
    }

    // SE TEM sourceProductId, É ADIÇÃO DE DROPSHIPPING
    if (data.sourceProductId && session.user.role === 'SELLER') {
      console.log('\n📦 [DROPSHIPPING] Adicionando produto dropshipping...')
      console.log('   🆔 Source Product ID:', data.sourceProductId)

      // Buscar produto original
      const originalProduct = await prisma.product.findUnique({
        where: { id: data.sourceProductId },
        include: { category: true }
      })

      if (!originalProduct) {
        console.log('❌ Produto original não encontrado')
        return NextResponse.json({ message: 'Produto não encontrado' }, { status: 404 })
      }

      if (!originalProduct.isDropshipping) {
        console.log('❌ Produto não é dropshipping')
        return NextResponse.json({ message: 'Produto não disponível para dropshipping' }, { status: 400 })
      }

      console.log('✅ Produto original encontrado:', originalProduct.name)

      // VERIFICAR SE JÁ ADICIONOU ESTE PRODUTO (EVITAR DUPLICAÇÃO)
      console.log('\n   🔍 Verificando duplicação...')
      console.log('   📋 Buscando produto com sellerId:', seller!.id, 'e supplierSku:', data.sourceProductId)
      
      const existingProduct = await prisma.product.findFirst({
        where: {
          sellerId: seller!.id,
          supplierSku: data.sourceProductId
        }
      })

      if (existingProduct) {
        console.log('❌ [DUPLICAÇÃO DETECTADA] Produto já adicionado!')
        console.log('   🆔 Produto existente ID:', existingProduct.id)
        console.log('   📝 Nome:', existingProduct.name)
        console.log('   📅 Adicionado em:', existingProduct.createdAt)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
        return NextResponse.json({ 
          message: 'Você já adicionou este produto ao seu catálogo',
          existingProduct: {
            id: existingProduct.id,
            name: existingProduct.name
          }
        }, { status: 400 })
      }

      console.log('   ✅ Produto não foi adicionado antes - pode prosseguir')

      // Validar preço
      const precoBase = originalProduct.price
      const precoFinal = data.customPrice || precoBase * 1.2

      if (precoFinal < precoBase) {
        console.log('❌ Preço inválido:', precoFinal, '< base:', precoBase)
        return NextResponse.json({ 
          message: `O preço deve ser no mínimo R$ ${precoBase.toFixed(2)}`,
          minPrice: precoBase 
        }, { status: 400 })
      }

      // Gerar slug único
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      const newSlug = `${originalProduct.slug}-${seller!.id.substring(0, 6)}-${randomSuffix}`

      console.log('✅ Criando cópia do produto...')

      const product = await prisma.product.create({
        data: {
          name: data.customName || originalProduct.name,
          slug: newSlug,
          description: originalProduct.description,
          price: precoFinal,
          comparePrice: precoFinal * 1.3,
          costPrice: precoBase,
          images: originalProduct.images,
          stock: originalProduct.stock,
          featured: false,
          categoryId: originalProduct.categoryId,
          sellerId: seller!.id,
          supplierId: originalProduct.supplierId,
          supplierSku: data.sourceProductId,
          supplierUrl: `/produtos/${originalProduct.slug}`,
          specifications: originalProduct.specifications,
          variants: originalProduct.variants,
          attributes: originalProduct.attributes,
          isDropshipping: true, // ✅ SEMPRE TRUE para produtos clonados
          dropshippingCommission: originalProduct.dropshippingCommission,
          availableForDropship: false,
          active: true,
          supplierStoreName: originalProduct.supplierStoreName || 'Marketplace',
          supplierStoreId: originalProduct.sellerId,
          supplierStock: originalProduct.stock,
          lastSyncAt: new Date()
        }
      })

      console.log('✅ Produto dropshipping adicionado!')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

      return NextResponse.json({ 
        success: true, 
        product,
        message: 'Produto adicionado ao seu catálogo!'
      }, { status: 201 })
    }

    // CRIAÇÃO NORMAL DE PRODUTO
    console.log('\n📦 [NORMAL] Criando produto normal...')
    
    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        price: data.price,
        comparePrice: data.comparePrice,
        costPrice: data.costPrice,
        shippingCost: data.shippingCost,
        taxCost: data.taxCost,
        totalCost: data.totalCost,
        margin: data.margin,
        // Peso e dimensões
        weight: data.weight,
        weightWithPackage: data.weightWithPackage,
        length: data.length,
        width: data.width,
        height: data.height,
        lengthWithPackage: data.lengthWithPackage,
        widthWithPackage: data.widthWithPackage,
        heightWithPackage: data.heightWithPackage,
        stock: data.stock,
        categoryId: data.categoryId,
        sellerId: seller?.id, // Se for seller, adiciona o sellerId
        supplierId: data.supplierId,
        supplierSku: data.supplierSku,
        supplierUrl: data.supplierUrl,
        images: JSON.stringify(data.images),
        featured: data.featured || false,
        gtin: data.gtin,
        brand: data.brand,
        model: data.model,
        color: data.color,
        mpn: data.mpn,
        technicalSpecs: data.technicalSpecs,
        // Variantes (tamanho x cor)
        variants: data.variants,
        sizeType: data.sizeType,
        sizeCategory: data.sizeCategory,
        bookTitle: data.bookTitle,
        bookAuthor: data.bookAuthor,
        bookGenre: data.bookGenre,
        bookPublisher: data.bookPublisher,
        bookIsbn: data.bookIsbn,
        // Campos de Tributação (NF-e)
        ncm: data.ncm,
        cest: data.cest,
        origem: data.origem || '0',
        cstIcms: data.cstIcms,
        aliquotaIcms: data.aliquotaIcms ? parseFloat(data.aliquotaIcms) : null,
        reducaoBcIcms: data.reducaoBcIcms ? parseFloat(data.reducaoBcIcms) : null,
        cstPis: data.cstPis,
        aliquotaPis: data.aliquotaPis ? parseFloat(data.aliquotaPis) : null,
        cstCofins: data.cstCofins,
        aliquotaCofins: data.aliquotaCofins ? parseFloat(data.aliquotaCofins) : null,
        cfopInterno: data.cfopInterno,
        cfopInterestadual: data.cfopInterestadual,
        unidadeComercial: data.unidadeComercial || 'UN',
        unidadeTributavel: data.unidadeTributavel || 'UN',
        tributacaoEspecial: data.tributacaoEspecial || 'normal',
        supplierStoreName: data.supplierStoreName,
        supplierStoreId: data.supplierStoreId,
        supplierStock: data.supplierStock,
        isChoiceProduct: data.isChoiceProduct || false,
        availableForDropship: data.availableForDropship !== false,
        supplierRating: data.supplierRating,
        supplierShippingSpeed: data.supplierShippingSpeed,
        dropshippingCommission: data.dropshippingCommission,
      },
    })

    console.log('✅ Produto criado:', product.name)

    // 🔗 MARCAR EAN COMO USADO SE FORNECIDO
    if (data.gtin) {
      console.log(`\n🔗 Processando EAN: ${data.gtin}`)
      const eanResult = await markEANAsUsed(data.gtin, product.id)
      if (eanResult.success) {
        console.log('✅ EAN processado:', eanResult.message)
      } else {
        console.log('⚠️ EAN:', eanResult.message)
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    statusCode = 201
    responseData = { id: product.id, name: product.name }
    await logApi({
      method: 'POST',
      endpoint: '/api/admin/products',
      statusCode,
      userId: session.user.id,
      userRole: session.user.role,
      sellerId: seller?.id,
      sellerName: seller?.storeName,
      requestBody: { name: data.name, sourceProductId: data.sourceProductId },
      responseBody: responseData,
      duration: Date.now() - startTime
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('💥 [ERRO] Erro ao criar produto')
    console.error('❌ Mensagem:', error.message)
    console.error('❌ Code:', error.code)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    statusCode = error.code === 'P2002' ? 400 : 500
    errorMsg = error.code === 'P2002' ? 'Slug já existe' : 'Erro ao criar produto'
    
    await logApi({
      method: 'POST',
      endpoint: '/api/admin/products',
      statusCode,
      errorMessage: errorMsg,
      duration: Date.now() - startTime
    })
    
    if (error.code === 'P2002') {
      return NextResponse.json({ message: 'Slug já existe. Tente novamente.' }, { status: 400 })
    }
    
    return NextResponse.json({ message: 'Erro ao criar produto' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const startTime = Date.now()
  
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 [INÍCIO] API GET /api/admin/products')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // 1. VERIFICAR AUTENTICAÇÃO (Session ou Token futuro)
    console.log('\n📍 ETAPA 1: VERIFICANDO AUTENTICAÇÃO...')
    const session = await getServerSession(authOptions)
    
    if (session?.user) {
      console.log('✅ Sessão encontrada!')
      console.log('   👤 Email:', session.user.email)
      console.log('   🎭 Role:', session.user.role)
      console.log('   🆔 User ID:', session.user.id)
    } else {
      console.log('❌ Nenhuma sessão encontrada')
    }
    
    // TODO: Adicionar autenticação por token/key para integrações externas
    // const apiKey = req.headers.get('x-api-key')
    // const apiToken = req.headers.get('authorization')?.replace('Bearer ', '')
    // console.log('🔑 API Key:', apiKey ? '***' + apiKey.slice(-4) : 'Não fornecido')
    // console.log('🎫 Token:', apiToken ? '***' + apiToken.slice(-4) : 'Não fornecido')
    
    if (!session?.user) {
      console.log('❌ [FALHA] Autenticação falhou - Nenhuma credencial válida')
      return NextResponse.json(
        { message: 'Não autenticado. Faça login ou forneça um token válido.' },
        { status: 401 }
      )
    }
    
    console.log('✅ [SUCESSO] Autenticação validada')
    
    // 2. VERIFICAR AUTORIZAÇÃO (ADMIN ou SELLER)
    console.log('\n📍 ETAPA 2: VERIFICANDO AUTORIZAÇÃO...')
    console.log('   🎭 Role do usuário:', session.user.role)
    console.log('   ✅ Roles permitidas: ADMIN, SELLER')
    
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SELLER') {
      console.log('❌ [FALHA] Role não autorizado:', session.user.role)
      console.log('   ℹ️  Roles aceitas: ADMIN ou SELLER')
      return NextResponse.json(
        { message: 'Não autorizado. Apenas administradores e vendedores.' },
        { status: 403 }
      )
    }
    
    console.log('✅ [SUCESSO] Role autorizado:', session.user.role)
    
    // 3. SE FOR VENDEDOR, VERIFICAR PLANO ATIVO
    if (session.user.role === 'SELLER') {
      console.log('\n📍 ETAPA 3: VALIDAÇÕES ESPECÍFICAS DE VENDEDOR...')
      console.log('   🔍 Buscando dados do vendedor no banco...')
      
      const seller = await prisma.seller.findUnique({
        where: { userId: session.user.id },
        include: {
          subscription: {
            include: {
              plan: true
            }
          }
        }
      })
      
      if (!seller) {
        console.log('❌ [FALHA] Vendedor não encontrado no banco de dados')
        console.log('   🆔 User ID procurado:', session.user.id)
        return NextResponse.json(
          { message: 'Vendedor não encontrado. Complete seu cadastro.' },
          { status: 403 }
        )
      }
      
      console.log('✅ Vendedor encontrado no banco!')
      console.log('   🆔 Seller ID:', seller.id)
      console.log('   🏪 Nome da loja:', seller.storeName)
      console.log('   📊 Status:', seller.status)
      console.log('   📅 Criado em:', seller.createdAt)
      
      // Verificar se o vendedor está ativo
      console.log('\n   🔍 Verificando STATUS do vendedor...')
      console.log('   📊 Status atual:', seller.status)
      console.log('   ✅ Status necessário: ACTIVE')
      
      if (seller.status !== 'ACTIVE') {
        console.log('❌ [FALHA] Vendedor não está ativo!')
        console.log('   📊 Status atual:', seller.status)
        console.log('   ℹ️  Status esperado: ACTIVE')
        return NextResponse.json(
          { message: `Vendedor não está ativo. Status: ${seller.status}` },
          { status: 403 }
        )
      }
      
      console.log('✅ Status OK - Vendedor está ACTIVE')
      
      // Verificar plano
      console.log('\n   🔍 Verificando ASSINATURA...')
      
      if (!seller.subscription) {
        console.log('❌ [FALHA] Nenhuma assinatura encontrada!')
        console.log('   ℹ️  O vendedor precisa ter um plano ativo')
        return NextResponse.json(
          { message: 'Você precisa de um plano ativo para acessar esta funcionalidade.' },
          { status: 403 }
        )
      }
      
      console.log('✅ Assinatura encontrada!')
      console.log('   🆔 Subscription ID:', seller.subscription.id)
      console.log('   📋 Plano:', seller.subscription.plan.name)
      console.log('   💰 Preço:', seller.subscription.price)
      console.log('   🔄 Ciclo:', seller.subscription.billingCycle)
      console.log('   📊 Status:', seller.subscription.status)
      console.log('   📅 Início:', seller.subscription.startDate)
      console.log('   📅 Fim:', seller.subscription.endDate)
      console.log('   🔄 Auto-renovação:', seller.subscription.autoRenew)
      
      // Verificar se o plano está ativo
      console.log('\n   🔍 Verificando STATUS DA ASSINATURA...')
      const validStatuses = ['ACTIVE', 'TRIAL']
      console.log('   📊 Status atual:', seller.subscription.status)
      console.log('   ✅ Status válidos:', validStatuses.join(', '))
      
      if (!validStatuses.includes(seller.subscription.status)) {
        console.log('❌ [FALHA] Status da assinatura inválido!')
        console.log('   📊 Status atual:', seller.subscription.status)
        console.log('   ✅ Status aceitos:', validStatuses.join(', '))
        return NextResponse.json(
          { message: `Seu plano está ${seller.subscription.status}. Renove sua assinatura para continuar.` },
          { status: 403 }
        )
      }
      
      console.log('✅ Status da assinatura OK!')
      
      // Verificar se o plano não expirou
      console.log('\n   🔍 Verificando VALIDADE DA ASSINATURA...')
      const now = new Date()
      const endDate = new Date(seller.subscription.endDate)
      console.log('   📅 Data atual:', now.toISOString())
      console.log('   📅 Data de expiração:', endDate.toISOString())
      
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      console.log('   ⏰ Dias restantes:', daysRemaining)
      
      if (seller.subscription.endDate < now) {
        console.log('❌ [FALHA] Plano expirado!')
        console.log('   📅 Expirou em:', seller.subscription.endDate)
        console.log('   📅 Data atual:', now)
        return NextResponse.json(
          { message: 'Seu plano expirou. Renove sua assinatura para continuar.' },
          { status: 403 }
        )
      }
      
      console.log('✅ Assinatura válida!')
      if (daysRemaining <= 7) {
        console.log('⚠️  AVISO: Plano expira em', daysRemaining, 'dias!')
      }
      
      console.log('\n✅ [SUCESSO] Todas as validações do vendedor passaram!')
    } else {
      console.log('\n📍 ETAPA 3: PULAR (Usuário é ADMIN)')
    }
    
    console.log('\n✅ [SUCESSO] Credenciamento completo - Prosseguindo com a busca')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // 4. BUSCAR PRODUTOS
    console.log('\n📍 ETAPA 4: BUSCANDO PRODUTOS...')
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const dropshipping = searchParams.get('dropshipping') // Para listar produtos disponíveis para dropshipping
    console.log('   🔍 Termo de busca:', search || '(todos os produtos)')
    console.log('   📦 Filtro dropshipping:', dropshipping)

    // Definir filtros de segurança baseado na role
    let whereCondition: any = {
      ...(search && {
        name: {
          contains: search
        }
      })
    }

    // Se é busca de produtos DISPONÍVEIS para dropshipping
    if (dropshipping === 'available') {
      console.log('   📦 LISTANDO PRODUTOS DISPONÍVEIS PARA DROPSHIPPING')
      whereCondition.isDropshipping = true
      whereCondition.availableForDropship = true
      whereCondition.active = true
      whereCondition.stock = { gt: 0 }
      
      console.log('   ✅ Filtros aplicados: isDropshipping=true, availableForDropship=true, active=true, stock>0')
    }
    // Se for VENDEDOR: só pode ver seus próprios produtos (incluindo drops que ele adicionou)
    else if (session.user.role === 'SELLER') {
      console.log('   🔒 APLICANDO FILTRO DE SEGURANÇA PARA VENDEDOR')
      
      const seller = await prisma.seller.findUnique({
        where: { userId: session.user.id }
      })
      
      console.log('   🆔 Seller ID:', seller?.id)
      console.log('   📋 Filtro aplicado:')
      console.log('      - Apenas produtos com sellerId =', seller?.id)
      console.log('      - (Inclui produtos próprios E dropshipping que o vendedor adicionou)')
      
      whereCondition.sellerId = seller?.id
    } else {
      console.log('   🔓 ADMIN: Sem filtro de segurança (acesso total)')
    }

    console.log('   📊 Condição WHERE final:', JSON.stringify(whereCondition, null, 2))

    const products = await prisma.product.findMany({
      where: whereCondition,
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        seller: {
          select: {
            id: true,
            storeName: true,
            nomeFantasia: true,
            razaoSocial: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })

    console.log('✅ Produtos encontrados:', products.length)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎉 [SUCESSO] Requisição finalizada com sucesso!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    const seller = session.user.role === 'SELLER' ? await prisma.seller.findUnique({ where: { userId: session.user.id } }) : null
    
    await logApi({
      method: 'GET',
      endpoint: '/api/admin/products',
      statusCode: 200,
      userId: session.user.id,
      userRole: session.user.role,
      sellerId: seller?.id,
      sellerName: seller?.storeName,
      responseBody: { count: products.length },
      duration: Date.now() - startTime
    })
    
    return NextResponse.json(products)
  } catch (error: any) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('💥 [ERRO CRÍTICO] Erro ao buscar produtos')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ Tipo:', error.constructor.name)
    console.error('❌ Mensagem:', error.message)
    console.error('❌ Stack:', error.stack)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    await logApi({
      method: 'GET',
      endpoint: '/api/admin/products',
      statusCode: 500,
      errorMessage: error.message,
      duration: Date.now() - startTime
    })
    
    return NextResponse.json(
      { message: 'Erro ao buscar produtos', error: error.message },
      { status: 500 }
    )
  }
}
