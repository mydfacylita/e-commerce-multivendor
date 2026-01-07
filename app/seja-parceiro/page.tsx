import Link from 'next/link';
import { FiCheck, FiDollarSign, FiTrendingUp, FiPackage, FiUsers, FiShoppingBag } from 'react-icons/fi';

export default function SejaParceiro() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">
              Seja um Parceiro MYDSHOP
            </h1>
            <p className="text-2xl mb-8 text-primary-100">
              Venda seus produtos em nossa plataforma e alcance milhares de clientes
            </p>
            <Link
              href="/vendedor/cadastro"
              className="inline-block bg-accent-500 text-white px-8 py-4 rounded-lg text-xl font-semibold hover:bg-accent-600 transition"
            >
              🚀 Comece Agora Gratuitamente
            </Link>
          </div>
        </div>
      </div>

      {/* Benefícios */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Por que vender conosco?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-xl">
              <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <FiDollarSign size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4">Baixa Comissão</h3>
              <p className="text-gray-700">
                Apenas 10% de comissão sobre suas vendas. Você fica com 90% do valor!
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-xl">
              <div className="bg-green-600 text-white w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <FiTrendingUp size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4">Sem Mensalidade</h3>
              <p className="text-gray-700">
                Zero custos fixos. Você só paga quando vende, sem taxas de cadastro ou mensalidade.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-xl">
              <div className="bg-purple-600 text-white w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <FiPackage size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4">Sua Própria Loja</h3>
              <p className="text-gray-700">
                Tenha uma loja virtual personalizada com sua marca dentro da nossa plataforma.
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-xl">
              <div className="bg-orange-600 text-white w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <FiUsers size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4">Milhares de Clientes</h3>
              <p className="text-gray-700">
                Acesso imediato a nossa base de clientes ativos e crescente fluxo de visitantes.
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 p-8 rounded-xl">
              <div className="bg-red-600 text-white w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <FiShoppingBag size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4">Gestão Completa</h3>
              <p className="text-gray-700">
                Dashboard completo para gerenciar produtos, vendas, estoque e finanças.
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-8 rounded-xl">
              <div className="bg-yellow-600 text-white w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <FiCheck size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4">Pagamentos Rápidos</h3>
              <p className="text-gray-700">
                Receba suas vendas de forma rápida e segura direto na sua conta bancária ou PIX.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Como Funciona */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Como Funciona?</h2>
          
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start mb-8">
              <div className="bg-primary-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl flex-shrink-0">
                1
              </div>
              <div className="ml-6">
                <h3 className="text-2xl font-bold mb-2">Cadastre-se</h3>
                <p className="text-gray-700 text-lg">
                  Preencha o formulário com seus dados (Pessoa Física ou Jurídica), informações da loja e dados bancários.
                </p>
              </div>
            </div>

            <div className="flex items-start mb-8">
              <div className="bg-primary-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl flex-shrink-0">
                2
              </div>
              <div className="ml-6">
                <h3 className="text-2xl font-bold mb-2">Aguarde Aprovação</h3>
                <p className="text-gray-700 text-lg">
                  Nossa equipe analisa seu cadastro em até 24 horas. Você receberá um email confirmando a aprovação.
                </p>
              </div>
            </div>

            <div className="flex items-start mb-8">
              <div className="bg-primary-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl flex-shrink-0">
                3
              </div>
              <div className="ml-6">
                <h3 className="text-2xl font-bold mb-2">Cadastre seus Produtos</h3>
                <p className="text-gray-700 text-lg">
                  Adicione seus produtos com fotos, descrições, preços e estoque. Quanto mais completo, mais vendas!
                </p>
              </div>
            </div>

            <div className="flex items-start mb-8">
              <div className="bg-primary-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl flex-shrink-0">
                4
              </div>
              <div className="ml-6">
                <h3 className="text-2xl font-bold mb-2">Comece a Vender</h3>
                <p className="text-gray-700 text-lg">
                  Seus produtos ficam visíveis para milhares de clientes. Gerencie pedidos e acompanhe vendas em tempo real.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-primary-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl flex-shrink-0">
                5
              </div>
              <div className="ml-6">
                <h3 className="text-2xl font-bold mb-2">Receba seus Pagamentos</h3>
                <p className="text-gray-700 text-lg">
                  Acompanhe seu financeiro no dashboard e solicite saques quando quiser. Dinheiro na sua conta rapidamente!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tipos de Vendedor */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Quem Pode Vender?</h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="border-2 border-blue-200 rounded-xl p-8 hover:border-blue-500 transition">
              <h3 className="text-3xl font-bold mb-4 text-blue-600">👤 Pessoa Física</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <FiCheck className="text-green-600 mr-3 mt-1 flex-shrink-0" size={20} />
                  <span>Ideal para quem está começando ou tem pequeno estoque</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-green-600 mr-3 mt-1 flex-shrink-0" size={20} />
                  <span>Cadastro simples com CPF e RG</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-green-600 mr-3 mt-1 flex-shrink-0" size={20} />
                  <span>Receba por PIX ou transferência bancária</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-green-600 mr-3 mt-1 flex-shrink-0" size={20} />
                  <span>Perfeito para vendedores autônomos</span>
                </li>
              </ul>
              <Link
                href="/vendedor/cadastro/pf"
                className="block mt-6 bg-blue-600 text-white text-center py-3 rounded-lg hover:bg-blue-700 font-semibold"
              >
                Cadastrar como PF
              </Link>
            </div>

            <div className="border-2 border-purple-200 rounded-xl p-8 hover:border-purple-500 transition">
              <h3 className="text-3xl font-bold mb-4 text-purple-600">🏢 Pessoa Jurídica</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <FiCheck className="text-green-600 mr-3 mt-1 flex-shrink-0" size={20} />
                  <span>Para empresas estabelecidas com CNPJ</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-green-600 mr-3 mt-1 flex-shrink-0" size={20} />
                  <span>Maior credibilidade com nota fiscal</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-green-600 mr-3 mt-1 flex-shrink-0" size={20} />
                  <span>Ideal para grande volume de vendas</span>
                </li>
                <li className="flex items-start">
                  <FiCheck className="text-green-600 mr-3 mt-1 flex-shrink-0" size={20} />
                  <span>Condições especiais para atacado</span>
                </li>
              </ul>
              <Link
                href="/vendedor/cadastro/pj"
                className="block mt-6 bg-purple-600 text-white text-center py-3 rounded-lg hover:bg-purple-700 font-semibold"
              >
                Cadastrar como PJ
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Final */}
      <div className="py-20 bg-gradient-to-r from-accent-500 to-accent-700 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Pronto para começar a vender?
          </h2>
          <p className="text-2xl mb-8 text-accent-100">
            Junte-se a centenas de vendedores que já confiam na MYDSHOP
          </p>
          <Link
            href="/vendedor/cadastro"
            className="inline-block bg-white text-accent-600 px-10 py-4 rounded-lg text-xl font-bold hover:bg-gray-100 transition"
          >
            Cadastrar Agora - É Grátis! 🚀
          </Link>
          <p className="mt-6 text-accent-100">
            Sem custos de setup • Sem mensalidade • Comece hoje mesmo
          </p>
        </div>
      </div>
    </div>
  );
}
