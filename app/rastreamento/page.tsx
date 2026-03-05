'use client'

import { useState } from 'react'
import { FiSearch, FiPackage, FiExternalLink } from 'react-icons/fi'

export default function RastreamentoPage() {
  const [codigo, setCodigo] = useState('')

  const handleRastrear = () => {
    if (!codigo.trim()) return
    const codigo_limpo = codigo.trim().toUpperCase()
    window.open(`https://rastreamento.correios.com.br/app/index.php?objeto=${codigo_limpo}`, '_blank')
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 rounded-full mb-4">
          <FiPackage size={32} className="text-primary-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Rastreamento de Pedido</h1>
        <p className="text-gray-500">
          Insira o código de rastreamento enviado por e-mail após a postagem do seu pedido.
        </p>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Código de rastreamento (Correios)
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRastrear()}
            placeholder="Ex: AA123456789BR"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase"
            maxLength={13}
          />
          <button
            onClick={handleRastrear}
            disabled={!codigo.trim()}
            className="flex items-center gap-2 bg-primary-600 text-white px-5 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FiSearch size={16} />
            Rastrear
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          O rastreamento será aberto no site oficial dos Correios.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        <h2 className="font-semibold text-gray-800">Links úteis</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="https://rastreamento.correios.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FiExternalLink className="text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-800">Site dos Correios</p>
              <p className="text-xs text-gray-500">Rastreamento oficial</p>
            </div>
          </a>
          <a
            href="https://www.linketrack.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FiExternalLink className="text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-800">Linketrack</p>
              <p className="text-xs text-gray-500">Rastreamento alternativo</p>
            </div>
          </a>
        </div>
      </div>

      <p className="text-center text-sm text-gray-400 mt-10">
        O código de rastreamento é enviado por e-mail em até 2 dias úteis após o pagamento confirmado.
      </p>
    </main>
  )
}
