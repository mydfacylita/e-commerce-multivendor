import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    // Buscar token do banco de dados
    const mlAuth = await prisma.mercadoLivreAuth.findUnique({
      where: {
        userId: session.user.id,
      },
    })

    if (!mlAuth) {
      return NextResponse.json(
        { message: 'Conta do Mercado Livre não conectada' },
        { status: 400 }
      )
    }

    // Verificar se o token expirou
    if (mlAuth.expiresAt < new Date()) {
      return NextResponse.json(
        { message: 'Token expirado. Reconecte sua conta do Mercado Livre.' },
        { status: 401 }
      )
    }

    const accessToken = mlAuth.accessToken

    // Buscar apenas 5 produtos ativos para teste
    const products = await prisma.product.findMany({
      where: {
        stock: { gt: 0 },
      },
      include: {
        category: true,
        supplier: true,
      },
      take: 5, // Limitar a 5 produtos para teste
    })

    // Type assertion para incluir os novos campos
    type ProductWithExtras = typeof products[0] & {
      gtin?: string | null;
      brand?: string | null;
      model?: string | null;
      color?: string | null;
      mpn?: string | null;
    };

    const listedProducts = []
    const errors = []

    // Para cada produto, criar anúncio no Mercado Livre
    for (const productRaw of products) {
      const product = productRaw as ProductWithExtras
      try {
        // Usar API de Domain Discovery (preditor de categorias oficial)
        let mlCategoryId: string | null = null
        let categoryName = ''
        let suggestedAttributes: any[] = []
        
        try {
          const discoveryUrl = `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?limit=1&q=${encodeURIComponent(product.name)}`
          console.log(`🔍 Consultando categoria para "${product.name}"...`)
          
          const discoveryResponse = await fetch(discoveryUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          })
          
          if (discoveryResponse.ok) {
            const discoveryData = await discoveryResponse.json()
            
            if (discoveryData && discoveryData.length > 0) {
              const firstResult = discoveryData[0]
              mlCategoryId = firstResult.category_id
              categoryName = firstResult.category_name || firstResult.domain_name
              suggestedAttributes = firstResult.attributes || []
              
              console.log(`✅ Categoria prevista: ${categoryName} (${mlCategoryId})`)
              console.log(`📋 Atributos sugeridos:`, suggestedAttributes.map((a: any) => a.id).join(', '))
            } else {
              console.log(`⚠️ Nenhuma categoria encontrada pela API para "${product.name}"`)
            }
          } else {
            const errorText = await discoveryResponse.text()
            console.error(`❌ Erro na API de discovery (${discoveryResponse.status}):`, errorText)
          }
        } catch (apiError) {
          console.error(`❌ Erro ao consultar domain_discovery:`, apiError)
        }
        
        // Se não conseguiu categoria, pular produto
        if (!mlCategoryId) {
          console.log(`⏭️ Pulando "${product.name}" - não foi possível determinar categoria`)
          errors.push({
            productId: product.id,
            productName: product.name,
            error: 'Não foi possível determinar categoria do Mercado Livre',
            details: []
          })
          continue
        }
        
        // 🆕 Verificar se categoria exige GTIN obrigatoriamente
        // Categorias que exigem GTIN: Eletrônicos, Celulares, Notebooks, etc.
        const categoriesRequiringGTIN = ['MLB1055', 'MLB1652', 'MLB7457', 'MLB432206', 'MLB1051', 'MLB1000']
        if (!product.gtin && categoriesRequiringGTIN.includes(mlCategoryId)) {
          console.log(`⚠️ Pulando "${product.name}" - Categoria ${categoryName} (${mlCategoryId}) exige GTIN obrigatoriamente`)
          errors.push({
            productId: product.id,
            productName: product.name,
            categoryId: mlCategoryId,
            categoryName: categoryName,
            error: `Categoria ${categoryName} exige código GTIN (código de barras). Adicione o campo GTIN ao produto para listá-lo nesta categoria.`,
            details: ['Configure o GTIN em: /admin/produtos/' + product.id]
          })
          continue
        }
        
        // Arredondar preço para 2 casas decimais
        const roundedPrice = Math.round(product.price * 100) / 100

        // Construir atributos baseados nas sugestões da API
        const attributes: any[] = []
        
        // Lista de atributos que não podem ser usados na criação (apenas leitura)
        const nonModifiableAttributes = ['AGE_GROUP', 'GENDER', 'ITEM_CONDITION']
        
        // 🆕 ADICIONAR GTIN SE O PRODUTO TIVER
        if (product.gtin) {
          attributes.push({
            id: 'GTIN',
            value_name: product.gtin,
          })
          console.log(`✅ GTIN adicionado: ${product.gtin}`)
        }
        
        // 🆕 ADICIONAR BRAND SE O PRODUTO TIVER
        if (product.brand) {
          attributes.push({
            id: 'BRAND',
            value_name: product.brand,
          })
          console.log(`✅ Marca adicionada: ${product.brand}`)
        }
        
        // 🆕 ADICIONAR MODEL SE O PRODUTO TIVER
        if (product.model) {
          attributes.push({
            id: 'MODEL',
            value_name: product.model,
          })
          console.log(`✅ Modelo adicionado: ${product.model}`)
        }
        
        // 🆕 ADICIONAR COLOR SE O PRODUTO TIVER
        if (product.color) {
          attributes.push({
            id: 'COLOR',
            value_name: product.color,
          })
          console.log(`✅ Cor adicionada: ${product.color}`)
        }
        
        // 🆕 ADICIONAR MPN SE O PRODUTO TIVER
        if (product.mpn) {
          attributes.push({
            id: 'MPN',
            value_name: product.mpn,
          })
          console.log(`✅ MPN adicionado: ${product.mpn}`)
        }
        
        // Adicionar atributos sugeridos pela API (se existirem valores E não conflitarem com os já adicionados)
        for (const attr of suggestedAttributes) {
          // Pular atributos não modificáveis
          if (nonModifiableAttributes.includes(attr.id)) {
            console.log(`⚠️ Ignorando atributo não modificável: ${attr.id}`)
            continue
          }
          
          // Pular se já adicionamos este atributo
          if (attributes.find(a => a.id === attr.id)) {
            continue
          }
          
          if (attr.value_id || attr.value_name) {
            attributes.push({
              id: attr.id,
              value_id: attr.value_id || null,
              value_name: attr.value_name || null,
            })
          }
        }
        
        // Se não tem BRAND nos dados do produto, extrair do nome como fallback
        if (!product.brand && !attributes.find(a => a.id === 'BRAND')) {
          const brandMatch = product.name.match(/^([A-Z][a-z]+|[A-Z]+)\s/)
          if (brandMatch) {
            attributes.push({
              id: 'BRAND',
              value_name: brandMatch[1],
            })
          }
        }

        const itemData: any = {
          title: product.name.substring(0, 60), // ML limita a 60 caracteres
          category_id: mlCategoryId,
          price: roundedPrice,
          currency_id: 'BRL',
          available_quantity: 1, // Anúncios gratuitos (free) geralmente limitam a 1
          buying_mode: 'buy_it_now',
          condition: 'new',
          listing_type_id: 'free', // Usar 'free' para evitar custos
          description: {
            plain_text: product.description || product.name,
          },
          pictures: (() => {
            const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images
            return Array.isArray(images) ? images.slice(0, 10).map((url: string) => ({ source: url })) : []
          })(),
          shipping: {
            mode: 'not_specified', // Usar not_specified ao invés de me1/me2
            free_shipping: false,
          },
        }
        
        // Adicionar atributos se existirem
        if (attributes.length > 0) {
          itemData.attributes = attributes
          console.log(`📝 Enviando ${attributes.length} atributos:`, attributes.map(a => a.id).join(', '))
        }

        const response = await fetch('https://api.mercadolibre.com/items', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(itemData),
        })

        if (response.ok) {
          const mlProduct = await response.json()
          listedProducts.push({
            productId: product.id,
            mlItemId: mlProduct.id,
            permalink: mlProduct.permalink,
          })
          console.log(`✅ Produto listado com sucesso: ${mlProduct.id}`)
        } else {
          const error = await response.json()
          
          // Verificar se o erro é sobre atributos obrigatórios que não podemos preencher
          const errorStr = JSON.stringify(error)
          let errorMessage = error.message || 'Erro desconhecido'
          
          if (errorStr.includes('SIZE_GRID_ID')) {
            errorMessage = 'Categoria de moda requer tabela de tamanhos (SIZE_GRID_ID). Configure variações com tamanhos para este produto.'
          } else if (errorStr.includes('GTIN')) {
            errorMessage = 'Categoria requer código GTIN (código de barras). Adicione o GTIN ao produto ou use outra categoria.'
          }
          
          console.error('❌ Erro ao listar produto no ML:', {
            productId: product.id,
            productName: product.name,
            categoryId: mlCategoryId,
            categoryName: categoryName,
            statusCode: response.status,
            error: errorMessage,
            detailsJSON: JSON.stringify(error, null, 2)
          })
          
          errors.push({
            productId: product.id,
            productName: product.name,
            error: errorMessage,
            details: error.cause || [],
            category: `${categoryName} (${mlCategoryId})`
          })
        }
      } catch (error: any) {
        errors.push({
          productId: product.id,
          productName: product.name,
          error: error.message || 'Erro ao processar produto',
        })
      }
    }

    return NextResponse.json({
      success: listedProducts.length > 0,
      message: listedProducts.length > 0 
        ? `${listedProducts.length} produtos listados com sucesso`
        : 'Nenhum produto foi listado. Verifique os requisitos abaixo.',
      totalProducts: products.length,
      listedProducts,
      listedCount: listedProducts.length,
      errors: errors.length > 0 ? errors : undefined,
      errorsCount: errors.length,
      summary: {
        totalAnalyzed: products.length,
        successful: listedProducts.length,
        failed: errors.length,
        mainIssues: {
          needsGTIN: errors.filter(e => e.error?.includes('GTIN')).length,
          needsSizeGrid: errors.filter(e => e.error?.includes('SIZE_GRID_ID')).length,
          otherErrors: errors.filter(e => !e.error?.includes('GTIN') && !e.error?.includes('SIZE_GRID_ID')).length,
        },
        recommendations: [
          '📌 A maioria das categorias do ML agora exige código GTIN (código de barras)',
          '📌 Produtos de moda requerem tabela de tamanhos e variações',
          '📌 Para dropshipping, considere adicionar campo GTIN no cadastro de produtos',
          '📌 Ou use categorias mais genéricas que aceitem produtos sem GTIN',
        ]
      }
    })
  } catch (error: any) {
    console.error('Erro ao listar produtos no ML:', error)
    return NextResponse.json(
      { message: 'Erro ao listar produtos', error: error.message },
      { status: 500 }
    )
  }
}
