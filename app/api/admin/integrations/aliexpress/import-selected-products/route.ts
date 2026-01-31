import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { parseAliExpressVariants, stringifyVariants } from '@/lib/product-variants'

// Função para gerar assinatura AliExpress
function generateSign(params: Record<string, any>, appSecret: string): string {
  const sortedKeys = Object.keys(params).filter(key => key !== 'sign').sort()
  const signString = sortedKeys.map(key => `${key}${params[key]}`).join('')
  return crypto.createHmac('sha256', appSecret).update(signString).digest('hex').toUpperCase()
}

// Buscar detalhes completos do produto
async function fetchProductDetails(productId: string, auth: any) {
  try {
    const apiUrl = 'https://api-sg.aliexpress.com/sync'
    const timestamp = Date.now().toString()

    const params: Record<string, any> = {
      app_key: auth.appKey,
      method: 'aliexpress.ds.product.get',
      session: auth.accessToken,
      timestamp: timestamp,
      format: 'json',
      v: '2.0',
      sign_method: 'sha256',
      product_id: String(productId),
      ship_to_country: 'BR',
      target_currency: 'BRL',
      target_language: 'PT',
    }
    params.sign = generateSign(params, auth.appSecret)

    const response = await fetch(`${apiUrl}?${new URLSearchParams(params).toString()}`)
    const data = await response.json()

    if (data.aliexpress_ds_product_get_response?.result) {
      return data.aliexpress_ds_product_get_response.result
    }
    return null
  } catch (error) {
    console.error('Erro ao buscar detalhes:', error)
    return null
  }
}

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

    // Buscar credenciais AliExpress
    const auth = await prisma.aliExpressAuth.findFirst()

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

        // Buscar detalhes completos do produto se tiver credenciais
        let allImages: string[] = [product.product_main_image_url]
        let fullDescription = ''
        let attributes: string[] = []
        let productTitle = product.product_title
        let skuList: any[] = []
        
        // Novos campos para salvar dados completos da API
        let supplierStoreId = ''
        let supplierStoreName = ''
        let supplierCountryCode = ''
        let shipFromCountry = ''
        let deliveryDays: number | null = null
        let gtin = ''
        let weightWithPackage: number | null = null
        let lengthWithPackage: number | null = null
        let widthWithPackage: number | null = null
        let heightWithPackage: number | null = null
        let supplierStock: number | null = null
        let brand = ''

        if (auth?.accessToken) {
          console.log(`📦 Buscando detalhes de: ${product.product_id}`)
          const details = await fetchProductDetails(product.product_id, auth)
          
          if (details) {
            const baseInfo = details.ae_item_base_info_dto
            const skuInfo = details.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o || []
            skuList = Array.isArray(skuInfo) ? skuInfo : [skuInfo]

            // Título original
            if (baseInfo?.subject) {
              productTitle = baseInfo.subject
            }
            
            // ========== EXTRAIR DADOS DO FORNECEDOR ==========
            const storeInfo = details.ae_store_info
            if (storeInfo) {
              supplierStoreId = storeInfo.store_id?.toString() || ''
              supplierStoreName = storeInfo.store_name || ''
              supplierCountryCode = storeInfo.store_country_code || ''
            }
            
            // ========== EXTRAIR DADOS DE LOGÍSTICA ==========
            const logisticsInfo = details.logistics_info_dto
            if (logisticsInfo) {
              shipFromCountry = logisticsInfo.ship_to_country || ''
              deliveryDays = logisticsInfo.delivery_time || null
            }
            
            // ========== EXTRAIR DADOS DO PACOTE ==========
            const packageInfo = details.package_info_dto
            if (packageInfo) {
              weightWithPackage = parseFloat(packageInfo.gross_weight) || null
              // API retorna 1 quando não tem dimensões reais, ignorar nesses casos
              lengthWithPackage = packageInfo.package_length > 1 ? packageInfo.package_length : null
              widthWithPackage = packageInfo.package_width > 1 ? packageInfo.package_width : null
              heightWithPackage = packageInfo.package_height > 1 ? packageInfo.package_height : null
            }
            
            // ========== EXTRAIR GTIN/EAN E ESTOQUE DO PRIMEIRO SKU ==========
            if (skuList.length > 0) {
              gtin = skuList[0].ean_code || ''
              supplierStock = skuList[0].sku_available_stock || null
            }

            // TODAS as imagens
            if (details.ae_multimedia_info_dto?.image_urls) {
              const imgs = details.ae_multimedia_info_dto.image_urls.split(';')
              allImages = imgs.map((img: string) => 
                img.startsWith('http') ? img : `https:${img}`
              ).filter((img: string) => img.length > 10)
            }

            // Adicionar imagens das variações
            skuList.forEach((sku: any) => {
              if (sku.sku_image) {
                const skuImg = sku.sku_image.startsWith('http') ? sku.sku_image : `https:${sku.sku_image}`
                if (!allImages.includes(skuImg)) {
                  allImages.push(skuImg)
                }
              }
            })

            // Descrição HTML
            if (baseInfo?.detail) {
              fullDescription = baseInfo.detail
            } else if (baseInfo?.mobile_detail) {
              fullDescription = baseInfo.mobile_detail
            }

            // Atributos/Características - FILTRAR APENAS OS IMPORTANTES
            if (details.ae_item_properties?.ae_item_property) {
              const props = details.ae_item_properties.ae_item_property
              const propList = Array.isArray(props) ? props : [props]
              
              // Palavras-chave de atributos importantes
              const importantKeys = ['marca', 'brand', 'material', 'tamanho', 'size', 'cor', 'color', 
                                     'modelo', 'model', 'capacidade', 'capacity', 'tela', 'screen',
                                     'memória', 'memory', 'bateria', 'battery', 'resolução', 'resolution',
                                     'peso', 'weight', 'voltagem', 'voltage']
              
              const filteredProps = propList.filter((prop: any) => {
                const name = (prop.attr_name || prop.attr_name_id || '').toLowerCase()
                return importantKeys.some(key => name.includes(key))
              })
              
              attributes = filteredProps.slice(0, 8).map((prop: any) => 
                `<li><strong>${prop.attr_name || prop.attr_name_id}:</strong> ${prop.attr_value || prop.attr_value_id}</li>`
              )
              
              // Extrair marca
              const brandAttr = propList.find((prop: any) => {
                const name = (prop.attr_name || '').toLowerCase()
                return name.includes('marca') || name.includes('brand')
              })
              if (brandAttr) brand = brandAttr.attr_value || ''
            }
          }

          // Rate limit
          await new Promise(resolve => setTimeout(resolve, 300))
        }

        // Calcular preços
        const costPrice = parseFloat(product.target_sale_price || '0')
        const margin = 1.0 // 100% de margem (2x o custo)
        const price = costPrice * (1 + margin)
        const comparePrice = product.target_original_price 
          ? parseFloat(product.target_original_price) * (1 + margin)
          : price * 1.3

        // Montar descrição LIMPA e formatada em HTML
        const attributesHtml = attributes.length > 0 
          ? `<h3>📋 Especificações</h3><ul>${attributes.join('')}</ul>`
          : ''

        const description = `
<h2>${productTitle}</h2>

${attributesHtml}

<h3>📦 Informações de Entrega</h3>
<ul>
  <li>Prazo de envio: 2-5 dias úteis</li>
  <li>Prazo de entrega: 15-40 dias úteis</li>
  <li>Código de rastreamento fornecido</li>
</ul>

<h3>✅ Garantia</h3>
<p>Produto com garantia de 30 dias contra defeitos de fabricação.</p>
        `.trim()

        // Gerar slug único
        const slug = productTitle
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 80) + '-' + product.product_id.slice(-6)

        // Gerar variants usando o módulo padronizado
        let variantsJson: string | undefined = undefined
        let selectedSkusJson: string | undefined = undefined
        
        if (auth?.accessToken && skuList.length > 0) {
          // Buscar detalhes frescos para ter estrutura completa
          const fullDetails = await fetchProductDetails(product.product_id, auth)
          if (fullDetails) {
            // Usar o parser padronizado
            const variants = parseAliExpressVariants(fullDetails)
            variantsJson = stringifyVariants(variants)
            
            // Gerar selectedSkus no formato correto (simples)
            selectedSkusJson = JSON.stringify(variants.skus.map(sku => ({
              skuId: sku.skuId,
              enabled: true,
              customPrice: Math.round(sku.price * 1.5 * 100) / 100, // 50% de margem
              margin: 50,
              costPrice: sku.price
            })))
          }
        }

        // Criar produto no banco com TODOS os dados da API
        const newProduct = await prisma.product.create({
          data: {
            name: productTitle,
            slug: slug,
            description: description,
            price: Math.round(price * 100) / 100,
            comparePrice: Math.round(comparePrice * 100) / 100,
            costPrice: costPrice,
            margin: margin * 100,
            images: JSON.stringify(allImages),
            stock: supplierStock || 9999,
            featured: false,
            categoryId: category.id,
            supplierId: supplierId,
            supplierSku: product.product_id,
            supplierUrl: product.product_detail_url,
            availableForDropship: true,
            // Novos campos da API
            brand: brand || undefined,
            gtin: gtin || undefined,
            supplierStoreId: supplierStoreId || undefined,
            supplierStoreName: supplierStoreName || undefined,
            supplierCountryCode: supplierCountryCode || undefined,
            shipFromCountry: shipFromCountry || undefined,
            deliveryDays: deliveryDays || undefined,
            supplierStock: supplierStock || undefined,
            weightWithPackage: weightWithPackage || undefined,
            lengthWithPackage: lengthWithPackage || undefined,
            widthWithPackage: widthWithPackage || undefined,
            heightWithPackage: heightWithPackage || undefined,
            // Variantes e SKUs selecionados - usando estrutura padronizada
            variants: variantsJson || undefined,
            selectedSkus: selectedSkusJson || undefined,
          }
        })

        console.log(`✅ Produto importado: ${newProduct.name} (${allImages.length} imagens, País: ${supplierCountryCode || 'N/A'})`)
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