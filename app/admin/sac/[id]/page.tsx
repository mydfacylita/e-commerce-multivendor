'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FiArrowLeft, FiMessageSquare, FiMail, FiPhone,
  FiUser, FiPackage, FiDollarSign, FiEdit2, FiCheck,
  FiX, FiSend, FiRefreshCw, FiClock, FiTag,
  FiAlertCircle, FiCheckCircle, FiXCircle, FiBell,
  FiCalendar, FiFileText, FiTrendingDown,
} from 'react-icons/fi'

const STATUS_OPTS = [
  { value: 'OPEN',        label: 'Aberto',         color: 'bg-blue-100 text-blue-700' },
  { value: 'IN_PROGRESS', label: 'Em Atendimento',  color: 'bg-yellow-100 text-yellow-700' },
  { value: 'NEGOTIATING', label: 'Negociando',      color: 'bg-purple-100 text-purple-700' },
  { value: 'RESOLVED',    label: 'Resolvido',       color: 'bg-green-100 text-green-700' },
  { value: 'CLOSED',      label: 'Fechado',         color: 'bg-gray-100 text-gray-600' },
]

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente', PROCESSING: 'Processando', PAID: 'Pago',
  SHIPPED: 'Enviado', DELIVERED: 'Entregue', CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
}

const CHANNEL_ICON: Record<string, any> = {
  whatsapp: () => <span className="text-green-600 font-bold text-xs">WPP</span>,
  email:    () => <FiMail className="text-blue-500" />,
  internal: () => <FiFileText className="text-gray-400" />,
}

const DEAL_TYPE_LABELS: Record<string, string> = {
  DISCOUNT:     '🏷️ Desconto',
  INSTALLMENT:  '📅 Parcelamento',
  BOLETO:       '📄 Novo Boleto',
  PIX:          '⚡ PIX',
  WRITE_OFF:    '✏️ Remissão',
}

const DEAL_STATUS_COLORS: Record<string, string> = {
  PROPOSED:  'bg-yellow-100 text-yellow-700',
  ACCEPTED:  'bg-green-100 text-green-700',
  REJECTED:  'bg-red-100 text-red-700',
  EXECUTED:  'bg-blue-100 text-blue-700',
  EXPIRED:   'bg-gray-100 text-gray-500',
}

// ── Componente de mensagem ───────────────────────────────────────────────────
function MsgBubble({ msg }: { msg: any }) {
  const isOut = msg.direction === 'out'
  const Icon = CHANNEL_ICON[msg.channel] || CHANNEL_ICON.internal

  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} gap-2`}>
      {/* Avatar cliente (mensagens recebidas) */}
      {!isOut && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
          <FiUser className="text-gray-500 text-sm" />
        </div>
      )}
      <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-sm ${
        isOut
          ? msg.channel === 'whatsapp' ? 'bg-green-500 text-white'
            : msg.channel === 'internal' ? 'bg-amber-50 border border-amber-200 text-amber-900'
            : 'bg-primary-600 text-white'
          : 'bg-white border text-gray-800'
      }`}>
        {/* Header small */}
        <div className={`flex items-center gap-1.5 mb-1 text-xs ${
          isOut && msg.channel !== 'internal' ? 'text-white/70'
          : isOut ? 'text-amber-600'
          : 'text-gray-400'
        }`}>
          <Icon />
          <span>{isOut ? (msg.from || 'Atendente') : (msg.from || 'Cliente')}</span>
          <span>·</span>
          <span>{new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          {msg.status === 'failed'    && <span className="text-red-300 font-medium">✗ Falha</span>}
          {msg.status === 'read'      && isOut && <span className="opacity-70">✓✓ Lido</span>}
          {msg.status === 'delivered' && isOut && <span className="opacity-70">✓✓</span>}
        </div>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
      </div>
    </div>
  )
}



