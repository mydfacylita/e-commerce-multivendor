import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Contato | MYDSHOP',
  description: 'Entre em contato com a MYDSHOP. Tire suas dúvidas, envie sugestões ou acesse nosso suporte ao cliente.',
}

export default function ContatoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">

          {/* Header */}
          <div className="text-center mb-10">
            <div className="flex justify-center mb-4">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="36" fill="#3B82F6"/>
                <path d="M24 28H56C57.1 28 58 28.9 58 30V50C58 51.1 57.1 52 56 52H24C22.9 52 22 51.1 22 50V30C22 28.9 22.9 28 24 28Z" fill="white" opacity="0.15"/>
                <path d="M22 30L40 42L58 30" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <rect x="22" y="28" width="36" height="24" rx="2" stroke="white" strokeWidth="2.5" fill="none"/>
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Fale Conosco</h1>
            <p className="text-gray-500">Estamos aqui para ajudar. Escolha o melhor canal de atendimento.</p>
          </div>

          {/* Canais de atendimento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-100">
              <div className="text-4xl mb-3">📧</div>
              <h3 className="font-bold text-gray-900 mb-1">E-mail</h3>
              <a href="mailto:contato@mydshop.com.br" className="text-blue-600 hover:underline text-sm break-all">
                contato@mydshop.com.br
              </a>
              <p className="text-xs text-gray-500 mt-2">Resposta em até 24 horas úteis</p>
            </div>

            <div className="text-center p-6 bg-green-50 rounded-xl border border-green-100">
              <div className="text-4xl mb-3">💬</div>
              <h3 className="font-bold text-gray-900 mb-1">WhatsApp</h3>
              <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer"
                className="text-green-600 hover:underline text-sm">
                Iniciar conversa
              </a>
              <p className="text-xs text-gray-500 mt-2">Seg–Sex, das 9h às 18h</p>
            </div>

            <div className="text-center p-6 bg-orange-50 rounded-xl border border-orange-100">
              <div className="text-4xl mb-3">❓</div>
              <h3 className="font-bold text-gray-900 mb-1">Central de Ajuda</h3>
              <Link href="/ajuda" className="text-orange-600 hover:underline text-sm">
                Ver perguntas frequentes
              </Link>
              <p className="text-xs text-gray-500 mt-2">Disponível 24 horas</p>
            </div>
          </div>

          {/* Informações da empresa */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Informações Comerciais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-lg">🏢</span>
                  <div>
                    <p className="font-semibold text-gray-900">Razão Social</p>
                    <p>MYDSHOP TECNOLOGIA E COMERCIO LTDA</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">🌐</span>
                  <div>
                    <p className="font-semibold text-gray-900">Site</p>
                    <a href="https://mydshop.com.br" className="text-blue-600 hover:underline">mydshop.com.br</a>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-lg">📧</span>
                  <div>
                    <p className="font-semibold text-gray-900">E-mail</p>
                    <a href="mailto:contato@mydshop.com.br" className="text-blue-600 hover:underline">contato@mydshop.com.br</a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">🕐</span>
                  <div>
                    <p className="font-semibold text-gray-900">Horário de Atendimento</p>
                    <p>Segunda a Sexta — 9h às 18h</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tópicos de suporte */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Posso te ajudar com...</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: '📦', label: 'Rastrear meu pedido', href: '/rastrear-pedido' },
                { icon: '↩️', label: 'Solicitar devolução ou troca', href: '/politica-devolucao' },
                { icon: '💳', label: 'Problemas com pagamento', href: '/ajuda' },
                { icon: '🏪', label: 'Quero ser vendedor', href: '/seja-parceiro' },
                { icon: '🔒', label: 'Privacidade e dados pessoais', href: '/politica-privacidade' },
                { icon: '📋', label: 'Termos de uso', href: '/termos' },
              ].map(item => (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm text-gray-700">
                  <span className="text-xl">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Links relacionados */}
          <div className="mt-10 pt-8 border-t border-gray-100 flex flex-wrap gap-4 justify-center">
            <Link href="/ajuda" className="text-sm text-blue-600 hover:underline">Central de Ajuda</Link>
            <Link href="/politica-devolucao" className="text-sm text-blue-600 hover:underline">Política de Devolução</Link>
            <Link href="/sobre" className="text-sm text-blue-600 hover:underline">Sobre Nós</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
