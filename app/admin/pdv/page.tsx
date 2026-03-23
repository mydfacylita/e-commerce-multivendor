'use client'

import { useState, useEffect } from 'react'
import { FiMonitor, FiPlus, FiUnlock, FiLock, FiAlertCircle } from 'react-icons/fi'
import PdvVendaScreen from './components/PdvVendaScreen'

interface Caixa {
  id: string
  numero: number
  nome: string
  isActive: boolean
  sessoes: Array<{
    id: string
    operadorNome: string
    valorAbertura: number
    totalVendas: number
    qtdVendas: number
    abertoEm: string
  }>
}

interface Sessao {
  id: string
  operadorNome: string
  valorAbertura: number
  totalVendas: number
  qtdVendas: number
  abertoEm: string
}

export default function PdvPage() {
  const [caixas, setCaixas] = useState<Caixa[]>([])
  const [loading, setLoading] = useState(true)
  const [caixaSelecionado, setCaixaSelecionado] = useState<Caixa | null>(null)
  const [sessaoAtiva, setSessaoAtiva] = useState<Sessao | null>(null)
  const [modalAbrirCaixa, setModalAbrirCaixa] = useState(false)
  const [modalFecharCaixa, setModalFecharCaixa] = useState(false)
  const [modalNovoCaixa, setModalNovoCaixa] = useState(false)
  const [valorAbertura, setValorAbertura] = useState('')
  const [valorFechamento, setValorFechamento] = useState('')
  const [nomeCaixa, setNomeCaixa] = useState('')
  const [numeroCaixa, setNumeroCaixa] = useState('')
  const [processando, setProcessando] = useState(false)

  async function carregarCaixas() {
    const r = await fetch('/api/admin/pdv/caixas')
    if (r.ok) setCaixas(await r.json())
    setLoading(false)
  }

  useEffect(() => { carregarCaixas() }, [])

  async function abrirCaixa() {
    if (!caixaSelecionado) return
    setProcessando(true)
    try {
      const r = await fetch(`/api/admin/pdv/caixas/${caixaSelecionado.id}/sessao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valorAbertura: parseFloat(valorAbertura) || 0 })
      })
      if (r.ok) {
        const sessao = await r.json()
        setSessaoAtiva(sessao)
        setModalAbrirCaixa(false)
        setValorAbertura('')
      } else {
        const err = await r.json()
        alert(err.error || 'Erro ao abrir caixa')
      }
    } finally {
      setProcessando(false)
    }
  }

  async function fecharCaixa() {
    if (!caixaSelecionado) return
    setProcessando(true)
    try {
      const r = await fetch(`/api/admin/pdv/caixas/${caixaSelecionado.id}/sessao`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valorFechamento: parseFloat(valorFechamento) || 0 })
      })
      if (r.ok) {
        setSessaoAtiva(null)
        setCaixaSelecionado(null)
        setModalFecharCaixa(false)
        setValorFechamento('')
        await carregarCaixas()
      }
    } finally {
      setProcessando(false)
    }
  }

  async function criarCaixa() {
    if (!nomeCaixa || !numeroCaixa) return
    setProcessando(true)
    try {
      const r = await fetch('/api/admin/pdv/caixas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeCaixa, numero: parseInt(numeroCaixa) })
      })
      if (r.ok) {
        await carregarCaixas()
        setModalNovoCaixa(false)
        setNomeCaixa('')
        setNumeroCaixa('')
      }
    } finally {
      setProcessando(false)
    }
  }

  function selecionarCaixa(caixa: Caixa) {
    setCaixaSelecionado(caixa)
    const sessaoAberta = caixa.sessoes?.[0]
    if (sessaoAberta) {
      setSessaoAtiva(sessaoAberta)
    } else {
      setSessaoAtiva(null)
      setModalAbrirCaixa(true)
    }
  }

  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // Tela de venda ativa
  if (caixaSelecionado && sessaoAtiva) {
    return (
      <div className="-m-8 h-screen flex flex-col" style={{ maxHeight: 'calc(100vh - 101px)' }}>
        {/* Barra de status do caixa */}
        <div className="flex items-center gap-3 px-6 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
          <span className="font-bold text-gray-800 dark:text-white text-sm">{caixaSelecionado.nome}</span>
          <span className="text-gray-400 text-sm">|</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{sessaoAtiva.qtdVendas} vendas · {fmtBRL(sessaoAtiva.totalVendas)}</span>
        </div>
        <div className="flex-1 overflow-hidden p-4">
        <PdvVendaScreen
          caixaId={caixaSelecionado.id}
          sessao={sessaoAtiva}
          onFecharCaixa={() => setModalFecharCaixa(true)}
        />
        </div>

        {/* Modal fechar caixa */}
        {modalFecharCaixa && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Fechar Caixa</h3>
              <p className="text-sm text-gray-500 mb-4">
                Total em vendas: <strong>{fmtBRL(sessaoAtiva.totalVendas)}</strong> ({sessaoAtiva.qtdVendas} vendas)
              </p>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Valor em dinheiro no caixa</label>
              <input
                type="number"
                value={valorFechamento}
                onChange={e => setValorFechamento(e.target.value)}
                placeholder="0,00"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm mt-1 mb-4 dark:bg-gray-900 dark:text-white"
              />
              <div className="flex gap-3">
                <button onClick={() => setModalFecharCaixa(false)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300">
                  Cancelar
                </button>
                <button
                  onClick={fecharCaixa}
                  disabled={processando}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {processando ? 'Fechando...' : 'Confirmar Fechamento'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Tela de seleção de caixa
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PDV — Ponto de Venda</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selecione um caixa para iniciar as vendas</p>
        </div>
        <button
          onClick={() => setModalNovoCaixa(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition"
        >
          <FiPlus size={16} /> Novo Caixa
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>
      ) : caixas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FiMonitor size={48} className="text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300">Nenhum caixa cadastrado</h3>
          <p className="text-sm text-gray-400 mt-1 mb-4">Crie o primeiro caixa para começar a vender</p>
          <button
            onClick={() => setModalNovoCaixa(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition"
          >
            <FiPlus size={16} /> Criar Caixa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {caixas.map(caixa => {
            const sessaoAberta = caixa.sessoes?.[0]
            return (
              <button
                key={caixa.id}
                onClick={() => selecionarCaixa(caixa)}
                disabled={!caixa.isActive}
                className={`text-left bg-white dark:bg-gray-800 rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition-all ${
                  sessaoAberta
                    ? 'border-green-300 dark:border-green-600 hover:border-green-400'
                    : 'border-gray-200 dark:border-gray-600 hover:border-primary-300'
                } ${!caixa.isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <FiMonitor size={24} className={sessaoAberta ? 'text-green-500' : 'text-gray-400'} />
                  </div>
                  <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                    sessaoAberta
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {sessaoAberta ? <><FiUnlock size={11} /> Aberto</> : <><FiLock size={11} /> Fechado</>}
                  </span>
                </div>
                <div className="font-bold text-gray-900 dark:text-white text-lg">{caixa.nome}</div>
                <div className="text-xs text-gray-400 mb-3">Caixa #{caixa.numero}</div>
                {sessaoAberta ? (
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Operador: <span className="font-medium text-gray-700 dark:text-gray-300">{sessaoAberta.operadorNome}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Vendas: <span className="font-medium text-green-600">{fmtBRL(sessaoAberta.totalVendas)}</span> ({sessaoAberta.qtdVendas})
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">Clique para abrir e iniciar vendas</div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Modal abrir caixa */}
      {modalAbrirCaixa && caixaSelecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Abrir {caixaSelecionado.nome}</h3>
            <p className="text-sm text-gray-500 mb-4">Informe o valor em dinheiro inicial no caixa</p>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fundo de caixa (R$)</label>
            <input
              type="number"
              value={valorAbertura}
              onChange={e => setValorAbertura(e.target.value)}
              placeholder="0,00"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm mt-1 mb-4 dark:bg-gray-900 dark:text-white"
              autoFocus
            />
            <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 mb-4">
              <FiAlertCircle size={15} className="text-yellow-600 flex-shrink-0" />
              <p className="text-xs text-yellow-700 dark:text-yellow-400">Uma sessão de caixa será aberta com seu usuário e não poderá ser reaberta após o fechamento.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setModalAbrirCaixa(false); setCaixaSelecionado(null) }}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={abrirCaixa}
                disabled={processando}
                className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {processando ? 'Abrindo...' : 'Abrir Caixa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal novo caixa */}
      {modalNovoCaixa && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Novo Caixa</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Número do caixa</label>
                <input
                  type="number"
                  value={numeroCaixa}
                  onChange={e => setNumeroCaixa(e.target.value)}
                  placeholder="Ex: 1"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm mt-1 dark:bg-gray-900 dark:text-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
                <input
                  type="text"
                  value={nomeCaixa}
                  onChange={e => setNomeCaixa(e.target.value)}
                  placeholder="Ex: Caixa 1 - Balcão"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm mt-1 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModalNovoCaixa(false)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300">
                Cancelar
              </button>
              <button
                onClick={criarCaixa}
                disabled={processando || !nomeCaixa || !numeroCaixa}
                className="flex-1 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {processando ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