// ── Formulário de envio de mensagem ─────────────────────────────────────────
function SendMessageForm({
  ticketId, buyerPhone, buyerEmail, buyerName, messages, ticketStatus, sessionClosedAt,
  onSent,
}: {
  ticketId: string
  buyerPhone?: string
  buyerEmail?: string
  buyerName?: string
  ticketStatus?: string
  sessionClosedAt?: string | null
  messages: any[]
  onSent: () => void
}) {
  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'internal'>('whatsapp')
  const [content, setContent] = useState('')
  const [subject, setSubject] = useState('')
  const [sending, setSending] = useState(false)
  const [tplMode, setTplMode] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  // ── Detectar sessão ativa (cliente respondeu nas últimas 24h)
  const lastIncoming = messages
    .filter(m => m.direction === 'in' && m.channel === 'whatsapp')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

  const sessionActive = lastIncoming
    ? (Date.now() - new Date(lastIncoming.createdAt).getTime()) < 24 * 60 * 60 * 1000
      && ticketStatus !== 'CLOSED'
      && !sessionClosedAt
    : false

  const sessionMinutesLeft = lastIncoming && sessionActive
    ? Math.floor((24 * 60 * 60 * 1000 - (Date.now() - new Date(lastIncoming.createdAt).getTime())) / 60000)
    : 0

  // Quando troca para whatsapp sem sessão, entra em modo template automaticamente
  useEffect(() => {
    if (channel === 'whatsapp' && !sessionActive) {
      setTplMode(true)
    } else {
      setTplMode(false)
    }
  }, [channel, sessionActive])

  // Quick texts
  const QUICK: Record<string, string[]> = {
    whatsapp: [
      'Olá! Estamos analisando seu caso e retornaremos em breve. 😊',
      'Seu pedido está sendo processado. Qualquer dúvida, é só responder aqui!',
      'Informamos que a situação foi normalizada. Pode ficar tranquilo(a)! ✅',
      'Emitimos o comprovante solicitado. Por favor, verifique seu e-mail. 📧',
    ],
    email: [
      'Prezado(a) cliente, agradecemos o contato.',
      'Ficamos à disposição para qualquer esclarecimento adicional.',
    ],
    internal: [
      'Cliente contatado — aguardando resposta',
      'Encaminhado para análise financeira',
      'Pedido verificado — sem irregularidades',
    ],
  }

  const sendIniciarAtendimento = async () => {
    setSending(true)
    const firstName = (buyerName || 'Cliente').split(' ')[0]
    try {
      const r = await fetch(`/api/admin/sac/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'whatsapp',
          content: `[Template: abertura_de_chamado] ${firstName}`,
          templateId: 'abertura_de_chamado',
          templateParams: [firstName],
        }),
      })
      const d = await r.json()
      if (r.status === 207) {
        alert(`⚠️ Registrado mas envio falhou: ${d.error}\n\nVerifique se o template "abertura_de_chamado" está aprovado no Meta Business Manager.`)
      } else if (!r.ok) {
        throw new Error(d.error || 'Erro')
      }
      onSent()
    } catch (e: any) {
      alert('Erro: ' + e.message)
    } finally {
      setSending(false)
    }
  }

  const sendText = async () => {
    if (!content.trim()) return
    setSending(true)
    try {
      const r = await fetch(`/api/admin/sac/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, content, subject: subject || undefined }),
      })
      const d = await r.json()
      if (r.status === 207) alert(`⚠️ Registrado mas envio falhou: ${d.error}`)
      else if (!r.ok) throw new Error(d.error || 'Erro')
      setContent('')
      setSubject('')
      onSent()
    } catch (e: any) {
      alert('Erro: ' + e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-t bg-gray-50">
      {/* ── Status da sessão WhatsApp ── */}
      {channel === 'whatsapp' && buyerPhone && (
        <div className={`px-4 py-2 text-xs flex items-center gap-2 border-b ${
          sessionActive
            ? 'bg-green-50 text-green-700 border-green-100'
            : 'bg-orange-50 text-orange-700 border-orange-100'
        }`}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sessionActive ? 'bg-green-500' : 'bg-orange-400'}`} />
          {sessionActive ? (
            <span>
              <strong>Sessão ativa</strong> — cliente respondeu recentemente.
              Texto livre liberado por mais {sessionMinutesLeft >= 60
                ? `${Math.floor(sessionMinutesLeft / 60)}h${sessionMinutesLeft % 60 > 0 ? `${sessionMinutesLeft % 60}min` : ''}`
                : `${sessionMinutesLeft}min`}.
              <button onClick={() => setTplMode(t => !t)}
                className="ml-2 underline hover:no-underline">
                {tplMode ? 'Usar texto livre' : 'Ou enviar template'}
              </button>
            </span>
          ) : (
            <span>
              <strong>Sessão encerrada</strong> — cliente não respondeu nas últimas 24h.
              Para iniciar, é obrigatório usar um <strong>template aprovado</strong>.
            </span>
          )}
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Canal */}
        <div className="flex gap-2">
          {(['whatsapp', 'email', 'internal'] as const).map(ch => (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                channel === ch
                  ? ch === 'whatsapp' ? 'bg-green-500 text-white border-green-500'
                    : ch === 'email' ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-gray-600 text-white border-gray-600'
                  : 'bg-white text-gray-600 hover:border-gray-400'
              }`}
            >
              {ch === 'whatsapp' ? '📱 WhatsApp' : ch === 'email' ? '📧 E-mail' : '📝 Interno'}
            </button>
          ))}
          {!buyerPhone && channel === 'whatsapp' && (
            <span className="text-xs text-orange-600 flex items-center gap-1 ml-2">
              <FiAlertCircle /> Sem telefone cadastrado
            </span>
          )}
          {!buyerEmail && channel === 'email' && (
            <span className="text-xs text-orange-600 flex items-center gap-1 ml-2">
              <FiAlertCircle /> Sem e-mail cadastrado
            </span>
          )}
        </div>

        {/* ── MODO INICIAR ATENDIMENTO ── */}
        {channel === 'whatsapp' && tplMode ? (
          <div className="space-y-3">
            <button
              onClick={sendIniciarAtendimento}
              disabled={sending || !buyerPhone}
              className="w-full bg-green-500 text-white py-3 rounded-xl font-medium hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {sending ? <FiRefreshCw className="animate-spin" /> : <FiSend />}
              {sending ? 'Enviando...' : '📱 Iniciar Atendimento'}
            </button>
          </div>
        ) : (
          <>
            {/* Quick templates */}
            {channel !== 'whatsapp' || sessionActive ? (
              <div className="flex gap-2 flex-wrap">
                {(QUICK[channel] || []).map((tpl, i) => (
                  <button key={i} onClick={() => setContent(tpl)}
                    className="text-xs bg-white border rounded-full px-3 py-1 text-gray-600 hover:bg-primary-50 hover:border-primary-300 transition-colors">
                    {tpl.slice(0, 40)}{tpl.length > 40 ? '...' : ''}
                  </button>
                ))}
              </div>
            ) : null}

            {/* Assunto (e-mail) */}
            {channel === 'email' && (
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Assunto do e-mail"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            )}

            {/* Mensagem */}
            <div className="flex gap-2 items-end">
              <textarea
                ref={textRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText() } }}
                rows={3}
                placeholder={channel === 'internal' ? 'Nota interna (não enviada ao cliente)...' : 'Mensagem para o cliente...'}
                className="flex-1 border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <button
                onClick={sendText}
                disabled={sending || !content.trim()}
                className="bg-primary-600 text-white p-3 rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {sending ? <FiRefreshCw className="animate-spin" /> : <FiSend />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Formulário de negociação ─────────────────────────────────────────────────
function NegotiationForm({ ticketId, orderId, orderTotal, onCreated }: {
  ticketId: string; orderId?: string; orderTotal?: number; onCreated: () => void
}) {
  const [form, setForm] = useState({
    type: 'DISCOUNT',
    originalAmount: orderTotal ? String(orderTotal.toFixed(2)) : '',
    negotiatedAmount: '',
    discountPct: '',
    installments: '1',
    dueDate: '',
    notes: '',
    sendWhatsApp: true,
    sendEmail: false,
    termsText: '',
  })
  const [saving, setSaving] = useState(false)

  // Auto-calcular desconto
  useEffect(() => {
    if (form.originalAmount && form.negotiatedAmount) {
      const orig = parseFloat(form.originalAmount)
      const neg  = parseFloat(form.negotiatedAmount)
      if (orig > 0 && neg > 0 && neg <= orig) {
        setForm(f => ({ ...f, discountPct: (((orig - neg) / orig) * 100).toFixed(1) }))
      }
    }
  }, [form.originalAmount, form.negotiatedAmount])

  const save = async () => {
    setSaving(true)
    try {
      const r = await fetch(`/api/admin/sac/${ticketId}/negotiation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, orderId }),
      })
      if (!r.ok) throw new Error(await r.text())
      onCreated()
      setForm(f => ({ ...f, negotiatedAmount: '', notes: '', termsText: '' }))
    } catch (e: any) {
      alert('Erro: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
        <FiTrendingDown className="text-purple-500" /> Nova Proposta de Negociação
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tipo *</label>
          <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            {Object.entries(DEAL_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Parcelas</label>
          <input type="number" min="1" max="24" value={form.installments}
            onChange={e => setForm(f => ({...f, installments: e.target.value}))}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Valor original (R$)</label>
          <input type="number" step="0.01" value={form.originalAmount}
            onChange={e => setForm(f => ({...f, originalAmount: e.target.value}))}
            className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Valor negociado (R$)</label>
          <input type="number" step="0.01" value={form.negotiatedAmount}
            onChange={e => setForm(f => ({...f, negotiatedAmount: e.target.value}))}
            className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
        </div>
        {form.discountPct && (
          <div className="col-span-2">
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-700 font-medium">
              💰 Desconto calculado: {form.discountPct}%
              {form.originalAmount && form.negotiatedAmount && (
                <span className="ml-2 text-green-600">
                  (Economia de R$ {(parseFloat(form.originalAmount) - parseFloat(form.negotiatedAmount)).toFixed(2)})
                </span>
              )}
            </div>
          </div>
        )}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Vencimento</label>
          <input type="date" value={form.dueDate}
            onChange={e => setForm(f => ({...f, dueDate: e.target.value}))}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex items-end gap-4 pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.sendWhatsApp}
              onChange={e => setForm(f => ({...f, sendWhatsApp: e.target.checked}))}
              className="rounded" />
            <span className="text-sm text-gray-600">📱 Enviar no WPP</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.sendEmail}
              onChange={e => setForm(f => ({...f, sendEmail: e.target.checked}))}
              className="rounded" />
            <span className="text-sm text-gray-600">📧 E-mail</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Observações</label>
        <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
          rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
          placeholder="Detalhes adicionais do acordo..." />
      </div>

      <button onClick={save} disabled={saving}
        className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
        {saving ? <FiRefreshCw className="animate-spin" /> : <FiDollarSign />}
        {saving ? 'Criando proposta...' : 'Criar Proposta e Enviar'}
      </button>
    </div>
  )
}

// ── Página principal do ticket ───────────────────────────────────────────────
export default function TicketPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [data, setData]       = useState<any>(null)
  const [loading, setLoading]  = useState(true)
  const [tab, setTab]          = useState<'chat' | 'negotiation' | 'history'>('chat')
  const [editStatus, setEditStatus] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(false)
  const msgEndRef  = useRef<HTMLDivElement>(null)
  const lastMsgCount = useRef(0)

  // Vincular pedido
  const [linkQ, setLinkQ]           = useState('')
  const [linkResults, setLinkResults] = useState<any[]>([])
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkingId, setLinkingId]   = useState<string | null>(null)

  // Edição inline de assunto / categoria
  const [editSubject, setEditSubject]   = useState(false)
  const [subjectVal, setSubjectVal]     = useState('')
  const [editCategory, setEditCategory] = useState(false)
  const [categoryVal, setCategoryVal]   = useState('')

  const CATEGORY_OPTS = [
    'CANCELAMENTO','TROCA','DEVOLUCAO','ENTREGA','PAGAMENTO','PRODUTO','OUTRO'
  ]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/sac/${id}`)
      if (!r.ok) throw new Error('Ticket não encontrado')
      setData(await r.json())
    } catch (e) {
      router.push('/admin/sac')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  // Scroll para o fim só quando o número de mensagens aumentar
  useEffect(() => {
    const count = data?.ticket?.messages?.length || 0
    if (count > lastMsgCount.current) {
      msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      lastMsgCount.current = count
    }
  }, [data?.ticket?.messages])

  // Auto-refresh a cada 8 segundos para capturar respostas do cliente
  useEffect(() => {
    if (tab !== 'chat') return
    const interval = setInterval(() => {
      load()
    }, 8000)
    return () => clearInterval(interval)
  }, [tab, load])

  const updateStatus = async (newStatus: string) => {
    await fetch(`/api/admin/sac/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setEditStatus(false)
    load()
  }

  // Buscar pedidos para vincular
  const searchLink = async (q: string) => {
    setLinkQ(q)
    if (q.length < 3) { setLinkResults([]); return }
    setLinkLoading(true)
    try {
      const r = await fetch(`/api/admin/sac/search?q=${encodeURIComponent(q)}`)
      const d = await r.json()
      setLinkResults(d.orders || [])
    } finally {
      setLinkLoading(false)
    }
  }

  const linkOrder = async (orderId: string) => {
    setLinkingId(orderId)
    try {
      await fetch(`/api/admin/sac/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      setLinkQ('')
      setLinkResults([])
      load()
    } finally {
      setLinkingId(null)
    }
  }

  const saveSubject = async () => {
    if (!subjectVal.trim()) return
    await fetch(`/api/admin/sac/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: subjectVal.trim() }),
    })
    setEditSubject(false)
    load()
  }

  const saveCategory = async (cat: string) => {
    await fetch(`/api/admin/sac/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: cat }),
    })
    setEditCategory(false)
    load()
  }

  const closeSession = async () => {
    setSessionLoading(true)
    try {
      const r = await fetch(`/api/admin/sac/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'closeSession' }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Erro ao encerrar')
      load()
    } catch (e: any) {
      alert('Erro: ' + e.message)
    } finally {
      setSessionLoading(false)
    }
  }

  const updateDealStatus = async (dealId: string, status: string) => {
    await fetch(`/api/admin/sac/${id}/negotiation`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId, status }),
    })
    load()
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <FiRefreshCw className="animate-spin text-3xl text-gray-400" />
      </div>
    )
  }

  if (!data) return null
  const { ticket, order, otherOrders, notificationHistory } = data
  const statusMeta = STATUS_OPTS.find(s => s.value === ticket.status)

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
      {/* ── Sidebar esq ─────────────────────────────────────────────── */}
      <aside className="w-72 bg-white border-r flex flex-col overflow-y-auto flex-shrink-0">

        {/* Cabeçalho */}
        <div className="p-4 border-b">
          <button onClick={() => router.push('/admin/sac')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-3">
            <FiArrowLeft /> Voltar ao SAC
          </button>
          {ticket.protocol && (
            <span className="bg-primary-50 border border-primary-200 text-primary-700 font-mono text-xs font-semibold px-2.5 py-1 rounded-full tracking-wide">
              🎫 {ticket.protocol}
            </span>
          )}

          {/* Assunto editável */}
          <div className="mt-2">
            {editSubject ? (
              <div className="flex gap-1">
                <input autoFocus value={subjectVal}
                  onChange={e => setSubjectVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveSubject()}
                  className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                <button onClick={saveSubject} className="text-green-600 px-1"><FiCheck /></button>
                <button onClick={() => setEditSubject(false)} className="text-gray-400 px-1"><FiX /></button>
              </div>
            ) : (
              <button onClick={() => { setSubjectVal(ticket.subject); setEditSubject(true) }}
                className="flex items-start gap-1 text-left group w-full">
                <span className="font-semibold text-gray-800 text-sm leading-snug flex-1">{ticket.subject}</span>
                <FiEdit2 className="text-gray-300 group-hover:text-gray-500 mt-0.5 flex-shrink-0 text-xs" />
              </button>
            )}
          </div>

          {/* Status */}
          <div className="mt-2">
            {editStatus ? (
              <div className="space-y-1">
                {STATUS_OPTS.map(s => (
                  <button key={s.value} onClick={() => updateStatus(s.value)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium ${s.color} hover:opacity-80`}>
                    {s.label}
                  </button>
                ))}
                <button onClick={() => setEditStatus(false)} className="w-full text-center text-xs text-gray-400 mt-1">Cancelar</button>
              </div>
            ) : (
              <button onClick={() => setEditStatus(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${statusMeta?.color} hover:opacity-80`}>
                <span>{statusMeta?.label}</span>
                <FiEdit2 className="text-xs" />
              </button>
            )}
          </div>
        </div>

        {/* Ação principal: Encerrar */}
        {ticket.status !== 'CLOSED' && (
          <div className="p-3 border-b">
            <button onClick={closeSession} disabled={sessionLoading}
              className="w-full flex items-center justify-center gap-2 bg-red-50 border border-red-300 text-red-600 text-sm font-semibold py-2.5 rounded-lg hover:bg-red-100 disabled:opacity-50 transition">
              {sessionLoading ? <FiRefreshCw className="animate-spin" /> : '🔒'}
              Encerrar Atendimento
            </button>
          </div>
        )}
        {ticket.status === 'CLOSED' && (
          <div className="p-3 border-b">
            <div className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center">
              🔒 Encerrado em {new Date(ticket.closedAt || ticket.updatedAt).toLocaleString('pt-BR')}
            </div>
          </div>
        )}

        {/* Cliente */}
        <div className="p-4 border-b space-y-1.5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cliente</h3>
          {ticket.buyerName  && <div className="flex items-center gap-2 text-sm font-medium text-gray-800"><FiUser className="text-gray-400 text-xs flex-shrink-0" /> {ticket.buyerName}</div>}
          {ticket.buyerPhone && (
            <div className="flex items-center gap-2 text-sm">
              <FiPhone className="text-green-500 text-xs flex-shrink-0" />
              <a href={`https://wa.me/${ticket.buyerPhone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                className="text-green-600 hover:underline">{ticket.buyerPhone}</a>
            </div>
          )}
          {ticket.buyerEmail && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <FiMail className="text-xs flex-shrink-0" />
              <span className="truncate text-xs">{ticket.buyerEmail}</span>
            </div>
          )}
          {ticket.buyerCpf && <div className="text-xs text-gray-400 font-mono mt-1">CPF: {ticket.buyerCpf}</div>}
        </div>

        {/* Categoria */}
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Motivo / Categoria</h3>
            {!editCategory && <button onClick={() => { setCategoryVal(ticket.category || ''); setEditCategory(true) }} className="text-gray-300 hover:text-gray-500"><FiEdit2 className="text-xs" /></button>}
          </div>
          {editCategory ? (
            <div className="grid grid-cols-2 gap-1">
              {CATEGORY_OPTS.map(c => (
                <button key={c} onClick={() => saveCategory(c)}
                  className={`text-xs px-2 py-1 rounded border text-left transition ${
                    ticket.category === c ? 'bg-primary-100 border-primary-400 text-primary-700 font-medium' : 'bg-white hover:bg-gray-50'
                  }`}>{c}</button>
              ))}
              <button onClick={() => setEditCategory(false)} className="col-span-2 text-xs text-gray-400 mt-1">Cancelar</button>
            </div>
          ) : (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              ticket.category ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400 italic'
            }`}>{ticket.category || 'Não definido — clique ✏️'}</span>
          )}
        </div>

        {/* Pedido vinculado */}
        <div className="p-4 border-b space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pedido Vinculado</h3>
          {order ? (
            <>
              <Link href={`/admin/pedidos/${order.id}`}
                className="flex items-center gap-2 text-sm font-mono text-primary-600 hover:underline font-semibold">
                <FiPackage className="text-xs" /> #{order.id.slice(-8).toUpperCase()}
              </Link>
              <div className="text-sm text-gray-700 font-semibold">R$ {Number(order.total).toFixed(2)}</div>
              <div className="text-xs inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {ORDER_STATUS_LABELS[order.status] || order.status}
              </div>
              {order.trackingCode && (
                <div className="text-xs text-gray-500">Rastreio: <span className="font-mono">{order.trackingCode}</span></div>
              )}
              <div className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</div>
              {/* Trocar pedido */}
              <button onClick={() => setLinkQ('_')} className="text-xs text-primary-600 hover:underline">
                + Trocar pedido vinculado
              </button>
            </>
          ) : (
            <p className="text-xs text-orange-600">⚠️ Nenhum pedido vinculado</p>
          )}

          {/* Busca de pedido para vincular */}
          {(!order || linkQ === '_') && (
            <div className="mt-2 space-y-1.5">
              <input
                value={linkQ === '_' ? '' : linkQ}
                onChange={e => searchLink(e.target.value)}
                placeholder="Buscar por Nome, Pedido ou CPF..."
                className="w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-400"
                autoFocus
              />
              {linkLoading && <div className="text-xs text-gray-400 text-center">Buscando...</div>}
              {linkResults.map((o: any) => (
                <button key={o.id} onClick={() => linkOrder(o.id)}
                  disabled={linkingId === o.id}
                  className="w-full text-left border rounded-lg px-3 py-2 hover:bg-primary-50 hover:border-primary-300 transition text-xs space-y-0.5">
                  <div className="font-mono font-semibold text-primary-700">#{o.id.slice(-8).toUpperCase()}</div>
                  <div className="text-gray-600">{o.buyerName} · R$ {Number(o.total).toFixed(2)}</div>
                  <div className="text-gray-400 flex gap-2">
                    <span>{ORDER_STATUS_LABELS[o.status] || o.status}</span>
                    <span>{new Date(o.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </button>
              ))}
              {linkQ && linkQ !== '_' && linkQ.length >= 3 && !linkLoading && linkResults.length === 0 && (
                <p className="text-xs text-gray-400 text-center">Nenhum pedido encontrado</p>
              )}
            </div>
          )}
        </div>

        {/* Outros pedidos do cliente */}
        {otherOrders?.length > 0 && (
          <div className="p-4 border-b space-y-1.5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Outros Pedidos do Cliente</h3>
            {otherOrders.map((o: any) => (
              <Link key={o.id} href={`/admin/pedidos/${o.id}`}
                className="flex items-center justify-between text-xs hover:bg-gray-50 rounded p-1.5 -mx-1.5">
                <span className="font-mono text-primary-600">#{o.id.slice(-8).toUpperCase()}</span>
                <span className="text-gray-500">R$ {Number(o.total).toFixed(2)}</span>
                <span className="text-gray-400">{ORDER_STATUS_LABELS[o.status] || o.status}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="p-4 text-xs text-gray-400 space-y-1">
          <div className="flex items-center gap-1"><FiCalendar className="flex-shrink-0" /> Aberto: {new Date(ticket.createdAt).toLocaleString('pt-BR')}</div>
          {ticket.assignedTo && <div className="flex items-center gap-1"><FiUser className="flex-shrink-0" /> Atendente: {ticket.assignedTo}</div>}
          {ticket.tags && (
            <div className="flex flex-wrap gap-1 mt-1">
              {ticket.tags.split(',').map((t: string) => (
                <span key={t} className="bg-gray-100 px-2 py-0.5 rounded-full">{t.trim()}</span>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main: conversa / negociação / histórico ────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="bg-white border-b px-6 flex gap-1">
          {[
            { key: 'chat',        label: '💬 Conversa',        count: ticket.messages?.length },
            { key: 'negotiation', label: '💰 Negociação',      count: ticket.negotiations?.length },
            { key: 'history',     label: '📋 Histórico',       count: notificationHistory?.length },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className="ml-1.5 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB: Conversa ─────────────────────────────── */}
        {tab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {ticket.messages?.length === 0 && (
                <div className="text-center text-gray-400 py-12">
                  <FiMessageSquare className="text-4xl mx-auto mb-3" />
                  <p>Nenhuma mensagem ainda. Inicie o atendimento.</p>
                </div>
              )}
              {ticket.messages?.map((msg: any) => (
                <MsgBubble key={msg.id} msg={msg} />
              ))}
              <div ref={msgEndRef} />
            </div>
            <SendMessageForm
              ticketId={id}
              buyerPhone={ticket.buyerPhone}
              buyerEmail={ticket.buyerEmail}
              buyerName={ticket.buyerName}
              messages={ticket.messages || []}
              ticketStatus={ticket.status}
              sessionClosedAt={ticket.sessionClosedAt}
              onSent={load}
            />
          </div>
        )}

        {/* ── TAB: Negociação ───────────────────────────── */}
        {tab === 'negotiation' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <NegotiationForm
              ticketId={id}
              orderId={ticket.orderId}
              orderTotal={order ? Number(order.total) : undefined}
              onCreated={load}
            />

            {/* Propostas existentes */}
            {ticket.negotiations?.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700">Propostas</h3>
                {ticket.negotiations.map((deal: any) => (
                  <div key={deal.id} className="bg-white rounded-xl border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">{DEAL_TYPE_LABELS[deal.type] || deal.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${DEAL_STATUS_COLORS[deal.status]}`}>
                        {deal.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm">
                      {deal.originalAmount && (
                        <div><span className="text-xs text-gray-500 block">Original</span>
                          <span className="font-medium text-red-600">R$ {Number(deal.originalAmount).toFixed(2)}</span></div>
                      )}
                      {deal.negotiatedAmount && (
                        <div><span className="text-xs text-gray-500 block">Negociado</span>
                          <span className="font-medium text-green-600">R$ {Number(deal.negotiatedAmount).toFixed(2)}</span></div>
                      )}
                      {deal.discountPct && (
                        <div><span className="text-xs text-gray-500 block">Desconto</span>
                          <span className="font-medium text-purple-600">{Number(deal.discountPct).toFixed(1)}%</span></div>
                      )}
                    </div>

                    {deal.installments > 1 && (
                      <div className="text-sm text-gray-600">📅 {deal.installments}x parcelas</div>
                    )}
                    {deal.dueDate && (
                      <div className="text-sm text-gray-600">⏰ Vence: {new Date(deal.dueDate).toLocaleDateString('pt-BR')}</div>
                    )}
                    {deal.notes && <p className="text-sm text-gray-500">{deal.notes}</p>}

                    {/* Ações */}
                    {deal.status === 'PROPOSED' && (
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => updateDealStatus(deal.id, 'ACCEPTED')}
                          className="flex items-center gap-1 bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-600">
                          <FiCheck /> Aceitar
                        </button>
                        <button onClick={() => updateDealStatus(deal.id, 'EXECUTED')}
                          className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-blue-600">
                          <FiCheckCircle /> Executar
                        </button>
                        <button onClick={() => updateDealStatus(deal.id, 'REJECTED')}
                          className="flex items-center gap-1 bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs hover:bg-red-200">
                          <FiX /> Rejeitar
                        </button>
                      </div>
                    )}
                    {deal.status === 'ACCEPTED' && (
                      <button onClick={() => updateDealStatus(deal.id, 'EXECUTED')}
                        className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-blue-600">
                        <FiCheckCircle /> Marcar como Executado
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Histórico de notificações ────────────── */}
        {tab === 'history' && (
          <div className="flex-1 overflow-y-auto p-5">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <FiBell /> Histórico de Notificações Enviadas
            </h3>
            {notificationHistory?.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <FiBell className="text-4xl mx-auto mb-3" />
                <p>Nenhuma notificação no histórico</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notificationHistory.map((n: any) => (
                  <div key={n.id} className="bg-white rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {n.channel === 'whatsapp'
                          ? <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-0.5 rounded">WPP</span>
                          : <span className="text-blue-600 font-bold text-xs bg-blue-50 px-2 py-0.5 rounded">EMAIL</span>}
                        <span className="font-medium text-sm text-gray-700">{n.type}</span>
                        {n.status === 'failed' && (
                          <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">Falha</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(n.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    {n.subject && <p className="text-xs text-gray-500 mt-1">Assunto: {n.subject}</p>}
                    {n.body && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{n.body}</p>}
                    <p className="text-xs text-gray-400 mt-1">Para: {n.to}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
