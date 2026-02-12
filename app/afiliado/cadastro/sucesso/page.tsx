'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FiCheckCircle, FiClock, FiMail, FiHome } from 'react-icons/fi'
import { Suspense } from 'react'

function SucessoContent() {
  const searchParams = useSearchParams()
  const code = searchParams?.get('code') || ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Sucesso Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-6 bg-green-100 rounded-full">
              <FiCheckCircle className="text-green-600" size={64} />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-4 text-gray-900">
            Cadastro Enviado com Sucesso!
          </h1>

          <p className="text-center text-gray-600 mb-8">
            Seu cadastro como afiliado foi recebido e está em análise.
          </p>

          {/* Código do Afiliado */}
          {code && (
            <div className="bg-accent-50 border-2 border-accent-200 rounded-lg p-6 mb-8">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Seu código de afiliado:</p>
                <p className="text-2xl font-bold text-accent-600">{code}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Guarde este código! Você usará ele para divulgar produtos.
                </p>
              </div>
            </div>
          )}

          {/* Próximos Passos */}
          <div className="space-y-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FiClock /> Próximos Passos
            </h2>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-accent-500 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Aguarde a Aprovação</h3>
                  <p className="text-sm text-gray-600">
                    Nossa equipe irá analisar seu cadastro em até 48 horas úteis.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-accent-500 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    <FiMail /> Verifique seu Email
                  </h3>
                  <p className="text-sm text-gray-600">
                    Enviaremos um email com a confirmação da aprovação ou solicitação de mais informações.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-accent-500 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Acesse seu Painel</h3>
                  <p className="text-sm text-gray-600">
                    Após a aprovação, você poderá fazer login e acessar seu painel de afiliado com links de divulgação e relatórios de vendas.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-accent-500 text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Comece a Divulgar</h3>
                  <p className="text-sm text-gray-600">
                    Use seus links únicos para divulgar produtos nas suas redes sociais e comece a ganhar comissões!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Info sobre conta MYD */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
            <h3 className="font-semibold text-blue-900 mb-2">💰 Sua Conta MYD</h3>
            <p className="text-sm text-blue-800">
              Após a aprovação, criaremos automaticamente uma <strong>Conta MYD</strong> para você. 
              Suas comissões serão creditadas nesta conta e você poderá solicitar saques a qualquer momento.
            </p>
          </div>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/"
              className="flex-1 bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 transition-colors text-center flex items-center justify-center gap-2"
            >
              <FiHome />
              Voltar para Home
            </Link>
            <Link
              href="/login"
              className="flex-1 bg-accent-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-accent-600 transition-colors text-center"
            >
              Fazer Login
            </Link>
          </div>
        </div>

        {/* Informações Adicionais */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Dúvidas Frequentes
          </h3>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">
                ❓ Quanto tempo leva para aprovar meu cadastro?
              </h4>
              <p className="text-gray-600">
                Geralmente analisamos cadastros em até 48 horas úteis. Você receberá um email com o resultado.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-1">
                ❓ Como funciona a comissão?
              </h4>
              <p className="text-gray-600">
                Você ganha 5% do valor de cada produto vendido através do seu link de afiliado. A comissão é creditada na sua Conta MYD após a confirmação do pagamento.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-1">
                ❓ Quando posso sacar minhas comissões?
              </h4>
              <p className="text-gray-600">
                Você pode solicitar saque a qualquer momento através do seu painel de afiliado. O valor mínimo para saque é R$ 50,00.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-1">
                ❓ Preciso ter CNPJ?
              </h4>
              <p className="text-gray-600">
                Não! Você pode ser afiliado como pessoa física (CPF). Apenas vendedores precisam de CNPJ.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AfiliadoCadastroSucessoPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-accent-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <SucessoContent />
    </Suspense>
  )
}
