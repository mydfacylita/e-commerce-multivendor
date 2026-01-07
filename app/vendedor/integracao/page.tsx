import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserPermissions } from '@/lib/seller'
import Link from 'next/link'
import { FiShoppingBag, FiPackage, FiRefreshCw, FiShoppingCart } from 'react-icons/fi'

export default async function VendedorIntegracaoPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'SELLER') {
    redirect('/login');
  }

  // Verificar permissões
  const permissions = await getUserPermissions(session);
  if (!permissions || (!permissions.canManageIntegrations && !permissions.isOwner)) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-red-800 mb-2">🚫 Acesso Negado</h2>
          <p className="text-red-600">
            Você não tem permissão para gerenciar integrações.
          </p>
          <p className="text-sm text-red-500 mt-2">
            Apenas o proprietário da loja pode configurar integrações com marketplaces.
          </p>
        </div>
      </div>
    );
  }

  // Buscar vendedor
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { 
      seller: true,
      workForSeller: true 
    }
  });

  const seller = user?.seller || user?.workForSeller;

  if (!seller) {
    redirect('/vendedor/cadastro');
  }

  // Buscar produtos do vendedor
  const products = await prisma.product.findMany({
    where: { sellerId: seller.id },
    include: {
      category: true,
      supplier: true,
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Integração com Marketplaces</h1>
        <p className="text-gray-600 mt-2">Conecte sua loja aos principais marketplaces do Brasil</p>
      </div>

      {/* Aviso Importante sobre Dropshipping */}
      <div className="bg-orange-50 border-l-4 border-orange-500 p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="bg-orange-500 text-white p-2 rounded-lg flex-shrink-0">
            <FiPackage size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-orange-900 mb-2">⚠️ Atenção: Produtos de Dropshipping</h3>
            <div className="text-sm text-orange-800 space-y-2">
              <p className="font-semibold">
                Produtos adicionados via DROPSHIPPING <strong className="underline">NÃO podem ser publicados em marketplaces externos</strong>.
              </p>
              <div className="bg-orange-100 rounded p-3 mt-3">
                <p className="font-semibold mb-2">Por que essa restrição?</p>
                <ul className="space-y-1 text-xs">
                  <li>• Marketplaces externos processam pagamentos diretamente</li>
                  <li>• Não conseguimos garantir o repasse ao fornecedor</li>
                  <li>• Impossível rastrear vendas externas</li>
                  <li>• Risco alto de problemas financeiros e logísticos</li>
                </ul>
              </div>
              <div className="bg-green-100 rounded p-3 mt-3">
                <p className="font-semibold mb-2 text-green-900">✅ O que VOCÊ PODE fazer:</p>
                <ul className="space-y-1 text-xs text-green-800">
                  <li>• Vender produtos de dropshipping na <strong>sua loja da plataforma</strong></li>
                  <li>• Publicar seus <strong>produtos próprios</strong> em qualquer marketplace</li>
                  <li>• Adicionar produtos próprios e ter total liberdade</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

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
            href="/vendedor/integracao/mercadolivre"
            className="block bg-white text-yellow-600 text-center py-2 rounded-md font-semibold hover:bg-yellow-50 transition-colors"
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
            href="/vendedor/integracao/aliexpress"
            className="block bg-white text-orange-600 text-center py-2 rounded-md font-semibold hover:bg-orange-50 transition-colors"
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
            href="/vendedor/integracao/shopee"
            className="block bg-white text-purple-600 text-center py-2 rounded-md font-semibold hover:bg-purple-50 transition-colors"
          >
            Configurar
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Seus Produtos Disponíveis</h2>
        <p className="text-gray-600 mb-6">
          {products.length} {products.length === 1 ? 'produto pronto' : 'produtos prontos'} para ser listado em marketplaces
        </p>

        {products.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Você ainda não tem produtos cadastrados</p>
            <Link
              href="/vendedor/produtos"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Adicionar Primeiro Produto
            </Link>
          </div>
        ) : (
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
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-lg mb-2 text-blue-900">💡 Como funciona?</h3>
        <ul className="space-y-2 text-blue-800">
          <li>✅ <strong>Listagem Automática:</strong> Publique produtos com um clique</li>
          <li>✅ <strong>Sincronização de Estoque:</strong> Estoque atualizado em tempo real</li>
          <li>✅ <strong>Gerenciamento Centralizado:</strong> Controle tudo em um só lugar</li>
          <li>✅ <strong>Pedidos Unificados:</strong> Todos os pedidos aparecem no seu painel</li>
          <li>✅ <strong>Dropshipping:</strong> Integre produtos de fornecedores para venda sem estoque</li>
        </ul>
      </div>
    </div>
  )
}
