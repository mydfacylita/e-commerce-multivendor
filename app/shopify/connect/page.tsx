'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'

const ERROR_MESSAGES: Record<string, { title: string; description: string; action?: { label: string; href: string } }> = {
  no_seller: {
    title: 'Você não tem uma loja na MydShop',
    description: 'Para conectar sua loja Shopify, primeiro você precisa criar uma conta de vendedor ativa na MydShop.',
    action: { label: 'Criar conta de vendedor', href: '/registro-vendedor' },
  },
  seller_pending: {
    title: 'Loja aguardando aprovação',
    description: 'Sua conta de vendedor na MydShop ainda está em análise. Aguarde a aprovação para conectar o Shopify.',
    action: { label: 'Ver status da conta', href: '/vendedor/conta' },
  },
  seller_suspended: {
    title: 'Conta de vendedor suspensa',
    description: 'Sua conta de vendedor está suspensa. Entre em contato com o suporte MydShop.',
    action: { label: 'Falar com suporte', href: '/contato' },
  },
  seller_rejected: {
    title: 'Conta de vendedor reprovada',
    description: 'Sua conta de vendedor não foi aprovada. Entre em contato com o suporte.',
    action: { label: 'Falar com suporte', href: '/contato' },
  },
  no_subscription: {
    title: 'Assinatura necessária',
    description: 'Para conectar sua loja Shopify à MydShop você precisa ter um plano ativo.',
    action: { label: 'Ver planos disponíveis', href: '/vendedor/planos' },
  },
  expired: {
    title: 'Sessão expirada',
    description: 'O tempo para concluir a instalação expirou (30 minutos). Por favor, reinicie o processo.',
  },
  invalid_token: {
    title: 'Token de instalação inválido',
    description: 'Ocorreu um erro de segurança durante a instalação. Tente novamente.',
  },
  unknown: {
    title: 'Erro inesperado',
    description: 'Ocorreu um erro durante a instalação. Tente novamente ou entre em contato com o suporte.',
  },
}

interface SellerInfo {
  seller: {
    storeName:     string
    storeSlug:     string
    storeLogo:     string | null
    status:        string
    productsCount: number
  }
  subscription: {
    planName: string
    status:   string
    endDate:  string
  } | null
  installation: {
    shopName:     string | null
    shopPlan:     string | null
    shopCurrency: string | null
    installedAt:  string
    isActive:     boolean
  } | null
}

function ConnectContent() {
  const params  = useSearchParams()
  const shop    = params.get('shop') || ''
  const error   = params.get('error') || ''

  const [info, setInfo]       = useState<SellerInfo | null>(null)
  const [loading, setLoading] = useState(!error)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    if (error || !shop) { setLoading(false); return }
    fetch(`/api/shopify/seller-info?shop=${encodeURIComponent(shop)}`)
      .then(r => r.json())
      .then(d => { setInfo(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [shop, error])

  const handleSync = async (type: 'orders' | 'products') => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res  = await fetch(`/api/shopify/sync/${type}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ shop }),
      })
      const data = await res.json()
      setSyncMsg(res.ok
        ? { type: 'ok',  text: data.message || 'Sincronização concluída!' }
        : { type: 'err', text: data.error   || 'Erro ao sincronizar.' }
      )
    } catch {
      setSyncMsg({ type: 'err', text: 'Erro de conexão.' })
    } finally {
      setSyncing(false)
    }
  }

  // ── Tela de erro ──────────────────────────────────────────────────────────
  if (error) {
    const e = ERROR_MESSAGES[error] || ERROR_MESSAGES.unknown
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-3">{e.title}</h1>
          <p className="text-gray-500 text-sm mb-2">{e.description}</p>
          {shop && (
            <p className="text-xs text-gray-400 mb-6">
              Loja Shopify: <span className="font-medium">{shop}</span>
            </p>
          )}
          <div className="space-y-3">
            {e.action && (
              <Link href={e.action.href}
                className="block w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 transition">
                {e.action.label}
              </Link>
            )}
            <Link href="/" className="block text-gray-400 text-sm hover:text-gray-600">
              Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Tela de loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Verificando instalação…</p>
        </div>
      </div>
    )
  }

  // ── Tela de sucesso ────────────────────────────────────────────────────────
  const seller  = info?.seller
  const sub     = info?.subscription
  const install = info?.installation

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#96bf48] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-2xl text-gray-400">+</span>
            {seller?.storeLogo
              ? <img src={seller.storeLogo} alt={seller.storeName} className="w-12 h-12 rounded-xl object-cover" />
              : <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">M</span>
                </div>
            }
          </div>
          <h1 className="text-2xl font-bold text-gray-900">App instalado com sucesso!</h1>
          <p className="text-gray-500 mt-1 text-sm">
            <span className="font-medium text-gray-700">{install?.shopName || shop}</span>
            {' '}conectada à loja{' '}
            <span className="font-medium text-gray-700">{seller?.storeName || '—'}</span>
          </p>
        </div>

        {/* Info do vendedor */}
        <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Loja MydShop</span>
            <span className="font-medium text-gray-800">{seller?.storeName || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Plano ativo</span>
            <span className="font-medium text-gray-800">
              {sub ? `${sub.planName}${sub.status === 'TRIAL' ? ' (Trial)' : ''}` : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Produtos na MydShop</span>
            <span className="font-medium text-gray-800">{seller?.productsCount ?? 0} produtos</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Plano Shopify</span>
            <span className="font-medium text-gray-800">{install?.shopPlan || '—'}</span>
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-2 mb-5">
          {[
            { ok: true,         text: 'Autorização OAuth concluída' },
            { ok: true,         text: 'Loja vinculada ao seu seller MydShop' },
            { ok: !!seller && !!sub, text: 'Conta vendedor e assinatura validadas' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-lg">{item.ok ? '✅' : '⚠️'}</span>
              <span className="text-gray-700 text-sm">{item.text}</span>
            </div>
          ))}
        </div>

        {/* Mensagem de sync */}
        {syncMsg && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${syncMsg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {syncMsg.text}
          </div>
        )}

        {/* Ações */}
        <div className="space-y-3 mb-5">
          <button
            onClick={() => handleSync('orders')}
            disabled={syncing}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 px-4 rounded-xl font-medium transition flex items-center justify-center gap-2"
          >
            {syncing
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : '📦'
            }
            Importar pedidos da Shopify
          </button>
          <button
            onClick={() => handleSync('products')}
            disabled={syncing || (seller?.productsCount === 0)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 px-4 rounded-xl font-medium transition flex items-center justify-center gap-2"
          >
            {syncing
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : '🛍'
            }
            Enviar {seller?.productsCount ?? 0} produtos para Shopify
          </button>
          {seller?.productsCount === 0 && (
            <p className="text-xs text-amber-600 text-center">
              ⚠️ Você não tem produtos cadastrados.{' '}
              <Link href="/vendedor/produtos/novo" className="underline">Cadastre agora</Link> para enviar ao Shopify.
            </p>
          )}
        </div>

        {/* Links */}
        <div className="flex justify-between text-sm border-t pt-4">
          <Link href="/admin/integracao/shopify" className="text-blue-600 hover:underline">
            Gerenciar integração →
          </Link>
          <Link href="/vendedor/integracao" className="text-gray-400 hover:text-gray-600">
            Painel do vendedor
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ShopifyConnectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ConnectContent />
    </Suspense>
  )
}

