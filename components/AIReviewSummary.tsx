'use client'

import { useEffect, useState } from 'react'

interface ReviewStats {
  count: number
  average: number
  distribution: Record<number, number>
}

interface AISummary {
  headline: string
  pros: string[]
  cons: string[]
  buyAdvice: string
  sentimentPct: number
}

interface Props {
  productId: string
}

export default function AIReviewSummary({ productId }: Props) {
  const [summary, setSummary] = useState<AISummary | null>(null)
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!productId) return
    fetch(`/api/ai/review-summary?productId=${productId}`)
      .then(r => r.json())
      .then(data => {
        if (data.summary) {
          setSummary(data.summary)
          setStats(data.stats)
        } else {
          setError(data.reason || null)
        }
      })
      .catch(() => setError('Não foi possível carregar o resumo.'))
      .finally(() => setLoading(false))
  }, [productId])

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-5 animate-pulse">
        <div className="h-4 w-40 bg-violet-200 rounded mb-3" />
        <div className="h-3 w-full bg-violet-100 rounded mb-2" />
        <div className="h-3 w-3/4 bg-violet-100 rounded" />
      </div>
    )
  }

  if (error || !summary) return null

  const sentiment = summary.sentimentPct || 0
  const sentimentColor = sentiment >= 80 ? 'text-green-600' : sentiment >= 60 ? 'text-yellow-600' : 'text-red-600'
  const barColor = sentiment >= 80 ? 'bg-green-500' : sentiment >= 60 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-5 mb-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-600"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Resumo IA das avaliações</p>
            {stats && (
              <p className="text-xs text-gray-500">{stats.count} avaliações · média {stats.average.toFixed(1)}★</p>
            )}
          </div>
        </div>
        <div className={`text-2xl font-bold ${sentimentColor} flex-shrink-0`}>
          {sentiment}%
          <span className="text-xs font-normal text-gray-500 ml-1">satisfação</span>
        </div>
      </div>

      {/* Sentiment bar */}
      <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${sentiment}%` }} />
      </div>

      {/* Headline */}
      <p className="mt-4 text-sm font-medium text-gray-800 leading-relaxed">
        "{summary.headline}"
      </p>

      {/* Pros/Cons */}
      {expanded && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Pros */}
          {summary.pros?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                PONTOS POSITIVOS
              </p>
              <ul className="space-y-1.5">
                {summary.pros.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <span className="w-4 h-4 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Cons */}
          {summary.cons?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-orange-700 mb-2 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                PONTOS DE ATENÇÃO
              </p>
              <ul className="space-y-1.5">
                {summary.cons.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <span className="w-4 h-4 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">!</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Buy advice */}
      {expanded && summary.buyAdvice && (
        <div className="mt-4 bg-white/70 border border-violet-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-violet-700 mb-1">💡 Conselho de compra</p>
          <p className="text-xs text-gray-700 leading-relaxed">{summary.buyAdvice}</p>
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="mt-3 text-xs text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1.5 transition-colors"
      >
        {expanded ? 'Ver menos' : 'Ver análise completa'}
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${expanded ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>
  )
}
