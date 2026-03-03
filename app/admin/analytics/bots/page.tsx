'use client'

import { useState, useEffect } from 'react'
import { FiRefreshCw, FiExternalLink } from 'react-icons/fi'

interface BotSummary {
  type: string
  label: string
  icon: string
  benefit: string
  visits: number
  lastSeen: string
}

interface TopPage {
  path: string
  botName: string
  visits: number
}

interface ByDay {
  date: string
  botName: string
  visits: number
}

interface BotData {
  summary: BotSummary[]
  topPages: TopPage[]
  byDay: ByDay[]
  days: number
  total: number
}

const FEED_URLS = [
  { label: 'Google Shopping (XML)', url: '/api/feeds/google-shopping', icon: '🔍', desc: 'Cadastrar no Google Merchant Center' },
  { label: 'Google Shopping (TSV)', url: '/api/feeds/google-shopping-txt', icon: '📄', desc: 'Formato alternativo TSV' },
  { label: 'Facebook Catalog', url: '/api/feeds/facebook-catalog', icon: '📘', desc: 'Cadastrar no Meta Commerce Manager' },
  { label: 'Buscapé / Zoom (CSV)', url: '/api/feeds/buscape', icon: '💰', desc: 'Enviar para Buscapé, Zoom, Bondfaro' },
]

export default function BotMonitorPage() {
  const [data, setData] = useState<BotData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics/bot-monitor?days=${days}`)
      const json = await res.json()
      setData(json)
    } catch { /* erro silencioso */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [days])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🤖 Monitoramento de Bots</h1>
          <p className="text-gray-500 mt-1">Bots aliados que geram tráfego e receita gratuita</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value={1}>Hoje</option>
            <option value={7}>7 dias</option>
            <option value={30}>30 dias</option>
          </select>
          <button onClick={load} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            <FiRefreshCw size={14} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Total */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Total de crawls</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{data.total.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">últimos {days} dias</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Tipos de bots</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{data.summary.length}</p>
            <p className="text-xs text-gray-400 mt-1">bots aliados ativos</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Páginas indexadas</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{data.topPages.length}</p>
            <p className="text-xs text-gray-400 mt-1">páginas únicas crawleadas</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Média diária</p>
            <p className="text-3xl font-bold text-orange-500 mt-1">{Math.round(data.total / days)}</p>
            <p className="text-xs text-gray-400 mt-1">crawls por dia</p>
          </div>
        </div>
      )}

      {/* Feeds disponíveis */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">📡 Feeds de Produtos Ativos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FEED_URLS.map(feed => (
            <div key={feed.url} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{feed.icon}</span>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{feed.label}</p>
                  <p className="text-xs text-gray-500">{feed.desc}</p>
                </div>
              </div>
              <a
                href={`https://mydshop.com.br${feed.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium"
              >
                Abrir <FiExternalLink size={12} />
              </a>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Carregando dados...</div>
      ) : !data || data.total === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <p className="text-2xl mb-2">🤖</p>
          <p className="font-semibold text-yellow-800">Nenhum bot aliado registrado ainda</p>
          <p className="text-sm text-yellow-700 mt-1">Os bots serão registrados automaticamente conforme visitam o site. Aguarde alguns dias após o deploy.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bots por visitas */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">🏆 Bots Mais Ativos</h2>
            <div className="space-y-3">
              {data.summary.map(bot => (
                <div key={bot.type} className="flex items-center gap-3">
                  <span className="text-2xl w-8">{bot.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 text-sm truncate">{bot.label}</p>
                      <span className="text-sm font-bold text-gray-700 ml-2">{bot.visits.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-green-600">{bot.benefit}</p>
                      <p className="text-xs text-gray-400">{bot.lastSeen}</p>
                    </div>
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full">
                      <div
                        className="h-1.5 bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(100, (bot.visits / (data.summary[0]?.visits || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top páginas crawleadas */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">📄 Páginas Mais Crawleadas</h2>
            <div className="space-y-2">
              {data.topPages.slice(0, 15).map((page, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 w-5 text-right text-xs">{i + 1}</span>
                  <a
                    href={`https://mydshop.com.br${page.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-blue-600 hover:underline truncate"
                  >
                    {page.path}
                  </a>
                  <span className="text-xs text-gray-500 shrink-0">{page.botName}</span>
                  <span className="text-xs font-semibold text-gray-700 w-8 text-right">{page.visits}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
