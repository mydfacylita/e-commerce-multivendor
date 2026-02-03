import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydshop.com.br'
  
  // URLs estáticas principais
  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/produtos`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/categorias`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/politica-privacidade`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/politica-devolucao`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/seja-parceiro`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  // Buscar todos os produtos ativos
  let productUrls: MetadataRoute.Sitemap = []
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      select: {
        slug: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 5000, // Limitar para evitar sitemap muito grande
    })

    productUrls = products.map((product) => ({
      url: `${baseUrl}/produtos/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  } catch (error) {
    console.error('Error fetching products for sitemap:', error)
  }

  // Buscar todas as categorias
  let categoryUrls: MetadataRoute.Sitemap = []
  try {
    const categories = await prisma.category.findMany({
      select: {
        slug: true,
        updatedAt: true,
      },
    })

    categoryUrls = categories.map((category) => ({
      url: `${baseUrl}/categorias/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  } catch (error) {
    console.error('Error fetching categories for sitemap:', error)
  }

  // Buscar lojas de vendedores ativos
  let sellerUrls: MetadataRoute.Sitemap = []
  try {
    const sellers = await prisma.user.findMany({
      where: {
        role: 'SELLER',
        seller: {
          isNot: null,
        },
      },
      select: {
        seller: {
          select: {
            slug: true,
            updatedAt: true,
          },
        },
      },
    })

    sellerUrls = sellers
      .filter(s => s.seller?.slug)
      .map((seller) => ({
        url: `${baseUrl}/loja/${seller.seller!.slug}`,
        lastModified: seller.seller!.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      }))
  } catch (error) {
    console.error('Error fetching sellers for sitemap:', error)
  }

  return [...staticUrls, ...productUrls, ...categoryUrls, ...sellerUrls]
}
