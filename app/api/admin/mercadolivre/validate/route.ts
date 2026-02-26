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

              // Helper: normaliza nome de atributo (lowercase, sem acentos, underscores)
              const normalizeAttrKey = (k: string): string =>
                k.toLowerCase().trim()
                  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                  .replace(/\s+/g, '_')
                  .replace(/[^a-z0-9_]/g, '')

              // Mapeamento: ID do ML → lista de sinônimos normalizados (PT-BR / EN)
              // Todas as chaves já estão normalizadas (lowercase, sem acentos, underscores)
              const CUSTOM_ATTR_ID_MAP: Record<string, string[]> = {
                // GERAL
                'COLOR':          ['cor', 'color', 'colour', 'cor_principal', 'main_color'],
                'BRAND':          ['marca', 'brand', 'fabricante', 'manufacturer'],
                'MODEL':          ['modelo', 'model'],
                'LINE':           ['linha', 'line', 'familia', 'family', 'linha_do_produto', 'linha_do_processador', 'linha_processador'],
                'WARRANTY_TYPE':  ['garantia', 'warranty', 'tipo_de_garantia', 'prazo_garantia'],
                'ALPHANUMERIC_MODELS': ['modelo_alfanumerico', 'alphanumeric_model', 'codigo_modelo', 'part_number'],
                'MATERIAL':       ['material', 'material_principal', 'composicao', 'composition'],
                'TYPE':           ['tipo', 'type'],
                'VOLTAGE':        ['voltagem', 'voltage', 'tensao', 'volts', 'bivolt'],
                'POWER':          ['potencia', 'power', 'watts', 'watt'],
                'ENERGY_EFFICIENCY': ['eficiencia_energetica', 'energy_efficiency', 'consumo', 'classe_energetica'],
                // DIMENSÕES
                'TOTAL_WIDTH':    ['largura', 'width', 'largura_total', 'total_width'],
                'TOTAL_HEIGHT':   ['altura', 'height', 'altura_total', 'total_height'],
                'TOTAL_LENGTH':   ['comprimento', 'length', 'comprimento_total', 'total_length'],
                'TOTAL_DEPTH':    ['profundidade', 'depth'],
                'THICKNESS':      ['espessura', 'thickness'],
                'TOTAL_DIAMETER': ['diametro', 'diameter', 'diametro_total', 'total_diameter'],
                'PACKAGE_WEIGHT': ['peso', 'weight', 'peso_embalagem', 'package_weight'],
                'NET_WEIGHT':     ['peso_liquido', 'net_weight'],
                'PACKAGE_HEIGHT': ['altura_embalagem', 'package_height'],
                'PACKAGE_WIDTH':  ['largura_embalagem', 'package_width'],
                'PACKAGE_LENGTH': ['comprimento_embalagem', 'package_length'],
                // CONECTIVIDADE
                'CONNECTIVITY':   ['conectividade', 'connectivity', 'conexao', 'tipo_conexao', 'interface'],
                'WITH_WI_FI':     ['wifi', 'wi_fi', 'com_wifi', 'tem_wifi', 'with_wi_fi', 'wireless'],
                'WITH_BLUETOOTH': ['bluetooth', 'com_bluetooth', 'tem_bluetooth'],
                'HDMI_PORTS':     ['portas_hdmi', 'hdmi_ports', 'quantidade_hdmi', 'hdmi'],
                'USB_PORTS':      ['portas_usb', 'usb_ports', 'quantidade_usb'],
                'WITH_USB':       ['com_usb', 'with_usb', 'tem_usb', 'carregamento_usb'],
                // NOTEBOOKS/LAPTOPS
                'CPU_MODEL':      ['processador', 'processor', 'cpu', 'cpu_model', 'modelo_do_processador', 'chip', 'chipset'],
                'CPU_BRAND':      ['marca_do_processador', 'marca_processador', 'cpu_brand', 'processor_brand', 'fabricante_processador'],
                'SCREEN_SIZE':    ['tamanho_da_tela', 'tamanho_de_tela', 'screen_size', 'tela', 'display', 'tamanho_display'],
                'RAM':            ['memoria_ram', 'ram', 'memoria', 'memory'],
                'INTERNAL_MEMORY': ['armazenamento', 'storage', 'hd', 'ssd', 'hdd', 'nvme', 'capacidade_armazenamento'],
                'OPERATING_SYSTEM': ['sistema_operacional', 'operating_system', 'sistema', 'os'],
                'GPU':            ['placa_de_video', 'gpu', 'placa_video', 'grafica', 'video_card', 'placa_grafica'],
                'PROCESSOR_SPEED': ['velocidade_processador', 'processor_speed', 'clock', 'frequencia_processador', 'ghz'],
                'BATTERY_CAPACITY': ['bateria', 'battery', 'capacidade_bateria', 'battery_capacity', 'autonomia', 'mah'],
                // CELULARES
                'IS_DUAL_SIM':    ['dual_sim', 'dual_chip', 'dois_chips'],
                'CARRIER':        ['operadora', 'carrier'],
                'CELLPHONES_ANATEL_HOMOLOGATION_NUMBER': ['anatel', 'homologacao_anatel', 'numero_anatel', 'certificacao_anatel', 'numero_homologacao'],
                'NETWORK_TECHNOLOGY': ['rede', 'network', 'tecnologia_rede', '5g', '4g'],
                // TVs/MONITORES
                'RESOLUTION':     ['resolucao', 'resolution', 'definicao'],
                'SMART_TV':       ['smart_tv', 'e_smart', 'possui_smart'],
                'HDR_TECHNOLOGY': ['hdr', 'hdr_technology', 'tecnologia_hdr'],
                'REFRESH_RATE':   ['taxa_de_atualizacao', 'taxa_atualizacao', 'refresh_rate', 'hz', 'hertz'],
                'SCREEN_TECHNOLOGY': ['tecnologia_tela', 'screen_technology', 'tipo_tela', 'painel', 'panel'],
                // ÁUDIO
                'WITH_NOISE_CANCELLATION': ['cancelamento_de_ruido', 'cancelamento_ruido', 'noise_cancellation', 'anc'],
                'WITH_MICROPHONE': ['microfone', 'microphone', 'com_microfone'],
                'IMPEDANCE':      ['impedancia', 'impedance'],
                'FREQUENCY_RESPONSE': ['resposta_de_frequencia', 'frequency_response'],
                // CÂMERAS
                'MEGAPIXELS':     ['megapixels', 'mp', 'resolucao_camera'],
                'OPTICAL_ZOOM':   ['zoom_optico', 'optical_zoom', 'zoom'],
                'SENSOR_TYPE':    ['sensor', 'tipo_sensor', 'sensor_type'],
                // ILUMINAÇÃO
                'LIGHTING_TECHNOLOGY': ['tecnologia_iluminacao', 'lighting_technology', 'tipo_led', 'tecnologia_luz'],
                'STRUCTURE_COLOR': ['cor_estrutura', 'cor_da_estrutura', 'structure_color'],
                'SCREEN_COLOR':   ['cor_cupula', 'cor_da_cupula', 'screen_color', 'cor_tela'],
                'STRUCTURE_MATERIAL': ['material_estrutura', 'material_da_estrutura', 'structure_material'],
                'SCREEN_MATERIAL': ['material_tela', 'material_cupula', 'screen_material'],
                // VESTUÁRIO
                'CLOTHING_SIZE':  ['tamanho_roupa', 'clothing_size', 'tamanho_camiseta', 'tamanho_calcas'],
                'GENDER':         ['genero', 'gender', 'sexo'],
                'AGE_GROUP':      ['faixa_etaria', 'age_group', 'publico_alvo', 'para_quem'],
                'FABRIC':         ['tecido', 'fabric', 'composicao_do_tecido', 'fibra'],
                // CALÇADOS
                'SHOE_SIZE':      ['numero_calcado', 'numero_do_calcado', 'shoe_size', 'numeracao', 'numero'],
                'SOLE_MATERIAL':  ['solado', 'sole_material'],
                // ELETRODOMÉSTICOS
                'CAPACITY':       ['capacidade', 'capacity', 'litros', 'volume'],
                'NUMBER_OF_BURNERS': ['bocas', 'queimadores', 'number_of_burners'],
                'DEFROST_SYSTEM': ['degelo', 'defrost_system', 'tipo_degelo'],
                // IMPRESSORAS
                'PRINTING_TECHNOLOGY': ['tecnologia_de_impressao', 'printing_technology', 'tipo_impressora'],
                'WITH_SCANNER':   ['com_scanner', 'scanner', 'with_scanner'],
                'MAX_PAPER_SIZE': ['tamanho_maximo_papel', 'max_paper_size', 'formato_papel'],
                // BELEZA/SAÚDE
                'CONTENT_VOLUME': ['volume_conteudo', 'conteudo', 'content_volume', 'ml', 'quantidade_ml'],
                'SKIN_TYPE':      ['tipo_pele', 'skin_type', 'para_pele'],
                'FRAGRANCE':      ['fragrancia', 'fragrance', 'aroma', 'perfume_type'],
                // MÓVEIS
                'ASSEMBLY_REQUIRED': ['requer_montagem', 'com_montagem', 'assembly_required'],
                'STYLE':          ['estilo', 'style', 'design'],
                'FINISH':         ['acabamento', 'finishing', 'finish'],
                // GAMES/PERIFÉRICOS
                'COMPATIBLE_PLATFORM': ['compatibilidade', 'platform', 'plataforma', 'para_console'],
                'SWITCH_TYPE':    ['tipo_switch', 'switch_type'],
                'DPI':            ['dpi', 'sensibilidade'],
                // FERRAMENTAS
                'POWER_SOURCE':   ['fonte_de_energia', 'power_source', 'alimentacao'],
                // LIVROS
                'LANGUAGE':       ['idioma', 'language'],
                'NUMBER_OF_PAGES': ['numero_de_paginas', 'paginas', 'pages'],
                'EDITION':        ['edicao', 'edition'],
              }

              // Verificar se temos o atributo preenchido no produto
              if (attr.id === 'BRAND') {
                filled = !!product.brand
                value = product.brand || undefined
              } else if (attr.id === 'GTIN') {
                filled = !!product.gtin
                value = product.gtin || undefined
              } else {
                // Verificar nos atributos personalizados do produto
                try {
                  const customAttrs = typeof (product as any).attributes === 'string'
                    ? JSON.parse((product as any).attributes)
                    : ((product as any).attributes || [])
                  if (Array.isArray(customAttrs)) {
                    const synonyms = CUSTOM_ATTR_ID_MAP[attr.id] || []
                    for (const ca of customAttrs) {
                      const nameNorm = normalizeAttrKey(ca.nome || ca.name || '')
                      if (synonyms.includes(nameNorm) || nameNorm === normalizeAttrKey(attr.id.replace(/_/g, ' '))) {
                        filled = true
                        value = ca.valor || ca.value || undefined
                        break
                      }
                    }
                    // Fallback: tentar extrair de campos estruturados do produto
                    if (!filled) {
                      if (attr.id === 'MODEL' || attr.id === 'LINE' || attr.id === 'FAMILY_NAME') {
                        filled = true
                        value = product.name?.split(' ')[0]
                      }
                    }
                  }
                } catch {
                  // ignorar erro de parsing
                }
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
