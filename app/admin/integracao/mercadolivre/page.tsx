'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FiArrowLeft, FiExternalLink, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface MLStatus {
  connected: boolean
  message: string
  mlUserId?: string
  expiresAt?: string
}

export default function MercadoLivrePage() {
  const [mlStatus, setMlStatus] = useState<MLStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  
  // Credenciais
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [credentialsSaved, setCredentialsSaved] = useState(false)
  const [savingCredentials, setSavingCredentials] = useState(false)

  useEffect(() => {
    checkConnection()
    loadCredentials()
  }, [])

  const loadCredentials = async () => {
    try {
      const response = await fetch('/api/admin/marketplaces/mercadolivre/credentials')
      if (response.ok) {
        const data = await response.json()
        if (data.clientId) {
          setClientId(data.clientId)
          setCredentialsSaved(true)
        }
        if (data.clientSecret) {
          setClientSecret('••••••••••••••••') // Mascara o secret
        }
      }
    } catch (error) {
      console.error('Erro ao carregar credenciais:', error)
    }
  }

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/admin/marketplaces/mercadolivre/status')
      const data = await response.json()
      setMlStatus(data)
      setIsConnected(data.connected)
    } catch (error) {
      console.error('Erro ao verificar conexão:', error)
      toast.error('Erro ao verificar conexão')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCredentials = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error('Preencha o App ID e Secret Key')
      return
    }

    setSavingCredentials(true)
    try {
      const response = await fetch('/api/admin/marketplaces/mercadolivre/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Credenciais salvas com sucesso!')
        setCredentialsSaved(true)
      } else {
        toast.error(data.error || 'Erro ao salvar credenciais')
      }
    } catch (error) {
      toast.error('Erro ao salvar credenciais')
    } finally {
      setSavingCredentials(false)
    }
  }

  const handleConnect = async () => {
    if (!credentialsSaved) {
      toast.error('Salve suas credenciais primeiro!')
      return
    }
    
    // Gerar code_verifier e code_challenge para PKCE
    const codeVerifier = generateRandomString(128)
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    
    // Salvar code_verifier no sessionStorage para usar no callback
    sessionStorage.setItem('ml_code_verifier', codeVerifier)
    
    const redirectUri = encodeURIComponent(`${window.location.origin}/admin/integracao/mercadolivre/callback`)
    const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&code_challenge=${codeChallenge}&code_challenge_method=S256`
    
    window.location.href = authUrl
  }

  // Funções auxiliares para PKCE
  const generateRandomString = (length: number) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
    let text = ''
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return text
  }

  const generateCodeChallenge = async (codeVerifier: string) => {
    const encoder = new TextEncoder()
    const data = encoder.encode(codeVerifier)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  const handleListProducts = async () => {
    if (!mlStatus?.connected) {
      toast.error('Conecte sua conta do Mercado Livre primeiro')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/marketplaces/mercadolivre/list-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (response.ok) {
        const successCount = data.listedProducts?.length || 0
        const totalCount = data.totalProducts || 0
        const errorCount = data.errorsCount || 0
        const summary = data.summary
        
        if (successCount > 0) {
          toast.success(`✅ ${successCount}/${totalCount} produtos listados no Mercado Livre!`)
        }
        
        if (errorCount > 0) {
          // Mostrar resumo de problemas
          console.group('📊 Resumo dos Erros do Mercado Livre')
          console.log('Total analisado:', summary?.totalAnalyzed)
          console.log('Sucesso:', summary?.successful)
          console.log('Falhas:', summary?.failed)
          console.log('\n🔍 Problemas principais:')
          console.log(`  - Precisam de GTIN: ${summary?.mainIssues?.needsGTIN}`)
          console.log(`  - Precisam de tabela de tamanhos: ${summary?.mainIssues?.needsSizeGrid}`)
          console.log(`  - Outros erros: ${summary?.mainIssues?.otherErrors}`)
          console.log('\n💡 Recomendações:')
          summary?.recommendations?.forEach((rec: string) => console.log(`  ${rec}`))
          console.log('\n📋 Detalhes dos erros:')
          console.table(data.errors?.map((e: any) => ({
            Produto: e.productName,
            Categoria: e.category,
            Problema: e.error
          })))
          console.groupEnd()
          
          // Toast com resumo
          if (summary?.mainIssues?.needsGTIN > 0) {
            toast.error(`⚠️ ${summary.mainIssues.needsGTIN} produtos precisam de código GTIN (código de barras)`)
          }
          if (summary?.mainIssues?.needsSizeGrid > 0) {
            toast.error(`⚠️ ${summary.mainIssues.needsSizeGrid} produtos de moda precisam de tabela de tamanhos`)
          }
          toast.error(`❌ ${errorCount} produtos não listados. Veja o console (F12) para detalhes.`)
        }
        
        if (successCount === 0 && errorCount === 0) {
          toast('ℹ️ Nenhum produto para listar (estoque zerado?)')
        }
      } else {
        toast.error(data.message || 'Erro ao listar produtos')
        console.error('Erro:', data)
      }
    } catch (error) {
      toast.error('Erro ao listar produtos')
      console.error('Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <Link
        href="/admin/integracao"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
      >
        <FiArrowLeft className="mr-2" />
        Voltar
      </Link>

      <div className="max-w-4xl">
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg shadow-lg p-8 text-white mb-8">
          <h1 className="text-3xl font-bold mb-4">Integração Mercado Livre</h1>
          <p className="text-lg opacity-90">
            Conecte sua conta e liste produtos automaticamente
          </p>
        </div>

        {/* Credenciais */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">🔑 Credenciais do App</h2>
          
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Configure suas credenciais do Mercado Livre para conectar sua conta.
            </p>

            <div>
              <label className="block text-sm font-medium mb-2">
                App ID (Client ID) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Ex: 1234567890123456"
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                disabled={credentialsSaved}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Secret Key (Client Secret) <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Ex: abcdefghijklmnopqrstuvwx"
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                disabled={credentialsSaved}
              />
            </div>

            {!credentialsSaved ? (
              <button
                onClick={handleSaveCredentials}
                disabled={savingCredentials}
                className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 font-semibold disabled:bg-gray-300"
              >
                {savingCredentials ? 'Salvando...' : 'Salvar Credenciais'}
              </button>
            ) : (
              <div className="flex items-center space-x-3">
                <div className="flex items-center text-green-600 flex-1">
                  <FiCheck className="mr-2" />
                  <span className="font-semibold">Credenciais configuradas</span>
                </div>
                <button
                  onClick={() => {
                    setCredentialsSaved(false)
                    setClientSecret('')
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Editar
                </button>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-4">
              <p className="text-sm text-blue-800 font-semibold mb-2">
                📋 Como obter suas credenciais:
              </p>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Acesse <a href="https://developers.mercadolivre.com.br/apps" target="_blank" rel="noopener noreferrer" className="underline">developers.mercadolivre.com.br/apps</a></li>
                <li>Faça login com sua conta do Mercado Livre</li>
                <li>Clique em "Criar novo aplicativo"</li>
                <li>Preencha os dados do aplicativo</li>
                <li>Em "Redirect URI", adicione: <code className="bg-blue-100 px-1 rounded text-xs">{typeof window !== 'undefined' ? window.location.origin : 'https://seu-dominio.com'}/admin/integracao/mercadolivre/callback</code></li>
                <li>Copie o <strong>App ID</strong> e <strong>Secret Key</strong> e cole acima</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Status da Conexão */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Status da Conexão</h2>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Verificando conexão...</p>
            </div>
          ) : !mlStatus?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-gray-600">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>{mlStatus?.message || 'Não conectado'}</span>
              </div>
              
              <button
                onClick={handleConnect}
                disabled={!credentialsSaved}
                className="bg-yellow-500 text-white px-6 py-3 rounded-md hover:bg-yellow-600 font-semibold flex items-center space-x-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <span>Conectar com Mercado Livre</span>
                <FiExternalLink />
              </button>

              {!credentialsSaved && (
                <p className="text-sm text-orange-600">
                  ⚠️ Configure suas credenciais acima primeiro
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-green-600">
                <FiCheck className="text-2xl" />
                <span className="font-semibold">Conectado com sucesso!</span>
              </div>
              
              {mlStatus.mlUserId && (
                <div className="text-sm text-gray-600">
                  <p><strong>ID do Usuário ML:</strong> {mlStatus.mlUserId}</p>
                  {mlStatus.expiresAt && (
                    <p><strong>Token válido até:</strong> {new Date(mlStatus.expiresAt).toLocaleString('pt-BR')}</p>
                  )}
                </div>
              )}
              
              <button
                onClick={() => setIsConnected(false)}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                Desconectar
              </button>
            </div>
          )}
        </div>

        {/* Listar Produtos */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Listar Produtos</h2>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              Publique todos os seus produtos ativos no Mercado Livre com apenas um clique.
            </p>

            <div className="grid md:grid-cols-2 gap-4 my-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">O que será enviado:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✓ Nome do produto</li>
                  <li>✓ Descrição completa</li>
                  <li>✓ Preço e estoque</li>
                  <li>✓ Imagens (até 10)</li>
                  <li>✓ Categoria automaticamente</li>
                </ul>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Configurações:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✓ Frete grátis (configurável)</li>
                  <li>✓ Tipo: Mercado Envios</li>
                  <li>✓ Garantia: 90 dias</li>
                  <li>✓ Condição: Novo</li>
                  <li>✓ Perguntas automáticas</li>
                </ul>
              </div>
            </div>

            <button
              onClick={handleListProducts}
              disabled={!isConnected || isLoading}
              className="w-full bg-yellow-500 text-white py-3 rounded-md hover:bg-yellow-600 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Listando produtos...' : 'Listar Todos os Produtos'}
            </button>
          </div>
        </div>

        {/* Configurações Avançadas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Configurações Avançadas</h2>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span>Sincronizar estoque automaticamente</span>
              </label>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span>Atualizar preços em tempo real</span>
              </label>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded" />
                <span>Adicionar margem extra para cobrir taxas do ML (5%)</span>
              </label>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span>Pausar anúncios quando estoque zerar</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Categoria padrão do Mercado Livre
              </label>
              <select className="w-full px-4 py-2 border rounded-md">
                <option>Detectar automaticamente</option>
                <option>MLB1051 - Celulares e Telefones</option>
                <option>MLB1648 - Informática</option>
                <option>MLB1430 - Roupas e Calçados</option>
                <option>MLB1000 - Eletrônicos</option>
              </select>
            </div>

            <button className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700">
              Salvar Configurações
            </button>
          </div>
        </div>

        {/* Informações */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-bold text-yellow-900 mb-2">📌 Importante:</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• O Mercado Livre cobra taxa de 11-16% sobre cada venda</li>
            <li>• Recomendamos adicionar essa margem ao preço</li>
            <li>• Produtos listados aparecem em até 15 minutos</li>
            <li>• Você pode editar os anúncios diretamente no Mercado Livre</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
