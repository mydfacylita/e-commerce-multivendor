'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FiArrowLeft, FiExternalLink, FiCheck, FiAlertCircle, FiLoader, FiTrash2, FiPackage, FiShoppingCart, FiDownload, FiUpload } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface ShopifyStatus {
  connected: boolean
  installation?: {
    shopDomain: string
    shopName: string | null
    shopPlan: string | null
    shopEmail: string | null
    isActive: boolean
    installedAt: string
    lastSyncAt: string | null
    syncOrdersEnabled: boolean
    syncProductsEnabled: boolean
    orderSyncsCount: number
    productSyncsCount: number
  }
}

export default function VendedorShopifyPage() {
  const [status, setStatus] = useState<ShopifyStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [shopInput, setShopInput] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState<'orders' | 'products' | 'import-products' | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/seller/shopify/status')
      const data = await res.json()
      setStatus(data)
    } catch {
      toast.error('Erro ao carregar status da integração')
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = () => {
    let shop = shopInput.trim().toLowerCase()
    if (!shop) {
      toast.error('Informe o domínio da sua loja Shopify')
      return
    }
    // Garante formato correto
    if (!shop.includes('.myshopify.com')) {
      shop = `${shop}.myshopify.com`
    }
    setConnecting(true)
    window.location.href = `/api/shopify/install?shop=${encodeURIComponent(shop)}`
  }

  const handleSyncOrders = async () => {
    if (!status?.installation?.shopDomain) return
    setSyncing('orders')
    try {
      const res = await fetch('/api/shopify/sync/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop: status.installation.shopDomain }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${data.synced ?? 0} pedidos sincronizados`)
        fetchStatus()
      } else {
        toast.error(data.error ?? 'Erro ao sincronizar pedidos')
      }
    } finally {
      setSyncing(null)
    }
  }

  const handleSyncProducts = async () => {
    if (!status?.installation?.shopDomain) return
    setSyncing('products')
    try {
      const res = await fetch('/api/shopify/sync/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop: status.installation.shopDomain }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${(data.synced ?? 0) + (data.updated ?? 0)} produtos enviados para Shopify`)
        fetchStatus()
      } else {
        toast.error(data.error ?? 'Erro ao enviar produtos')
      }
    } finally {
      setSyncing(null)
    }
  }

  const handleImportProducts = async () => {
    if (!status?.installation?.shopDomain) return
    setSyncing('import-products')
    try {
      const res = await fetch('/api/shopify/import-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop: status.installation.shopDomain }),
      })
      const data = await res.json()
      if (res.ok) {
        const total = (data.imported ?? 0) + (data.updated ?? 0)
        toast.success(`${total} produto${total !== 1 ? 's' : ''} importado${total !== 1 ? 's' : ''} da Shopify`)
        fetchStatus()
      } else {
        toast.error(data.error ?? 'Erro ao importar produtos')
      }
    } finally {
      setSyncing(null)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Deseja desconectar sua loja Shopify da MydShop? Você pode reconectar a qualquer momento.')) return
    setDisconnecting(true)
    try {
      const res = await fetch('/api/seller/shopify/disconnect', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Loja Shopify desconectada')
        fetchStatus()
      } else {
        toast.error(data.error ?? 'Erro ao desconectar')
      }
    } finally {
      setDisconnecting(false)
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <FiLoader className="animate-spin text-4xl text-[#96bf48]" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/vendedor/integracao" className="text-gray-400 hover:text-gray-700">
          <FiArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#96bf48] rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shopify</h1>
            <p className="text-sm text-gray-500">Conecte sua loja Shopify à MydShop</p>
          </div>
        </div>
      </div>

      {status?.connected && status.installation ? (
        <>
          {/* ✅ CONECTADO */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6 flex items-start gap-4">
            <div className="bg-green-500 text-white rounded-full p-1.5 flex-shrink-0 mt-0.5">
              <FiCheck size={16} />
            </div>
            <div>
              <p className="font-semibold text-green-800">Loja conectada com sucesso</p>
              <p className="text-green-700 text-sm mt-0.5">
                <strong>{status.installation.shopName ?? status.installation.shopDomain}</strong>
                {' · '}{status.installation.shopDomain}
              </p>
              {status.installation.shopPlan && (
                <p className="text-green-600 text-xs mt-0.5">Plano Shopify: {status.installation.shopPlan}</p>
              )}
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white border rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Conectado em</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(status.installation.installedAt)}</p>
            </div>
            <div className="bg-white border rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Última sincronização</p>
              <p className="text-sm font-medium text-gray-900">
                {status.installation.lastSyncAt ? formatDate(status.installation.lastSyncAt) : 'Nunca'}
              </p>
            </div>
            <div className="bg-white border rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Pedidos sincronizados</p>
              <p className="text-2xl font-bold text-gray-900">{status.installation.orderSyncsCount}</p>
            </div>
            <div className="bg-white border rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Produtos sincronizados</p>
              <p className="text-2xl font-bold text-gray-900">{status.installation.productSyncsCount}</p>
            </div>
          </div>

          {/* Ações de sync */}
          <div className="bg-white border rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Sincronização manual</h3>
            <div className="grid grid-cols-1 gap-3">
              {/* Pedidos: Shopify → MydShop */}
              <button
                onClick={handleSyncOrders}
                disabled={syncing !== null}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {syncing === 'orders' ? <FiLoader className="animate-spin" /> : <FiDownload size={16} />}
                Importar pedidos da Shopify → MydShop
              </button>

              {/* Produtos: Shopify → MydShop */}
              <button
                onClick={handleImportProducts}
                disabled={syncing !== null}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {syncing === 'import-products' ? <FiLoader className="animate-spin" /> : <FiDownload size={16} />}
                Importar produtos da Shopify → MydShop
              </button>

              {/* Produtos: MydShop → Shopify */}
              <button
                onClick={handleSyncProducts}
                disabled={syncing !== null}
                className="flex items-center justify-center gap-2 bg-[#96bf48] hover:bg-[#7fa03c] text-white py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {syncing === 'products' ? <FiLoader className="animate-spin" /> : <FiUpload size={16} />}
                Enviar produtos MydShop → Shopify
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3">A sincronização de pedidos também ocorre automaticamente via webhooks da Shopify.</p>
          </div>

          {/* Link para admin Shopify */}
          <div className="bg-white border rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Acessar sua loja Shopify</h3>
            <a
              href={`https://${status.installation.shopDomain}/admin`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#96bf48] hover:text-[#7fa03c] font-medium text-sm"
            >
              <FiExternalLink size={14} />
              {status.installation.shopDomain}/admin
            </a>
          </div>

          {/* Desconectar */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="font-semibold text-red-900 mb-1">Desconectar loja</h3>
            <p className="text-sm text-red-700 mb-3">
              Isso remove a integração. Pedidos e produtos já importados são mantidos.
            </p>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {disconnecting ? <FiLoader className="animate-spin" size={14} /> : <FiTrash2 size={14} />}
              Desconectar Shopify
            </button>
          </div>
        </>
      ) : (
        <>
          {/* ❌ NÃO CONECTADO */}
          <div className="bg-white border rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <FiAlertCircle className="text-amber-500" size={20} />
              <h2 className="font-semibold text-gray-900">Sua loja Shopify não está conectada</h2>
            </div>
            <p className="text-gray-600 text-sm mb-6">
              Conecte sua loja Shopify para sincronizar pedidos e produtos automaticamente com a MydShop.
            </p>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Domínio da sua loja Shopify
              </label>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#96bf48]">
                  <input
                    type="text"
                    value={shopInput}
                    onChange={(e) => setShopInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                    placeholder="minha-loja"
                    className="flex-1 px-4 py-3 outline-none text-sm"
                  />
                  <span className="px-3 py-3 bg-gray-50 text-gray-400 text-sm border-l">.myshopify.com</span>
                </div>
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="bg-[#96bf48] hover:bg-[#7fa03c] text-white px-6 py-3 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                >
                  {connecting ? <FiLoader className="animate-spin" size={14} /> : null}
                  Conectar loja
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Você encontra o domínio em: Shopify Admin → Configurações → Domínios
              </p>
            </div>
          </div>

          {/* Como funciona */}
          <div className="bg-gray-50 border rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Como funciona a integração</h3>
            <div className="space-y-3">
              {[
                { num: '1', title: 'Informe o domínio', desc: 'Digite o subdomínio da sua loja Shopify (ex: minha-loja)' },
                { num: '2', title: 'Autorize o acesso', desc: 'Você será redirecionado para a Shopify para autorizar a integração' },
                { num: '3', title: 'Pronto!', desc: 'Pedidos e produtos serão sincronizados automaticamente' },
              ].map((step) => (
                <div key={step.num} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#96bf48] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {step.num}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{step.title}</p>
                    <p className="text-gray-500 text-xs">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
