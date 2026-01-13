import Link from 'next/link'

export default function PoliticaPrivacidadePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="flex justify-center mb-4">
              <svg width="80" height="96" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="bagGradPolicy" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#2563EB" />
                  </linearGradient>
                </defs>
                <path d="M35 50 L30 115 C30 119 32 122 35 122 L85 122 C88 122 90 119 90 115 L85 50 Z" 
                      fill="url(#bagGradPolicy)" stroke="#2563EB" strokeWidth="3" strokeLinejoin="round"/>
                <path d="M37 50 C37 38 45 30 60 30 C75 30 83 38 83 50" 
                      stroke="#F97316" strokeWidth="5" fill="none" strokeLinecap="round"/>
                <circle cx="50" cy="75" r="6" fill="white"/>
                <circle cx="70" cy="75" r="6" fill="white"/>
                <ellipse cx="45" cy="65" rx="6" ry="8" fill="white" opacity="0.4"/>
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Política de Privacidade
            </h1>
            <p className="text-gray-500">MYDSHOP Marketplace</p>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none text-gray-700 space-y-8">
            <p className="text-lg leading-relaxed">
              A <strong className="text-primary-600">MYDSHOP Marketplace</strong> respeita a sua privacidade e está comprometida com a proteção dos dados pessoais de seus usuários, clientes, parceiros e vendedores. Esta Política de Privacidade descreve como coletamos, utilizamos, armazenamos e protegemos suas informações ao utilizar nossa plataforma.
            </p>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm">1</span>
                Coleta de Informações
              </h2>
              <p className="leading-relaxed">
                Coletamos informações pessoais fornecidas diretamente por você, incluindo nome completo, CPF ou CNPJ, endereço, e-mail, telefone e dados de pagamento quando aplicável. Além disso, podemos coletar automaticamente informações como endereço IP, tipo de navegador, dispositivo utilizado, dados de navegação e uso da plataforma, bem como informações obtidas por meio de cookies e tecnologias semelhantes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm">2</span>
                Uso das Informações
              </h2>
              <p className="leading-relaxed">
                As informações coletadas são utilizadas para processar cadastros, pedidos e pagamentos, intermediar transações entre compradores e vendedores, melhorar a experiência do usuário, cumprir obrigações legais e regulatórias, prevenir fraudes e garantir a segurança da plataforma, além de enviar comunicações relacionadas aos serviços da MYDSHOP.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm">3</span>
                Compartilhamento de Dados
              </h2>
              <p className="leading-relaxed">
                A MYDSHOP <strong>não vende dados pessoais</strong>. O compartilhamento pode ocorrer apenas quando estritamente necessário, como com parceiros logísticos e meios de pagamento, com vendedores cadastrados para viabilizar a entrega dos produtos, para cumprimento de obrigações legais, judiciais ou regulatórias, ou mediante consentimento expresso do titular dos dados.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm">4</span>
                Armazenamento e Segurança
              </h2>
              <p className="leading-relaxed">
                Adotamos medidas técnicas e administrativas adequadas para proteger os dados pessoais contra acesso não autorizado, perda, alteração ou divulgação indevida. As informações são armazenadas em ambientes seguros e mantidas pelo tempo necessário para cumprir as finalidades descritas nesta política, garantindo total conformidade com as melhores práticas de segurança da informação.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm">5</span>
                Cookies
              </h2>
              <p className="leading-relaxed">
                Utilizamos cookies para melhorar o desempenho da plataforma, personalizar conteúdos e analisar o uso do sistema. Esses pequenos arquivos de texto são armazenados em seu dispositivo e nos ajudam a oferecer uma experiência mais personalizada. O usuário pode gerenciar ou desativar os cookies diretamente nas configurações do seu navegador.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm">6</span>
                Direitos do Titular dos Dados
              </h2>
              <p className="leading-relaxed">
                Nos termos da Lei Geral de Proteção de Dados (LGPD), você tem o direito de confirmar a existência de tratamento de dados, acessar, corrigir ou atualizar seus dados pessoais, solicitar a exclusão de dados quando aplicável, e revogar o consentimento a qualquer momento. Todas as solicitações podem ser feitas por meio dos canais oficiais da MYDSHOP, e serão atendidas no prazo legal estabelecido.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm">7</span>
                Alterações nesta Política
              </h2>
              <p className="leading-relaxed">
                Esta Política de Privacidade pode ser atualizada a qualquer momento para refletir melhorias em nossos processos ou mudanças na legislação aplicável. Recomendamos que você revise este documento periodicamente para estar sempre informado sobre como protegemos suas informações.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm">8</span>
                Contato
              </h2>
              <p className="leading-relaxed">
                Em caso de dúvidas, solicitações ou reclamações relacionadas à privacidade e proteção de dados, entre em contato com a MYDSHOP Marketplace por meio dos canais oficiais disponibilizados na plataforma. Nossa equipe está preparada para atendê-lo e esclarecer qualquer questão sobre o tratamento dos seus dados pessoais.
              </p>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500 mb-4">
              Última atualização: Janeiro de 2026
            </p>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Voltar para a loja
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
