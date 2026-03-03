'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FiShield, FiAlertTriangle, FiSearch,
  FiGlobe, FiClock, FiActivity, FiEye, FiUser, FiRefreshCw,
  FiCheckCircle, FiXCircle, FiList, FiMonitor,
  FiDownload, FiSlash, FiUnlock, FiDollarSign
} from 'react-icons/fi'

interface IpSummary {
  ip: string
  totalEvents: number
  pageViews: number
  sessions: number
  uniquePages: number
  firstSeen: string
  lastSeen: string
  durationMin: number
  pagesPerMin: number
  botScore: number
  knownBot: boolean
  userAgent: string
  suspicious: boolean
}

interface JourneyEntry {
  url: string
  timestamp: string
}

interface EventEntry {
  id: string
  event: string
  url: string
  page: string
  referrer: string
  userAgent: string
  visitorId: string
  sessionId: string
  timestamp: string
}

interface IpDetail {
  ip: string
  summary: {
    totalEvents: number
    pageViews: number
    sessions: number
    uniquePages: number
    firstSeen: string
    lastSeen: string
    durationMin: number
    pagesPerMin: number
    botScore: number
    userAgents: string[]
  }
  journey: JourneyEntry[]
  events: EventEntry[]
}

const isPaidTraffic = (url: string) =>
  /gad_source|gclid|utm_source|utm_campaign|fbclid/i.test(url)

const BOT_COLOR = (score: number) => {
  if (score >= 70) return 'text-red-600 bg-red-50 border-red-200'
  if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200'
  return 'text-green-600 bg-green-50 border-green-200'
}

const BOT_LABEL = (score: number, knownBot: boolean) => {
  if (knownBot) return 'Bot Identificado'
  if (score >= 70) return 'Alta Suspeita'
  if (score >= 40) return 'Suspeito'
  return 'Humano'
}

