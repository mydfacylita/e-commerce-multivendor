'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'

function ConnectContent() {
  const params = useSearchParams()
  const shop   = params.get('shop') || ''
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)

  const handleSyncOrders = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/shopify/sync/orders', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ shop }),
      })
      setSyncResult(await res.json())
    } finally {
      setSyncing(false)
    }
  }

  const handleSyncProducts = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/shopify/sync/products', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ shop }),
      })
      setSyncResult(await res.json())
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8">
        {/* Logo + título */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            {/* Shopify logo mark */}
            <div className="w-12 h-12 bg-[#96bf48] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-2xl text-gray-400">+</span>
            {/* Mydshop mark */}
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">M</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">App instalado com sucesso!</h1>
          <p className="text-gray-500 mt-2 text-sm">
            {shop && <span className="font-medium text-gray-700">{shop}</span>}
            {shop && ' está conectada ao Mydshop'}
          </p>
        </div>

        {/* Checklist */}
        <div className="space-y-3 mb-8">
          {[
            { icon: '✅', text: 'Autorização OAuth concluída' },
            { icon: '✅', text: 'Loja conectada ao Mydshop' },
            { icon: '🔄', text: 'Sincronização de pedidos disponível' },
            { icon: '🔄', text: 'Sincronização de produtos disponível' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-lg">{item.icon}</span>
              <span className="text-gray-700 text-sm">{item.text}</span>
            </div>
          ))}
        </div>

        {/* Ações */}
        <div className="space-y-3 mb-6">
          <button
            onClick={handleSyncOrders}
            disabled={syncing}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
          >
            {syncing ? 'Sincronizando...' : '📦 Importar pedidos da Shopify'}
          </button>
          <button
            onClick={handleSyncProducts}
            disabled={syncing}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
          >
            {syncing ? 'Sincronizando...' : '🛍 Enviar produtos para Shopify'}
          </button>
        </div>

        {/* Resultado sync */}
        {syncResult && (
          <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-800 mb-4 font-mono">
            <pre>{JSON.stringify(syncResult, null, 2)}</pre>
          </div>
        )}

        {/* Rodapé */}
        <div className="text-center space-y-2">
          <Link
            href="/admin/integracao/shopify"
            className="block text-sm text-blue-600 hover:underline font-medium"
          >
            Gerenciar integração Shopify →
          </Link>
          <Link href="/admin" className="block text-sm text-gray-500 hover:underline">
            Ir para o painel admin
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ShopifyConnectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <ConnectContent />
    </Suspense>
  )
}
