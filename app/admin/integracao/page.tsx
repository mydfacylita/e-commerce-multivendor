import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { FiShoppingBag, FiPackage, FiRefreshCw, FiShoppingCart } from 'react-icons/fi'

export default async function IntegracaoPage() {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      supplier: true,
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Integração com Marketplaces</h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Mercado Livre</h3>
            <FiShoppingBag size={32} />
          </div>
          <p className="text-sm mb-4 opacity-90">
            Liste seus produtos automaticamente no Mercado Livre
          </p>
          <Link
            href="/admin/integracao/mercadolivre"
            className="block bg-white text-yellow-600 text-center py-2 rounded-md font-semibold hover:bg-yellow-50"
          >
            Configurar
          </Link>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">AliExpress</h3>
            <FiShoppingCart size={32} />
          </div>
          <p className="text-sm mb-4 opacity-90">
            Importar produtos do AliExpress como fornecedor dropshipping
          </p>
          <Link
            href="/admin/integracao/aliexpress"
            className="block bg-white text-orange-600 text-center py-2 rounded-md font-semibold hover:bg-orange-50"
          >
            Configurar
          </Link>
        </div>

        <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Amazon</h3>
            <FiPackage size={32} />
          </div>
          <p className="text-sm mb-4 opacity-90">
            Integre com Amazon Seller Central
          </p>
          <button
            disabled
            className="w-full bg-white/50 text-white text-center py-2 rounded-md font-semibold cursor-not-allowed"
          >
            Em breve
          </button>
        </div>

        <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Shopee</h3>
            <FiRefreshCw size={32} />
          </div>
          <p className="text-sm mb-4 opacity-90">
            Sincronize com Shopee Brasil
          </p>
          <Link
            href="/admin/integracao/shopee"
            className="block bg-white text-purple-600 text-center py-2 rounded-md font-semibold hover:bg-purple-50"
          >
            Configurar
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Produtos Disponíveis para Integração</h2>
        <p className="text-gray-600 mb-6">
          {products.length} produtos prontos para serem listados em marketplaces
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Produto</th>
                <th className="text-left py-3 px-4">Categoria</th>
                <th className="text-left py-3 px-4">Preço</th>
                <th className="text-left py-3 px-4">Estoque</th>
                <th className="text-left py-3 px-4">Fornecedor</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{product.name}</td>
                  <td className="py-3 px-4 text-gray-600">{product.category.name}</td>
                  <td className="py-3 px-4 text-green-600 font-semibold">
                    R$ {product.price.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-sm ${
                      product.stock > 10 
                        ? 'bg-green-100 text-green-800' 
                        : product.stock > 0 
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.stock} un.
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {product.supplier?.name || 'Próprio'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-lg mb-2 text-blue-900">💡 Como funciona?</h3>
        <ul className="space-y-2 text-blue-800">
          <li>✅ <strong>Listagem Automática:</strong> Publique produtos com um clique</li>
          <li>✅ <strong>Sincronização de Estoque:</strong> Estoque atualizado em tempo real</li>
          <li>✅ <strong>Gerenciamento Centralizado:</strong> Controle tudo em um só lugar</li>
          <li>✅ <strong>Pedidos Unificados:</strong> Todos os pedidos aparecem aqui</li>
        </ul>
      </div>
    </div>
  )
}
