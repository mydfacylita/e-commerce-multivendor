import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { FiShoppingBag, FiPackage, FiRefreshCw, FiShoppingCart, FiCreditCard, FiDollarSign, FiVideo, FiMessageCircle, FiMail, FiTruck } from 'react-icons/fi'

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
      <h1 className="text-3xl font-bold mb-8">Integrações</h1>

      {/* Configuração Global */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-blue-800">⚙️ Configuração de Credenciais</h3>
            <p className="text-sm text-blue-600">
              Configure as credenciais globais para que os vendedores possam conectar suas contas com apenas um clique.
            </p>
          </div>
          <Link
            href="/admin/integracao/marketplaces"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Configurar Apps
          </Link>
        </div>
      </div>

      {/* Marketplaces */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">🛒 Marketplaces</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        <div className="bg-gradient-to-br from-gray-900 via-pink-600 to-cyan-400 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">TikTok Shop</h3>
            <FiVideo size={32} />
          </div>
          <p className="text-sm mb-4 opacity-90">
            Venda seus produtos no TikTok Shop 🔥
          </p>
          <Link
            href="/admin/integracao/tiktokshop"
            className="block bg-white text-pink-600 text-center py-2 rounded-md font-semibold hover:bg-pink-50"
          >
            Configurar
          </Link>
        </div>
        </div>
      </div>

      {/* Gateways de Pagamento */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">💳 Gateways de Pagamento</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Mercado Pago</h3>
              <FiDollarSign size={32} />
            </div>
            <p className="text-sm mb-4 opacity-90">
              Receba pagamentos via Pix, cartão de crédito e boleto
            </p>
            <Link
              href="/admin/integracao/mercadopago"
              className="block bg-white text-blue-600 text-center py-2 rounded-md font-semibold hover:bg-blue-50 transition-colors"
            >
              Configurar
            </Link>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Nubank PJ</h3>
              <FiDollarSign size={32} />
            </div>
            <p className="text-sm mb-4 opacity-90">
              Envie pagamentos via PIX gratuitamente
            </p>
            <Link
              href="/admin/integracao/nubank"
              className="block bg-white text-purple-600 text-center py-2 rounded-md font-semibold hover:bg-purple-50 transition-colors"
            >
              Configurar
            </Link>
          </div>

          <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">PagSeguro</h3>
              <FiCreditCard size={32} />
            </div>
            <p className="text-sm mb-4 opacity-90">
              Aceite pagamentos com PagSeguro/UOL
            </p>
            <button
              disabled
              className="w-full bg-white/50 text-white text-center py-2 rounded-md font-semibold cursor-not-allowed"
            >
              Em breve
            </button>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Stripe</h3>
              <FiCreditCard size={32} />
            </div>
            <p className="text-sm mb-4 opacity-90">
              Pagamentos internacionais com Stripe
            </p>
            <button
              disabled
              className="w-full bg-white/50 text-white text-center py-2 rounded-md font-semibold cursor-not-allowed"
            >
              Em breve
            </button>
          </div>

          <div className="bg-gradient-to-br from-red-400 to-pink-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">PayPal</h3>
              <FiDollarSign size={32} />
            </div>
            <p className="text-sm mb-4 opacity-90">
              Aceite PayPal para vendas internacionais
            </p>
            <button
              disabled
              className="w-full bg-white/50 text-white text-center py-2 rounded-md font-semibold cursor-not-allowed"
            >
              Em breve
            </button>
          </div>

          <div className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Pix</h3>
              <FiDollarSign size={32} />
            </div>
            <p className="text-sm mb-4 opacity-90">
              Receba via Pix instantaneamente
            </p>
            <button
              disabled
              className="w-full bg-white/50 text-white text-center py-2 rounded-md font-semibold cursor-not-allowed"
            >
              Em breve
            </button>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Boleto</h3>
              <FiCreditCard size={32} />
            </div>
            <p className="text-sm mb-4 opacity-90">
              Gere boletos bancários automaticamente
            </p>
            <button
              disabled
              className="w-full bg-white/50 text-white text-center py-2 rounded-md font-semibold cursor-not-allowed"
            >
              Em breve
            </button>
          </div>
        </div>
      </div>

      {/* Comunicação / Mensageria */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">💬 Comunicação</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">WhatsApp Business</h3>
              <FiMessageCircle size={32} />
            </div>
            <p className="text-sm mb-4 opacity-90">
              Envie notificações de pedidos, PIX e boleto via WhatsApp (API Oficial Meta)
            </p>
            <Link
              href="/admin/integracao/whatsapp"
              className="block bg-white text-green-600 text-center py-2 rounded-md font-semibold hover:bg-green-50 transition-colors"
            >
              Configurar
            </Link>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Email (SMTP)</h3>
              <FiMail size={32} />
            </div>
            <p className="text-sm mb-4 opacity-90">
              Configure envio de emails transacionais
            </p>
            <button
              disabled
              className="w-full bg-white/50 text-white text-center py-2 rounded-md font-semibold cursor-not-allowed"
            >
              Em breve
            </button>
          </div>
        </div>
      </div>

      {/* Encomendas/Envios */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">📦 Encomendas/Envios</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Correios</h3>
              <FiTruck size={32} />
            </div>
            <p className="text-sm mb-4 opacity-90">
              Consulte fretes, rastreie encomendas e gere etiquetas pelos Correios
            </p>
            <Link
              href="/admin/integracao/envios"
              className="block bg-white text-yellow-600 text-center py-2 rounded-md font-semibold hover:bg-yellow-50 transition-colors"
            >
              Configurar
            </Link>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Jadlog</h3>
              <FiPackage size={32} />
            </div>
            <p className="text-sm mb-4 opacity-90">
              Integração com transportadora Jadlog
            </p>
            <button
              disabled
              className="w-full bg-white/50 text-white text-center py-2 rounded-md font-semibold cursor-not-allowed"
            >
              Em breve
            </button>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Melhor Envio</h3>
              <FiTruck size={32} />
            </div>
            <p className="text-sm mb-4 opacity-90">
              Multicarrier: Correios, Jadlog, Azul e mais
            </p>
            <button
              disabled
              className="w-full bg-white/50 text-white text-center py-2 rounded-md font-semibold cursor-not-allowed"
            >
              Em breve
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
