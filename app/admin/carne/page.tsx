'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import {
  FiFileText, FiDollarSign, FiCheck, FiX, FiAlertCircle, FiClock,
  FiPlus, FiTrash2, FiChevronDown, FiChevronUp, FiRefreshCw,
  FiUser, FiPhone, FiCreditCard, FiCalendar, FiShoppingBag,
  FiSearch, FiFilter, FiSend, FiCopy, FiExternalLink, FiZap,
  FiTrendingUp, FiCheckCircle, FiSliders,
} from 'react-icons/fi'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Parcela {
  id: string
  numero: number
  valor: number
  dueDate: string
  paidAt: string | null
  paidBy: string | null
  paymentId: string | null
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  notes: string | null
}
interface OrderItem { product: { name: string }; quantity: number; price: number }
interface OrderRef {
  id: string; total: number; paymentMethod: string | null; paymentStatus: string | null
  status: string; createdAt: string; buyerName: string | null; buyerEmail: string | null
  buyerPhone: string | null; buyerCpf: string | null; items: OrderItem[]
}
interface Carne {
  id: string; orderId: string; buyerName: string; buyerPhone: string | null
  buyerCpf: string | null; totalValue: number; interestRate: number
  totalWithInterest: number | null; financingAcceptedAt: string | null
  notes: string | null; createdAt: string; parcelas: Parcela[]; order: OrderRef
}
interface PendingOrder {
  id: string; total: number; buyerName: string | null; buyerEmail: string | null
  buyerPhone: string | null; buyerCpf: string | null; paymentMethod: string | null
  paymentStatus: string | null; createdAt: string; items: OrderItem[]
  hasCarne: boolean
}

type StatusFilter = 'todos' | 'ativos' | 'quitados' | 'vencidas' | 'aguardando'
type SortOption  = 'recentes' | 'antigos' | 'maior_valor' | 'vencidas_primeiro' | 'nome'

