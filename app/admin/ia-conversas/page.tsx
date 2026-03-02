'use client'

import { useState, useEffect, useCallback } from 'react'
import { FiMessageSquare, FiShoppingCart, FiZap, FiTrendingUp, FiChevronDown, FiChevronUp, FiRefreshCw, FiUser } from 'react-icons/fi'

function fmtDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

interface ChatMsg { role: string; content: string }
interface Session {
  id: string
  sessionId: string
  pageUrl?: string
  pageTitle?: string
  messageCount: number
  wasProactive: boolean
  addedToCart: boolean
  wentToCheckout: boolean
  ipAddress?: string
  messages: string
  createdAt: string
  updatedAt: string
  user?: { id: string; name?: string; email: string } | null
}
interface Stats {
  total: number
  proactive: number
  addedToCart: number
  wentToCheckout: number
  proactiveRate: number
  cartConversionRate: number
  checkoutRate: number
}

const formatPrice = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white text-xl flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function SessionCard({ session }: { session: Session }) {
  const [expanded, setExpanded] = useState(false)
  const msgs: ChatMsg[] = (() => {
    try { return JSON.parse(session.messages) } catch { return [] }
  })()

  const pageLabel = session.pageTitle || session.pageUrl?.replace(/^https?:\/\/[^/]+/, '') || '—'

  return (
    <div className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${session.wentToCheckout ? 'border-green-300' : session.addedToCart ? 'border-violet-300' : session.wasProactive ? 'border-amber-300' : 'border-gray-200'}`}>
      {/* Header */}
      <button onClick={() => setExpanded(e => !e)} className="w-full text-left px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <FiUser className="text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {session.user ? (
                <span className="text-sm font-semibold text-gray-800">{session.user.name || session.user.email}</span>
              ) : (
                <span className="text-sm font-semibold text-gray-500">Visitante anônimo</span>
              )}
              {session.wasProactive && (
                <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">⚡ Proativa</span>
              )}
              {session.addedToCart && (
                <span className="text-xs bg-violet-100 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full font-medium">🛒 Add Carrinho</span>
              )}
              {session.wentToCheckout && (
                <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">✅ Checkout</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-gray-500 truncate max-w-[220px]" title={session.pageUrl || ''}>
                📄 {pageLabel}
              </span>
              <span className="text-xs text-gray-400">
                {session.messageCount} {session.messageCount === 1 ? 'mensagem' : 'mensagens'}
              </span>
              <span className="text-xs text-gray-400">
                {fmtDate(session.createdAt)}
              </span>
              {session.ipAddress && (
                <span className="text-xs text-gray-400">🌐 {session.ipAddress}</span>
              )}
            </div>
          </div>
          <div className="text-gray-400 flex-shrink-0 mt-1">
            {expanded ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </div>
      </button>

      {/* Conversa expandida */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-3 max-h-96 overflow-y-auto">
          {msgs.filter(m => m.content && !m.content.includes('__SHOW_CART__')).map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`px-3 py-2 rounded-xl max-w-[80%] text-sm leading-relaxed whitespace-pre-line ${
                m.role === 'user'
                  ? 'bg-violet-600 text-white rounded-tr-sm'
                  : 'bg-white border border-gray-200 text-gray-700 rounded-tl-sm'
              }`}>
                {m.content.length > 300 ? m.content.slice(0, 300) + '…' : m.content}
              </div>
            </div>
          ))}
          {msgs.length === 0 && <p className="text-sm text-gray-400 text-center py-2">Sem mensagens registradas</p>}
        </div>
      )}
    </div>
  )
}

export default function AIConversasPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filter, setFilter] = useState<'all' | 'proactive' | 'cart' | 'checkout'>('all')

  const load = useCallback(async (p: number, f: typeof filter) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' })
      if (f === 'proactive') params.set('proactive', 'true')
      if (f === 'cart') params.set('cart', 'true')
      if (f === 'checkout') params.set('checkout', 'true')
      const res = await fetch(`/api/admin/ai-conversations?${params}`)
      const data = await res.json()
      setSessions(data.sessions || [])
      setStats(data.stats || null)
      setTotalPages(data.pagination?.pages || 1)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(page, filter) }, [load, page, filter])

  const filterBtns: { key: typeof filter; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'Todas', icon: <FiMessageSquare /> },
    { key: 'proactive', label: 'Proativas (IA iniciou)', icon: <FiZap /> },
    { key: 'cart', label: 'Adicionou ao Carrinho', icon: <FiShoppingCart /> },
    { key: 'checkout', label: 'Foram ao Checkout', icon: <FiTrendingUp /> },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            🤖 Mydi — Conversas com Clientes
          </h1>
          <p className="text-sm text-gray-500 mt-1">Monitore em tempo real como a IA está ajudando seus clientes a comprar</p>
        </div>
        <button onClick={() => load(page, filter)} className="flex items-center gap-2 text-sm bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors">
          <FiRefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<FiMessageSquare />} label="Total de conversas" value={stats.total} color="bg-indigo-500" />
          <StatCard icon={<FiZap />} label="Proativas (IA abriu)" value={stats.proactive} sub={`${stats.proactiveRate}% do total`} color="bg-amber-500" />
          <StatCard icon={<FiShoppingCart />} label="Adicionaram ao carrinho" value={stats.addedToCart} sub={`${stats.cartConversionRate}% conversão`} color="bg-violet-500" />
          <StatCard icon={<FiTrendingUp />} label="Foram ao checkout" value={stats.wentToCheckout} sub={`${stats.checkoutRate}% do total`} color="bg-green-500" />
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {filterBtns.map(btn => (
          <button
            key={btn.key}
            onClick={() => { setFilter(btn.key); setPage(1) }}
            className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-full border transition-colors ${
              filter === btn.key
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-violet-400 hover:text-violet-700'
            }`}
          >
            {btn.icon} {btn.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <div className="animate-spin w-8 h-8 border-2 border-violet-300 border-t-violet-600 rounded-full mr-3" />
          Carregando conversas…
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FiMessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">Nenhuma conversa encontrada</p>
          <p className="text-sm mt-1">As conversas aparecem aqui assim que clientes interagem com a Mydi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => <SessionCard key={s.id} session={s} />)}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
            ← Anterior
          </button>
          <span className="text-sm text-gray-600">Página {page} de {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
            Próxima →
          </button>
        </div>
      )}
    </div>
  )
}
