'use server'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST - Buscar produto no catálogo do ML por GTIN ou título
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { gtin, title, categoryId, domainId } = body

    if (!gtin && !title) {
      return NextResponse.json({ error: 'GTIN ou título é obrigatório' }, { status: 400 })
    }

    // Buscar configuração do ML - usar mercadoLivreAuth
    const integration = await prisma.mercadoLivreAuth.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (!integration?.accessToken) {
      return NextResponse.json(
        { error: 'Mercado Livre não conectado' },
        { status: 400 }
      )
    }

    // Primeiro tenta buscar por GTIN no catálogo
    if (gtin) {
      // Buscar diretamente pelo GTIN no catálogo
      const catalogUrl = `https://api.mercadolibre.com/products/search?status=active&site_id=MLB&product_identifier=${gtin}`
      const response = await fetch(catalogUrl, {
        headers: { Authorization: `Bearer ${integration.accessToken}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.results && data.results.length > 0) {
          // Buscar detalhes de cada produto encontrado
          const products = await Promise.all(
            data.results.slice(0, 5).map(async (productId: string) => {
              try {
                const productUrl = `https://api.mercadolibre.com/products/${productId}`
                const productResponse = await fetch(productUrl, {
                  headers: { Authorization: `Bearer ${integration.accessToken}` }
                })
                if (productResponse.ok) {
                  const product = await productResponse.json()
                  return {
                    id: product.id,
                    name: product.name,
                    status: product.status,
                    domainId: product.domain_id,
                    picture: product.pictures?.[0]?.url,
                    attributes: product.attributes?.slice(0, 10).map((a: any) => ({
                      id: a.id,
                      name: a.name,
                      value: a.value_name || a.value_struct?.number
                    }))
                  }
                }
              } catch (e) {
                console.log('Erro ao buscar produto:', e)
              }
              return null
            })
          )

          const validProducts = products.filter(Boolean)
          if (validProducts.length > 0) {
            return NextResponse.json({
              found: true,
              searchType: 'gtin',
              products: validProducts
            })
          }
        }
      }
    }

    // Se não achou por GTIN ou só tem título, busca por título
    if (title) {
      // Buscar no catálogo por título (com domínio se disponível)
      let searchUrl = `https://api.mercadolibre.com/products/search?status=active&site_id=MLB&q=${encodeURIComponent(title)}`
      if (domainId) {
        searchUrl += `&domain_id=${domainId}`
      }

      const response = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${integration.accessToken}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.results && data.results.length > 0) {
          const products = await Promise.all(
            data.results.slice(0, 8).map(async (productId: string) => {
              try {
                const productUrl = `https://api.mercadolibre.com/products/${productId}`
                const productResponse = await fetch(productUrl, {
                  headers: { Authorization: `Bearer ${integration.accessToken}` }
                })
                if (productResponse.ok) {
                  const product = await productResponse.json()
                  return {
                    id: product.id,
                    name: product.name,
                    status: product.status,
                    domainId: product.domain_id,
                    picture: product.pictures?.[0]?.url,
                    attributes: product.attributes?.slice(0, 10).map((a: any) => ({
                      id: a.id,
                      name: a.name,
                      value: a.value_name || a.value_struct?.number
                    }))
                  }
                }
              } catch (e) {
                console.log('Erro ao buscar produto:', e)
              }
              return null
            })
          )

          const validProducts = products.filter(Boolean)
          if (validProducts.length > 0) {
            return NextResponse.json({
              found: true,
              searchType: 'title',
              products: validProducts
            })
          }
        }
      }
    }

    // Não encontrou nada
    return NextResponse.json({
      found: false,
      message: 'Nenhum produto encontrado no catálogo do Mercado Livre',
      suggestion: gtin 
        ? 'O GTIN informado não foi encontrado. A categoria pode permitir publicação sem catálogo.'
        : 'Tente usar o código GTIN/EAN do produto para uma busca mais precisa.'
    })

  } catch (error) {
    console.error('Erro na busca de catálogo ML:', error)
    return NextResponse.json(
      { error: 'Erro interno ao buscar catálogo' },
      { status: 500 }
    )
  }
}
