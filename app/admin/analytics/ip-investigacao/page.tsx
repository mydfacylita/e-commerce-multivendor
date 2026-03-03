'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FiShield, FiAlertTriangle, FiSearch, FiChevronDown, FiChevronUp,
  FiGlobe, FiClock, FiActivity, FiEye, FiUser, FiRefreshCw,
  FiCheckCircle, FiXCircle, FiList, FiMonitor, FiFilter
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
  const [showClean, setShowClean] = useState(false)
  const [filter, setFilter] = useState('')
  const [tab, setTab] = useState<'suspicious' | 'all'>('suspicious')

  // Detalhe de IP
  const [selectedIp, setSelectedIp] = useState<string | null>(null)
  const [detail, setDetail] = useState<IpDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [journeyView, setJourneyView] = useState<'timeline' | 'list'>('timeline')

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics/ip-investigation?days=${days}`)
      if (res.ok) {
        const data = await res.json()
        setSuspicious(data.suspicious || [])
        setClean(data.clean || [])
      }
    } finally {
      setLoading(false)
    }
  }, [days])

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiShield className="text-red-500" /> Investigação de IPs
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Rastreamento completo de jornadas por IP — detecta bots e tráfego falso que contamina o Google Analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
          <button
            onClick={loadList}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-500 uppercase font-semibold">IPs Suspeitos</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{suspicious.length}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-xs text-orange-500 uppercase font-semibold">Bots identificados</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{suspicious.filter(i => i.knownBot).length}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-xs text-yellow-600 uppercase font-semibold">Alta suspeita (≥70%)</p>
          <p className="text-3xl font-bold text-yellow-700 mt-1">{suspicious.filter(i => i.botScore >= 70).length}</p>
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
                {displayed.map(ip => (
                  <button
                    key={ip.ip}
                    onClick={() => loadDetail(ip.ip)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${selectedIp === ip.ip ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <FiGlobe className={`w-4 h-4 shrink-0 ${ip.suspicious ? 'text-red-400' : 'text-gray-400'}`} />
                        <div className="min-w-0">
                          <p className="font-mono font-semibold text-sm text-gray-900">{ip.ip}</p>
                          <p className="text-xs text-gray-400 truncate max-w-xs">{ip.userAgent}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 shrink-0 text-right">
                        <div>
                          <p className="text-xs text-gray-400">Pág. vistas</p>
                          <p className="font-bold text-sm text-gray-800">{ip.pageViews.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Pág/min</p>
                          <p className={`font-bold text-sm ${ip.pagesPerMin > 5 ? 'text-red-600' : 'text-gray-800'}`}>{ip.pagesPerMin}</p>
                        </div>
                        <div className="w-24">
                          <p className="text-xs text-gray-400 mb-1">Score bot</p>
                          <ScoreBar score={ip.botScore} />
                          <p className="text-xs text-center mt-0.5 font-semibold text-gray-600">{ip.botScore}%</p>
                        </div>
                        <ScoreBadge score={ip.botScore} knownBot={ip.knownBot} />
                        <FiChevronDown className="text-gray-300 w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-400 pl-7">
                      <span><FiClock className="inline w-3 h-3 mr-1" />{fmt(ip.firstSeen)} → {fmt(ip.lastSeen)}</span>
                      <span><FiEye className="inline w-3 h-3 mr-1" />{ip.uniquePages} páginas únicas</span>
                      <span><FiUser className="inline w-3 h-3 mr-1" />{ip.sessions} sessões</span>
                      <span><FiClock className="inline w-3 h-3 mr-1" />{ip.durationMin}min</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Painel de detalhe */}
        {selectedIp && (
          <div className="w-[480px] shrink-0 bg-white border border-gray-200 rounded-xl overflow-y-auto max-h-[80vh] sticky top-6">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-mono font-bold text-gray-900">{selectedIp}</p>
                {detail && (
                  <ScoreBadge score={detail.summary.botScore} knownBot={false} />
                )}
              </div>
              <button onClick={() => setSelectedIp(null)} className="text-gray-400 hover:text-gray-600">
                <FiXCircle className="w-5 h-5" />
              </button>
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
                    <div className="relative pl-4 space-y-0 max-h-96 overflow-y-auto">
                      {detail.journey.slice(0, 200).map((j, i) => (
                        <div key={i} className="relative pl-4 pb-2 border-l-2 border-blue-100 last:border-l-0">
                          <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-blue-400 border-2 border-white" />
                          <p className="text-xs font-mono text-blue-700 break-all leading-tight">{j.url}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{fmt(j.timestamp)}</p>
                        </div>
                      ))}
                      {detail.journey.length > 200 && (
                        <p className="text-xs text-gray-400 text-center pt-2">
                          +{detail.journey.length - 200} páginas adicionais...
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto space-y-1">
                      {[...new Map(detail.journey.map(j => [j.url, j])).values()].map((j, i) => {
                        const count = detail.journey.filter(x => x.url === j.url).length
                        return (
                          <div key={i} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5">
                            <p className="text-xs font-mono text-gray-700 truncate flex-1">{j.url}</p>
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
