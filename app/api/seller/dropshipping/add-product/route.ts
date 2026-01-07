import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getUserPermissions, getSellerFromSession } from "@/lib/seller"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SELLER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Verificar permissões
    const permissions = await getUserPermissions(session)
    if (!permissions || (!permissions.canManageDropshipping && !permissions.isOwner)) {
      return NextResponse.json(
        { error: "Você não tem permissão para gerenciar dropshipping" },
        { status: 403 }
      )
    }

    // Buscar seller (próprio ou do patrão)
    const seller = await getSellerFromSession(session)
    if (!seller) {
      return NextResponse.json({ error: "Vendedor não encontrado" }, { status: 404 })
    }

    const { productId, customPrice, customName } = await request.json()

    console.log('📦 [Add Dropshipping] Recebido:', { productId, customPrice, customName, sellerId: seller.id })

    // Verificar se o produto existe e é de dropshipping
    const originalProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true }
    })

    console.log('🔍 [Add Dropshipping] Produto original:', { 
      found: !!originalProduct, 
      isDropshipping: originalProduct?.isDropshipping 
    })

    if (!originalProduct) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })
    }

    if (!originalProduct.isDropshipping) {
      return NextResponse.json(
        { error: "Este produto não está disponível para dropshipping" },
        { status: 400 }
      )
    }

    // Verificar se o vendedor já tem este produto
    const existingProduct = await prisma.product.findFirst({
      where: {
        sellerId: seller.id,
        supplierSku: productId, // Usando productId como SKU de referência
        isDropshipping: false
      }
    })

    console.log('🔍 [Add Dropshipping] Produto existente:', { found: !!existingProduct })

    if (existingProduct) {
      return NextResponse.json(
        { error: "Você já adicionou este produto ao seu catálogo" },
        { status: 400 }
      )
    }

    // Calcular preço mínimo (preço base + margem mínima para cobrir comissão)
    const precoBase = originalProduct.price
    const comissao = originalProduct.dropshippingCommission || 0
    const precoMinimo = precoBase // O vendedor deve vender por pelo menos o preço base

    // Validar preço customizado
    const precoFinal = customPrice || precoBase * 1.2 // Se não definir, adiciona 20%
    
    console.log('💰 [Add Dropshipping] Preços:', { precoBase, precoFinal, customPrice })
    
    if (precoFinal < precoBase) {
      return NextResponse.json(
        { 
          error: `O preço deve ser no mínimo R$ ${precoBase.toFixed(2)} (preço base)`,
          minPrice: precoBase 
        },
        { status: 400 }
      )
    }

    // Criar slug único para o produto do vendedor
    const baseSlug = originalProduct.slug
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const newSlug = `${baseSlug}-${seller.id.substring(0, 6)}-${randomSuffix}`

    console.log('🔧 [Add Dropshipping] Criando produto com slug:', newSlug)

    // Criar uma cópia do produto para o vendedor
    const newProduct = await prisma.product.create({
      data: {
        name: customName || originalProduct.name,
        slug: newSlug,
        description: originalProduct.description,
        price: precoFinal,
        comparePrice: precoFinal * 1.3, // Preço "de" para mostrar desconto
        costPrice: precoBase, // O custo para o vendedor é o preço base
        images: originalProduct.images,
        stock: originalProduct.stock, // Inicialmente igual, mas será sincronizado
        featured: false,
        categoryId: originalProduct.categoryId,
        sellerId: seller.id,
        supplierId: originalProduct.supplierId, // Manter o supplier original se houver
        supplierSku: productId, // ID do produto original como referência
        supplierUrl: `/produtos/${originalProduct.slug}`,
        specifications: originalProduct.specifications,
        variants: originalProduct.variants,
        attributes: originalProduct.attributes,
        isDropshipping: false, // Este é o produto DO vendedor, não para dropshipping
        availableForDropship: false,
        active: true,
        
        // Informações do fornecedor original
        supplierStoreName: originalProduct.supplierStoreName || 'Marketplace',
        supplierStoreId: originalProduct.sellerId || undefined,
        supplierStock: originalProduct.stock,
        lastSyncAt: new Date()
      }
    })

    console.log(`✅ [Add Dropshipping Product] Produto adicionado:`, {
      sellerId: seller.id,
      sellerName: seller.storeName,
      originalProductId: originalProduct.id,
      newProductId: newProduct.id,
      productName: newProduct.name,
      basePrice: precoBase,
      sellingPrice: precoFinal,
      commission: comissao
    })

    return NextResponse.json({
      success: true,
      product: newProduct,
      message: "Produto adicionado ao seu catálogo com sucesso!"
    })
  } catch (error: any) {
    console.error("❌ [Add Dropshipping Product] Erro completo:", error)
    console.error("❌ [Add Dropshipping Product] Stack:", error.stack)
    
    // Erros específicos do Prisma
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "Já existe um produto com este slug. Tente novamente." },
        { status: 400 }
      )
    }
    
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: "Referência inválida. Verifique a categoria ou fornecedor." },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        error: "Erro ao adicionar produto",
        details: error.message,
        code: error.code 
      },
      { status: 500 }
    )
  }
}
