import Link from 'next/link'

/**
 * 🔒 Página 404 personalizada
 * Exibida quando uma rota não é encontrada
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        {/* Ilustração 404 */}
        <div className="mb-8">
          <span className="text-9xl font-bold bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent">
            404
          </span>
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Página não encontrada
        </h1>

        {/* Descrição */}
        <p className="text-gray-600 mb-8">
          A página que você está procurando não existe ou foi movida para outro endereço.
        </p>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <svg 
              className="w-5 h-5 mr-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
              />
            </svg>
            Voltar ao início
          </Link>
          
          <Link
            href="/produtos"
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg 
              className="w-5 h-5 mr-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
            Ver produtos
          </Link>
        </div>

        {/* Sugestões */}
        <div className="mt-12 text-left bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-3">
            Você pode tentar:
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Verificar se o endereço está correto
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Usar a barra de pesquisa
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Navegar pelas categorias
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
