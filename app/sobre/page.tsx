import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Sobre Nós | MYDSHOP',
  description: 'Conheça a MYDSHOP Marketplace. Nossa missão é conectar compradores e vendedores em todo o Brasil com segurança, praticidade e os melhores preços.',
}

export default function SobrePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">

          {/* Header com logo */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <svg width="90" height="96" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="bagGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6"/>
                    <stop offset="100%" stopColor="#2563EB"/>
                  </linearGradient>
                </defs>
                <path d="M35 50 L30 115 C30 119 32 122 35 122 L85 122 C88 122 90 119 90 115 L85 50 Z"
                      fill="url(#bagGrad)" stroke="#2563EB" strokeWidth="3" strokeLinejoin="round"/>
                <path d="M37 50 C37 38 45 30 60 30 C75 30 83 38 83 50"
                      stroke="#F97316" strokeWidth="5" fill="none" strokeLinecap="round"/>
                <circle cx="50" cy="75" r="6" fill="white"/>
                <circle cx="70" cy="75" r="6" fill="white"/>
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Sobre a MYDSHOP</h1>
            <p className="text-xl text-gray-500">Conectando compradores e vendedores em todo o Brasil</p>
          </div>

          {/* Missão */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-10">
            <h2 className="text-xl font-bold text-blue-800 mb-2">Nossa Missão</h2>
            <p className="text-blue-700 text-lg leading-relaxed">
              Democratizar o comércio eletrônico no Brasil, oferecendo uma plataforma segura, acessível e tecnológica para que qualquer pessoa possa comprar e vender online com confiança.
            </p>
          </div>

          <div className="prose prose-lg max-w-none text-gray-700 space-y-8">

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Quem Somos</h2>
              <p>
                A <strong className="text-blue-600">MYDSHOP</strong> é um marketplace brasileiro que reúne milhares de produtos de vendedores parceiros em uma única plataforma. Acreditamos que tecnologia e transparência são os pilares para uma experiência de compra segura e satisfatória.
              </p>
              <p>
                Nossa plataforma foi desenvolvida com foco em simplicidade para o comprador e eficiência para o vendedor — trazendo ferramentas profissionais de gestão de loja, integração com transportadoras, emissão de notas fiscais e muito mais.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">O que fazemos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose">
                {[
                  { icon: '🛒', title: 'Marketplace Completo', desc: 'Milhares de produtos de múltiplos vendedores em um só lugar' },
                  { icon: '🔒', title: 'Compra Segura', desc: 'Pagamentos protegidos e garantia de entrega para o comprador' },
                  { icon: '🚚', title: 'Frete Integrado', desc: 'Integração com Correios e transportadoras para todo o Brasil' },
                  { icon: '📊', title: 'Gestão Profissional', desc: 'Painel completo para vendedores gerenciarem seus negócios' },
                  { icon: '📦', title: 'Multi-vendedor', desc: 'Suporte a vários vendedores num único pedido com entrega unificada' },
                  { icon: '🤝', title: 'Suporte Dedicado', desc: 'Atendimento ao cliente e suporte técnico para compradores e vendedores' },
                ].map(item => (
                  <div key={item.title} className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-3xl">{item.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Nossos Valores</h2>
              <ul className="list-none space-y-3 not-prose">
                {[
                  { v: 'Transparência', d: 'Informações claras sobre produtos, preços, prazos e políticas.' },
                  { v: 'Confiança', d: 'Relação honesta com compradores, vendedores e parceiros.' },
                  { v: 'Inovação', d: 'Tecnologia de ponta para facilitar o comércio eletrônico.' },
                  { v: 'Responsabilidade', d: 'Compromisso com o Código de Defesa do Consumidor e a LGPD.' },
                ].map(item => (
                  <li key={item.v} className="flex gap-3 items-start">
                    <span className="text-green-500 font-bold text-lg mt-0.5">✓</span>
                    <span><strong className="text-gray-900">{item.v}:</strong> {item.d}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Seja um Vendedor Parceiro</h2>
              <p>
                Quer vender na MYDSHOP? Cadastre sua loja gratuitamente e alcance milhares de compradores em todo o Brasil. Oferecemos planos para todos os tamanhos de negócio.
              </p>
              <div className="mt-4 not-prose">
                <Link href="/seja-parceiro" className="inline-block bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors">
                  Quero ser vendedor →
                </Link>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Informações Legais</h2>
              <div className="bg-gray-50 rounded-xl p-5 not-prose text-sm text-gray-600 space-y-1">
                <p><strong>Razão Social:</strong> MYD Facilyta Technology (MYDSHOP)</p>
                <p><strong>CNPJ:</strong> 24.223.868/0001-19</p>
                <p><strong>Endereço:</strong> Av. dos Holandeses, Nº 15 – Sala 15, Bairro Chau, CEP 65065-180 – São Luís / MA</p>
                <p><strong>Site:</strong> https://mydshop.com.br</p>
                <p><strong>E-mail:</strong> <a href="mailto:contato@mydshop.com.br" className="text-blue-600 hover:underline">contato@mydshop.com.br</a></p>
                <p><strong>Atendimento:</strong> Segunda a Sexta, das 9h às 18h</p>
              </div>
            </section>
          </div>

          {/* Links relacionados */}
          <div className="mt-12 pt-8 border-t border-gray-100 flex flex-wrap gap-4 justify-center">
            <Link href="/contato" className="text-sm text-blue-600 hover:underline">Fale Conosco</Link>
            <Link href="/politica-privacidade" className="text-sm text-blue-600 hover:underline">Política de Privacidade</Link>
            <Link href="/termos" className="text-sm text-blue-600 hover:underline">Termos de Uso</Link>
            <Link href="/seja-parceiro" className="text-sm text-blue-600 hover:underline">Seja um Parceiro</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
