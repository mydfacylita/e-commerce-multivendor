'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import Image from 'next/image'

const SCOPE_LABELS: Record<string, { label: string; description: string; icon: string }> = {
  'orders:read':    { label: 'Ver seus pedidos',            description: 'Listar e consultar seus pedidos e status de entrega',       icon: '📦' },
  'orders:write':   { label: 'Gerenciar seus pedidos',      description: 'Criar e atualizar pedidos em seu nome',                      icon: '✏️' },
  'products:read':  { label: 'Ver seus produtos',           description: 'Listar e consultar seu catálogo de produtos',                icon: '🛍️' },
  'products:write': { label: 'Gerenciar seus produtos',     description: 'Criar, editar e remover produtos do seu catálogo',           icon: '🏷️' },
}

interface AppInfo {
  id: string
  name: string
  description: string | null
  logoUrl: string | null
  appType: string
}

export default function OAuthAuthorizePage() {
  const searchParams  = useSearchParams()
  const router        = useRouter()
  const { data: session, status } = useSession()

  const clientId     = searchParams.get('client_id') || ''
  const redirectUri  = searchParams.get('redirect_uri') || ''
  const scope        = searchParams.get('scope') || ''
  const state        = searchParams.get('state') || ''
  const responseType = searchParams.get('response_type') || ''

  const [appInfo, setAppInfo]           = useState<AppInfo | null>(null)
  const [requestedScopes, setScopes]    = useState<string[]>([])
  const [error, setError]               = useState('')
  const [loading, setLoading]           = useState(true)
  const [approving, setApproving]       = useState(false)

  useEffect(() => {
    if (!clientId || !redirectUri) {
      setError('Parâmetros inválidos. Verifique o link de autorização.')
      setLoading(false)
      return
    }

    const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, scope, state, response_type: responseType })
    fetch(`/api/oauth/authorize?${params}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setAppInfo(data.app)
        setScopes(data.requestedScopes || [])
      })
      .catch(() => setError('Erro ao validar o pedido de autorização.'))
      .finally(() => setLoading(false))
  }, [clientId, redirectUri, scope, state, responseType])

  async function handleDecision(approved: boolean) {
    setApproving(true)
    try {
      const res = await fetch('/api/oauth/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id:    clientId,
          redirect_uri: redirectUri,
          scope,
          state,
          approved,
        })
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      if (data.redirect) window.location.href = data.redirect
    } catch {
      setError('Erro ao processar sua decisão.')
    } finally {
      setApproving(false)
    }
  }

  // Se não está logado, redirecionar para login com retorno
  if (status === 'loading') {
    return <LoadingScreen message="Verificando sessão..." />
  }

  if (status === 'unauthenticated') {
    const callbackUrl = `/oauth/authorize?${searchParams.toString()}`
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">🔐</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Login necessário</h1>
          <p className="text-gray-500 mb-6 text-sm">Você precisa estar logado na Mydshop para autorizar este app.</p>
          <button
            onClick={() => signIn(undefined, { callbackUrl })}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            Fazer login na Mydshop
          </button>
        </div>
      </div>
    )
  }

  if (loading) return <LoadingScreen message="Carregando informações do app..." />

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-red-600 mb-2">Erro de autorização</h1>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!appInfo) return null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white text-center">
          <div className="flex items-center justify-center gap-4 mb-3">
            {appInfo.logoUrl ? (
              <img src={appInfo.logoUrl} alt={appInfo.name} className="w-12 h-12 rounded-xl bg-white object-contain p-1" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">🔗</div>
            )}
            <div className="text-white/60 text-xl">↔</div>
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
              <span className="text-blue-600 font-bold text-xs">MYD</span>
            </div>
          </div>
          <h1 className="font-bold text-lg">{appInfo.name}</h1>
          <p className="text-blue-100 text-sm mt-1">quer se conectar à sua conta Mydshop</p>
        </div>

        {/* Conta conectada */}
        <div className="px-6 pt-4 pb-2">
          <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
              {session?.user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="text-xs text-gray-500">Conectando como</p>
              <p className="text-sm font-medium text-gray-800">{session?.user?.email}</p>
            </div>
          </div>
        </div>

        {/* Permissões solicitadas */}
        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Este app terá acesso a:</p>
          <div className="space-y-2">
            {requestedScopes.map(scope => {
              const info = SCOPE_LABELS[scope]
              if (!info) return null
              return (
                <div key={scope} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <span className="text-lg mt-0.5">{info.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{info.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{info.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Aviso */}
        <div className="px-6 pb-2">
          <p className="text-xs text-gray-400 text-center">
            Ao autorizar, <strong>{appInfo.name}</strong> poderá acessar os dados acima em seu nome. Você pode revogar este acesso a qualquer momento em <strong>Minha conta → Apps conectados</strong>.
          </p>
        </div>

        {/* Botões */}
        <div className="px-6 py-4 flex gap-3">
          <button
            onClick={() => handleDecision(false)}
            disabled={approving}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition disabled:opacity-50"
          >
            Negar
          </button>
          <button
            onClick={() => handleDecision(true)}
            disabled={approving}
            className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {approving ? 'Autorizando...' : 'Autorizar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-500 text-sm">{message}</p>
      </div>
    </div>
  )
}
