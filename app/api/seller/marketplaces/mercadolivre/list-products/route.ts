import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    // Buscar vendedor
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { seller: true, workForSeller: true }
    })

    const seller = user?.seller || user?.workForSeller
    if (!seller) {
      return NextResponse.json({ message: 'Vendedor não encontrado' }, { status: 404 })
    }

    // Buscar token do VENDEDOR (não do admin)
    const mlCredential = await prisma.sellerMarketplaceCredential.findUnique({
      where: {
        sellerId_marketplace: {
          sellerId: seller.id,
          marketplace: 'mercadolivre'
        }
      }
    })

    if (!mlCredential || !mlCredential.mlAccessToken) {
      return NextResponse.json(
        { message: 'Conta do Mercado Livre não conectada. Clique em "Conectar com Mercado Livre" primeiro.' },
        { status: 400 }
      )
    }

    // Verificar se o token expirou
    if (mlCredential.mlExpiresAt && mlCredential.mlExpiresAt < new Date()) {
      return NextResponse.json(
        { message: 'Token expirado. Reconecte sua conta do Mercado Livre.' },
        { status: 401 }
      )
    }

    const accessToken = mlCredential.mlAccessToken

    // Buscar apenas produtos DO VENDEDOR
    const products = await prisma.product.findMany({
      where: {
        sellerId: seller.id,
        stock: { gt: 0 },
        active: true,
      },
      include: {
        category: true,
      },
      take: 10, // Limitar para não sobrecarregar
    })

    if (products.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Você não tem produtos ativos em estoque para listar.',
        totalProducts: 0,
        listedProducts: [],
        listedCount: 0,
      })
    }

    // Type assertion para campos extras
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
        // Usar API de Domain Discovery (preditor de categorias)
        let mlCategoryId: string | null = null
        let categoryName = ''
        let suggestedAttributes: any[] = []
        
        try {
          const discoveryUrl = `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?limit=1&q=${encodeURIComponent(product.name)}`
          
          const discoveryResponse = await fetch(discoveryUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          })
          
          if (discoveryResponse.ok) {
            const discoveryData = await discoveryResponse.json()
            
            if (discoveryData && discoveryData.length > 0) {
              const firstResult = discoveryData[0]
              mlCategoryId = firstResult.category_id
              categoryName = firstResult.category_name || firstResult.domain_name
              suggestedAttributes = firstResult.attributes || []
            }
          }
        } catch (apiError) {
          console.error(`Erro ao consultar domain_discovery:`, apiError)
        }
        
        // Se não conseguiu categoria, pular produto
        if (!mlCategoryId) {
          errors.push({
            productId: product.id,
            productName: product.name,
            error: 'Não foi possível determinar categoria do Mercado Livre',
          })
          continue
        }
        
        // Arredondar preço
        const roundedPrice = Math.round(product.price * 100) / 100

        // Construir atributos
        const attributes: any[] = []
        const nonModifiableAttributes = ['AGE_GROUP', 'GENDER', 'ITEM_CONDITION']
        
        if (product.gtin) {
          attributes.push({ id: 'GTIN', value_name: product.gtin })
        }
        
        if (product.brand) {
          attributes.push({ id: 'BRAND', value_name: product.brand })
        }
        
        if (product.model) {
          attributes.push({ id: 'MODEL', value_name: product.model })
        }
        
        if (product.color) {
          attributes.push({ id: 'COLOR', value_name: product.color })
        }
        
        if (product.mpn) {
          attributes.push({ id: 'MPN', value_name: product.mpn })
        }
        
        // Adicionar atributos sugeridos
        for (const attr of suggestedAttributes) {
          if (nonModifiableAttributes.includes(attr.id)) continue
          if (attributes.find(a => a.id === attr.id)) continue
          
          if (attr.value_id || attr.value_name) {
            attributes.push({
              id: attr.id,
              value_id: attr.value_id || null,
              value_name: attr.value_name || null,
            })
          }
        }

        const itemData: any = {
          title: product.name.substring(0, 60),
          category_id: mlCategoryId,
          price: roundedPrice,
          currency_id: 'BRL',
          available_quantity: Math.min(product.stock || 1, 999),
          buying_mode: 'buy_it_now',
          condition: 'new',
          listing_type_id: 'free',
          description: {
            plain_text: product.description || product.name,
          },
          pictures: (() => {
            const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images
            return Array.isArray(images) ? images.slice(0, 10).map((url: string) => ({ source: url })) : []
          })(),
          shipping: {
            mode: 'not_specified',
            free_shipping: false,
          },
        }
        
        if (attributes.length > 0) {
          itemData.attributes = attributes
        }

        // CRIAR ANÚNCIO NA CONTA DO VENDEDOR (usando o token dele!)
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
          
          // Salvar no MarketplaceListing para rastreamento
          await prisma.marketplaceListing.upsert({
            where: {
              productId_marketplace: {
                productId: product.id,
                marketplace: 'mercadolivre'
              }
            },
            create: {
              productId: product.id,
              marketplace: 'mercadolivre',
              listingId: mlProduct.id,
              status: 'active',
              listingUrl: mlProduct.permalink
            },
            update: {
              listingId: mlProduct.id,
              status: 'active',
              listingUrl: mlProduct.permalink,
              lastSyncAt: new Date()
            }
          })
        } else {
          const error = await response.json()
          let errorMessage = error.message || 'Erro desconhecido'
          
          if (JSON.stringify(error).includes('GTIN')) {
            errorMessage = 'Categoria requer código GTIN (código de barras).'
          }
          
          errors.push({
            productId: product.id,
            productName: product.name,
            error: errorMessage,
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
        ? `${listedProducts.length} produtos listados com sucesso na SUA conta do Mercado Livre!`
        : 'Nenhum produto foi listado. Verifique os erros abaixo.',
      totalProducts: products.length,
      listedProducts,
      listedCount: listedProducts.length,
      errors: errors.length > 0 ? errors : undefined,
      errorsCount: errors.length,
    })
  } catch (error: any) {
    console.error('Erro ao listar produtos no ML:', error)
    return NextResponse.json(
      { message: 'Erro ao listar produtos', error: error.message },
      { status: 500 }
    )
  }
}
