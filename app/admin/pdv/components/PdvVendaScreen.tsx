'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { FiSearch, FiPlus, FiMinus, FiTrash2, FiShoppingCart, FiDollarSign, FiCreditCard, FiSmartphone, FiX, FiCheck, FiPrinter, FiUser, FiClock, FiPackage } from 'react-icons/fi'

interface Produto {
  id: string
  name: string
  price: number
  stock: number
  gtin?: string
  images?: string
}

interface ItemCarrinho {
  productId?: string
  codigo?: string
  nome: string
  quantidade: number
  precoUnit: number
  desconto: number
}

interface Sessao {
  id: string
  operadorNome: string
  valorAbertura: number
  totalVendas: number
  qtdVendas: number
  abertoEm: string
}

interface VendaFinalizada {
  id: string
  numero: number
  total: number
  formaPagamento: string
  troco: number
  clienteNome?: string
  createdAt: string
}

const FORMAS_PAGAMENTO = [
  { id: 'DINHEIRO', label: 'Dinheiro', icon: FiDollarSign, cor: 'bg-green-500' },
  { id: 'CARTAO_CREDITO', label: 'Crédito', icon: FiCreditCard, cor: 'bg-blue-500' },
  { id: 'CARTAO_DEBITO', label: 'Débito', icon: FiCreditCard, cor: 'bg-indigo-500' },
  { id: 'PIX', label: 'PIX', icon: FiSmartphone, cor: 'bg-teal-500' },
]

