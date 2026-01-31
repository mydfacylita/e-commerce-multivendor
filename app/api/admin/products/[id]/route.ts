import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logApi } from '@/lib/api-logger'
import { syncDropshippingProducts, checkAndReactivateDropProduct } from '@/lib/dropshipping-sync'
import { updateEANAssignment, releaseEANFromProduct } from '@/lib/ean-utils'

// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()
  let statusCode = 200
  
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        supplier: true,
      },
    })

    if (!product) {
      statusCode = 404
      await logApi({
        method: 'GET',
        endpoint: `/api/admin/products/${params.id}`,
        statusCode,
        duration: Date.now() - startTime
      })
      return NextResponse.json(
        { message: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    await logApi({
      method: 'GET',
      endpoint: `/api/admin/products/${params.id}`,
      statusCode,
      duration: Date.now() - startTime
    })
    return NextResponse.json(product)
  } catch (error) {
    console.error('Erro ao buscar produto:', error)
    statusCode = 500
    await logApi({
      method: 'GET',
      endpoint: `/api/admin/products/${params.id}`,
      statusCode,
      errorMessage: error instanceof Error ? error.message : 'Erro ao buscar produto',
      duration: Date.now() - startTime
    })
    return NextResponse.json(
      { message: 'Erro ao buscar produto' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()
  
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🗑️  [INÍCIO] DELETE /api/admin/products/[id]')
    console.log('   🆔 Product ID:', params.id)
    
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      console.log('❌ Não autenticado')
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SELLER') {
      console.log('❌ Role não permitida:', session.user.role)
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    let sellerId: string | null = null

    // SE FOR SELLER, VALIDAR TUDO
    if (session.user.role === 'SELLER') {
      console.log('👤 Role: SELLER - Validando vendedor...')
      
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          seller: {
            include: {
              subscriptions: {
                where: { status: { in: ['ACTIVE', 'TRIAL'] } },
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            }
          },
          workForSeller: {
            include: {
              subscriptions: {
                where: { status: { in: ['ACTIVE', 'TRIAL'] } },
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            }
          }
        }
      })

      const seller = user?.seller || user?.workForSeller
      const activeSubscription = seller?.subscriptions?.[0]

      if (!seller || seller.status !== 'ACTIVE') {
        console.log('❌ Vendedor inválido')
        return NextResponse.json({ message: 'Vendedor inválido' }, { status: 403 })
      }

      if (!activeSubscription || !['ACTIVE', 'TRIAL'].includes(activeSubscription.status)) {
        console.log('❌ Plano inválido')
        return NextResponse.json({ message: 'Plano inválido' }, { status: 403 })
      }

      if (activeSubscription.endDate < new Date()) {
        console.log('❌ Plano expirado')
        return NextResponse.json({ message: 'Plano expirado' }, { status: 403 })
      }

      sellerId = seller.id
      console.log('✅ Vendedor validado:', seller.storeName)
    }

    // BUSCAR O PRODUTO
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        orderItems: {
          include: {
            order: true
          }
        }
      }
    })

    if (!product) {
      console.log('❌ Produto não encontrado')
      return NextResponse.json({ message: 'Produto não encontrado' }, { status: 404 })
    }

    // SE FOR SELLER, VERIFICAR SE É DELE
    if (sellerId && product.sellerId !== sellerId) {
      console.log('❌ Produto não pertence ao vendedor')
      return NextResponse.json({ message: 'Produto não pertence a você' }, { status: 403 })
    }

    // VERIFICAR SE O PRODUTO TEM PEDIDOS
    if (product.orderItems && product.orderItems.length > 0) {
      console.log('⚠️  Produto tem pedidos vinculados:', product.orderItems.length)
      
      // Verificar se algum pedido está ativo (não cancelado/recusado)
      const hasActiveOrders = product.orderItems.some(item => 
        !['CANCELLED', 'REFUSED'].includes(item.order.status)
      )

      if (hasActiveOrders) {
        console.log('❌ Produto possui pedidos ativos - não pode ser excluído')
        return NextResponse.json({ 
          message: 'Este produto não pode ser excluído pois possui pedidos vinculados. Para produtos com pedidos, você pode desativá-lo em vez de excluir.',
          hasOrders: true
        }, { status: 400 })
      }
    }

    console.log('✅ Produto pode ser excluído')

    // 🔗 LIBERAR EAN ANTES DE EXCLUIR
    if (product.gtin) {
      console.log(`\n🔗 Liberando EAN: ${product.gtin}`)
      const eanResult = await releaseEANFromProduct(product.gtin, product.id)
      console.log('✅ EAN liberado:', eanResult.message)
    }

    await prisma.product.delete({
      where: { id: params.id },
    })

    console.log('✅ Produto excluído com sucesso')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    const seller = sellerId ? await prisma.seller.findUnique({ where: { id: sellerId } }) : null
    
    await logApi({
      method: 'DELETE',
      endpoint: `/api/admin/products/${params.id}`,
      statusCode: 200,
      userId: session.user.id,
      userRole: session.user.role,
      sellerId: seller?.id,
      sellerName: seller?.storeName,
      duration: Date.now() - startTime
    })

    return NextResponse.json({ message: 'Produto excluído com sucesso' })
  } catch (error: any) {
    console.error('❌ Erro ao excluir produto:', error)
    
    await logApi({
      method: 'DELETE',
      endpoint: `/api/admin/products/${params.id}`,
      statusCode: 500,
      errorMessage: error.message,
      duration: Date.now() - startTime
    })
    
    return NextResponse.json(
      { message: 'Erro ao excluir produto' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()
  
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✏️  [INÍCIO] PUT /api/admin/products/[id]')
    console.log('   🆔 Product ID:', params.id)
    
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      console.log('❌ Não autenticado')
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SELLER') {
      console.log('❌ Role não autorizado:', session.user.role)
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    console.log('✅ Usuário autenticado:', session.user.email, '- Role:', session.user.role)

    // SE FOR SELLER, VALIDAR PLANO E OWNERSHIP
    let sellerId = null
    if (session.user.role === 'SELLER') {
      console.log('\n📍 Validando vendedor...')
      
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          seller: {
            include: {
              subscriptions: {
                where: { status: { in: ['ACTIVE', 'TRIAL'] } },
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            }
          },
          workForSeller: {
            include: {
              subscriptions: {
                where: { status: { in: ['ACTIVE', 'TRIAL'] } },
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            }
          }
        }
      })

      const seller = user?.seller || user?.workForSeller
      const activeSubscription = seller?.subscriptions?.[0]

      if (!seller || seller.status !== 'ACTIVE') {
        console.log('❌ Vendedor inválido')
        return NextResponse.json({ message: 'Vendedor inválido' }, { status: 403 })
      }

      if (!activeSubscription || !['ACTIVE', 'TRIAL'].includes(activeSubscription.status)) {
        console.log('❌ Plano inválido')
        return NextResponse.json({ message: 'Plano inválido' }, { status: 403 })
      }

      if (activeSubscription.endDate < new Date()) {
        console.log('❌ Plano expirado')
        return NextResponse.json({ message: 'Plano expirado' }, { status: 403 })
      }

      sellerId = seller.id
    }

    console.log('\n🔍 Verificando produto...')

    // Obter dados da requisição e produto existente (escopo global)
    const data = await req.json()
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id }
    })

    if (!existingProduct) {
      console.log('❌ Produto não encontrado')
      return NextResponse.json({ message: 'Produto não encontrado' }, { status: 404 })
    }

    // Validações específicas do SELLER
    if (session.user.role === 'SELLER') {
    if (existingProduct.sellerId !== sellerId) {
      console.log('❌ Produto não pertence ao vendedor')
      return NextResponse.json({ message: 'Você não tem permissão para editar este produto' }, { status: 403 })
    }

    // SE FOR DROPSHIPPING, VALIDAR CAMPOS EDITÁVEIS E VERIFICAR PREÇO MÍNIMO
    if (existingProduct.isDropshipping && existingProduct.supplierSku) {
        console.log('⚠️  Produto dropshipping - validando preço mínimo...')
        
        // Buscar produto original para validar preço
        const sourceProduct = await prisma.product.findUnique({
          where: { id: existingProduct.supplierSku },
          select: { price: true, active: true, isDropshipping: true }
        })
        
        if (sourceProduct) {
          const precoBase = sourceProduct.price
          const precoVendedor = parseFloat(data.price) || existingProduct.price
          
          // VALIDAR PREÇO MÍNIMO
          if (precoVendedor < precoBase) {
            console.log(`❌ Preço do vendedor R$ ${precoVendedor.toFixed(2)} < base R$ ${precoBase.toFixed(2)}`)
            return NextResponse.json({ 
              message: `O preço deve ser no mínimo R$ ${precoBase.toFixed(2)}`,
              minPrice: precoBase 
            }, { status: 400 })
          }
          
          // BLOQUEAR ATIVAÇÃO SE PREÇO ESTÁ ABAIXO DO MÍNIMO
          if (data.active === true && existingProduct.price < precoBase) {
            console.log(`❌ Tentativa de ativar produto com preço abaixo do mínimo`)
            console.log(`   Preço atual: R$ ${existingProduct.price.toFixed(2)} < Mínimo: R$ ${precoBase.toFixed(2)}`)
            return NextResponse.json({ 
              message: `Não é possível ativar este produto. O preço atual (R$ ${existingProduct.price.toFixed(2)}) está abaixo do mínimo permitido (R$ ${precoBase.toFixed(2)}). Aumente o preço primeiro.`,
              minPrice: precoBase 
            }, { status: 400 })
          }
          
          // BLOQUEAR ATIVAÇÃO SE PRODUTO ORIGINAL ESTÁ INATIVO OU NÃO É MAIS DROPSHIPPING
          if (data.active === true && (!sourceProduct.active || !sourceProduct.isDropshipping)) {
            console.log(`❌ Tentativa de ativar produto cujo original está inativo`)
            return NextResponse.json({ 
              message: `Não é possível ativar este produto. O produto original foi desativado pelo administrador.`
            }, { status: 400 })
          }
          
          console.log(`✅ Preço válido: R$ ${precoVendedor.toFixed(2)} >= base R$ ${precoBase.toFixed(2)}`)
        } else {
          // Produto original não existe mais
          if (data.active === true) {
            console.log(`❌ Tentativa de ativar produto órfão (original não existe)`)
            return NextResponse.json({ 
              message: `Não é possível ativar este produto. O produto original não existe mais.`
            }, { status: 400 })
          }
        }
      }
    }

    // Buscar produto existente para verificar se é do admin e se é dropshipping
    let existingProductForSync = null
    if (session.user.role === 'ADMIN') {
      existingProductForSync = await prisma.product.findUnique({
        where: { id: params.id },
        select: { sellerId: true, isDropshipping: true }
      })
    }

    console.log('\n📝 Atualizando produto...')

    // 🔗 PROCESSAR MUDANÇA DE EAN ANTES DA ATUALIZAÇÃO
    const oldGTIN = existingProduct.gtin
    const newGTIN = data.gtin
    if (oldGTIN !== newGTIN) {
      console.log(`\n🔗 Processando mudança de EAN: ${oldGTIN || 'nenhum'} → ${newGTIN || 'nenhum'}`)
      const eanResult = await updateEANAssignment(oldGTIN, newGTIN, params.id)
      if (!eanResult.success) {
        console.log('❌ Erro no EAN:', eanResult.message)
        return NextResponse.json({ message: eanResult.message }, { status: 400 })
      }
      console.log('✅ EAN atualizado:', eanResult.message)
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        price: data.price,
        comparePrice: data.comparePrice,
        costPrice: data.costPrice,
        margin: data.margin,
        stock: data.stock,
        categoryId: data.categoryId,
        supplierId: data.supplierId,
        supplierSku: data.supplierSku,
        supplierUrl: data.supplierUrl,
        images: typeof data.images === 'string' ? data.images : JSON.stringify(data.images),
        featured: data.featured,
        gtin: data.gtin,
        brand: data.brand,
        model: data.model,
        color: data.color,
        mpn: data.mpn,
        technicalSpecs: data.technicalSpecs,
        bookTitle: data.bookTitle,
        bookAuthor: data.bookAuthor,
        bookGenre: data.bookGenre,
        bookPublisher: data.bookPublisher,
        bookIsbn: data.bookIsbn,
        sizes: data.sizes,
        variants: data.variants,
        selectedSkus: data.selectedSkus,
        sizeType: data.sizeType,
        sizeCategory: data.sizeCategory,
        // Campos de Tributação (NF-e)
        ncm: data.ncm,
        cest: data.cest,
        origem: data.origem,
        cstIcms: data.cstIcms,
        aliquotaIcms: data.aliquotaIcms !== undefined ? (data.aliquotaIcms ? parseFloat(data.aliquotaIcms) : null) : undefined,
        reducaoBcIcms: data.reducaoBcIcms !== undefined ? (data.reducaoBcIcms ? parseFloat(data.reducaoBcIcms) : null) : undefined,
        cstPis: data.cstPis,
        aliquotaPis: data.aliquotaPis !== undefined ? (data.aliquotaPis ? parseFloat(data.aliquotaPis) : null) : undefined,
        cstCofins: data.cstCofins,
        aliquotaCofins: data.aliquotaCofins !== undefined ? (data.aliquotaCofins ? parseFloat(data.aliquotaCofins) : null) : undefined,
        cfopInterno: data.cfopInterno,
        cfopInterestadual: data.cfopInterestadual,
        unidadeComercial: data.unidadeComercial,
        unidadeTributavel: data.unidadeTributavel,
        tributacaoEspecial: data.tributacaoEspecial,
        // Dropshipping
        isDropshipping: data.isDropshipping,
        dropshippingCommission: data.dropshippingCommission,
        availableForDropship: data.availableForDropship,
        // Peso e dimensões
        weight: data.weight,
        weightWithPackage: data.weightWithPackage,
        length: data.length,
        width: data.width,
        height: data.height,
        lengthWithPackage: data.lengthWithPackage,
        widthWithPackage: data.widthWithPackage,
        heightWithPackage: data.heightWithPackage,
        // Especificações
        specifications: data.specifications,
        attributes: data.attributes,
        // Configurações de pagamento
        acceptsCreditCard: data.acceptsCreditCard,
        maxInstallments: data.maxInstallments,
        installmentsFreeInterest: data.installmentsFreeInterest,
      },
      include: {
        category: true,
        supplier: true,
      },
    })

    console.log('✅ Produto atualizado com sucesso')

    // 🔄 SINCRONIZAR PRODUTOS DROPSHIPPING SE FOR ADMIN E PRODUTO ORIGINAL
    let syncResult = null
    if (session.user.role === 'ADMIN' && existingProductForSync && !existingProductForSync.sellerId && existingProductForSync.isDropshipping) {
      console.log('\n🔄 Sincronizando produtos dropshipping...')
      
      syncResult = await syncDropshippingProducts(params.id, data)
      
      if (syncResult.synced > 0 || syncResult.inactivated > 0) {
        console.log(`   📊 Resultado: ${syncResult.synced} sincronizados, ${syncResult.inactivated} inativados`)
      }
    }

    // 🔄 SE FOR VENDEDOR ATUALIZANDO PREÇO DE UM DROP, VERIFICAR REATIVAÇÃO
    if (session.user.role === 'SELLER' && product.supplierSku && data.price) {
      const reactivateResult = await checkAndReactivateDropProduct(params.id, data.price)
      if (reactivateResult.reactivated) {
        console.log('✅ Produto dropshipping reativado!')
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    const seller = sellerId ? await prisma.seller.findUnique({ where: { id: sellerId } }) : null
    
    await logApi({
      method: 'PUT',
      endpoint: `/api/admin/products/${params.id}`,
      statusCode: 200,
      userId: session.user.id,
      userRole: session.user.role,
      sellerId: seller?.id,
      sellerName: seller?.storeName,
      requestBody: { name: data.name, price: data.price },
      responseBody: { id: product.id, name: product.name },
      duration: Date.now() - startTime
    })

    // Incluir resultado da sincronização na resposta se houver
    if (syncResult && (syncResult.synced > 0 || syncResult.inactivated > 0)) {
      return NextResponse.json({
        ...product,
        _syncResult: {
          synced: syncResult.synced,
          inactivated: syncResult.inactivated,
          message: `${syncResult.synced} produtos sincronizados, ${syncResult.inactivated} inativados por preço abaixo do mínimo`
        }
      })
    }

    return NextResponse.json(product)
  } catch (error: any) {
    console.error('Erro ao atualizar produto:', error)
    
    await logApi({
      method: 'PUT',
      endpoint: `/api/admin/products/${params.id}`,
      statusCode: 500,
      errorMessage: error.message,
      duration: Date.now() - startTime
    })
    
    return NextResponse.json(
      { message: 'Erro ao atualizar produto' },
      { status: 500 }
    )
  }
}
