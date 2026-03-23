'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ─── Aba Lojas Conectadas ──────────────────────────────────────────────────

interface SellerConnection {
  id: string
  shopId: number
  merchantName: string | null
  region: string | null
  expiresAt: string
  isSandbox: boolean
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    seller: { id: string; storeName: string; status: string } | null
  }
}

function LojasConectadasTab() {
  const [connections, setConnections] = useState<SellerConnection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/shopee/installations')
      .then(r => r.json())
      .then(d => setConnections(d.connections || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-gray-400">Carregando...</div>
  }

  const active   = connections.filter(c => new Date(c.expiresAt) > new Date()).length
  const inactive = connections.length - active

  return (
    <div className="space-y-4">
      {/* Stats */}
      {connections.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total conectadas', value: connections.length, color: 'text-blue-700',  bg: 'bg-blue-50  border-blue-200'  },
            { label: 'Token ativo',      value: active,             color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
            { label: 'Token expirado',   value: inactive,           color: 'text-red-600',   bg: 'bg-red-50   border-red-200'   },
          ].map(s => (
            <div key={s.label} className={`border rounded-xl px-4 py-3 ${s.bg}`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {connections.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🛒</p>
          <p className="font-medium">Nenhum vendedor conectou sua loja Shopee ainda</p>
          <p className="text-sm mt-1">Quando um vendedor autorizar o app, aparecerá aqui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map(c => {
            const expired = new Date(c.expiresAt) < new Date()
            return (
              <div key={c.id} className="bg-white border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">
                      {c.user.seller?.storeName || c.user.name || c.user.email}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${expired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {expired ? 'Token expirado' : 'Ativo'}
                    </span>
                    {c.isSandbox && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Sandbox</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{c.user.email}</div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-600 flex-wrap">
                    <span>Shop ID: <strong>{c.shopId}</strong></span>
                    {c.merchantName && <span>Loja: <strong>{c.merchantName}</strong></span>}
                    {c.region && <span>Região: <strong>{c.region}</strong></span>}
                    <span>Expira: <strong>{new Date(c.expiresAt).toLocaleDateString('pt-BR')}</strong></span>
                    <span>Conectado em: <strong>{new Date(c.createdAt).toLocaleDateString('pt-BR')}</strong></span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────

export default function ShopeeIntegrationPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'conexao' | 'lojas'>('conexao');
  const [isLoading, setIsLoading] = useState(false);
  const [authData, setAuthData] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [partnerKey, setPartnerKey] = useState('');
  const [isSandboxInput, setIsSandboxInput] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  useEffect(() => {
    fetchAuthStatus();
  }, []);

  const fetchAuthStatus = async () => {
    try {
      const response = await fetch('/api/admin/marketplaces/shopee/auth');
      if (response.ok) {
        const data = await response.json();
        setAuthData(data);
      }
    } catch (error) {
      console.error('Erro ao buscar status:', error);
    }
  };

  const handleSaveCredentials = async () => {
    if (!partnerId || !partnerKey) {
      setError('Preencha Partner ID e Partner Key');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/marketplaces/shopee/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerId: parseInt(partnerId),
          partnerKey,
          isSandbox: isSandboxInput,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao salvar credenciais');

      setSuccess('Credenciais salvas com sucesso!');
      setShowCredentials(false);
      setPartnerId('');
      setPartnerKey('');
      fetchAuthStatus();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthorize = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/marketplaces/shopee/auth/authorize');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao gerar URL de autorização');

      window.location.href = data.authUrl;
    } catch (error: any) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Deseja realmente desconectar sua conta Shopee?')) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/marketplaces/shopee/auth', { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao desconectar');
      }
      setAuthData(null);
      setSuccess('Conta desconectada.');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const isConnected = authData?.isConnected;
  const hasCredentials = authData?.partnerId;
  const isSandboxActive = authData?.isSandbox;

  const callbackUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/admin/integracao/shopee/callback`
    : 'https://gerencial-sys.mydshop.com.br/admin/integracao/shopee/callback';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integração com Shopee</h1>
        <p className="text-gray-500 text-sm mt-1">Configure suas credenciais de parceiro e autorize o acesso à loja.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {[
          { key: 'conexao', label: 'Minha Conexão' },
          { key: 'lojas',   label: 'Lojas Conectadas' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'lojas' && <LojasConectadasTab />}

      {activeTab === 'conexao' && (<>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Status Card */}
      <div className="bg-white shadow-sm rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Status da Conexão</h2>

        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : hasCredentials ? 'bg-yellow-400' : 'bg-gray-300'}`} />
          <span className="font-medium">
            {isConnected ? 'Conectado' : hasCredentials ? 'Credenciais configuradas (não autorizado)' : 'Não configurado'}
          </span>
          {isSandboxActive != null && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isSandboxActive ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
              {isSandboxActive ? '🧪 Sandbox' : '🚀 Produção'}
            </span>
          )}
        </div>

        {isConnected && authData && (
          <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 rounded-lg p-4">
            <div>
              <p className="text-gray-500">Loja</p>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{authData.merchantName || 'N/A'}</p>
                {!authData.merchantName && (
                  <button
                    onClick={async () => {
                      setIsLoading(true)
                      try {
                        await fetch('/api/admin/marketplaces/shopee/auth', { method: 'PATCH' })
                        fetchAuthStatus()
                      } finally { setIsLoading(false) }
                    }}
                    disabled={isLoading}
                    className="text-xs text-orange-600 underline hover:text-orange-800 disabled:opacity-50"
                  >
                    Atualizar
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className="text-gray-500">Shop ID</p>
              <p className="font-semibold">{authData.shopId}</p>
            </div>
            <div>
              <p className="text-gray-500">Região</p>
              <p className="font-semibold">{authData.region || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">Token expira em</p>
              <p className="font-semibold">{new Date(authData.expiresAt).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        )}

        {hasCredentials && !showCredentials && (
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 text-sm">
            <span className="text-gray-500">Partner ID configurado:</span>
            <span className="font-mono font-semibold text-gray-800">{authData.partnerId}</span>
            <button
              onClick={() => { setShowCredentials(true); setPartnerId(String(authData.partnerId)); setIsSandboxInput(authData.isSandbox ?? false); }}
              className="ml-auto text-blue-600 hover:text-blue-800 text-xs underline"
            >
              Editar
            </button>
          </div>
        )}

        {/* Credentials Form */}
        {(!hasCredentials || showCredentials) && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <p className="text-sm font-medium text-gray-700">
              {showCredentials ? 'Atualizar credenciais' : 'Configure as credenciais do parceiro'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Partner ID
                </label>
                <input
                  type="number"
                  value={partnerId}
                  onChange={e => setPartnerId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Ex: 1234567"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Partner Key
                </label>
                <input
                  type="password"
                  value={partnerKey}
                  onChange={e => setPartnerKey(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Cole o Partner Key aqui"
                />
              </div>
            </div>

            {/* Sandbox toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setIsSandboxInput(!isSandboxInput)}
                className={`relative w-10 h-6 rounded-full transition-colors ${isSandboxInput ? 'bg-amber-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isSandboxInput ? 'translate-x-4' : ''}`} />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Modo Sandbox</span>
                <p className="text-xs text-gray-500">
                  {isSandboxInput
                    ? 'Usando partner.uat.shopeemobile.com (ambiente de teste)'
                    : 'Usando partner.shopeemobile.com (produção)'}
                </p>
              </div>
            </label>

            <div className="flex gap-2">
              <button
                onClick={handleSaveCredentials}
                disabled={isLoading}
                className="bg-orange-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50 font-medium"
              >
                {isLoading ? 'Salvando...' : 'Salvar Credenciais'}
              </button>
              {showCredentials && (
                <button
                  onClick={() => { setShowCredentials(false); setPartnerId(''); setPartnerKey(''); }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          {hasCredentials && !isConnected && !showCredentials && (
            <button
              onClick={handleAuthorize}
              disabled={isLoading}
              className="bg-orange-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50"
            >
              {isLoading ? 'Redirecionando...' : '🔗 Autorizar com Shopee'}
            </button>
          )}
          {isConnected && (
            <>
              <button
                onClick={handleAuthorize}
                disabled={isLoading}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Renovar Autorização
              </button>
              <Link
                href="/admin/integracao/shopee/test"
                className="bg-green-100 text-green-700 px-5 py-2.5 rounded-lg font-medium hover:bg-green-200"
              >
                🧪 Testar API
              </Link>
              <button
                onClick={handleDisconnect}
                disabled={isLoading}
                className="bg-red-100 text-red-700 px-5 py-2.5 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50"
              >
                {isLoading ? 'Desconectando...' : 'Desconectar'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-blue-900">Como configurar</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>
            Acesse{' '}
            <a href="https://open.shopee.com/" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-blue-600">
              open.shopee.com
            </a>{' '}
            → <strong>My Apps</strong> → copie o <strong>Partner ID</strong> e a <strong>Partner Key</strong>
          </li>
          <li>
            Nas configurações do App, adicione esta URL de redirecionamento:
            <div className="mt-1 bg-white rounded px-3 py-1.5 font-mono text-xs text-gray-700 break-all">
              {callbackUrl}
            </div>
          </li>
          <li>Cole as credenciais no formulário acima e salve</li>
          <li>Clique em <strong>"Autorizar com Shopee"</strong> para conectar sua loja</li>
        </ol>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 mt-2">
          <strong>⚠️ Erro "invalid_partner_id"?</strong> Significa que o Partner ID salvo não corresponde a nenhum app registrado no Shopee Open Platform.
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Verifique o Partner ID em <strong>open.shopee.com → My Apps</strong></li>
            <li>Certifique-se de que o ambiente está certo: credenciais de <strong>teste</strong> precisam do <strong>Modo Sandbox</strong> ativado</li>
          </ul>
        </div>
      </div>
      </>)}
    </div>
  );
}
