import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Termos de Uso | MYDSHOP',
  description: 'Leia os Termos de Uso da MYDSHOP Marketplace. Regras, direitos e deveres dos usuários, vendedores e compradores.',
}

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="flex justify-center mb-4">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="8" width="60" height="64" rx="6" fill="#3B82F6"/>
                <rect x="18" y="22" width="44" height="5" rx="2" fill="white" opacity="0.8"/>
                <rect x="18" y="33" width="44" height="5" rx="2" fill="white" opacity="0.8"/>
                <rect x="18" y="44" width="30" height="5" rx="2" fill="white" opacity="0.8"/>
                <circle cx="58" cy="58" r="14" fill="#10B981"/>
                <path d="M52 58 L56 62 L64 54" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Termos de Uso
            </h1>
            <p className="text-gray-500">MYDSHOP Marketplace — Última atualização: março de 2026</p>
          </div>

          <div className="prose prose-lg max-w-none text-gray-700 space-y-8">
            <p className="text-lg leading-relaxed">
              Bem-vindo à <strong className="text-blue-600">MYDSHOP Marketplace</strong>. Ao acessar ou utilizar nossa plataforma, você concorda com os presentes Termos de Uso. Leia atentamente antes de continuar.
            </p>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Sobre a Plataforma</h2>
              <p>A MYDSHOP é um marketplace que conecta compradores e vendedores, oferecendo uma plataforma segura para a comercialização de produtos. Não somos fabricantes nem revendedores diretos — atuamos como intermediários entre compradores e vendedores independentes cadastrados em nossa plataforma.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Cadastro e Conta</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>O cadastro é individual, intransferível e de uso exclusivo do titular.</li>
                <li>Você é responsável pela veracidade das informações fornecidas.</li>
                <li>É proibido criar contas com dados falsos ou de terceiros sem autorização.</li>
                <li>Em caso de uso indevido, a conta poderá ser suspensa ou cancelada sem aviso prévio.</li>
                <li>Menores de 18 anos devem ter autorização de um responsável legal.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Compras e Pagamentos</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Os preços exibidos são em reais (BRL) e incluem os tributos aplicáveis, exceto quando indicado de outra forma.</li>
                <li>A confirmação do pedido ocorre após a aprovação do pagamento.</li>
                <li>Em caso de divergência de preço por erro técnico, a MYDSHOP reserva-se o direito de cancelar o pedido e reembolsar o valor pago.</li>
                <li>Meios de pagamento disponíveis: cartão de crédito, boleto bancário, Pix e outros métodos exibidos no checkout.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Entrega e Frete</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Os prazos de entrega são estimados e podem variar conforme a região e o vendedor.</li>
                <li>O cálculo do frete é realizado no checkout com base no CEP de destino.</li>
                <li>Em casos de força maior (greves, desastres naturais, etc.), os prazos podem ser impactados sem responsabilidade da MYDSHOP.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Política de Troca e Devolução</h2>
              <p>
                Conforme o Código de Defesa do Consumidor (Lei 8.078/90), você tem direito a:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Arrependimento:</strong> Cancelamento em até 7 dias corridos após o recebimento, sem necessidade de justificativa, para compras realizadas fora de estabelecimento físico.</li>
                <li><strong>Defeito:</strong> Reclamação em até 90 dias para produtos duráveis com defeito de fabricação.</li>
              </ul>
              <p className="mt-3">
                Consulte nossa <Link href="/politica-devolucao" className="text-blue-600 hover:underline">Política de Devolução</Link> completa para mais detalhes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Vendedores e Parceiros</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Os vendedores são responsáveis pela qualidade, veracidade das informações e entrega dos produtos anunciados.</li>
                <li>A MYDSHOP pode remover produtos ou suspender vendedores que violem as políticas da plataforma.</li>
                <li>O cadastro como vendedor está sujeito a aprovação e cumprimento do contrato de parceria.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Propriedade Intelectual</h2>
              <p>Todo o conteúdo da plataforma (logotipo, design, textos, código-fonte) é protegido por direitos autorais e não pode ser reproduzido sem autorização expressa da MYDSHOP.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Limitação de Responsabilidade</h2>
              <p>A MYDSHOP não se responsabiliza por danos indiretos, perda de lucros ou danos decorrentes do uso inadequado da plataforma por terceiros. Nossa responsabilidade fica limitada ao valor da transação envolvida.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">9. Privacidade e Dados Pessoais</h2>
              <p>
                O uso dos seus dados pessoais é regido pela nossa{' '}
                <Link href="/politica-privacidade" className="text-blue-600 hover:underline">Política de Privacidade</Link>,
                em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">10. Alterações nos Termos</h2>
              <p>A MYDSHOP reserva-se o direito de alterar estes Termos a qualquer momento. As alterações entram em vigor imediatamente após a publicação. O uso continuado da plataforma após as alterações implica na aceitação dos novos termos.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">11. Foro e Legislação</h2>
              <p>Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca de domicílio do consumidor para dirimir quaisquer disputas, nos termos do Código de Defesa do Consumidor.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">12. Contato</h2>
              <p>
                Dúvidas sobre estes Termos? Entre em contato:{' '}
                <a href="mailto:contato@mydshop.com.br" className="text-blue-600 hover:underline">contato@mydshop.com.br</a>
                {' '}ou acesse nossa página de{' '}
                <Link href="/contato" className="text-blue-600 hover:underline">Contato</Link>.
              </p>
            </section>
          </div>

          {/* Links relacionados */}
          <div className="mt-12 pt-8 border-t border-gray-100 flex flex-wrap gap-4 justify-center">
            <Link href="/politica-privacidade" className="text-sm text-blue-600 hover:underline">Política de Privacidade</Link>
            <Link href="/politica-devolucao" className="text-sm text-blue-600 hover:underline">Política de Devolução</Link>
            <Link href="/contato" className="text-sm text-blue-600 hover:underline">Fale Conosco</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
