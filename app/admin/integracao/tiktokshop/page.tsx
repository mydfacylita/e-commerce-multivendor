'use client';

import { useState, useEffect } from 'react';
import { FiVideo, FiShoppingBag, FiRefreshCw, FiSettings, FiExternalLink, FiCheck, FiX } from 'react-icons/fi';
import { SiTiktok } from 'react-icons/si';
import Link from 'next/link';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface TikTokAuthData {
  isConnected: boolean;
  shopName?: string;
  shopId?: string;
  sellerName?: string;
  region?: string;
  expiresAt?: string;
  appKey?: string;
}

export default function TikTokShopIntegrationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [authData, setAuthData] = useState<TikTokAuthData | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [appKey, setAppKey] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  const [stats, setStats] = useState<{ products: number; orders: number } | null>(null);

  useEffect(() => {
    fetchAuthStatus();
  }, []);

  const fetchAuthStatus = async () => {
    try {
      const response = await fetch('/api/admin/marketplaces/tiktokshop/auth');
      if (response.ok) {
        const data = await response.json();
        setAuthData(data);
        if (data.appKey) {
          setAppKey(data.appKey);
        }
        if (data.isConnected) {
          fetchStats();
        }
      }
    } catch (error) {
      console.error('Erro ao buscar status:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/marketplaces/tiktokshop/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const handleSaveCredentials = async () => {
    if (!appKey || !appSecret) {
      setError('Preencha App Key e App Secret');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/marketplaces/tiktokshop/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appKey, appSecret }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar credenciais');
      }

      setSuccess('Credenciais salvas com sucesso!');
      setShowCredentials(false);
      fetchAuthStatus();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthorize = async () => {
    if (!authData?.appKey) {
      setError('Configure suas credenciais primeiro');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/marketplaces/tiktokshop/auth/authorize');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar URL de autorização');
      }

      // Redireciona para autorização do TikTok Shop
      window.location.href = data.authUrl;
    } catch (error: any) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/marketplaces/tiktokshop/auth/refresh', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao renovar token');
      }

      setSuccess('Token renovado com sucesso!');
      fetchAuthStatus();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Deseja realmente desconectar sua conta TikTok Shop? Isso irá remover todas as credenciais salvas.')) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/marketplaces/tiktokshop/auth', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao desconectar');
      }

      setAuthData(null);
      setStats(null);
      setSuccess('Conta desconectada com sucesso!');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const isConnected = authData?.isConnected;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-gradient-to-br from-gray-900 via-pink-600 to-cyan-400 rounded-xl">
          <SiTiktok className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Integração com TikTok Shop</h1>
          <p className="text-gray-600">Conecte sua loja ao TikTok Shop para vender diretamente na plataforma</p>
        </div>
      </div>

      {/* Mensagens de Erro/Sucesso */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
          <FiX className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
          <FiCheck className="w-5 h-5" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status da Conexão */}
        <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FiSettings className="w-5 h-5" />
            Status da Conexão
          </h2>
          
          <div className="flex items-center mb-4">
            <div className={`w-3 h-3 rounded-full mr-3 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
            <span className="text-lg font-medium">
              {isConnected ? 'Conectado' : 'Não conectado'}
            </span>
          </div>

          {isConnected && authData && (
            <div className="bg-gradient-to-r from-gray-50 to-pink-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Loja:</span>
                  <p className="font-semibold">{authData.shopName || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Shop ID:</span>
                  <p className="font-semibold font-mono text-xs">{authData.shopId || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Vendedor:</span>
                  <p className="font-semibold">{authData.sellerName || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Região:</span>
                  <p className="font-semibold">{authData.region || 'BR'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Token expira em:</span>
                  <p className="font-semibold">
                    {authData.expiresAt 
                      ? new Date(authData.expiresAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isConnected && (
            <div className="space-y-4">
              {!showCredentials && !authData?.appKey && (
                <button
                  onClick={() => setShowCredentials(true)}
                  className="bg-gradient-to-r from-pink-600 to-cyan-500 text-white px-6 py-3 rounded-lg hover:opacity-90 transition flex items-center gap-2"
                >
                  <FiSettings className="w-4 h-4" />
                  Configurar Credenciais
                </button>
              )}

              {showCredentials && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      App Key
                    </label>
                    <input
                      type="text"
                      value={appKey}
                      onChange={(e) => setAppKey(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="Ex: 6p5ki************"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      App Secret
                    </label>
                    <input
                      type="password"
                      value={appSecret}
                      onChange={(e) => setAppSecret(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="Digite o App Secret"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveCredentials}
                      disabled={isLoading}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <FiRefreshCw className="w-4 h-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <FiCheck className="w-4 h-4" />
                          Salvar Credenciais
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowCredentials(false)}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {authData?.appKey && !showCredentials && (
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    Credenciais configuradas. Clique para autorizar sua loja.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAuthorize}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-gray-900 via-pink-600 to-cyan-400 text-white px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <FiRefreshCw className="w-4 h-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <SiTiktok className="w-4 h-4" />
                          Autorizar com TikTok Shop
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowCredentials(true)}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                    >
                      Editar Credenciais
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isConnected && (
            <div className="flex gap-2">
              <button
                onClick={handleRefreshToken}
                disabled={isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <FiRefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Renovar Token
              </button>
              <button
                onClick={handleDisconnect}
                disabled={isLoading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                <FiX className="w-4 h-4" />
                Desconectar
              </button>
            </div>
          )}
        </div>

        {/* Estatísticas */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Estatísticas</h2>
          
          {isConnected && stats ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-pink-50 to-pink-100 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FiShoppingBag className="w-8 h-8 text-pink-600" />
                  <div>
                    <p className="text-2xl font-bold text-pink-600">{stats.products}</p>
                    <p className="text-sm text-gray-600">Produtos Sincronizados</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-cyan-50 to-cyan-100 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FiVideo className="w-8 h-8 text-cyan-600" />
                  <div>
                    <p className="text-2xl font-bold text-cyan-600">{stats.orders}</p>
                    <p className="text-sm text-gray-600">Pedidos este Mês</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FiVideo className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Conecte sua conta para ver as estatísticas</p>
            </div>
          )}
        </div>
      </div>

      {/* Ações Rápidas (apenas se conectado) */}
      {isConnected && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/integracao/tiktokshop/produtos"
              className="border border-gray-200 rounded-lg p-4 hover:border-pink-400 hover:shadow transition flex items-center gap-3"
            >
              <FiShoppingBag className="w-6 h-6 text-pink-600" />
              <div>
                <p className="font-medium">Gerenciar Produtos</p>
                <p className="text-sm text-gray-500">Sincronize produtos com TikTok Shop</p>
              </div>
            </Link>
            
            <Link
              href="/admin/integracao/tiktokshop/pedidos"
              className="border border-gray-200 rounded-lg p-4 hover:border-cyan-400 hover:shadow transition flex items-center gap-3"
            >
              <FiVideo className="w-6 h-6 text-cyan-600" />
              <div>
                <p className="font-medium">Ver Pedidos</p>
                <p className="text-sm text-gray-500">Pedidos recebidos do TikTok</p>
              </div>
            </Link>
            
            <Link
              href="/admin/integracao/tiktokshop/configuracoes"
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-400 hover:shadow transition flex items-center gap-3"
            >
              <FiSettings className="w-6 h-6 text-gray-600" />
              <div>
                <p className="font-medium">Configurações</p>
                <p className="text-sm text-gray-500">Opções avançadas</p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Instruções */}
      <div className="mt-6 bg-gradient-to-r from-gray-50 to-pink-50 border border-pink-200 rounded-lg p-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <SiTiktok className="w-5 h-5" />
          Como configurar sua integração:
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>
            Acesse o{' '}
            <a 
              href="https://partner.tiktokshop.com/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-pink-600 hover:underline inline-flex items-center gap-1"
            >
              TikTok Shop Partner Center
              <FiExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>Crie uma aplicação e obtenha o <strong>App Key</strong> e <strong>App Secret</strong></li>
          <li>
            Configure a Redirect URL como:{' '}
            <code className="bg-white px-2 py-1 rounded text-xs">
              {typeof window !== 'undefined' ? window.location.origin : ''}/api/admin/marketplaces/tiktokshop/callback
            </code>
          </li>
          <li>Cole as credenciais acima e clique em "Autorizar com TikTok Shop"</li>
          <li>Autorize o acesso à sua loja na página do TikTok</li>
        </ol>
        
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
          <strong className="text-yellow-800">⚠️ Importante:</strong>
          <p className="text-yellow-700 mt-1">
            O TikTok Shop está disponível apenas em regiões selecionadas. 
            Verifique se sua região está habilitada no TikTok Shop Partner Center.
          </p>
        </div>
      </div>
    </div>
  );
}
