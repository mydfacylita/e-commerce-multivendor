import { NextRequest, NextResponse } from 'next/server'
import { createShopifyProduct, updateShopifyProduct, sanitizeShopDomain } from '@/lib/shopify'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/shopify/sync/products
 * Body: { shop: string, productIds?: string[] }
 * 
 * Envia produtos do Mydshop para a loja Shopify.
 * Se productIds não informado, sincroniza todos os produtos do vendedor vinculado.
 */
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { shop, productIds } = body

  if (!shop) {
    return NextResponse.json({ error: 'shop é obrigatório' }, { status: 400 })
  }

  const cleanShop = sanitizeShopDomain(shop)

  const installation = await (prisma as any).shopifyInstallation.findUnique({
    where: { shopDomain: cleanShop },
  })

  if (!installation || !installation.isActive) {
    return NextResponse.json({ error: 'Loja não encontrada ou inativa' }, { status: 404 })
  }

  if (!installation.syncProductsEnabled) {
    return NextResponse.json({ message: 'Sincronização de produtos desabilitada' }, { status: 200 })
  }

  if (!installation.userId) {
    return NextResponse.json({ error: 'Loja sem vendedor Mydshop vinculado' }, { status: 400 })
  }

  // Buscar produtos Mydshop do vendedor
  const where: any = {
    seller: { userId: installation.userId },
    isActive: true,
  }
  if (productIds?.length) {
    where.id = { in: productIds }
  }

  const products = await prisma.product.findMany({
    where,
    take: 100,
  })

  const results = { synced: 0, updated: 0, failed: 0, errors: [] as string[] }

  for (const product of products) {
    try {
      // Verificar sync existente
      const existingSync = await (prisma as any).shopifyProductSync.findUnique({
        where: {
          installationId_mydProductId: {
            installationId: installation.id,
            mydProductId:   product.id,
          },
        },
      })

      const payload = {
        title:        product.name,
        body_html:    (product as any).description || '',
        vendor:       (product as any).brand       || 'Mydshop',
        product_type: (product as any).category    || '',
        status:       'active' as const,
        variants: [{
          price:                String(product.price || 0),
          sku:                  product.supplierSku ?? undefined,
          inventory_quantity:   product.stock || 0,
          requires_shipping:    true,
        }],
        images: (() => {
          try {
            const imgs = JSON.parse(product.images || '[]')
            return Array.isArray(imgs) ? imgs.slice(0, 5).map((url: string) => ({ src: url })) : []
          } catch { return [] }
        })(),
      }

      if (existingSync?.shopifyProductId && existingSync.status === 'synced') {
        // Atualizar produto existente na Shopify
        await updateShopifyProduct(cleanShop, installation.accessToken, existingSync.shopifyProductId, payload)

        await (prisma as any).shopifyProductSync.update({
          where: { id: existingSync.id },
          data:  { status: 'synced', errorMessage: null, syncedAt: new Date() },
        })
        results.updated++
      } else {
        // Criar novo produto na Shopify
        const created = await createShopifyProduct(cleanShop, installation.accessToken, payload)

        await (prisma as any).shopifyProductSync.upsert({
          where: {
            installationId_mydProductId: {
              installationId: installation.id,
              mydProductId:   product.id,
            },
          },
          update: {
            shopifyProductId: String(created.id),
            shopifyVariantId: created.variants?.[0] ? String(created.variants[0].id) : null,
            status:           'synced',
            syncedAt:         new Date(),
            errorMessage:     null,
          },
          create: {
            installationId:   installation.id,
            mydProductId:     product.id,
            shopifyProductId: String(created.id),
            shopifyVariantId: created.variants?.[0] ? String(created.variants[0].id) : null,
            status:           'synced',
            syncedAt:         new Date(),
          },
        })
        results.synced++
      }
    } catch (err: any) {
      results.failed++
      results.errors.push(`Produto ${product.id}: ${err.message}`)

      await (prisma as any).shopifyProductSync.upsert({
        where: {
          installationId_mydProductId: {
            installationId: installation.id,
            mydProductId:   product.id,
          },
        },
        update: { status: 'failed', errorMessage: err.message },
        create: {
          installationId: installation.id,
          mydProductId:   product.id,
          status:         'failed',
          errorMessage:   err.message,
        },
      })
    }
  }

  return NextResponse.json({
    message: 'Sincronização de produtos concluída',
    shop: cleanShop,
    total: products.length,
    ...results,
  })
}