export default function PdvVendaPage({ caixaId, sessao, onFecharCaixa }: {
  caixaId: string
  sessao: Sessao
  onFecharCaixa: () => void
}) {
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<Produto[]>([])
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [desconto, setDesconto] = useState(0)
  const [acrescimo, setAcrescimo] = useState(0)
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO')
  const [valorPago, setValorPago] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [clienteCpf, setClienteCpf] = useState('')
  const [processando, setProcessando] = useState(false)
  const [vendaFinalizada, setVendaFinalizada] = useState<VendaFinalizada | null>(null)
  const [ultimasVendas, setUltimasVendas] = useState<VendaFinalizada[]>([])
  const inputBuscaRef = useRef<HTMLInputElement>(null)
  const inputValorRef = useRef<HTMLInputElement>(null)

  const subtotal = carrinho.reduce((s, i) => s + (i.quantidade * i.precoUnit) - i.desconto, 0)
  const total = subtotal - desconto + acrescimo
  const troco = formaPagamento === 'DINHEIRO' && valorPago ? Math.max(0, parseFloat(valorPago) - total) : 0

  // Busca produtos
  useEffect(() => {
    if (busca.length < 2) { setResultados([]); return }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/admin/pdv/produtos?q=${encodeURIComponent(busca)}`)
      if (r.ok) setResultados(await r.json())
    }, 300)
    return () => clearTimeout(t)
  }, [busca])

  // Carrega últimas vendas da sessão
  const carregarVendas = useCallback(async () => {
    const r = await fetch(`/api/admin/pdv/vendas?sessaoId=${sessao.id}`)
    if (r.ok) setUltimasVendas((await r.json()).slice(0, 8))
  }, [sessao.id])

  useEffect(() => { carregarVendas() }, [carregarVendas])

  function adicionarProduto(p: Produto) {
    setCarrinho(prev => {
      const idx = prev.findIndex(i => i.productId === p.id)
      if (idx >= 0) {
        const novo = [...prev]
        novo[idx] = { ...novo[idx], quantidade: novo[idx].quantidade + 1 }
        return novo
      }
      return [...prev, { productId: p.id, nome: p.name, quantidade: 1, precoUnit: p.price, desconto: 0 }]
    })
    setBusca('')
    setResultados([])
    inputBuscaRef.current?.focus()
  }

  function alterarQtd(idx: number, delta: number) {
    setCarrinho(prev => {
      const novo = [...prev]
      const q = novo[idx].quantidade + delta
      if (q <= 0) return prev.filter((_, i) => i !== idx)
      novo[idx] = { ...novo[idx], quantidade: q }
      return novo
    })
  }

  function removerItem(idx: number) {
    setCarrinho(prev => prev.filter((_, i) => i !== idx))
  }

  function limparCarrinho() {
    setCarrinho([])
    setDesconto(0)
    setAcrescimo(0)
    setClienteNome('')
    setClienteCpf('')
    setValorPago('')
    setVendaFinalizada(null)
    inputBuscaRef.current?.focus()
  }

  async function finalizarVenda() {
    if (!carrinho.length) return
    setProcessando(true)
    try {
      const r = await fetch('/api/admin/pdv/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caixaId,
          sessaoId: sessao.id,
          clienteNome: clienteNome || undefined,
          clienteCpf: clienteCpf || undefined,
          itens: carrinho,
          desconto,
          acrescimo,
          formaPagamento,
          troco,
          total
        })
      })
      if (r.ok) {
        const venda = await r.json()
        setVendaFinalizada(venda)
        await carregarVendas()
      } else {
        alert('Erro ao finalizar venda')
      }
    } finally {
      setProcessando(false)
    }
  }

  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtFP = (fp: string) => ({ DINHEIRO: 'Dinheiro', CARTAO_CREDITO: 'Crédito', CARTAO_DEBITO: 'Débito', PIX: 'PIX', MISTO: 'Misto' }[fp] || fp)

  // Tela de venda finalizada
  if (vendaFinalizada) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-2xl p-10 text-center max-w-md w-full shadow-lg">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCheck size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">Venda Concluída!</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Venda #{vendaFinalizada.numero}</p>
          <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{fmtBRL(vendaFinalizada.total)}</div>
          <div className="text-gray-600 dark:text-gray-300 text-sm mb-1">{fmtFP(vendaFinalizada.formaPagamento)}</div>
          {vendaFinalizada.troco > 0 && (
            <div className="text-green-600 dark:text-green-400 font-semibold">Troco: {fmtBRL(vendaFinalizada.troco)}</div>
          )}
          {vendaFinalizada.clienteNome && (
            <div className="text-gray-500 dark:text-gray-400 text-sm mt-2">Cliente: {vendaFinalizada.clienteNome}</div>
          )}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => window.print()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <FiPrinter size={16} /> Imprimir
            </button>
            <button
              onClick={limparCarrinho}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-semibold"
            >
              <FiPlus size={16} /> Nova Venda
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-4 h-full">
      {/* LADO ESQUERDO — Busca + Últimas vendas */}
      <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-hidden">
        {/* Busca */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              ref={inputBuscaRef}
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar produto por nome, código ou GTIN..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-900 dark:text-white focus:outline-none focus:border-primary-400"
              autoFocus
            />
          </div>
          {resultados.length > 0 && (
            <div className="mt-2 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
              {resultados.map(p => {
                const img = (() => { try { const imgs = JSON.parse(p.images || '[]'); return imgs[0] } catch { return null } })()
                return (
                  <button
                    key={p.id}
                    onClick={() => adicionarProduto(p)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary-50 dark:hover:bg-gray-700 text-left border-b border-gray-100 dark:border-gray-700 last:border-0 transition"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
                      {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <FiPackage className="m-auto mt-2 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.gtin && `GTIN: ${p.gtin} · `}Estoque: {p.stock}</div>
                    </div>
                    <div className="font-bold text-primary-600 dark:text-primary-400">{fmtBRL(p.price)}</div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Últimas vendas da sessão */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <FiClock size={16} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Últimas vendas da sessão</h3>
            <span className="ml-auto text-xs text-gray-400">{sessao.qtdVendas} venda(s) · {fmtBRL(sessao.totalVendas)}</span>
          </div>
          {ultimasVendas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma venda nessa sessão ainda</p>
          ) : (
            <div className="space-y-2 overflow-y-auto flex-1">
              {ultimasVendas.map(v => (
                <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <span className="text-xs font-mono text-gray-400">#{v.numero}</span>
                    {v.clienteNome && <span className="ml-2 text-xs text-gray-500">{v.clienteNome}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{fmtFP(v.formaPagamento)}</span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fmtBRL(v.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* LADO DIREITO — Carrinho + Pagamento */}
      <div className="w-96 flex flex-col gap-2 flex-shrink-0 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 155px)' }}>
        {/* Info do operador */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-2">
          <FiUser size={14} className="text-gray-400" />
          <span className="text-xs text-gray-500">{sessao.operadorNome}</span>
          <button
            onClick={onFecharCaixa}
            className="ml-auto text-xs text-red-500 hover:text-red-600 transition"
          >
            Fechar caixa
          </button>
        </div>

        {/* Carrinho */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <FiShoppingCart size={16} className="text-primary-600" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Carrinho</h3>
            {carrinho.length > 0 && (
              <button onClick={() => setCarrinho([])} className="ml-auto text-xs text-red-400 hover:text-red-500">
                Limpar
              </button>
            )}
          </div>

          <div className="overflow-y-auto px-4 py-1 space-y-1" style={{ maxHeight: '20vh' }}>
            {carrinho.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Adicione produtos buscando acima</p>
            ) : (
              carrinho.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{item.nome}</div>
                    <div className="text-xs text-gray-400">{fmtBRL(item.precoUnit)} × {item.quantidade}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => alterarQtd(idx, -1)} className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600">
                      <FiMinus size={10} />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-gray-800 dark:text-gray-200">{item.quantidade}</span>
                    <button onClick={() => alterarQtd(idx, 1)} className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600">
                      <FiPlus size={10} />
                    </button>
                  </div>
                  <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 w-16 text-right">
                    {fmtBRL((item.quantidade * item.precoUnit) - item.desconto)}
                  </div>
                  <button onClick={() => removerItem(idx)} className="text-red-400 hover:text-red-500">
                    <FiTrash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Desconto / Acréscimo */}
          <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-400">Desconto R$</label>
              <input type="number" min="0" value={desconto || ''} onChange={e => setDesconto(parseFloat(e.target.value) || 0)} className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-xs dark:bg-gray-900 dark:text-white" placeholder="0,00" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400">Acréscimo R$</label>
              <input type="number" min="0" value={acrescimo || ''} onChange={e => setAcrescimo(parseFloat(e.target.value) || 0)} className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-xs dark:bg-gray-900 dark:text-white" placeholder="0,00" />
            </div>
          </div>

          {/* Cliente (opcional) */}
          <div className="px-3 py-1 border-t border-gray-100 dark:border-gray-700">
            <input type="text" value={clienteNome} onChange={e => setClienteNome(e.target.value)} className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-xs dark:bg-gray-900 dark:text-white" placeholder="Cliente (opcional)" />
          </div>

          {/* Total */}
          <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Subtotal</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">{fmtBRL(subtotal)}</span>
            </div>
            {desconto > 0 && (
              <div className="flex justify-between items-center text-green-600">
                <span className="text-sm">Desconto</span>
                <span className="text-sm">-{fmtBRL(desconto)}</span>
              </div>
            )}
            {acrescimo > 0 && (
              <div className="flex justify-between items-center text-red-500">
                <span className="text-sm">Acréscimo</span>
                <span className="text-sm">+{fmtBRL(acrescimo)}</span>
              </div>
            )}
            <div className="flex justify-between items-center mt-1">
              <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
              <span className="text-2xl font-bold text-primary-600">{fmtBRL(total)}</span>
            </div>
          </div>
        </div>

        {/* Forma de pagamento */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 flex-shrink-0">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">FORMA DE PAGAMENTO</h4>
          <div className="grid grid-cols-4 gap-1 mb-2">
            {FORMAS_PAGAMENTO.map(fp => (
              <button
                key={fp.id}
                onClick={() => setFormaPagamento(fp.id)}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg text-xs font-medium transition border-2 ${
                  formaPagamento === fp.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'border-transparent bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <fp.icon size={18} />
                {fp.label}
              </button>
            ))}
          </div>

          {formaPagamento === 'DINHEIRO' && (
            <div className="mb-2">
              <input ref={inputValorRef} type="number" min={total} value={valorPago} onChange={e => setValorPago(e.target.value)} className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm dark:bg-gray-900 dark:text-white" placeholder={`Valor recebido (${total.toFixed(2)})`} />
              {troco > 0 && (
                <div className="mt-1 p-1.5 bg-green-50 dark:bg-green-900/30 rounded-lg text-center">
                  <span className="text-xs text-green-600 dark:text-green-400">Troco: </span>
                  <span className="text-sm font-bold text-green-700 dark:text-green-300">{fmtBRL(troco)}</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={finalizarVenda}
            disabled={!carrinho.length || processando}
            className="w-full mt-2 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-base rounded-xl transition flex items-center justify-center gap-2"
          >
            {processando ? 'Processando...' : (
              <>
                <FiCheck size={20} />
                Finalizar Venda
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
