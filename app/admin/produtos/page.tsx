import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { FiEdit, FiTrash2, FiPlus, FiPackage } from 'react-icons/fi'
import DeleteProductButton from '@/components/admin/DeleteProductButton'
import ToggleProductActiveButton from '@/components/admin/ToggleProductActiveButton'
import ToggleDropshippingButton from '@/components/admin/ToggleDropshippingButton'
import PublishToMarketplaceButton from '@/components/admin/PublishToMarketplaceButton'
import SyncAllMarketplacesButton from '@/components/admin/SyncAllMarketplacesButton'
import ProductsFilter from '@/components/admin/ProductsFilter'
import ProductsCardView from '@/components/admin/ProductsCardView'
import BulkPriceUpdateButton from '@/components/admin/BulkPriceUpdateButton'


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
        <ProductsCardView products={products as any} />
      )}

      {/* Visualização em Lista (tabela original) */}
      {viewMode === 'list' && (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-3 lg:py-4 lg:px-6 font-semibold text-xs lg:text-sm">Imagem</th>
                <th className="text-left py-3 px-3 lg:py-4 lg:px-6 font-semibold text-xs lg:text-sm">Nome</th>
                <th className="text-left py-3 px-3 lg:py-4 lg:px-6 font-semibold text-xs lg:text-sm hidden md:table-cell">Fornecedor</th>
                <th className="text-left py-3 px-3 lg:py-4 lg:px-6 font-semibold text-xs lg:text-sm hidden lg:table-cell">Categoria</th>
                <th className="text-left py-3 px-3 lg:py-4 lg:px-6 font-semibold text-xs lg:text-sm">Preço</th>
                <th className="text-left py-3 px-3 lg:py-4 lg:px-6 font-semibold text-xs lg:text-sm">Estoque</th>
                <th className="text-left py-3 px-3 lg:py-4 lg:px-6 font-semibold text-xs lg:text-sm">Status</th>
                <th className="text-left py-3 px-3 lg:py-4 lg:px-6 font-semibold text-xs lg:text-sm hidden xl:table-cell">Dropshipping</th>
                <th className="text-left py-3 px-3 lg:py-4 lg:px-6 font-semibold text-xs lg:text-sm hidden xl:table-cell">Marketplaces</th>
                <th className="text-right py-3 px-3 lg:py-4 lg:px-6 font-semibold text-xs lg:text-sm">Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                let imagens: string[] = [];
                try {
                  if (typeof product.images === 'string' && product.images.trim()) {
                    imagens = JSON.parse(product.images);
                  } else if (Array.isArray(product.images)) {
                    imagens = product.images;
                  }
                } catch (e) {
                  // Se falhar o parse, tenta usar como URL direta
                  if (typeof product.images === 'string' && product.images.startsWith('http')) {
                    imagens = [product.images];
                  }
                }
                const primeiraImagem = Array.isArray(imagens) && imagens.length > 0 ? imagens[0] : null
                
                return (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-3 lg:py-4 lg:px-6">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
                      {primeiraImagem ? (
                        <img
                          src={primeiraImagem}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FiPackage className="text-gray-400" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 lg:py-4 lg:px-6">
                    <p className="font-semibold text-sm lg:text-base line-clamp-2">{product.name}</p>
                    <p className="text-xs text-gray-500">ID: {product.id.slice(0, 8)}...</p>
                    {product.supplierSku && (
                      <p className="text-xs text-gray-400 truncate max-w-[100px] lg:max-w-none">SKU: {product.supplierSku}</p>
                    )}
                  </td>
                  <td className="py-3 px-3 lg:py-4 lg:px-6 hidden md:table-cell">
                    {product.supplier?.name || (
                      <span className="text-sm text-gray-400">Sem fornecedor</span>
                    )}
                  </td>
                  <td className="py-3 px-3 lg:py-4 lg:px-6 hidden lg:table-cell">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {product.category.name}
                    </span>
                  </td>
                  <td className="py-3 px-3 lg:py-4 lg:px-6">
                    <p className="font-semibold text-sm lg:text-base">R$ {product.price.toFixed(2)}</p>
                    {product.comparePrice && (
                      <p className="text-xs text-gray-500 line-through">
                        R$ {product.comparePrice.toFixed(2)}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-3 lg:py-4 lg:px-6">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        product.stock > 10
                          ? 'bg-green-100 text-green-800'
                          : product.stock > 0
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {product.stock} un.
                    </span>
                  </td>
                  <td className="py-3 px-3 lg:py-4 lg:px-6">
                    {product.featured && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs mr-1">
                        Destaque
                      </span>
                    )}
                    {!product.active && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                        Inativo
                      </span>
                    )}
                    {product.active && !product.featured && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        Ativo
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 lg:py-4 lg:px-6 hidden xl:table-cell">
                    <ToggleDropshippingButton 
                      productId={product.id}
                      isDropshipping={product.isDropshipping}
                      commission={product.dropshippingCommission}
                    />
                  </td>
                  <td className="py-3 px-3 lg:py-4 lg:px-6 hidden xl:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {product.marketplaceListings.length === 0 ? (
                        <span className="text-xs text-gray-400">Não pub.</span>
                      ) : (
                        product.marketplaceListings.map((listing) => (
                          <span
                            key={listing.marketplace}
                            className={`px-2 py-1 rounded-full text-xs ${
                              listing.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : listing.status === 'paused'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {listing.marketplace === 'mercadolivre' ? 'ML' :
                             listing.marketplace === 'shopee' ? 'Shopee' :
                             listing.marketplace === 'amazon' ? 'Amazon' :
                             listing.marketplace}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 lg:py-4 lg:px-6">
                    <div className="flex justify-end space-x-1 lg:space-x-2">
                      <ToggleProductActiveButton 
                        productId={product.id} 
                        currentStatus={product.active}
                      />
                      <PublishToMarketplaceButton
                        productId={product.id}
                        existingListings={product.marketplaceListings}
                      />
                      <Link
                        href={`/admin/produtos/${product.id}`}
                        className="p-1.5 lg:p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                        title="Editar"
                      >
                        <FiEdit size={16} className="lg:w-[18px] lg:h-[18px]" />
                      </Link>
                      <DeleteProductButton productId={product.id} />
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
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