function ScoreBadge({ score, knownBot }: { score: number; knownBot: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${BOT_COLOR(score)}`}>
      {knownBot || score >= 70 ? <FiAlertTriangle className="w-3 h-3" /> : <FiCheckCircle className="w-3 h-3" />}
      {BOT_LABEL(score, knownBot)} {score > 0 && `(${score}%)`}
    </span>
  )
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-orange-400' : 'bg-green-500'
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
    </div>
  )
}

export default function IpInvestigacaoPage() {
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [suspicious, setSuspicious] = useState<IpSummary[]>([])
  const [clean, setClean] = useState<IpSummary[]>([])
  const [filter, setFilter] = useState('')
  const [tab, setTab] = useState<'suspicious' | 'all'>('suspicious')
  const [blocklist, setBlocklist] = useState<Set<string>>(new Set())
  const [blocking, setBlocking] = useState<string | null>(null)

  // Detalhe de IP
  const [selectedIp, setSelectedIp] = useState<string | null>(null)
  const [detail, setDetail] = useState<IpDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [journeyView, setJourneyView] = useState<'timeline' | 'list'>('timeline')

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const [listRes, blockRes] = await Promise.all([
        fetch(`/api/analytics/ip-investigation?days=${days}`),
        fetch('/api/analytics/ip-blocklist'),
      ])
      if (listRes.ok) {
        const data = await listRes.json()
        setSuspicious(data.suspicious || [])
        setClean(data.clean || [])
      }
      if (blockRes.ok) {
        const bd = await blockRes.json()
        setBlocklist(new Set(bd.blocklist || []))
      }
    } finally {
      setLoading(false)
    }
  }, [days])

  const toggleBlock = async (ip: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setBlocking(ip)
    const isBlocked = blocklist.has(ip)
    try {
      const res = await fetch('/api/analytics/ip-blocklist', {
        method: isBlocked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip }),
      })
      if (res.ok) {
        const d = await res.json()
        setBlocklist(new Set(d.blocklist))
      }
    } finally { setBlocking(null) }
  }

  const blockAllSuspicious = async () => {
    const toBlock = suspicious.filter(i => !blocklist.has(i.ip)).map(i => i.ip)
    if (!toBlock.length) return
    setBlocking('all')
    try {
      const res = await fetch('/api/analytics/ip-blocklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ips: toBlock }),
      })
      if (res.ok) { const d = await res.json(); setBlocklist(new Set(d.blocklist)) }
    } finally { setBlocking(null) }
  }

  const exportForGoogleAds = () => {
    const ips = suspicious.map(i => i.ip)
    const content = `# IPs Suspeitos — Exportar para Google Ads > Configurações > Exclusões de IP\n# Gerado: ${new Date().toLocaleString('pt-BR')} | Total: ${ips.length}\n\n${ips.join('\n')}`
    const blob = new Blob([content], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `ips-fraudulentos-${new Date().toISOString().slice(0,10)}.txt`
    a.click()
  }

  useEffect(() => { loadList() }, [loadList])

  const loadDetail = async (ip: string) => {
    setSelectedIp(ip)
    setDetail(null)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/analytics/ip-investigation?ip=${encodeURIComponent(ip)}&days=${days}`)
      if (res.ok) setDetail(await res.json())
    } finally {
      setDetailLoading(false)
    }
  }

  const displayed = (tab === 'suspicious' ? suspicious : [...suspicious, ...clean])
    .filter(i => !filter || i.ip.includes(filter) || i.userAgent.toLowerCase().includes(filter.toLowerCase()))

  const fmt = (iso: string) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="p-6 space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiShield className="text-red-500" /> Investigação de IPs Fraudulentos
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Detecta bots que clicam em anúncios pagos e geram conversões falsas no Google Ads / Analytics
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
          <button onClick={exportForGoogleAds}
            className="flex items-center gap-2 border border-blue-300 text-blue-700 bg-blue-50 px-4 py-2 rounded-lg text-sm hover:bg-blue-100">
            <FiDownload className="w-4 h-4" /> Exportar para Google Ads
          </button>
          <button onClick={blockAllSuspicious} disabled={blocking === 'all'}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
            <FiSlash className="w-4 h-4" />
            {blocking === 'all' ? 'Bloqueando...' : `Bloquear todos (${suspicious.filter(i => !blocklist.has(i.ip)).length})`}
          </button>
          <button onClick={loadList}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200">
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Banner alerta click fraud */}
      {suspicious.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <FiAlertTriangle className="text-red-500 text-xl shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">Click Fraud detectado — tráfego pago comprometido</p>
            <p className="text-sm text-red-700 mt-1">
              {suspicious.length} IPs com comportamento de bot.{' '}
              Use <strong>Exportar</strong> e adicione em <strong>Google Ads → Configurações → Exclusões de IP</strong> para parar de pagar por cliques falsos.
              Clique em <strong>Bloquear todos</strong> para barrar no servidor imediatamente.
            </p>
          </div>
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-500 uppercase font-semibold">IPs Suspeitos</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{suspicious.length}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-xs text-orange-500 uppercase font-semibold">Alta suspeita (≥70%)</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{suspicious.filter(i => i.botScore >= 70).length}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-xs text-purple-600 uppercase font-semibold">Já bloqueados</p>
          <p className="text-3xl font-bold text-purple-700 mt-1">{blocklist.size}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-600 uppercase font-semibold">IPs humanos</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{clean.length}</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Lista de IPs */}
        <div className="flex-1 min-w-0">
          {/* Tabs + Filtro */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex gap-2">
                <button
                  onClick={() => setTab('suspicious')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'suspicious' ? 'bg-red-100 text-red-700' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  🚨 Suspeitos ({suspicious.length})
                </button>
                <button
                  onClick={() => setTab('all')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  Todos ({suspicious.length + clean.length})
                </button>
              </div>
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5">
                <FiSearch className="text-gray-400 w-4 h-4" />
                <input
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  placeholder="Filtrar por IP ou User Agent..."
                  className="text-sm outline-none w-56"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <FiActivity className="animate-spin text-blue-500 text-3xl" />
              </div>
            ) : displayed.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FiShield className="mx-auto text-4xl mb-3 opacity-30" />
                <p>Nenhum IP encontrado no período</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {displayed.map(ip => {
                  const isBlocked = blocklist.has(ip.ip)
                  return (
                    <button key={ip.ip} onClick={() => loadDetail(ip.ip)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${selectedIp === ip.ip ? 'bg-blue-50 border-l-4 border-blue-500' : ''} ${isBlocked ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <FiGlobe className={`w-4 h-4 shrink-0 ${ip.suspicious ? 'text-red-400' : 'text-gray-400'}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-mono font-semibold text-sm text-gray-900">{ip.ip}</p>
                              {isBlocked && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                  <FiSlash className="w-3 h-3" /> Bloqueado
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 truncate max-w-xs">{ip.userAgent}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Pág/min</p>
                            <p className={`font-bold text-sm ${ip.pagesPerMin > 5 ? 'text-red-600' : 'text-gray-800'}`}>{ip.pagesPerMin}</p>
                          </div>
                          <div className="w-20">
                            <ScoreBar score={ip.botScore} />
                            <p className="text-xs text-center mt-0.5 font-semibold text-gray-500">{ip.botScore}%</p>
                          </div>
                          <ScoreBadge score={ip.botScore} knownBot={ip.knownBot} />
                          <button onClick={e => toggleBlock(ip.ip, e)} disabled={blocking === ip.ip}
                            title={isBlocked ? 'Desbloquear' : 'Bloquear IP'}
                            className={`p-2 rounded-lg transition-colors ${isBlocked ? 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-600' : 'bg-red-50 text-red-600 hover:bg-red-100'} disabled:opacity-50`}>
                            {blocking === ip.ip
                              ? <FiActivity className="animate-spin w-4 h-4" />
                              : isBlocked ? <FiUnlock className="w-4 h-4" /> : <FiSlash className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-400 pl-7">
                        <span><FiClock className="inline w-3 h-3 mr-1" />{fmt(ip.firstSeen)} → {fmt(ip.lastSeen)}</span>
                        <span><FiEye className="inline w-3 h-3 mr-1" />{ip.uniquePages} págs únicas</span>
                        <span><FiUser className="inline w-3 h-3 mr-1" />{ip.sessions} sessões</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Painel de detalhe */}
        {selectedIp && (
          <div className="w-[480px] shrink-0 bg-white border border-gray-200 rounded-xl overflow-y-auto max-h-[80vh] sticky top-6">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <p className="font-mono font-bold text-gray-900">{selectedIp}</p>
                  {detail && <ScoreBadge score={detail.summary.botScore} knownBot={false} />}
                </div>
                {blocklist.has(selectedIp) && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                    <FiSlash className="w-3 h-3" /> BLOQUEADO
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={e => toggleBlock(selectedIp, e)} disabled={blocking === selectedIp}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    blocklist.has(selectedIp)
                      ? 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  } disabled:opacity-50`}>
                  {blocking === selectedIp
                    ? <FiActivity className="animate-spin w-4 h-4" />
                    : blocklist.has(selectedIp)
                      ? <><FiUnlock className="w-4 h-4" /> Desbloquear</>
                      : <><FiSlash className="w-4 h-4" /> Bloquear IP</>}
                </button>
                <button onClick={() => setSelectedIp(null)} className="text-gray-400 hover:text-gray-600">
                  <FiXCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20">
                <FiActivity className="animate-spin text-blue-500 text-3xl" />
              </div>
            ) : detail ? (
              <div className="p-4 space-y-5">
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Eventos', val: detail.summary.totalEvents },
                    { label: 'Pág. Vistas', val: detail.summary.pageViews },
                    { label: 'Sessões', val: detail.summary.sessions },
                    { label: 'Págs Únicas', val: detail.summary.uniquePages },
                    { label: 'Duração', val: `${detail.summary.durationMin}min` },
                    { label: 'Pág/min', val: detail.summary.pagesPerMin },
                  ].map(c => (
                    <div key={c.label} className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-400">{c.label}</p>
                      <p className="font-bold text-gray-800 text-sm mt-0.5">{c.val}</p>
                    </div>
                  ))}
                </div>

                {/* Score de bot */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-700">Score de Bot</p>
                    <p className={`text-sm font-bold ${detail.summary.botScore >= 70 ? 'text-red-600' : detail.summary.botScore >= 40 ? 'text-orange-500' : 'text-green-600'}`}>
                      {detail.summary.botScore}%
                    </p>
                  </div>
                  <ScoreBar score={detail.summary.botScore} />
                  <p className="text-xs text-gray-400 mt-1">
                    Calculado pela taxa de páginas por minuto. ≥40% = suspeito, ≥70% = alto risco.
                  </p>
                </div>

                {/* Alerta tráfego pago */}
                {detail.journey.some(j => isPaidTraffic(j.url)) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
                      <FiDollarSign className="text-red-500" /> Cliques em Anúncios Pagos Detectados!
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      Este IP acessou via link de anúncio (<code>gad_source</code> / <code>gclid</code> / <code>utm_</code>).
                      Cada clique custou dinheiro. Bloqueie no Google Ads imediatamente.
                    </p>
                  </div>
                )}

                {/* User agents */}
                {detail.summary.userAgents.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                      <FiMonitor className="w-4 h-4" /> User Agents detectados
                    </p>
                    <div className="space-y-1">
                      {detail.summary.userAgents.map((ua, i) => (
                        <p key={i} className="text-xs bg-gray-50 rounded p-2 font-mono text-gray-600 break-all">{ua}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Jornada */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                      <FiList className="w-4 h-4" /> Jornada de navegação ({detail.journey.length})
                    </p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setJourneyView('timeline')}
                        className={`px-2 py-1 text-xs rounded ${journeyView === 'timeline' ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:bg-gray-100'}`}
                      >Timeline</button>
                      <button
                        onClick={() => setJourneyView('list')}
                        className={`px-2 py-1 text-xs rounded ${journeyView === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:bg-gray-100'}`}
                      >Lista</button>
                    </div>
                  </div>

                  {journeyView === 'timeline' ? (
                    <div className="relative pl-1 max-h-96 overflow-y-auto">
                      {detail.journey.slice(0, 200).map((j, i) => {
                        const paid = isPaidTraffic(j.url)
                        return (
                          <div key={i} className={`relative pl-5 pb-2 border-l-2 last:border-l-0 ${paid ? 'border-red-300' : 'border-blue-100'}`}>
                            <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-white ${paid ? 'bg-red-400' : 'bg-blue-400'}`} />
                            {paid && <span className="text-xs font-bold text-red-600 flex items-center gap-1 mb-0.5"><FiDollarSign className="w-3 h-3" /> ANÚNCIO PAGO</span>}
                            <p className={`text-xs font-mono break-all leading-tight ${paid ? 'text-red-700 font-semibold' : 'text-blue-700'}`}>{j.url}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{fmt(j.timestamp)}</p>
                          </div>
                        )
                      })}
                      {detail.journey.length > 200 && (
                        <p className="text-xs text-gray-400 text-center pt-2">+{detail.journey.length - 200} mais...</p>
                      )}
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto space-y-1">
                      {[...new Map(detail.journey.map(j => [j.url, j])).values()].map((j, i) => {
                        const count = detail.journey.filter(x => x.url === j.url).length
                        const paid = isPaidTraffic(j.url)
                        return (
                          <div key={i} className={`flex items-center justify-between rounded px-3 py-1.5 ${paid ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                            <div className="min-w-0 flex-1">
                              {paid && <span className="text-xs font-bold text-red-600 flex items-center gap-1"><FiDollarSign className="w-3 h-3" /> PAGO</span>}
                              <p className={`text-xs font-mono truncate ${paid ? 'text-red-700' : 'text-gray-700'}`}>{j.url}</p>
                            </div>
                            <span className="ml-2 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">{count}x</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Todos os eventos */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    <FiActivity className="w-4 h-4" /> Todos os eventos ({detail.events.length})
                  </p>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {detail.events.slice(-100).reverse().map((e, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs bg-gray-50 rounded px-3 py-2">
                        <span className={`shrink-0 px-1.5 py-0.5 rounded font-semibold text-white text-xs ${e.event === 'purchase' ? 'bg-green-500' : e.event === 'page_view' ? 'bg-blue-500' : e.event === 'add_to_cart' ? 'bg-yellow-500' : 'bg-gray-400'}`}>
                          {e.event}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-gray-600 truncate">{e.url || e.page || '—'}</p>
                          <p className="text-gray-400 mt-0.5">{fmt(e.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-20 text-gray-400">
                Sem dados para este IP
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
