'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FiHeadphones, FiPlus, FiSearch, FiRefreshCw,
  FiMessageSquare, FiMail, FiPhone, FiUser,
  FiAlertCircle, FiClock, FiCheckCircle, FiXCircle,
  FiDollarSign, FiPackage, FiFilter,
} from 'react-icons/fi'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN:        { label: 'Aberto',           color: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'Em Atendimento',   color: 'bg-yellow-100 text-yellow-700' },
  NEGOTIATING: { label: 'Negociando',       color: 'bg-purple-100 text-purple-700' },
  RESOLVED:    { label: 'Resolvido',        color: 'bg-green-100 text-green-700' },
  CLOSED:      { label: 'Fechado',          color: 'bg-gray-100 text-gray-600' },
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW:    'bg-gray-100 text-gray-500',
  NORMAL: 'bg-blue-50 text-blue-600',
  HIGH:   'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
}

const CATEGORY_ICONS: Record<string, string> = {
  CANCELAMENTO: '❌',
  ENTREGA: '🚚',
  DEVOLUCAO: '↩️',
  COBRANCA: '💰',
  OUTRO: '💬',
}

interface Ticket {
  id: string
  buyerName?: string
  buyerEmail?: string
  buyerPhone?: string
  orderId?: string
  subject: string
  status: string
  priority: string
  category?: string
  assignedTo?: string
  createdAt: string
  updatedAt: string
  hasNegotiation: boolean
  _count?: { messages: number; negotiations: number }
}

interface Stats {
  OPEN: number
  IN_PROGRESS: number
  NEGOTIATING: number
  RESOLVED: number
  CLOSED: number
}

