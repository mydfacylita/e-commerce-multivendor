import { NextRequest, NextResponse } from 'next/server'
import { getShopifyProducts, sanitizeShopDomain } from '@/lib/shopify'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/shopify/import-products
 * Body: { shop: string }
 *
 * Importa produtos da loja Shopify para o catálogo MydShop do vendedor.
 * Produtos já importados (mesmo shopify ID) são atualizados (preço, estoque, imagens).
 */
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { shop } = body
  if (!shop) return NextResponse.json({ error: 'shop é obrigatório' }, { status: 400 })

  const cleanShop = sanitizeShopDomain(shop)

  const installation = await (prisma as any).shopifyInstallation.findUnique({
    where: { shopDomain: cleanShop },
  })

  if (!installation || !installation.isActive) {
    return NextResponse.json({ error: 'Loja não encontrada ou inativa' }, { status: 404 })
  }

  if (!installation.userId) {
    return NextResponse.json({ error: 'Loja sem vendedor MydShop vinculado' }, { status: 400 })
  }

  // Buscar o seller pelo userId
  const seller = await prisma.seller.findUnique({ where: { userId: installation.userId } })
  if (!seller) {
    return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 })
  }

  // Buscar uma categoria padrão (usada como fallback para produtos importados)
  let defaultCategory = await prisma.category.findFirst({
    where: { slug: 'outros' },
    select: { id: true },
  })
  if (!defaultCategory) {
    defaultCategory = await prisma.category.findFirst({ select: { id: true } })
  }
  if (!defaultCategory) {
    return NextResponse.json({ error: 'Nenhuma categoria cadastrada no sistema' }, { status: 500 })
  }

  // Buscar produtos ativos da Shopify
  const shopifyProducts = await getShopifyProducts(cleanShop, installation.accessToken, { status: 'active', limit: 250 })

  const results = { imported: 0, updated: 0, skipped: 0, failed: 0, errors: [] as string[] }

  for (const sp of shopifyProducts) {
    try {
      const variant = sp.variants?.[0]
      const price   = variant ? parseFloat(variant.price) : 0
      const stock   = variant?.inventory_quantity ?? 0
      const sku     = variant?.sku || null
      const images  = JSON.stringify((sp.images || []).slice(0, 10).map(i => i.src))
      // slug único: storeSlug + shopify-product-id
      const slug = `${seller.storeSlug}-shopify-${sp.id}`

      const existingProduct = await prisma.product.findFirst({
        where: { supplierSku: `shopify_${sp.id}`, sellerId: seller.id },
        select: { id: true },
      })

      if (existingProduct) {
        // Atualiza preço, estoque e imagens
        await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            price,
            stock,
            images,
            lastSyncAt: new Date(),
          },
        })
        results.updated++
      } else {
        await prisma.product.create({
          data: {
            name:        sp.title,
            slug,
            description: sp.body_html || '',
            price,
            stock,
            images,
            brand:       sp.vendor || null,
            supplierSku: `shopify_${sp.id}`,   // identificador único Shopify
            sellerId:    seller.id,
            categoryId:  defaultCategory!.id,
            active:      true,
            lastSyncAt:  new Date(),
          },
        })
        results.imported++
      }
    } catch (err: any) {
      results.failed++
      results.errors.push(`Produto Shopify ${sp.id} ("${sp.title}"): ${err.message}`)
    }
  }

  // Atualiza lastSyncAt da instalação
  await (prisma as any).shopifyInstallation.update({
    where: { id: installation.id },
    data: { lastSyncAt: new Date() },
  })

  return NextResponse.json({
    message: 'Importação de produtos concluída',
    shop: cleanShop,
    total: shopifyProducts.length,
    ...results,
  })
}
