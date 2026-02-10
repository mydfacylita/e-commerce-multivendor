'use server'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  info: string[]
  categoryInfo?: {
    id: string
    name: string
    requiresCatalog: boolean
    catalogDomain?: string
  }
  requiredAttributes?: {
    id: string
    name: string
    filled: boolean
    value?: string
  }[]
  productData?: any
}

// POST - Validar produto antes de publicar no ML
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, categoryId, catalogProductId } = body

    if (!productId) {
      return NextResponse.json({ error: 'ID do produto é obrigatório' }, { status: 400 })
    }

    // Buscar produto
    const product = await prisma.product.findFirst({
      where: { 
        id: productId
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    // Buscar categoria se existir
    let productCategory: any = null
    if (product.categoryId) {
      productCategory = await prisma.category.findUnique({
        where: { id: product.categoryId }
      })
    }

    // Buscar imagens - usando a tabela correta
    let productImages: any[] = []
    try {
      // Tentar buscar de ProductImage ou usar campo images do produto
      productImages = (product as any).images || []
    } catch (e) {
      console.log('Imagens não encontradas')
    }

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

    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      info: [],
      productData: {
        title: product.name,
        price: product.comparePrice || product.price,
        stock: product.stock,
        brand: product.brand,
        gtin: product.gtin,
        description: product.description,
        imagesCount: productImages.length,
        weight: product.weight,
        dimensions: {
          width: product.width,
          height: product.height,
          depth: product.length
        }
      }
    }

    // ==================== VALIDAÇÕES BÁSICAS DO PRODUTO ====================

    // Título
    if (!product.name || product.name.length < 5) {
      result.errors.push('O título do produto é muito curto (mínimo 5 caracteres)')
      result.valid = false
    } else if (product.name.length > 60) {
      result.warnings.push(`O título tem ${product.name.length} caracteres. ML recomenda até 60.`)
    }

    // Preço
    const price = Number(product.comparePrice || product.price || 0)
    if (price <= 0) {
      result.errors.push('O produto precisa ter um preço válido')
      result.valid = false
    } else if (price < 5) {
      result.warnings.push('Preço muito baixo. O Mercado Livre pode exigir um mínimo maior dependendo da categoria.')
    }

    // Estoque
    if (!product.stock || product.stock <= 0) {
      result.errors.push('O produto precisa ter estoque disponível')
      result.valid = false
    }

    // Imagens
    if (!productImages || productImages.length === 0) {
      result.errors.push('O produto precisa ter pelo menos uma imagem')
      result.valid = false
    } else if (productImages.length < 3) {
      result.warnings.push('Recomendamos ter pelo menos 3 imagens para melhor conversão')
    } else {
      result.info.push(`✓ ${productImages.length} imagens cadastradas`)
    }

    // Marca
    if (!product.brand || product.brand.trim() === '') {
      result.warnings.push('Marca não informada. Será usada "Genérica"')
    } else {
      result.info.push(`✓ Marca: ${product.brand}`)
    }

    // GTIN
    if (product.gtin && product.gtin.trim() !== '') {
      result.info.push(`✓ GTIN: ${product.gtin}`)
    } else {
      result.info.push('ℹ Sem GTIN - Será marcado como "produto sem código universal"')
    }

    // Peso e dimensões para frete
    if (!product.weight || product.weight <= 0) {
      result.warnings.push('Peso não informado. Pode afetar o cálculo de frete.')
    }

    if (!product.width || !product.height || !product.length) {
      result.warnings.push('Dimensões (largura, altura, profundidade) incompletas.')
    }

    // ==================== VALIDAÇÃO DE CATEGORIA ====================

    let mlCategoryId = categoryId

    // Se não foi fornecida categoria, tenta usar a categoria mapeada do produto
    if (!mlCategoryId && productCategory?.mlCategoryId) {
      mlCategoryId = productCategory.mlCategoryId
      result.info.push(`ℹ Usando categoria mapeada: ${productCategory.mlCategoryId}`)
    }

    if (!mlCategoryId) {
      result.errors.push('Selecione uma categoria do Mercado Livre')
      result.valid = false
    } else {
      // Verificar se a categoria existe e se permite listagem
      try {
        const categoryUrl = `https://api.mercadolibre.com/categories/${mlCategoryId}`
        const categoryResponse = await fetch(categoryUrl, {
          headers: { Authorization: `Bearer ${integration.accessToken}` }
        })

        if (!categoryResponse.ok) {
          result.errors.push(`Categoria ${mlCategoryId} não encontrada no Mercado Livre`)
          result.valid = false
        } else {
          const category = await categoryResponse.json()
          
          result.categoryInfo = {
            id: category.id,
            name: category.name,
            requiresCatalog: false,
            catalogDomain: undefined
          }

          // Verificar se categoria permite listagem
          if (category.settings?.listing_allowed === false) {
            result.errors.push('Esta categoria não permite listagem direta')
            result.valid = false
          }

          // Verificar se exige catálogo
          if (category.settings?.catalog_domain) {
            result.categoryInfo.requiresCatalog = true
            result.categoryInfo.catalogDomain = category.settings.catalog_domain

            if (!catalogProductId) {
              // Tentar encontrar produto no catálogo automaticamente
              if (product.gtin) {
                const catalogUrl = `https://api.mercadolibre.com/products/search?status=active&site_id=MLB&product_identifier=${product.gtin}`
                const catalogResponse = await fetch(catalogUrl, {
                  headers: { Authorization: `Bearer ${integration.accessToken}` }
                })

                if (catalogResponse.ok) {
                  const catalogData = await catalogResponse.json()
                  if (catalogData.results && catalogData.results.length > 0) {
                    result.info.push(`✓ Produto encontrado no catálogo pelo GTIN: ${catalogData.results[0]}`)
                    result.productData.suggestedCatalogId = catalogData.results[0]
                  } else {
                    result.warnings.push('Categoria exige catálogo, mas o GTIN não foi encontrado no catálogo ML')
                  }
                }
              } else {
                result.warnings.push('Esta categoria geralmente exige vinculação com catálogo. Tente buscar o produto.')
              }
            } else {
              result.info.push(`✓ Produto vinculado ao catálogo: ${catalogProductId}`)
            }
          }

          // Verificar atributos obrigatórios
          const attributesUrl = `https://api.mercadolibre.com/categories/${mlCategoryId}/attributes`
          const attributesResponse = await fetch(attributesUrl, {
            headers: { Authorization: `Bearer ${integration.accessToken}` }
          })

          if (attributesResponse.ok) {
            const attributes = await attributesResponse.json()
            const requiredAttrs = attributes.filter((a: any) => a.tags?.required)
            
            result.requiredAttributes = requiredAttrs.map((attr: any) => {
              let filled = false
              let value: string | undefined

              // Verificar se temos o atributo preenchido no produto
              if (attr.id === 'BRAND') {
                filled = !!product.brand
                value = product.brand || undefined
              } else if (attr.id === 'GTIN') {
                filled = !!product.gtin
                value = product.gtin || undefined
              } else if (attr.id === 'MODEL' || attr.id === 'LINE' || attr.id === 'FAMILY_NAME') {
                // Tentar extrair do nome do produto
                filled = true
                value = product.name.split(' ')[0]
              }

              return {
                id: attr.id,
                name: attr.name,
                filled,
                value
              }
            })

            const missingAttrs = (result.requiredAttributes || []).filter(a => !a.filled)
            if (missingAttrs.length > 0) {
              result.warnings.push(`Atributos obrigatórios que podem precisar de atenção: ${missingAttrs.map(a => a.name).join(', ')}`)
            }
          }

          result.info.push(`✓ Categoria: ${category.name}`)
        }
      } catch (e) {
        console.error('Erro ao verificar categoria:', e)
        result.warnings.push('Não foi possível verificar detalhes da categoria')
      }
    }

    // ==================== RESUMO FINAL ====================

    if (result.valid && result.errors.length === 0) {
      result.info.unshift('✅ Produto pronto para publicação!')
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Erro na validação pré-publicação:', error)
    return NextResponse.json(
      { error: 'Erro interno ao validar produto' },
      { status: 500 }
    )
  }
}
