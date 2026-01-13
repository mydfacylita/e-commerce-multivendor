import Link from 'next/link'

/**
 * 🔒 Página de serviço indisponível (503)
 * Exibida quando o sistema está em manutenção ou com problemas de infraestrutura
 */
export default function ServiceUnavailable() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="mb-8">
          <span className="text-4xl font-bold">
            <span className="text-orange-500">MYD</span>
            <span className="text-blue-600">SHOP</span>
          </span>
        </div>

        {/* Ícone de manutenção */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-yellow-100">
            <span className="text-5xl">🔧</span>
          </div>
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Estamos em Manutenção
        </h1>

        {/* Mensagem - 🔒 NÃO expõe detalhes técnicos */}
        <p className="text-gray-600 mb-6 leading-relaxed">
          Nosso sistema está passando por uma atualização para melhor atendê-lo. 
          Por favor, tente novamente em alguns minutos.
        </p>

        {/* Status */}
        <div className="bg-white rounded-lg p-4 mb-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            <span>Sistema em atualização</span>
          </div>
        </div>

        {/* Botão de refresh */}
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          🔄 Verificar novamente
        </button>

        {/* Contato */}
        <p className="mt-8 text-sm text-gray-500">
          Precisa de ajuda urgente?{' '}
          <a 
            href="mailto:suporte@mydshop.com.br" 
            className="text-blue-600 hover:underline"
          >
            suporte@mydshop.com.br
          </a>
        </p>
      </div>
    </div>
  )
}
