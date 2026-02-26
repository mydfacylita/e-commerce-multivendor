import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DeveloperLanding() {
  const session = await getServerSession(authOptions)
  if (session?.user) redirect('/developer/dashboard')

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">M</div>
          <span className="font-semibold text-lg">MydShop <span className="text-blue-400">Developers</span></span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/developer/docs" className="text-gray-400 hover:text-white text-sm transition-colors">Documentação</Link>
          <Link href="/developer/login" className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-950 border border-blue-800 rounded-full px-4 py-1.5 text-sm text-blue-300 mb-8">
          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
          API v1 — Acesso programático à plataforma MydShop
        </div>
        <h1 className="text-5xl font-bold mb-6 leading-tight">
          Construa integrações<br />
          <span className="text-blue-400">poderosas</span> com MydShop
        </h1>
        <p className="text-gray-400 text-xl mb-10 max-w-2xl mx-auto">
          Acesse pedidos, produtos, etiquetas e muito mais via API REST segura com autenticação via API Key.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/developer/login" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors">
            Criar conta grátis
          </Link>
          <Link href="/developer/docs" className="border border-gray-700 hover:border-gray-500 text-gray-300 px-8 py-3 rounded-xl font-semibold transition-colors">
            Ver documentação
          </Link>
        </div>
      </section>

      {/* Scopes */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-center mb-12 text-gray-200">Endpoints disponíveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { scope: 'orders:read', label: 'Pedidos', desc: 'Listar e visualizar pedidos', icon: '📦' },
            { scope: 'orders:write', label: 'Atualizar Pedidos', desc: 'Alterar status de pedidos', icon: '✏️' },
            { scope: 'products:read', label: 'Produtos', desc: 'Listar produtos e estoque', icon: '🛍️' },
            { scope: 'labels:read', label: 'Etiquetas', desc: 'Baixar etiquetas de envio', icon: '🏷️' },
            { scope: 'invoices:read', label: 'Notas Fiscais', desc: 'Acessar NFe dos pedidos', icon: '🧾' },
            { scope: 'webhooks:manage', label: 'Webhooks', desc: 'Receber eventos em tempo real', icon: '🔔' },
          ].map(item => (
            <div key={item.scope} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-blue-800 transition-colors">
              <div className="text-2xl mb-3">{item.icon}</div>
              <h3 className="font-semibold mb-1">{item.label}</h3>
              <p className="text-gray-500 text-sm mb-3">{item.desc}</p>
              <code className="text-xs bg-gray-800 text-blue-400 px-2 py-1 rounded">{item.scope}</code>
            </div>
          ))}
        </div>
      </section>

      {/* Code example */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-center mb-8 text-gray-200">Simples de usar</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="ml-2 text-gray-500 text-sm">Exemplo de autenticação</span>
          </div>
          <pre className="p-6 text-sm text-gray-300 overflow-x-auto"><code>{`import crypto from 'crypto'

const API_KEY = 'myd_live_...'
const API_SECRET = 'seu_secret'
const timestamp = Date.now().toString()

const signature = crypto
  .createHmac('sha256', API_SECRET)
  .update(\`\${API_KEY}:\${timestamp}\`)
  .digest('hex')

const res = await fetch('https://gerencial-sys.mydshop.com.br/api/v1/orders', {
  headers: {
    'Authorization': \`Bearer \${API_KEY}\`,
    'X-Api-Signature': signature,
    'X-Timestamp': timestamp,
  }
})`}</code></pre>
        </div>
      </section>
    </div>
  )
}
