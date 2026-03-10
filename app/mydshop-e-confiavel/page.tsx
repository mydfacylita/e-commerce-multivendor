import type { Metadata } from 'next'
import Link from 'next/link'
import { FiCheckCircle, FiShield, FiMapPin, FiPhone, FiMail, FiExternalLink } from 'react-icons/fi'

export const metadata: Metadata = {
  title: 'A MYDSHOP é confiável? | Empresa registrada, CNPJ ativo',
  description: 'Sim! A MYDSHOP é um marketplace 100% brasileiro, com CNPJ ativo 24.223.868/0001-19, empresa M Feitoza Ribeiro (MYD FACILYTA TECHNOLOGY), registrada em São Luís – MA desde 2016.',
  keywords: ['mydshop confiavel', 'mydshop cnpj', 'mydshop é golpe', 'mydshop é seguro', 'mydshop marketplace', 'myd facilyta technology'],
  openGraph: {
    title: 'A MYDSHOP é confiável? Sim — CNPJ ativo desde 2016',
    description: 'Empresa registrada na Receita Federal, CNPJ 24.223.868/0001-19. Compre com segurança no marketplace brasileiro.',
    type: 'website',
    url: 'https://www.mydshop.com.br/mydshop-e-confiavel',
  },
  alternates: {
    canonical: 'https://www.mydshop.com.br/mydshop-e-confiavel',
  },
}

export default function ConfiaveisPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 space-y-8">

        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-white text-center shadow-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
            <FiShield size={36} className="text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            A MYDSHOP é confiável?
          </h1>
          <p className="text-blue-100 text-lg">
            Sim. Somos um marketplace 100% brasileiro, com empresa registrada, CNPJ ativo e operação transparente desde 2016.
          </p>
        </div>

        {/* Resposta direta */}
        <div className="bg-white rounded-2xl shadow p-6 border-l-4 border-green-500">
          <div className="flex items-start gap-3">
            <FiCheckCircle className="text-green-500 shrink-0 mt-1" size={22} />
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Resposta direta: Sim, a MYDSHOP é confiável.</h2>
              <p className="text-gray-600 leading-relaxed">
                A MYDSHOP é um marketplace online operado pela empresa <strong>M FEITOZA RIBEIRO</strong>, 
                registrada na Receita Federal do Brasil com CNPJ <strong>24.223.868/0001-19</strong>, 
                situação cadastral <strong>ATIVA</strong>, sediada em São Luís – Maranhão.
              </p>
            </div>
          </div>
        </div>

        {/* Dados do CNPJ */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            <FiShield className="text-blue-600" /> Dados Oficiais — Receita Federal
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'CNPJ', value: '24.223.868/0001-19' },
              { label: 'Situação Cadastral', value: '✅ ATIVA', green: true },
              { label: 'Razão Social', value: 'MYD Facilyta Technology (MYDSHOP)' },
              { label: 'Nome Fantasia', value: 'MYDSHOP' },
              { label: 'Endereço', value: 'Av. dos Holandeses, Nº 15 – Sala 15, Chau – CEP 65065-180' },
              { label: 'Cidade / UF', value: 'São Luís – MA' },
              { label: 'Data de Abertura', value: '22/02/2016' },
              { label: 'Natureza Jurídica', value: 'Empresário Individual' },
              { label: 'Atividade Principal', value: 'Consultoria em Tecnologia da Informação' },
            ].map(({ label, value, green }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`font-semibold ${green ? 'text-green-600' : 'text-gray-900'}`}>{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Fonte: Receita Federal do Brasil —{' '}
            <a
              href="https://www.gov.br/receitafederal/pt-br"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline inline-flex items-center gap-1"
            >
              gov.br/receitafederal <FiExternalLink size={10} />
            </a>
          </p>
        </div>

        {/* Atividades */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Atividades Econômicas Registradas</h2>
          <ul className="space-y-2">
            {[
              'Consultoria em tecnologia da informação (atividade principal)',
              'Desenvolvimento de programas de computador sob encomenda',
              'Serviços de aplicação e hospedagem na internet',
              'Comércio varejista de equipamentos de informática e periféricos',
            ].map((ativ) => (
              <li key={ativ} className="flex items-start gap-2 text-gray-700">
                <FiCheckCircle className="text-blue-500 shrink-0 mt-0.5" size={16} />
                {ativ}
              </li>
            ))}
          </ul>
        </div>

        {/* Por que somos confiáveis */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-5">Por que comprar na MYDSHOP com segurança?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: 'Empresa registrada desde 2016', desc: 'Mais de 8 anos de operação com CNPJ ativo na Receita Federal.' },
              { title: 'Pagamento seguro', desc: 'Utilizamos gateways homologados como Mercado Pago para proteger seu pagamento.' },
              { title: 'Nota Fiscal emitida', desc: 'Todos os pedidos são faturados com nota fiscal eletrônica (NF-e).' },
              { title: 'Proteção ao consumidor', desc: 'Respeitamos o Código de Defesa do Consumidor e direito de arrependimento.' },
              { title: 'SSL e dados criptografados', desc: 'Site com certificado SSL — toda comunicação é criptografada.' },
              { title: 'Suporte dedicado', desc: 'Equipe de atendimento disponível para resolver qualquer problema com seu pedido.' },
            ].map(({ title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                <FiCheckCircle className="text-blue-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-white rounded-2xl shadow p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pronto para comprar com segurança?</h2>
          <p className="text-gray-500 mb-6">Encontre produtos com os melhores preços e entrega para todo o Brasil.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/produtos"
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Ver Produtos
            </Link>
            <Link
              href="/contato"
              className="bg-gray-100 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Falar com o Suporte
            </Link>
          </div>
        </div>

        {/* Links internos para SEO */}
        <div className="text-center text-sm text-gray-400 space-x-4">
          <Link href="/sobre" className="hover:text-blue-600">Sobre a MYDSHOP</Link>
          <span>·</span>
          <Link href="/politica-privacidade" className="hover:text-blue-600">Política de Privacidade</Link>
          <span>·</span>
          <Link href="/termos" className="hover:text-blue-600">Termos de Uso</Link>
          <span>·</span>
          <Link href="/contato" className="hover:text-blue-600">Contato</Link>
        </div>

      </div>
    </div>
  )
}
