'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ShopeeIntegrationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [authData, setAuthData] = useState<any>(null);
  const [error, setError] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [partnerKey, setPartnerKey] = useState('');
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

    try {
      const response = await fetch('/api/admin/marketplaces/shopee/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId: parseInt(partnerId), partnerKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar credenciais');
      }

      setShowCredentials(false);
      fetchAuthStatus();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthorize = async () => {
    if (!authData?.partnerId) {
      setError('Configure suas credenciais primeiro');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/marketplaces/shopee/auth/authorize');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar URL de autorização');
      }

      // Redireciona para autorização da Shopee
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

    try {
      const response = await fetch('/api/admin/marketplaces/shopee/auth', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao desconectar');
      }

      setAuthData(null);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const isConnected = authData?.isConnected;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Integração com Shopee</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Status da Conexão */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Status da Conexão</h2>
        
        <div className="flex items-center mb-4">
          <div className={`w-3 h-3 rounded-full mr-3 ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <span className="text-lg">
            {isConnected ? 'Conectado' : 'Não conectado'}
          </span>
        </div>

        {isConnected && authData && (
          <div className="bg-gray-50 rounded p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Loja:</span>
                <p className="font-semibold">{authData.merchantName || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600">Shop ID:</span>
                <p className="font-semibold">{authData.shopId}</p>
              </div>
              <div>
                <span className="text-gray-600">Região:</span>
                <p className="font-semibold">{authData.region}</p>
              </div>
              <div>
                <span className="text-gray-600">Token expira em:</span>
                <p className="font-semibold">
                  {new Date(authData.expiresAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        )}

        {!isConnected && (
          <div className="space-y-4">
            {!showCredentials && !authData?.partnerId && (
              <button
                onClick={() => setShowCredentials(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Configurar Credenciais
              </button>
            )}

            {showCredentials && (
              <div className="bg-gray-50 rounded p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Partner ID
                  </label>
                  <input
                    type="number"
                    value={partnerId}
                    onChange={(e) => setPartnerId(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Ex: 1234567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Partner Key
                  </label>
                  <input
                    type="password"
                    value={partnerKey}
                    onChange={(e) => setPartnerKey(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Digite o Partner Key"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveCredentials}
                    disabled={isLoading}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Salvando...' : 'Salvar Credenciais'}
                  </button>
                  <button
                    onClick={() => setShowCredentials(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {authData?.partnerId && !showCredentials && (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Credenciais configuradas. Clique para autorizar sua loja.
                </p>
                <button
                  onClick={handleAuthorize}
                  disabled={isLoading}
                  className="bg-orange-600 text-white px-6 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
                >
                  {isLoading ? 'Processando...' : 'Autorizar com Shopee'}
                </button>
              </div>
            )}
          </div>
        )}

        {isConnected && (
          <button
            onClick={handleDisconnect}
            disabled={isLoading}
            className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? 'Desconectando...' : 'Desconectar'}
          </button>
        )}
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold mb-3">Como configurar:</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Acesse o <a href="https://open.shopee.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Shopee Open Platform</a></li>
          <li>Crie uma aplicação e obtenha o Partner ID e Partner Key</li>
          <li>Configure a Redirect URL como: <code className="bg-white px-2 py-1 rounded">{window.location.origin}/admin/integracao/shopee/callback</code></li>
          <li>Cole as credenciais acima e clique em "Autorizar com Shopee"</li>
        </ol>
      </div>
    </div>
  );
}
