'use server'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Buscar categorias do ML (por predição ou ID)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') // Para predição de categoria
    const categoryId = searchParams.get('categoryId') // Para buscar atributos de uma categoria
    const parentId = searchParams.get('parentId') // Para buscar subcategorias

    // Buscar configuração do ML - usar mercadoLivreAuth
    const integration = await prisma.mercadoLivreAuth.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (!integration?.accessToken) {
      return NextResponse.json(
        { error: 'Mercado Livre não conectado. Vá em Configurações > Integrações para conectar.' },
        { status: 400 }
      )
    }

    // Se tem query, faz predição de categoria baseada no título/nome do produto
    if (query) {
      const predictUrl = `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?q=${encodeURIComponent(query)}`
      const response = await fetch(predictUrl, {
        headers: { Authorization: `Bearer ${integration.accessToken}` }
      })
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Erro ao predizer categoria:', error)
        return NextResponse.json({ error: 'Erro ao buscar categorias sugeridas' }, { status: 400 })
      }

      const predictions = await response.json()
      
      // Retorna as categorias sugeridas
      return NextResponse.json({
        predictions: predictions.slice(0, 10).map((p: any) => ({
          categoryId: p.category_id,
          categoryName: p.category_name,
          domainId: p.domain_id,
          domainName: p.domain_name,
          attributes: p.attributes || []
        }))
      })
    }

    // Se tem categoryId, busca os detalhes e atributos obrigatórios dessa categoria
    if (categoryId) {
      // Buscar detalhes da categoria
      const categoryUrl = `https://api.mercadolibre.com/categories/${categoryId}`
      const categoryResponse = await fetch(categoryUrl, {
        headers: { Authorization: `Bearer ${integration.accessToken}` }
      })

      if (!categoryResponse.ok) {
        return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
      }

      const category = await categoryResponse.json()

      // Buscar atributos da categoria
      const attributesUrl = `https://api.mercadolibre.com/categories/${categoryId}/attributes`
      const attributesResponse = await fetch(attributesUrl, {
        headers: { Authorization: `Bearer ${integration.accessToken}` }
      })

      let attributes: any[] = []
      if (attributesResponse.ok) {
        attributes = await attributesResponse.json()
      }

      // Verificar se a categoria exige catálogo
      // listing_strategy = 'catalog_required' | 'catalog_only' = de fato OBRIGATÓRIO
      // catalog_domain presente mas listing_strategy = 'open'/'buybox' = OPCIONAL (usuário escolhe)
      let requiresCatalog = false
      let catalogAvailable = false // catálogo existe mas não é obrigatório
      let catalogDomain = null

      const listingStrategy = category.settings?.listing_strategy
      catalogDomain = category.settings?.catalog_domain || null

      if (listingStrategy === 'catalog_required' || listingStrategy === 'catalog_only') {
        requiresCatalog = true
        catalogAvailable = true
      } else if (catalogDomain) {
        // Tem catálogo disponível mas NÃO é obrigatório - usuário pode escolher
        requiresCatalog = false
        catalogAvailable = true
      }

      // Separar atributos obrigatórios e opcionais
      const requiredAttributes = attributes.filter((attr: any) => 
        attr.tags?.required || attr.tags?.catalog_required
      )
      const optionalAttributes = attributes.filter((attr: any) => 
        !attr.tags?.required && !attr.tags?.catalog_required
      )

      return NextResponse.json({
        category: {
          id: category.id,
          name: category.name,
          path: category.path_from_root?.map((p: any) => p.name).join(' > '),
          requiresCatalog,
          catalogAvailable,
          catalogDomain,
          listingStrategy: listingStrategy || null,
          listingAllowed: category.settings?.listing_allowed !== false,
          pictureConfig: category.settings?.picture_config,
        },
        requiredAttributes: requiredAttributes.map((attr: any) => ({
          id: attr.id,
          name: attr.name,
          type: attr.value_type,
          values: attr.values?.slice(0, 50) || [], // Limitar valores para performance
          allowedUnits: attr.allowed_units,
          hint: attr.hint,
          tooltip: attr.tooltip
        })),
        optionalAttributes: optionalAttributes.slice(0, 20).map((attr: any) => ({
          id: attr.id,
          name: attr.name,
          type: attr.value_type,
          values: attr.values?.slice(0, 50) || [],
          allowedUnits: attr.allowed_units,
        }))
      })
    }

    // Se tem parentId, busca subcategorias
    if (parentId) {
      const childrenUrl = `https://api.mercadolibre.com/categories/${parentId}`
      const response = await fetch(childrenUrl, {
        headers: { Authorization: `Bearer ${integration.accessToken}` }
      })

      if (!response.ok) {
        return NextResponse.json({ error: 'Categoria pai não encontrada' }, { status: 404 })
      }

      const parentCategory = await response.json()
      
      return NextResponse.json({
        parent: {
          id: parentCategory.id,
          name: parentCategory.name
        },
        children: parentCategory.children_categories?.map((c: any) => ({
          id: c.id,
          name: c.name,
          totalItemsInCategory: c.total_items_in_this_category
        })) || []
      })
    }

    // Se não tem nenhum parâmetro, retorna categorias raiz
    const rootUrl = 'https://api.mercadolibre.com/sites/MLB/categories'
    const response = await fetch(rootUrl, {
      headers: { Authorization: `Bearer ${integration.accessToken}` }
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 })
    }

    const categories = await response.json()
    
    return NextResponse.json({
      categories: categories.map((c: any) => ({
        id: c.id,
        name: c.name
      }))
    })

  } catch (error) {
    console.error('Erro na API de categorias ML:', error)
    return NextResponse.json(
      { error: 'Erro interno ao buscar categorias' },
      { status: 500 }
    )
  }
}