// ── Modal de novo ticket ─────────────────────────────────────────────────────
function NewTicketModal({ onClose, onCreate }: { onClose: () => void; onCreate: (t: Ticket) => void }) {
  const [q, setQ]                 = useState('')
  const [searchResults, setResults] = useState<{ orders: any[]; users: any[] } | null>(null)
  const [searching, setSearching] = useState(false)
  const [selected, setSelected]   = useState<{ type: 'order' | 'user'; data: any } | null>(null)
  const [form, setForm]           = useState({
    subject: '', category: 'OUTRO', priority: 'NORMAL',
    buyerName: '', buyerEmail: '', buyerPhone: '', buyerCpf: '',
    orderId: '',
  })
  const [saving, setSaving] = useState(false)

  const doSearch = async (val: string) => {
    if (val.length < 3) { setResults(null); return }
    setSearching(true)
    try {
      const r = await fetch(`/api/admin/sac/search?q=${encodeURIComponent(val)}`)
      setResults(await r.json())
    } finally {
      setSearching(false)
    }
  }

  const selectOrder = (order: any) => {
    setSelected({ type: 'order', data: order })
    setForm(f => ({
      ...f,
      buyerName:  order.buyerName  || '',
      buyerEmail: order.buyerEmail || '',
      buyerPhone: order.buyerPhone || '',
      buyerCpf:   order.buyerCpf   || '',
      orderId:    order.id,
      subject:    `Pedido #${order.id.slice(-8).toUpperCase()}`,
    }))
    setResults(null)
    setQ('')
  }

  const selectUser = (user: any) => {
    setSelected({ type: 'user', data: user })
    setForm(f => ({
      ...f,
      buyerName:  user.name  || '',
      buyerEmail: user.email || '',
      buyerPhone: user.phone || '',
      buyerCpf:   user.cpf   || '',
    }))
    setResults(null)
    setQ('')
  }

  const handleCreate = async () => {
    if (!form.subject) return
    setSaving(true)
    try {
      const r = await fetch('/api/admin/sac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!r.ok) throw new Error(await r.text())
      const t = await r.json()
      onCreate(t)
      onClose()
    } catch (e: any) {
      alert('Erro: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Novo Atendimento (SAC)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {/* Busca de cliente/pedido */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar cliente ou pedido</label>
            <div className="relative">
              <input
                type="text"
                value={q}
                onChange={e => { setQ(e.target.value); doSearch(e.target.value) }}
                placeholder="Nome, e-mail, telefone, CPF ou nº pedido..."
                className="w-full border rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              {searching && <FiRefreshCw className="absolute right-2 top-2.5 text-gray-400 animate-spin" />}
            </div>

            {searchResults && (
              <div className="border rounded-lg mt-1 shadow-lg bg-white max-h-60 overflow-y-auto divide-y">
                {searchResults.orders.map(o => (
                  <button key={o.id} onClick={() => selectOrder(o)} className="w-full text-left px-4 py-2.5 hover:bg-primary-50 flex items-center gap-3">
                    <FiPackage className="text-primary-400 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium">{o.buyerName || 'Cliente'} — <span className="font-mono text-xs">{o.id.slice(-8).toUpperCase()}</span></div>
                      <div className="text-xs text-gray-500">R$ {Number(o.total).toFixed(2)} · {o.status} · {new Date(o.createdAt).toLocaleDateString('pt-BR')}</div>
                    </div>
                  </button>
                ))}
                {searchResults.users.map(u => (
                  <button key={u.id} onClick={() => selectUser(u)} className="w-full text-left px-4 py-2.5 hover:bg-primary-50 flex items-center gap-3">
                    <FiUser className="text-primary-400 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium">{u.name || u.email}</div>
                      <div className="text-xs text-gray-500">{u.email} · {u.phone || 'sem tel.'}</div>
                    </div>
                  </button>
                ))}
                {searchResults.orders.length === 0 && searchResults.users.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-500">Nenhum resultado encontrado</div>
                )}
              </div>
            )}
          </div>

          {/* Cliente selecionado / dados manuais */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome</label>
              <input value={form.buyerName} onChange={e => setForm(f => ({...f, buyerName: e.target.value}))}
                className="w-full border rounded px-3 py-2 text-sm" placeholder="Nome do cliente" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Telefone / WhatsApp</label>
              <input value={form.buyerPhone} onChange={e => setForm(f => ({...f, buyerPhone: e.target.value}))}
                className="w-full border rounded px-3 py-2 text-sm" placeholder="55119..." />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">E-mail</label>
              <input value={form.buyerEmail} onChange={e => setForm(f => ({...f, buyerEmail: e.target.value}))}
                className="w-full border rounded px-3 py-2 text-sm" placeholder="email@exemplo.com" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Pedido relacionado</label>
              <input value={form.orderId} onChange={e => setForm(f => ({...f, orderId: e.target.value}))}
                className="w-full border rounded px-3 py-2 text-sm font-mono" placeholder="ID do pedido" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Assunto / Motivo *</label>
            <input value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))}
              className="w-full border rounded px-3 py-2 text-sm" placeholder="Descreva brevemente o motivo do atendimento" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Categoria</label>
              <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="CANCELAMENTO">❌ Cancelamento</option>
                <option value="ENTREGA">🚚 Entrega</option>
                <option value="DEVOLUCAO">↩️ Devolução</option>
                <option value="COBRANCA">💰 Cobrança / Dívida</option>
                <option value="OUTRO">💬 Outro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Prioridade</label>
              <select value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="LOW">Baixa</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-5 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 text-sm">Cancelar</button>
          <button
            onClick={handleCreate}
            disabled={saving || !form.subject}
            className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Criando...' : 'Criar Atendimento'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function SacPage() {
  const router = useRouter()
  const [tickets, setTickets]       = useState<Ticket[]>([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('')
  const [showNewModal, setNewModal] = useState(false)
  const [stats, setStats]           = useState<Stats>({ OPEN: 0, IN_PROGRESS: 0, NEGOTIATING: 0, RESOLVED: 0, CLOSED: 0 })

  const loadTickets = useCallback(async (q = search, s = statusFilter) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (q) params.set('q', q)
      if (s) params.set('status', s)
      const r = await fetch(`/api/admin/sac?${params}`)
      const data = await r.json()
      setTickets(data.tickets || [])
      setTotal(data.total || 0)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  const loadStats = async () => {
    // Carrega contagem por status
    const ss: Stats = { OPEN: 0, IN_PROGRESS: 0, NEGOTIATING: 0, RESOLVED: 0, CLOSED: 0 }
    await Promise.all(
      (Object.keys(ss) as (keyof Stats)[]).map(async st => {
        const r = await fetch(`/api/admin/sac?status=${st}&limit=1`)
        const d = await r.json()
        ss[st] = d.total || 0
      })
    )
    setStats(ss)
  }

  useEffect(() => {
    loadTickets()
    loadStats()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadTickets(search, statusFilter)
  }

  const handleStatusFilter = (s: string) => {
    setStatus(s)
    loadTickets(search, s)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary-100 p-2 rounded-lg">
            <FiHeadphones className="text-primary-600 text-2xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">SAC — Atendimento ao Cliente</h1>
            <p className="text-sm text-gray-500">WhatsApp · E-mail · Negociação de dívidas</p>
          </div>
        </div>
        <button
          onClick={() => setNewModal(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium"
        >
          <FiPlus /> Novo Atendimento
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.entries(STATUS_LABELS) as [string, any][]).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => handleStatusFilter(statusFilter === key ? '' : key)}
            className={`rounded-xl p-4 text-left border-2 transition-all ${
              statusFilter === key ? 'border-primary-400 shadow-md' : 'border-transparent bg-white shadow-sm hover:shadow-md'
            }`}
          >
            <div className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-2 ${meta.color}`}>{meta.label}</div>
            <div className="text-2xl font-bold text-gray-800">{stats[key as keyof Stats]}</div>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <form onSubmit={handleSearch} className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-60">
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail, telefone, pedido..."
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700">
            Buscar
          </button>
          {(search || statusFilter) && (
            <button type="button" onClick={() => { setSearch(''); setStatus(''); loadTickets('', '') }}
              className="text-gray-500 hover:text-gray-700 text-sm underline">
              Limpar
            </button>
          )}
          <button type="button" onClick={() => loadTickets()} className="ml-auto text-gray-500 hover:text-primary-600">
            <FiRefreshCw />
          </button>
        </form>
      </div>

      {/* Lista de tickets */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <span className="text-sm text-gray-600 font-medium">
            {loading ? 'Carregando...' : `${total} atendimento${total !== 1 ? 's' : ''}`}
            {statusFilter && ` · ${STATUS_LABELS[statusFilter]?.label}`}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <FiRefreshCw className="animate-spin text-3xl mx-auto mb-3" />
            Carregando atendimentos...
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <FiHeadphones className="text-4xl mx-auto mb-3" />
            <p>Nenhum atendimento encontrado</p>
            <button onClick={() => setNewModal(true)} className="mt-3 text-primary-600 hover:underline text-sm">
              Criar o primeiro atendimento
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {tickets.map(t => (
              <Link
                key={t.id}
                href={`/admin/sac/${t.id}`}
                className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                {/* Status indicator */}
                <div className="mt-1 flex-shrink-0">
                  {t.status === 'OPEN'        && <FiAlertCircle className="text-blue-500 text-lg" />}
                  {t.status === 'IN_PROGRESS' && <FiClock className="text-yellow-500 text-lg" />}
                  {t.status === 'NEGOTIATING' && <FiDollarSign className="text-purple-500 text-lg" />}
                  {t.status === 'RESOLVED'    && <FiCheckCircle className="text-green-500 text-lg" />}
                  {t.status === 'CLOSED'      && <FiXCircle className="text-gray-400 text-lg" />}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800 truncate">{t.subject}</span>
                    {t.category && (
                      <span className="text-xs">{CATEGORY_ICONS[t.category] || '💬'} {t.category}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[t.priority]}`}>
                      {t.priority}
                    </span>
                    {t.hasNegotiation && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Negociação</span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
                    {t.buyerName  && <span className="flex items-center gap-1"><FiUser className="text-xs" /> {t.buyerName}</span>}
                    {t.buyerPhone && <span className="flex items-center gap-1"><FiMessageSquare className="text-xs" /> {t.buyerPhone}</span>}
                    {t.buyerEmail && <span className="flex items-center gap-1"><FiMail className="text-xs" /> {t.buyerEmail}</span>}
                    {t.orderId    && <span className="flex items-center gap-1"><FiPackage className="text-xs" /> #{t.orderId.slice(-8).toUpperCase()}</span>}
                  </div>
                </div>

                {/* Meta */}
                <div className="text-right flex-shrink-0 space-y-1">
                  <div className={`text-xs px-2 py-0.5 rounded-full inline-block ${STATUS_LABELS[t.status]?.color}`}>
                    {STATUS_LABELS[t.status]?.label}
                  </div>
                  <div className="text-xs text-gray-400 block">
                    {t._count?.messages || 0} msg{(t._count?.messages || 0) !== 1 ? 's' : ''}
                  </div>
                  <div className="text-xs text-gray-400 block">
                    {new Date(t.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showNewModal && (
        <NewTicketModal
          onClose={() => setNewModal(false)}
          onCreate={ticket => {
            router.push(`/admin/sac/${ticket.id}`)
          }}
        />
      )}
    </div>
  )
}
