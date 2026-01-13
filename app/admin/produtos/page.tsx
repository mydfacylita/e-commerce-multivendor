import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { FiEdit, FiTrash2, FiPlus, FiPackage } from 'react-icons/fi'
import DeleteProductButton from '@/components/admin/DeleteProductButton'
import ToggleProductActiveButton from '@/components/admin/ToggleProductActiveButton'
import ToggleDropshippingButton from '@/components/admin/ToggleDropshippingButton'
import PublishToMarketplaceButton from '@/components/admin/PublishToMarketplaceButton'
import SyncAllMarketplacesButton from '@/components/admin/SyncAllMarketplacesButton'

export default async function AdminProdutosPage() {
  const products = await prisma.product.findMany({
    where: {
      sellerId: null // Apenas produtos do admin, não dos vendedores
    },
    include: { 
      category: true,
      supplier: true,
      marketplaceListings: true
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Gerenciar Produtos</h1>
        <div className="flex space-x-3">
          <SyncAllMarketplacesButton />
          <Link
            href="/admin/produtos/novo"
            className="bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 flex items-center space-x-2"
          >
            <FiPlus />
            <span>Novo Produto</span>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-4 px-6 font-semibold">Imagem</th>
                <th className="text-left py-4 px-6 font-semibold">Nome</th>
                <th className="text-left py-4 px-6 font-semibold">Fornecedor</th>
                <th className="text-left py-4 px-6 font-semibold">Categoria</th>
                <th className="text-left py-4 px-6 font-semibold">Preço</th>
                <th className="text-left py-4 px-6 font-semibold">Estoque</th>
                <th className="text-left py-4 px-6 font-semibold">Status</th>
                <th className="text-left py-4 px-6 font-semibold">Dropshipping</th>
                <th className="text-left py-4 px-6 font-semibold">Marketplaces</th>
                <th className="text-right py-4 px-6 font-semibold">Ações</th>
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
                  <td className="py-4 px-6">
                    <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
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
                  <td className="py-4 px-6">
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-gray-500">ID: {product.id.slice(0, 8)}...</p>
                    {product.supplierSku && (
                      <p className="text-xs text-gray-400">SKU: {product.supplierSku}</p>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    {product.supplier?.name || (
                      <span className="text-sm text-gray-400">Sem fornecedor</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {product.category.name}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <p className="font-semibold">R$ {product.price.toFixed(2)}</p>
                    {product.comparePrice && (
                      <p className="text-sm text-gray-500 line-through">
                        R$ {product.comparePrice.toFixed(2)}
                      </p>
                    )}
                  </td>
                  <td className="py-4 px-6">
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
                  <td className="py-4 px-6">
                    {product.featured && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs mr-2">
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
                  <td className="py-4 px-6">
                    <ToggleDropshippingButton 
                      productId={product.id}
                      isDropshipping={product.isDropshipping}
                      commission={product.dropshippingCommission}
                    />
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1">
                      {product.marketplaceListings.length === 0 ? (
                        <span className="text-xs text-gray-400">Não publicado</span>
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
                  <td className="py-4 px-6">
                    <div className="flex justify-end space-x-2">
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
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                        title="Editar"
                      >
                        <FiEdit size={18} />
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
            <p className="text-gray-500 mb-4">Nenhum produto cadastrado</p>
            <Link
              href="/admin/produtos/novo"
              className="text-primary-600 hover:text-primary-700 font-semibold"
            >
              Criar primeiro produto →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
