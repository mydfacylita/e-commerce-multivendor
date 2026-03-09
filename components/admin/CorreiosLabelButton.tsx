'use client'

import { useState } from 'react'
import { FiPrinter, FiDownload, FiLoader, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'

interface CorreiosLabelButtonProps {
  orderId: string
  initialTrackingCode?: string | null
  initialPrePostagemId?: string | null
}

export default function CorreiosLabelButton({
  orderId,
  initialTrackingCode,
  initialPrePostagemId,
}: CorreiosLabelButtonProps) {
  const [loading, setLoading] = useState(false)
  const [trackingCode, setTrackingCode] = useState(initialTrackingCode || null)
  const [prePostagemId, setPrePostagemId] = useState(initialPrePostagemId || null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/expedicao/${orderId}/gerar-etiqueta-correios`, {
        method: 'POST',
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setTrackingCode(data.codigoRastreio)
        setPrePostagemId(data.idPrePostagem || prePostagemId)
        setSuccess(true)
      } else {
        setError(data.error || 'Erro ao gerar etiqueta')
      }
    } catch {
      setError('Falha na comunicação com os Correios')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPdf = () => {
    window.open(`/api/admin/expedicao/${orderId}/etiqueta-pdf`, '_blank')
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
      <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
        <FiPrinter size={14} />
        Etiqueta de Postagem — Correios
      </p>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <FiAlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {(success || (trackingCode && prePostagemId)) && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <FiCheckCircle size={14} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Pré-postagem gerada!</p>
            {trackingCode && (
              <p className="font-mono mt-0.5">{trackingCode}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {!trackingCode ? (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? (
              <>
                <FiLoader size={14} className="animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FiPrinter size={14} />
                Gerar Etiqueta Correios
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-60 text-gray-700 text-xs px-3 py-1.5 rounded-lg transition-colors"
          >
            {loading ? <FiLoader size={12} className="animate-spin" /> : <FiPrinter size={12} />}
            Regerar
          </button>
        )}

        {(prePostagemId || (trackingCode && prePostagemId !== null)) && (
          <button
            onClick={handleDownloadPdf}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <FiDownload size={14} />
            Baixar Etiqueta PDF
          </button>
        )}
      </div>

      {trackingCode && !prePostagemId && (
        <p className="text-xs text-gray-400">
          Pedido com rastreio manual. Clique em &quot;Regerar&quot; para criar via Correios.
        </p>
      )}
    </div>
  )
}