interface AdminPaymentData {
  carneId: string
  parcelaId: string
  method: 'pix' | 'boleto'
  paymentId?: string
  qrCode?: string
  qrCodeBase64?: string
  boletoUrl?: string
  paymentUrl?: string
  valor: number
  numero: number
  dueDate: string
  buyerName?: string
  buyerPhone?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR')
const fmtDateTime = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

function statusBadge(s: Parcela['status']) {
  const map = {
    PENDING:   { label: 'A vencer', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    PAID:      { label: 'Pago',     cls: 'bg-green-100 text-green-700 border-green-200' },
    OVERDUE:   { label: 'Vencida',  cls: 'bg-red-100 text-red-700 border-red-200' },
    CANCELLED: { label: 'Cancelada',cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  }
  const { label, cls } = map[s] || map.PENDING
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}>{label}</span>
}

// ── Modal: Pagamento Admin (Pix / Boleto gerado pelo admin) ───────────────────
function AdminPagamentoModal({ data, onClose }: { data: AdminPaymentData; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const copyQR = () => {
    if (data.qrCode) {
      navigator.clipboard.writeText(data.qrCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
      toast.success('Código Pix copiado!')
    }
  }

  const whatsappMsg = data.method === 'pix'
    ? `Olá ${data.buyerName || ''}! Segue o código Pix para pagamento da parcela ${data.numero} (${fmt(data.valor)}):\n\n${data.qrCode}`
    : `Olá ${data.buyerName || ''}! Segue o link para pagamento da parcela ${data.numero} (${fmt(data.valor)}):\n\n${data.boletoUrl || data.paymentUrl}`

  const whatsappUrl = `https://wa.me/${(data.buyerPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMsg)}`

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${data.method === 'pix' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
              {data.method === 'pix' ? <FiZap size={18} /> : <FiFileText size={18} />}
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{data.method === 'pix' ? 'Pix Gerado' : 'Boleto Gerado'}</h2>
              <p className="text-xs text-gray-500">Parcela {data.numero} · {fmt(data.valor)} · Vence {data.dueDate}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
            <FiX size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {data.method === 'pix' && (
            <>
              {data.qrCodeBase64 && (
                <div className="flex justify-center">
                  <div className="p-2 border-2 border-emerald-200 rounded-xl bg-white">
                    <Image src={`data:image/png;base64,${data.qrCodeBase64}`} alt="QR Code Pix" width={180} height={180} className="rounded-lg" />
                  </div>
                </div>
              )}
              {data.qrCode && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Código Pix Copia e Cola</p>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <p className="text-xs text-gray-700 font-mono break-all leading-relaxed">{data.qrCode.slice(0, 80)}…</p>
                  </div>
                  <button onClick={copyQR} className={`mt-2 w-full flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl font-medium transition-colors ${copied ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {copied ? <><FiCheckCircle size={14} /> Copiado!</> : <><FiCopy size={14} /> Copiar código Pix</>}
                  </button>
                </div>
              )}
            </>
          )}
          {data.method === 'boleto' && (data.boletoUrl || data.paymentUrl) && (
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <FiFileText className="text-blue-600" size={28} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Boleto gerado com sucesso</p>
                <p className="text-sm text-gray-500 mt-1">Parcela {data.numero} · Vence em {data.dueDate}</p>
              </div>
              <a href={data.boletoUrl || data.paymentUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full text-sm bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium">
                <FiExternalLink size={14} /> Abrir Boleto
              </a>
              <button onClick={() => { navigator.clipboard.writeText(data.boletoUrl || data.paymentUrl || ''); toast.success('Link copiado!') }}
                className="flex items-center justify-center gap-2 w-full text-sm bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200 transition-colors">
                <FiCopy size={14} /> Copiar link do boleto
              </button>
            </div>
          )}
          {data.buyerPhone && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Enviar para o cliente</p>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full text-sm bg-[#25D366] text-white py-3 rounded-xl hover:bg-[#1ebe57] transition-colors font-medium">
                <FiSend size={14} /> Enviar via WhatsApp ({data.buyerPhone})
              </a>
            </div>
          )}
          {data.paymentId && <p className="text-center text-xs text-gray-400 font-mono">ID: {data.paymentId}</p>}
        </div>
        <div className="p-4 border-t border-gray-100">
          <button onClick={onClose} className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 text-sm transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  )
}
function NovoCarneModal({ order, onClose, onCreated }: {
  order: PendingOrder; onClose: () => void; onCreated: () => void
}) {
  const [form, setForm] = useState({
    buyerName: order.buyerName || '',
    buyerPhone: order.buyerPhone || '',
    buyerCpf: order.buyerCpf || '',
    numeroParcelas: 3,
    primeiroVencimento: new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0],
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [interestRate, setInterestRate] = useState(0)
  const [interestRateLoading, setInterestRateLoading] = useState(true)

  // Buscar taxa de juros configurada
  useEffect(() => {
    fetch('/api/admin/config?prefix=financing')
      .then(r => r.json())
      .then(d => setInterestRate(parseFloat(d.configs?.['financing.interestRate'] ?? '0') || 0))
      .catch(() => setInterestRate(0))
      .finally(() => setInterestRateLoading(false))
  }, [])

  // Total com juros compostos: M = C × (1 + i)^n
  const totalWithInterest = interestRate > 0
    ? Math.round(order.total * Math.pow(1 + interestRate / 100, form.numeroParcelas) * 100) / 100
    : order.total

  // Preview das parcelas sobre o total COM juros
  const preview = Array.from({ length: form.numeroParcelas }, (_, i) => {
    const d = new Date(form.primeiroVencimento)
    d.setMonth(d.getMonth() + i)
    const base = Math.round((totalWithInterest / form.numeroParcelas) * 100) / 100
    const valor = i === form.numeroParcelas - 1
      ? Math.round((totalWithInterest - base * (form.numeroParcelas - 1)) * 100) / 100
      : base
    return { numero: i + 1, valor, dueDate: d.toLocaleDateString('pt-BR') }
  })

  const handleSubmit = async () => {
    if (!form.buyerName || !form.primeiroVencimento) {
      toast.error('Preencha nome e data do primeiro vencimento')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/carne', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Carnê criado com sucesso!')
      onCreated()
      onClose()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar carnê')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Criar Carnê</h2>
            <p className="text-sm text-gray-500">Pedido #{order.id.slice(-8).toUpperCase()} · {fmt(order.total)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500"><FiX /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Dados do comprador */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Dados do Comprador</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FiUser className="text-gray-400 flex-shrink-0" size={15} />
                <input className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400" placeholder="Nome completo *" value={form.buyerName} onChange={e => setForm(f => ({ ...f, buyerName: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <FiPhone className="text-gray-400 flex-shrink-0" size={15} />
                <input className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400" placeholder="Telefone / WhatsApp" value={form.buyerPhone} onChange={e => setForm(f => ({ ...f, buyerPhone: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <FiCreditCard className="text-gray-400 flex-shrink-0" size={15} />
                <input className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400" placeholder="CPF" value={form.buyerCpf} onChange={e => setForm(f => ({ ...f, buyerCpf: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Configuração do carnê */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Configuração do Carnê</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nº de Parcelas</label>
                <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400" value={form.numeroParcelas} onChange={e => setForm(f => ({ ...f, numeroParcelas: +e.target.value }))}>
                  {[2,3,4,5,6,7,8,9,10,11,12].map(n => {
                    const twi = interestRate > 0
                      ? Math.round(order.total * Math.pow(1 + interestRate / 100, n) * 100) / 100
                      : order.total
                    return <option key={n} value={n}>{n}x de {fmt(Math.round(twi/n*100)/100)}{interestRate > 0 ? ` (+${interestRate}%a.m.)` : ''}</option>
                  })}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">1º Vencimento</label>
                <input type="date" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400" value={form.primeiroVencimento} onChange={e => setForm(f => ({ ...f, primeiroVencimento: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Preview das parcelas */}
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview das Parcelas</p>
              {interestRateLoading ? (
                <span className="text-xs text-gray-400">carregando juros…</span>
              ) : interestRate > 0 ? (
                <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">{interestRate}% a.m. (juros compostos)</span>
              ) : (
                <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">Sem juros</span>
              )}
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {preview.map(p => (
                <div key={p.numero} className="flex justify-between text-sm text-gray-700">
                  <span className="font-medium">Parcela {p.numero}/{form.numeroParcelas}</span>
                  <span className="text-gray-500">{p.dueDate}</span>
                  <span className="font-bold text-indigo-600">{fmt(p.valor)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 mt-2 pt-2 space-y-1">
              {interestRate > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Valor original</span>
                  <span>{fmt(order.total)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-gray-900">
                <span>Total a cobrar</span>
                <span className={interestRate > 0 ? 'text-orange-600' : 'text-indigo-600'}>{fmt(totalWithInterest)}</span>
              </div>
            </div>
          </div>

          {/* Observações */}
          <textarea className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 resize-none" rows={2} placeholder="Observações (opcional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 text-sm border border-gray-200 text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 text-sm bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium">
            {loading ? 'Criando…' : 'Criar Carnê'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Ver Contrato (admin read-only) ─────────────────────────────────────
interface ContractClause { titulo: string; itens: string[] }
interface ContractData {
  clausulas: ContractClause[]
  credora: { nome: string; cnpj: string; endereco: string }
  devedor: { nome: string; cpf: string }
  totalValue: number; totalWithInterest: number; valorParcela: number
  numParcelas: number; taxaJuros: number
  parcelas: { numero: number; valor: number; dueDate: string }[]
  assinatura: { local: string; data: string; credor: string; devedor: string }
}

function ContratoAdminModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [contract, setContract] = useState<ContractData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/orders/${orderId}/contrato`)
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setContract(d.contract) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [orderId])

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <FiFileText className="text-indigo-600" size={20} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Contrato de Financiamento</h2>
              <p className="text-xs text-gray-500">Pedido #{orderId.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 transition-colors">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading && <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>}
          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>}
          {contract && (
            <>
              <div className="text-center pb-2 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 uppercase tracking-wide">Contrato Particular de Financiamento</h3>
                <p className="text-sm text-gray-500 mt-1">{contract.credora.nome}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-indigo-700 uppercase mb-2">CREDORA</p>
                  <p className="font-semibold text-gray-900">{contract.credora.nome}</p>
                  {contract.credora.cnpj && <p className="text-sm text-gray-600">CNPJ: {contract.credora.cnpj}</p>}
                  {contract.credora.endereco && <p className="text-sm text-gray-600">{contract.credora.endereco}</p>}
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-600 uppercase mb-2">DEVEDORA</p>
                  <p className="font-semibold text-gray-900">{contract.devedor.nome}</p>
                  {contract.devedor.cpf && <p className="text-sm text-gray-600">CPF: {contract.devedor.cpf}</p>}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-600 uppercase mb-3">Resumo Financeiro</p>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div><p className="text-xs text-gray-500">Valor Original</p><p className="font-bold">{fmt(contract.totalValue)}</p></div>
                  <div><p className="text-xs text-gray-500">Taxa de Juros</p><p className="font-bold text-orange-600">{contract.taxaJuros}% a.m.</p></div>
                  <div><p className="text-xs text-gray-500">Total com Juros</p><p className="font-bold text-indigo-700">{fmt(contract.totalWithInterest)}</p></div>
                  <div><p className="text-xs text-gray-500">Parcelas</p><p className="font-bold">{contract.numParcelas}x de {fmt(contract.valorParcela)}</p></div>
                </div>
              </div>
              <div className="space-y-3">
                {contract.clausulas.map((c, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4">
                    <p className="font-bold text-gray-900 text-sm mb-1">{c.titulo}</p>
                    <div className="space-y-1.5">
                      {c.itens.map((item, j) => (
                        <p key={j} className="text-sm text-gray-700 leading-relaxed">{item}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b"><p className="text-xs font-bold text-gray-600 uppercase">Plano de Pagamento</p></div>
                <div className="divide-y divide-gray-100">
                  {contract.parcelas.map(p => (
                    <div key={p.numero} className="flex justify-between items-center px-4 py-2 text-sm">
                      <span className="text-gray-600">Parcela {p.numero}/{contract.numParcelas}</span>
                      <span className="text-gray-500">{p.dueDate}</span>
                      <span className="font-semibold">{fmt(p.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700">
                <p>{contract.assinatura.local && `${contract.assinatura.local}, `}{contract.assinatura.data}</p>
                <div className="grid grid-cols-2 gap-8 mt-6">
                  <div className="text-center"><div className="border-t border-gray-400 pt-2"></div><p className="font-medium">{contract.assinatura.credor}</p><p className="text-xs text-gray-500">CREDORA</p></div>
                  <div className="text-center"><div className="border-t border-gray-400 pt-2"></div><p className="font-medium">{contract.assinatura.devedor}</p><p className="text-xs text-gray-500">DEVEDORA</p></div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-100">
          <button onClick={onClose} className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 text-sm transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  )
}

// ── Card de Carnê ─────────────────────────────────────────────────────────────
function CarneCard({ carne, onUpdated, onGeneratePayment }: {
  carne: Carne
  onUpdated: () => void
  onGeneratePayment: (data: AdminPaymentData) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [paying, setPaying] = useState<string | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showContrato, setShowContrato] = useState(false)

  const paid    = carne.parcelas.filter(p => p.status === 'PAID').length
  const overdue = carne.parcelas.filter(p => p.status === 'OVERDUE').length
  const total   = carne.parcelas.length
  const effectiveTotal = carne.totalWithInterest ?? carne.totalValue
  const paidValue  = carne.parcelas.filter(p => p.status === 'PAID').reduce((s, p) => s + p.valor, 0)
  const remaining  = effectiveTotal - paidValue
  const isAccepted = !!carne.financingAcceptedAt
  const isAwaitingAcceptance = !isAccepted && !carne.parcelas.every(p => p.status === 'PAID')

  const handleTogglePay = async (parcelaId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PAID' ? 'PENDING' : 'PAID'
    setPaying(parcelaId)
    try {
      const res = await fetch(`/api/admin/carne/${carne.id}/parcela/${parcelaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      toast.success(newStatus === 'PAID' ? 'Parcela recebida com sucesso!' : 'Pagamento desfeito')
      onUpdated()
    } catch {
      toast.error('Erro ao atualizar parcela')
    } finally {
      setPaying(null)
    }
  }

  const handleGeneratePayment = async (parcelaId: string, method: 'pix' | 'boleto') => {
    const key = `${parcelaId}-${method}`
    setGenerating(key)
    try {
      const res = await fetch(`/api/admin/carne/${carne.id}/parcela/${parcelaId}/pagar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar pagamento')
      onGeneratePayment({ carneId: carne.id, parcelaId, method, ...data })
      toast.success(`${method === 'pix' ? 'Pix' : 'Boleto'} gerado com sucesso!`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setGenerating(null)
    }
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/admin/carne/${carne.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Carnê removido')
      onUpdated()
    } catch {
      toast.error('Erro ao remover carnê')
    }
  }

  const allPaid    = paid === total
  const cardBorder = allPaid ? 'border-green-300 bg-green-50/30' : overdue > 0 ? 'border-red-200' : 'border-gray-200'

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${cardBorder}`}>
      {/* Header clicável */}
      <button onClick={() => setExpanded(e => !e)} className="w-full text-left p-5">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${allPaid ? 'bg-green-100 text-green-600' : overdue > 0 ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
            <FiFileText size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-900">{carne.buyerName}</span>
              {allPaid && <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">✅ Quitado</span>}
              {isAwaitingAcceptance && <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">⏳ Aguardando aceite</span>}
              {isAccepted && !allPaid && <span className="text-xs bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">✔ Aceito em {fmtDate(carne.financingAcceptedAt!)}</span>}
              {overdue > 0 && !allPaid && <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium">⚠️ {overdue} vencida{overdue > 1 ? 's' : ''}</span>}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-500">
              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">#{carne.order.id.slice(-8).toUpperCase()}</span>
              <span>{paid}/{total} parcelas pagas</span>
              <span className="font-semibold text-indigo-600">{fmt(effectiveTotal)}</span>
              {carne.interestRate > 0 && <span className="text-orange-600 font-medium">{carne.interestRate}% a.m.</span>}
              {!allPaid && <span>Restante: <span className="font-semibold text-gray-700">{fmt(remaining)}</span></span>}
              {carne.buyerPhone && <span className="flex items-center gap-1"><FiPhone size={11} />{carne.buyerPhone}</span>}
              {carne.buyerCpf && <span className="flex items-center gap-1"><FiCreditCard size={11} />{carne.buyerCpf}</span>}
            </div>
            <div className="mt-2.5 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${allPaid ? 'bg-green-500' : overdue > 0 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                style={{ width: `${(paid / total) * 100}%` }} />
            </div>
          </div>
          <div className="text-gray-400 flex-shrink-0">
            {expanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          </div>
        </div>
      </button>

      {/* Corpo expandido */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/40 p-5 space-y-3">
          {/* Produtos */}
          <div className="bg-white border border-gray-100 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Produtos do Pedido</p>
            {carne.order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs text-gray-600 py-0.5">
                <span>{item.product?.name || 'Produto'} x{item.quantity}</span>
                <span className="font-medium">{fmt(item.price * item.quantity)}</span>
              </div>
            ))}
            {carne.notes && <p className="text-xs text-gray-400 mt-2 italic border-t border-gray-100 pt-2">📝 {carne.notes}</p>}
          </div>

          {/* Parcelas */}
          <div className="space-y-2">
            {carne.parcelas.map(p => (
              <div key={p.id} className={`rounded-xl border p-3 ${
                p.status === 'PAID'      ? 'bg-green-50 border-green-200' :
                p.status === 'OVERDUE'   ? 'bg-red-50 border-red-200' :
                p.status === 'CANCELLED' ? 'bg-gray-100 border-gray-200 opacity-60' :
                'bg-white border-gray-200'
              }`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-7 h-7 mt-0.5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shadow-sm">
                    {p.numero}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900">{fmt(p.valor)}</span>
                      {statusBadge(p.status)}
                      {p.paymentId && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded font-mono">
                          ID: {p.paymentId}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                      <span>Vence: {fmtDate(p.dueDate)}</span>
                      {p.paidAt && <span className="text-green-600 font-medium">· ✓ Pago em {fmtDate(p.paidAt)} por {p.paidBy}</span>}
                    </div>
                  </div>
                  {p.status !== 'CANCELLED' && (
                    <div className="flex-shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
                      {p.status !== 'PAID' && (
                        <button onClick={() => handleGeneratePayment(p.id, 'pix')} disabled={!!generating}
                          className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors font-medium disabled:opacity-50">
                          {generating === `${p.id}-pix` ? '…' : <><FiZap size={11} /> Pix</>}
                        </button>
                      )}
                      {p.status !== 'PAID' && (
                        <button onClick={() => handleGeneratePayment(p.id, 'boleto')} disabled={!!generating}
                          className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors font-medium disabled:opacity-50">
                          {generating === `${p.id}-boleto` ? '…' : <><FiFileText size={11} /> Boleto</>}
                        </button>
                      )}
                      <button onClick={() => handleTogglePay(p.id, p.status)} disabled={paying === p.id}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                          p.status === 'PAID' ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-600 text-white hover:bg-green-700'
                        }`}>
                        {paying === p.id ? '…' : p.status === 'PAID' ? <><FiX size={11} /> Desfazer</> : <><FiCheck size={11} /> Recebido</>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="pt-1 flex items-center justify-between gap-3">
            <button onClick={() => setShowContrato(true)} className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 transition-colors font-medium">
              <FiFileText size={13} /> Ver Contrato
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">Confirmar exclusão?</span>
                <button onClick={handleDelete} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 font-medium">Sim, remover</button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">Cancelar</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors">
                <FiTrash2 size={12} /> Remover
              </button>
            )}
          </div>

          {showContrato && <ContratoAdminModal orderId={carne.orderId} onClose={() => setShowContrato(false)} />}
        </div>
      )}
    </div>
  )
}

// ── Página Principal ──────────────────────────────────────────────────────────
export default function CarnePage() {
  const [tab, setTab] = useState<'carnes' | 'pedidos'>('carnes')
  const [carnes, setCarnes] = useState<Carne[]>([])
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [newCarneOrder, setNewCarneOrder] = useState<PendingOrder | null>(null)
  const [paymentModal, setPaymentModal] = useState<AdminPaymentData | null>(null)

  // Filtros
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [sortBy, setSortBy] = useState<SortOption>('recentes')
  const [showFilters, setShowFilters] = useState(false)

  const loadCarnes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/carne')
      const data = await res.json()
      setCarnes(data.carnes || [])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadPendingOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/carne/pending-orders')
      const data = await res.json()
      setPendingOrders(data.orders || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCarnes() }, [loadCarnes])
  useEffect(() => { if (tab === 'pedidos') loadPendingOrders() }, [tab, loadPendingOrders])

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalCarne    = carnes.length
  const quitados      = carnes.filter(c => c.parcelas.every(p => p.status === 'PAID')).length
  const comVencidas   = carnes.filter(c => c.parcelas.some(p => p.status === 'OVERDUE')).length
  const aguardando    = carnes.filter(c => !c.financingAcceptedAt).length
  const totalReceber  = carnes.reduce((s, c) => s + c.parcelas.filter(p => p.status !== 'PAID' && p.status !== 'CANCELLED').reduce((x, p) => x + p.valor, 0), 0)
  const totalRecebido = carnes.reduce((s, c) => s + c.parcelas.filter(p => p.status === 'PAID').reduce((x, p) => x + p.valor, 0), 0)

  // ── Filtro + Ordenação ──────────────────────────────────────────────────
  const filteredCarnes = useMemo(() => {
    let list = [...carnes]
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(c =>
        c.buyerName.toLowerCase().includes(q) ||
        (c.buyerCpf || '').replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        (c.buyerPhone || '').replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        c.order.id.slice(-8).toLowerCase().includes(q) ||
        c.orderId.toLowerCase().includes(q)
      )
    }
    if (statusFilter === 'quitados')   list = list.filter(c => c.parcelas.every(p => p.status === 'PAID'))
    if (statusFilter === 'vencidas')   list = list.filter(c => c.parcelas.some(p => p.status === 'OVERDUE'))
    if (statusFilter === 'aguardando') list = list.filter(c => !c.financingAcceptedAt)
    if (statusFilter === 'ativos')     list = list.filter(c => !c.parcelas.every(p => p.status === 'PAID') && !!c.financingAcceptedAt)

    if (sortBy === 'recentes')          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    if (sortBy === 'antigos')           list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    if (sortBy === 'maior_valor')       list.sort((a, b) => (b.totalWithInterest ?? b.totalValue) - (a.totalWithInterest ?? a.totalValue))
    if (sortBy === 'nome')              list.sort((a, b) => a.buyerName.localeCompare(b.buyerName))
    if (sortBy === 'vencidas_primeiro') list.sort((a, b) => b.parcelas.filter(p => p.status === 'OVERDUE').length - a.parcelas.filter(p => p.status === 'OVERDUE').length)
    return list
  }, [carnes, search, statusFilter, sortBy])

  const statusFilters: { key: StatusFilter; label: string; count?: number }[] = [
    { key: 'todos',      label: 'Todos',             count: totalCarne },
    { key: 'ativos',     label: 'Ativos',             count: totalCarne - quitados - aguardando },
    { key: 'quitados',   label: 'Quitados',           count: quitados },
    { key: 'vencidas',   label: 'Com vencidas',       count: comVencidas },
    { key: 'aguardando', label: 'Aguardando aceite',  count: aguardando },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiFileText className="text-indigo-600" /> Carnê — Pagamento Parcelado
          </h1>
          <p className="text-sm text-gray-500 mt-1">Controle interno de parcelamentos manuais · Não visível no site</p>
        </div>
        <button onClick={() => { loadCarnes(); if (tab === 'pedidos') loadPendingOrders() }}
          className="flex items-center gap-2 text-sm bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
          <FiRefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { icon: <FiFileText />,    label: 'Total',           value: totalCarne,         color: 'bg-indigo-500' },
          { icon: <FiCheck />,       label: 'Quitados',        value: quitados,           color: 'bg-green-500' },
          { icon: <FiAlertCircle />, label: 'Com Vencidas',    value: comVencidas,        color: 'bg-red-500' },
          { icon: <FiClock />,       label: 'Aguard. Aceite',  value: aguardando,         color: 'bg-amber-500' },
          { icon: <FiDollarSign />,  label: 'A Receber',       value: fmt(totalReceber),  color: 'bg-orange-500' },
          { icon: <FiTrendingUp />,  label: 'Recebido',        value: fmt(totalRecebido), color: 'bg-emerald-500' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${s.color} text-white flex items-center justify-center text-base flex-shrink-0`}>{s.icon}</div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">{s.label}</p>
              <p className="text-lg font-bold text-gray-900 truncate">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        {[
          { key: 'carnes',  label: `Carnês (${totalCarne})`, icon: <FiFileText size={14} /> },
          { key: 'pedidos', label: 'Pedidos Pendentes',       icon: <FiShoppingBag size={14} /> },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 text-sm px-5 py-2.5 rounded-full border transition-colors font-medium ${tab === t.key ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-400'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Busca + Filtros (tab Carnês) ────────────────────────────────────── */}
      {tab === 'carnes' && (
        <div className="space-y-3">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input type="text" placeholder="Buscar por nome, CPF, telefone ou nº do pedido…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white shadow-sm" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><FiX size={14} /></button>
              )}
            </div>
            <button onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border transition-colors ${showFilters ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-400'}`}>
              <FiSliders size={14} /> Filtros
            </button>
          </div>

          {showFilters && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><FiFilter size={11} /> Status</p>
                <div className="flex flex-wrap gap-2">
                  {statusFilters.map(f => (
                    <button key={f.key} onClick={() => setStatusFilter(f.key)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${statusFilter === f.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400'}`}>
                      {f.label}
                      {f.count !== undefined && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${statusFilter === f.key ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>{f.count}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><FiTrendingUp size={11} /> Ordenar por</p>
                <div className="flex flex-wrap gap-2">
                  {([
                    ['recentes',          'Mais recentes'],
                    ['antigos',           'Mais antigos'],
                    ['maior_valor',       'Maior valor'],
                    ['vencidas_primeiro', 'Vencidas primeiro'],
                    ['nome',              'Nome A-Z'],
                  ] as [SortOption, string][]).map(([key, label]) => (
                    <button key={key} onClick={() => setSortBy(key)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${sortBy === key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(search || statusFilter !== 'todos') && (
            <p className="text-xs text-gray-500">
              Mostrando <strong className="text-gray-900">{filteredCarnes.length}</strong> de <strong>{totalCarne}</strong> carnês
              {search && <> para "<strong>{search}</strong>"</>}
              {' '}<button onClick={() => { setSearch(''); setStatusFilter('todos') }} className="text-indigo-500 hover:text-indigo-700 font-medium">Limpar filtros</button>
            </p>
          )}
        </div>
      )}

      {/* ── TAB: Carnês ──────────────────────────────────────────────────────── */}
      {tab === 'carnes' && (
        loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full mr-3" />
            Carregando carnês…
          </div>
        ) : filteredCarnes.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FiFileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium text-gray-600">
              {carnes.length === 0 ? 'Nenhum carnê criado ainda' : 'Nenhum carnê encontrado com esses filtros'}
            </p>
            {carnes.length === 0 ? (
              <>
                <p className="text-sm mt-1">Vá para "Pedidos Pendentes" e converta um pedido em carnê</p>
                <button onClick={() => setTab('pedidos')} className="mt-4 text-sm bg-indigo-600 text-white px-5 py-2.5 rounded-full hover:bg-indigo-700 transition-colors">Ver Pedidos Pendentes →</button>
              </>
            ) : (
              <button onClick={() => { setSearch(''); setStatusFilter('todos') }} className="mt-4 text-sm bg-indigo-600 text-white px-5 py-2.5 rounded-full hover:bg-indigo-700 transition-colors">Limpar filtros</button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCarnes.map(c => (
              <CarneCard key={c.id} carne={c} onUpdated={loadCarnes} onGeneratePayment={data => setPaymentModal(data)} />
            ))}
          </div>
        )
      )}

      {/* ── TAB: Pedidos Pendentes ───────────────────────────────────────────── */}
      {tab === 'pedidos' && (
        loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full mr-3" />
            Carregando pedidos…
          </div>
        ) : pendingOrders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FiShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium text-gray-600">Nenhum pedido pendente encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingOrders.map(order => (
              <div key={order.id} className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow ${order.hasCarne ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200'}`}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <FiShoppingBag size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900">{order.buyerName || order.buyerEmail || 'Sem nome'}</span>
                      <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">#{order.id.slice(-8).toUpperCase()}</span>
                      {order.hasCarne && <span className="text-xs bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">📋 Já tem carnê</span>}
                      {!order.hasCarne && <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${order.paymentMethod === 'boleto' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {order.paymentMethod || 'Pagamento pendente'}
                      </span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-500">
                      <span className="text-base font-bold text-gray-800">{fmt(order.total)}</span>
                      <span className="flex items-center gap-1"><FiCalendar size={11} />{fmtDateTime(order.createdAt)}</span>
                      {order.buyerPhone && <span className="flex items-center gap-1"><FiPhone size={11} />{order.buyerPhone}</span>}
                      {order.buyerCpf && <span className="flex items-center gap-1"><FiCreditCard size={11} />{order.buyerCpf}</span>}
                    </div>
                    <div className="mt-1.5 text-xs text-gray-500">
                      {order.items.map(i => `${i.product?.name || 'Produto'} x${i.quantity}`).join(', ')}
                    </div>
                  </div>
                  {!order.hasCarne && (
                    <button onClick={() => setNewCarneOrder(order)}
                      className="flex-shrink-0 flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-sm">
                      <FiPlus size={14} /> Criar Carnê
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Modais ────────────────────────────────────────────────────────── */}
      {newCarneOrder && (
        <NovoCarneModal
          order={newCarneOrder}
          onClose={() => setNewCarneOrder(null)}
          onCreated={() => { loadCarnes(); loadPendingOrders() }}
        />
      )}
      {paymentModal && (
        <AdminPagamentoModal data={paymentModal} onClose={() => setPaymentModal(null)} />
      )}
    </div>
  )
}
