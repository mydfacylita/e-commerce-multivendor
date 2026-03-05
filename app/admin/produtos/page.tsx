import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { FiPlus, FiPackage } from 'react-icons/fi'
import SyncAllMarketplacesButton from '@/components/admin/SyncAllMarketplacesButton'
import ProductsFilter from '@/components/admin/ProductsFilter'
import ProductsCardView from '@/components/admin/ProductsCardView'
import BulkPriceUpdateButton from '@/components/admin/BulkPriceUpdateButton'
import BulkCategoryUpdateButton from '@/components/admin/BulkCategoryUpdateButton'
import ProductsListWithSelection from '@/components/admin/ProductsListWithSelection'

// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface SearchParams {
  status?: string
  category?: string
  search?: string
  view?: string
  lowStock?: string
  noStock?: string
  noImage?: string
}

export default async function AdminProdutosPage({ 
  searchParams 
}: { 
  searchParams: SearchParams 
}) {
  // Buscar categorias para o filtro (com hierarquia)
  const allCategories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true, parentId: true },
    orderBy: { name: 'asc' }
  })

  // Construir filtro dinâmico
  const where: any = {
    sellerId: null // Apenas produtos do admin
  }

  // Filtro por status
  if (searchParams.status === 'active') {
    where.active = true
  } else if (searchParams.status === 'inactive') {
    where.active = false
  } else if (searchParams.status === 'featured') {
    where.featured = true
  } else if (searchParams.status === 'dropshipping') {
    where.isDropshipping = true
  }

  // Filtro por categoria (incluindo subcategorias)
  if (searchParams.category) {
    // Buscar IDs da categoria e todas as subcategorias
    const getCategoryIds = (parentId: string): string[] => {
      const children = allCategories.filter(c => c.parentId === parentId)
      return [parentId, ...children.flatMap(c => getCategoryIds(c.id))]
    }
    const categoryIds = getCategoryIds(searchParams.category)
    where.categoryId = { in: categoryIds }
  }

  // Filtro por busca
  if (searchParams.search) {
    where.OR = [
      { name: { contains: searchParams.search } },
      { description: { contains: searchParams.search } },
      { supplierSku: { contains: searchParams.search } }
    ]
  }

  // Filtros adicionais
  if (searchParams.lowStock === 'true') {
    where.stock = { gt: 0, lte: 10 }
  }
  if (searchParams.noStock === 'true') {
    where.stock = 0
  }

  const products = await prisma.product.findMany({
    where,
    include: { 
      category: true,
      supplier: true,
      marketplaceListings: true
    },
    orderBy: { createdAt: 'desc' },
  })

  // Buscar média de avaliações por produto
  const reviewStats = await prisma.productReview.groupBy({
    by: ['productId'],
    where: { isApproved: true },
    _avg: { rating: true },
    _count: { id: true },
  })
  const reviewMap: Record<string, { avg: number; count: number }> = {}
  reviewStats.forEach(r => {
    reviewMap[r.productId] = { avg: r._avg.rating ?? 0, count: r._count.id }
  })

  // Buscar visitas únicas por produto (últimos 90 dias)
  const visitRows = await prisma.$queryRaw<{ productId: string; visits: bigint }[]>`
    SELECT
      JSON_UNQUOTE(JSON_EXTRACT(data, '$.id')) AS productId,
      COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(data, '$.visitorId'))) AS visits
    FROM analytics_table
    WHERE
      createdAt >= DATE_SUB(NOW(), INTERVAL 90 DAY)
      AND (
        name = 'view_product'
        OR (name = 'custom' AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.eventName')) = 'view_product')
      )
      AND JSON_UNQUOTE(JSON_EXTRACT(data, '$.id')) IS NOT NULL
    GROUP BY productId
  `
  const visitMap: Record<string, number> = {}
  visitRows.forEach(r => { if (r.productId) visitMap[r.productId] = Number(r.visits) })

  // Contadores para o filtro
  const [totalProducts, activeCount, inactiveCount, featuredCount, dropshippingCount] = await Promise.all([
    prisma.product.count({ where: { sellerId: null } }),
    prisma.product.count({ where: { sellerId: null, active: true } }),
    prisma.product.count({ where: { sellerId: null, active: false } }),
    prisma.product.count({ where: { sellerId: null, featured: true } }),
    prisma.product.count({ where: { sellerId: null, isDropshipping: true } })
  ])

  const viewMode = searchParams.view || 'list'

  return (
    <div className="min-w-0">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold">Gerenciar Produtos</h1>
        <div className="flex flex-wrap gap-2">
          <BulkPriceUpdateButton />
          <BulkCategoryUpdateButton />
          <SyncAllMarketplacesButton />
          <Link
            href="/admin/produtos/novo"
            className="bg-primary-600 text-white px-4 py-2 lg:px-6 lg:py-3 rounded-md hover:bg-primary-700 flex items-center space-x-2 text-sm lg:text-base"
          >
            <FiPlus />
            <span>Novo Produto</span>
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <ProductsFilter
        categories={allCategories}
        totalProducts={totalProducts}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
        featuredCount={featuredCount}
        dropshippingCount={dropshippingCount}
      />

      {/* Visualização em Cards */}
      {viewMode === 'cards' && (
        <ProductsCardView products={products as any} reviewMap={reviewMap} visitMap={visitMap} />
      )}

      {/* Visualização em Lista com seleção */}
      {viewMode === 'list' && (
        <ProductsListWithSelection products={products as any} categories={allCategories} reviewMap={reviewMap} visitMap={visitMap} />
      )}

      {/* Mensagem quando não há produtos (cards) */}
      {viewMode === 'cards' && products.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FiPackage size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 mb-4">Nenhum produto encontrado</p>
          <Link
            href="/admin/produtos/novo"
            className="text-primary-600 hover:text-primary-700 font-semibold"
          >
            Criar primeiro produto →
          </Link>
        </div>
      )}
    </div>
  )
}
