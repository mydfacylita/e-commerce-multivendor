import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// API para importar apenas produtos selecionados
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { supplierId, products } = await req.json()

    if (!supplierId || !products || !Array.isArray(products)) {
      return NextResponse.json({ 
        success: false,
        error: 'Fornecedor e produtos são obrigatórios' 
      })
    }

    // Buscar categoria padrão
    let category = await prisma.category.findFirst({
      where: { slug: 'importados' }
    })

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: 'Importados',
          slug: 'importados',
          description: 'Produtos importados selecionados'
        }
      })
    }

    let importedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    // Importar cada produto selecionado
    for (const product of products) {
      try {
        // Verificar se produto já existe
        const existingProduct = await prisma.product.findFirst({
          where: { supplierSku: product.product_id }
        })

        if (existingProduct) {
          skippedCount++
          continue
        }

        // Calcular preços
        const costPrice = parseFloat(product.target_sale_price || '0')
        const margin = 0.5 // 50% de margem
        const price = costPrice * (1 + margin)
        const comparePrice = product.target_original_price 
          ? parseFloat(product.target_original_price) * (1 + margin)
          : price * 1.3

        // Traduzir título básico
        const translatedTitle = product.product_title
          .replace(/New/gi, 'Novo')
          .replace(/Fashion/gi, 'Moda')
          .replace(/Women/gi, 'Feminino')
          .replace(/Men/gi, 'Masculino')
          .replace(/Jewelry/gi, 'Joia')
          .replace(/Summer/gi, 'Verão')
          .replace(/Winter/gi, 'Inverno')

        // Descrição genérica
        const description = `✨ Produto Importado de Qualidade

📦 Características:
- Produto Original
- Envio Internacional
- Garantia de Qualidade

🚚 Informações de Entrega:
- Processamento: 2-5 dias úteis
- Prazo de entrega: 15-30 dias úteis
- Código de rastreamento fornecido

💯 Satisfação Garantida`

        // Criar produto no banco
        const newProduct = await prisma.product.create({
          data: {
            name: translatedTitle,
            slug: `${translatedTitle.toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .substring(0, 50)}-${Date.now()}`,
            description: description,
            price: Math.round(price * 100) / 100,
            comparePrice: Math.round(comparePrice * 100) / 100,
            costPrice: costPrice,
            margin: margin * 100,
            images: JSON.stringify([product.product_main_image_url]),
            stock: 9999, // Estoque infinito para dropshipping
            featured: false,
            categoryId: category.id,
            supplierId: supplierId,
            supplierSku: product.product_id,
            supplierUrl: product.product_detail_url,
          }
        })

        console.log(`✅ Produto importado: ${newProduct.name}`)
        importedCount++

      } catch (error: any) {
        console.error(`Erro ao importar produto ${product.product_id}:`, error)
        errors.push(`${product.product_title}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedCount,
      skipped: skippedCount,
      total: products.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('Erro na importação:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    })
  }
}