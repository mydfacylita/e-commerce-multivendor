'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FiArrowLeft, FiCheck, FiPackage, FiDownload, FiX, FiAlertCircle, FiCheckCircle, FiInfo } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface AliExpressStatus {
  configured: boolean
  authorized: boolean
  trackingId?: string
  message: string
  error?: boolean
}

interface Supplier {
  id: string
  name: string
}

interface InfoModal {
  isOpen: boolean
  type: 'info' | 'success' | 'error' | 'warning'
  title: string
  message: string
  details?: string[]
  action?: {
    label: string
    onClick: () => void
  }
}

export default function AliExpressIntegrationPage() {
  const [status, setStatus] = useState<AliExpressStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [showConfigForm, setShowConfigForm] = useState(false)
  const [authorizing, setAuthorizing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [keywords, setKeywords] = useState('')
  const [modal, setModal] = useState<InfoModal>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  })

  // Categorias principais do AliExpress para Dropshipping
  const categories = [
    { id: '', name: 'Todos (Recomendados)' },
    { id: '1524', name: 'Telefones & Eletrônicos' },
    { id: '1511', name: 'Computadores & Escritório' },
    { id: '36', name: 'Eletrodomésticos' },
    { id: '1501', name: 'Jóias & Relógios' },
    { id: '1503', name: 'Casa & Jardim' },
    { id: '34', name: 'Bolsas & Sapatos' },
    { id: '1420', name: 'Brinquedos & Hobbies' },
    { id: '200003482', name: 'Esportes & Entretenimento' },
    { id: '26', name: 'Moda Feminina' },
    { id: '200000345', name: 'Moda Masculina' },
    { id: '39', name: 'Luzes & Iluminação' },
    { id: '66', name: 'Beleza & Saúde' },
  ]

  // Form
  const [appKey, setAppKey] = useState('')
  const [appSecret, setAppSecret] = useState('')
  const [trackingId, setTrackingId] = useState('')

  const showModal = (config: Omit<InfoModal, 'isOpen'>) => {
    setModal({ ...config, isOpen: true })
  }

  const closeModal = () => {
    setModal({ ...modal, isOpen: false })
  }

  useEffect(() => {
    checkStatus()
    fetchSuppliers()
    
    // Verificar parâmetros de retorno OAuth
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'authorized') {
      showModal({
        type: 'success',
        title: 'Autorização Concedida!',
        message: 'Sua conta AliExpress foi autorizada com sucesso.',
        details: [
          '✓ Você já pode importar produtos do AliExpress',
          '✓ Selecione uma categoria ou busque por palavras-chave',
          '✓ Escolha um fornecedor para associar os produtos'
        ]
      })
      checkStatus()
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('error')) {
      const errorMsg = params.get('error')
      showModal({
        type: 'error',
        title: 'Erro na Autorização',
        message: 'Não foi possível autorizar sua conta AliExpress.',
        details: [
          `• Erro: ${errorMsg}`,
          '• Verifique se você autorizou o acesso ao seu aplicativo',
          '• Certifique-se de que suas credenciais estão corretas',
          '• Tente fazer a autorização novamente'
        ],
        action: {
          label: 'Tentar Novamente',
          onClick: () => {
            closeModal()
            handleAuthorize()
          }
        }
      })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/admin/integrations/aliexpress/status')
      if (!response.ok) {
        if (response.status === 401) {
          showModal({
            type: 'error',
            title: 'Acesso Negado',
            message: 'Você não tem permissão para acessar essa página.',
            details: [
              '• Faça login com uma conta de administrador',
              '• Verifique se sua sessão não expirou',
              '• Entre em contato com o suporte se o problema persistir'
            ]
          })
          return
        }
        throw new Error(`Status ${response.status}`)
      }
      const data = await response.json()
      setStatus(data)
      if (data.trackingId) setTrackingId(data.trackingId)
    } catch (error) {
      showModal({
        type: 'error',
        title: 'Erro ao Verificar Status',
        message: 'Não foi possível verificar o status da integração.',
        details: [
          '• Verifique sua conexão com a internet',
          '• O servidor pode estar temporariamente indisponível',
          '• Recarregue a página para tentar novamente'
        ],
        action: {
          label: 'Recarregar Página',
          onClick: () => {
            closeModal()
            window.location.reload()
          }
        }
      })
      console.error('Erro ao verificar status:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/admin/suppliers')
      if (!response.ok) {
        if (response.status === 401) {
          showModal({
            type: 'error',
            title: 'Sem Permissão',
            message: 'Você não tem permissão para acessar os fornecedores.',
            details: [
              '• Faça login com uma conta de administrador',
              '• Verifique se sua sessão não expirou'
            ]
          })
          return
        }
        throw new Error(`Status ${response.status}`)
      }
      const data = await response.json()
      setSuppliers(data.suppliers || [])
    } catch (error) {
      showModal({
        type: 'error',
        title: 'Erro ao Carregar Fornecedores',
        message: 'Não foi possível carregar a lista de fornecedores.',
        details: [
          '• Verifique sua conexão com a internet',
          '• Tente recarregar a página',
          '• Se o erro persistir, verifique os logs do servidor'
        ],
        action: {
          label: 'Tentar Novamente',
          onClick: () => {
            closeModal()
            fetchSuppliers()
          }
        }
      })
      console.error('Erro ao buscar fornecedores:', error)
    }
  }

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!appKey || !appSecret) {
      showModal({
        type: 'warning',
        title: 'Campos Obrigatórios',
        message: 'Você precisa preencher as credenciais do AliExpress.',
        details: [
          '• App Key (obrigatório)',
          '• App Secret (obrigatório)',
          '• Tracking ID (opcional - para ganhar comissões)'
        ]
      })
      return
    }

    try {
      const response = await fetch('/api/admin/integrations/aliexpress/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appKey, appSecret, trackingId }),
      })

      if (response.ok) {
        showModal({
          type: 'success',
          title: 'Configuração Salva!',
          message: 'AliExpress configurado com sucesso.',
          details: [
            '✓ Credenciais salvas com segurança',
            '✓ Próximo passo: Autorizar o aplicativo',
            '✓ Clique no botão "Autorizar Aplicativo" abaixo'
          ]
        })
        setAppKey('')
        setAppSecret('')
        setShowConfigForm(false)
        await checkStatus()
      } else {
        const data = await response.json()
        showModal({
          type: 'error',
          title: 'Erro ao Salvar Credenciais',
          message: data.message || 'Não foi possível salvar as credenciais do AliExpress.',
          details: [
            '• Verifique se o App Key está correto',
            '• Verifique se o App Secret está correto',
            '• Certifique-se de que criou o aplicativo no AliExpress',
            '• Consulte a documentação: https://portals.aliexpress.com'
          ],
          action: {
            label: 'Tentar Novamente',
            onClick: closeModal
          }
        })
      }
    } catch (error) {
      showModal({
        type: 'error',
        title: 'Erro de Conexão',
        message: 'Não foi possível conectar ao servidor.',
        details: [
          '• Verifique sua conexão com a internet',
          '• O servidor pode estar indisponível',
          '• Tente novamente em alguns instantes'
        ],
        action: {
          label: 'Tentar Novamente',
          onClick: closeModal
        }
      })
      console.error('Erro ao configurar AliExpress:', error)
    }
  }

  const handleImportProducts = async () => {
    if (!selectedSupplier) {
      showModal({
        type: 'warning',
        title: 'Fornecedor Não Selecionado',
        message: 'Você precisa selecionar um fornecedor antes de importar produtos.',
        details: [
          '• Selecione um fornecedor na lista acima',
          '• Os produtos importados serão associados a este fornecedor',
          '• Se não houver fornecedores, crie um primeiro'
        ]
      })
      return
    }

    setImporting(true)

    try {
      const response = await fetch('/api/admin/integrations/aliexpress/import-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          supplierId: selectedSupplier,
          keywords: keywords || 'trending products',
          categoryId: selectedCategory || ''
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const imported = data.importedProducts?.length || 0
        const errors = data.errors?.length || 0
        
        if (imported > 0 && errors === 0) {
          showModal({
            type: 'success',
            title: 'Produtos Importados!',
            message: `${imported} produto(s) foram importados com sucesso.`,
            details: [
              '✓ Produtos adicionados ao catálogo',
              '✓ Verifique a lista de produtos no menu lateral',
              '✓ Configure preços e estoques se necessário'
            ]
          })
        } else if (imported > 0 && errors > 0) {
          showModal({
            type: 'warning',
            title: 'Importação Parcial',
            message: `${imported} produtos importados, mas ${errors} falharam.`,
            details: [
              `✓ ${imported} produtos importados com sucesso`,
              `✗ ${errors} produtos com erro`,
              '• Verifique os logs para detalhes dos erros',
              '• Tente importar novamente os produtos que falharam'
            ]
          })
        } else {
          showModal({
            type: 'error',
            title: 'Falha na Importação',
            message: 'Nenhum produto foi importado.',
            details: [
              '• Verifique se há produtos disponíveis na categoria',
              '• Tente usar palavras-chave diferentes',
              '• Verifique se sua autorização está válida',
              '• Consulte os logs do servidor para mais detalhes'
            ],
            action: {
              label: 'Tentar Novamente',
              onClick: closeModal
            }
          })
        }
      } else {
        const errorMsg = data.message || 'Erro desconhecido'
        showModal({
          type: 'error',
          title: 'Erro ao Importar Produtos',
          message: errorMsg,
          details: [
            '• Verifique se você está autorizado no AliExpress',
            '• Certifique-se de que suas credenciais estão corretas',
            '• Pode haver um limite de requisições - aguarde alguns minutos',
            '• Verifique sua conexão com a internet'
          ],
          action: {
            label: 'Tentar Novamente',
            onClick: closeModal
          }
        })
      }
    } catch (error) {
      showModal({
        type: 'error',
        title: 'Erro de Conexão',
        message: 'Não foi possível conectar ao servidor para importar produtos.',
        details: [
          '• Verifique sua conexão com a internet',
          '• O servidor pode estar temporariamente indisponível',
          '• Tente novamente em alguns instantes',
          '• Se o erro persistir, contate o suporte'
        ],
        action: {
          label: 'Tentar Novamente',
          onClick: () => {
            closeModal()
            handleImportProducts()
          }
        }
      })
      console.error('Erro ao importar produtos:', error)
    } finally {
      setImporting(false)
    }
  }

  const handleAuthorize = async () => {
    setAuthorizing(true)
    try {
      const response = await fetch('/api/admin/integrations/aliexpress/oauth/authorize')
      
      if (!response.ok) {
        const data = await response.json()
        showModal({
          type: 'error',
          title: 'Erro ao Iniciar Autorização',
          message: data.error || 'Não foi possível gerar a URL de autorização.',
          details: [
            '• Verifique se as credenciais foram configuradas',
            '• App Key e App Secret devem estar corretos',
            '• Tente salvar as credenciais novamente',
            '• Verifique os logs do servidor para mais detalhes'
          ],
          action: {
            label: 'Configurar Credenciais',
            onClick: () => {
              closeModal()
              setShowConfigForm(true)
            }
          }
        })
        setAuthorizing(false)
        return
      }

      const data = await response.json()
      
      if (data.authUrl) {
        showModal({
          type: 'info',
          title: 'Redirecionando para AliExpress',
          message: 'Você será redirecionado para autorizar o aplicativo no AliExpress.',
          details: [
            '1. Faça login na sua conta AliExpress',
            '2. Autorize o acesso ao aplicativo',
            '3. Você será redirecionado de volta automaticamente',
            '4. A integração estará pronta para uso!'
          ]
        })
        
        // Aguardar usuário ler e redirecionar
        setTimeout(() => {
          window.location.href = data.authUrl
        }, 3000)
      } else {
        showModal({
          type: 'error',
          title: 'URL de Autorização Inválida',
          message: 'O servidor não retornou uma URL válida para autorização.',
          details: [
            '• Verifique se as credenciais foram configuradas',
            '• Tente recarregar a página',
            '• Entre em contato com o suporte se o problema persistir'
          ],
          action: {
            label: 'Recarregar',
            onClick: () => {
              closeModal()
              window.location.reload()
            }
          }
        })
        setAuthorizing(false)
      }
    } catch (error) {
      showModal({
        type: 'error',
        title: 'Erro de Conexão',
        message: 'Não foi possível conectar ao servidor para iniciar a autorização.',
        details: [
          '• Verifique sua conexão com a internet',
          '• O servidor pode estar temporariamente indisponível',
          '• Tente novamente em alguns instantes'
        ],
        action: {
          label: 'Tentar Novamente',
          onClick: () => {
            closeModal()
            setAuthorizing(false)
          }
        }
      })
      console.error('Erro ao iniciar autorização:', error)
      setAuthorizing(false)
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
        {/* Aviso sobre API OAuth */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Aviso: API OAuth do AliExpress em teste
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>A autenticação OAuth com o AliExpress ainda está em desenvolvimento e pode apresentar problemas. 
                Por enquanto, você pode usar os <strong>3 produtos demo</strong> disponíveis para testar todo o sistema de dropshipping, 
                incluindo importação, cálculo de preços e margem de lucro.</p>
                <p className="mt-2">Os produtos demo funcionam perfeitamente e permitem que você teste todas as funcionalidades do sistema!</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-orange-600 rounded-lg shadow-lg p-8 text-white mb-8">
          <div className="flex items-center space-x-4">
            <FiPackage className="text-6xl" />
            <div>
              <h1 className="text-3xl font-bold mb-2">Integração AliExpress</h1>
              <p className="text-lg opacity-90">
                Importe produtos do AliExpress como fornecedor dropshipping
              </p>
            </div>
          </div>
        </div>

        {/* Status */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {/* Configuração */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Configuração</h2>

              {status?.configured && !status.error && !showConfigForm ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-green-600">
                      <FiCheck className="text-2xl" />
                      <span className="font-semibold">AliExpress configurado!</span>
                    </div>
                    <button
                      onClick={() => setShowConfigForm(true)}
                      className="text-orange-600 hover:text-orange-700 font-semibold text-sm border border-orange-600 px-4 py-2 rounded-md hover:bg-orange-50 transition-colors"
                    >
                      Reconfigurar Credenciais
                    </button>
                  </div>
                  {status.trackingId && (
                    <div className="text-sm text-gray-600">
                      <p><strong>Tracking ID:</strong> {status.trackingId}</p>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSaveCredentials} className="space-y-4">
                  {status?.configured && showConfigForm && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                      <p className="text-sm text-yellow-800">
                        ⚠️ Você está prestes a alterar as credenciais do AliExpress. As novas credenciais substituirão as anteriores.
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      App Key
                    </label>
                    <input
                      type="text"
                      value={appKey}
                      onChange={(e) => setAppKey(e.target.value)}
                      placeholder="524396"
                      className="w-full border border-gray-300 rounded-md px-4 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      App Secret
                    </label>
                    <input
                      type="password"
                      value={appSecret}
                      onChange={(e) => setAppSecret(e.target.value)}
                      placeholder="••••••••"
                      className="w-full border border-gray-300 rounded-md px-4 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tracking ID (Opcional)
                    </label>
                    <input
                      type="text"
                      value={trackingId}
                      onChange={(e) => setTrackingId(e.target.value)}
                      placeholder="Para rastrear comissões"
                      className="w-full border border-gray-300 rounded-md px-4 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use seu Tracking ID do programa de afiliados
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="bg-orange-600 text-white px-6 py-3 rounded-md hover:bg-orange-700 font-semibold"
                    >
                      Salvar Credenciais
                    </button>
                    
                    {status?.configured && showConfigForm && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowConfigForm(false)
                          setAppKey('')
                          setAppSecret('')
                        }}
                        className="bg-gray-200 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-300 font-semibold"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              )}

              {/* Passo 2: Autorização OAuth - Mostrar após salvar credenciais */}
              {status?.configured && !status.authorized && !showConfigForm && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Passo 2: Autorização OAuth Necessária</h3>
                  <p className="text-sm text-yellow-700 mb-3">
                    Para importar produtos, você precisa autorizar o acesso via OAuth.
                  </p>
                  <button
                    onClick={handleAuthorize}
                    disabled={authorizing}
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {authorizing ? 'Redirecionando...' : '🔐 Autorizar Acesso'}
                  </button>
                </div>
              )}

              {!showConfigForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-4">
                  <p className="text-sm text-blue-800 font-semibold mb-2">
                    Como obter as credenciais:
                  </p>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Acesse <a href="https://portals.aliexpress.com" target="_blank" rel="noopener noreferrer" className="underline">AliExpress Open Platform</a></li>
                    <li>Crie uma conta de desenvolvedor</li>
                    <li>Crie um novo aplicativo</li>
                    <li>Obtenha App Key e App Secret</li>
                    <li>Configure as permissões necessárias (Product Search)</li>
                    <li>Para comissões, cadastre-se no programa de afiliados</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Escolher Nichos */}
            {status?.configured && status.authorized && (
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-md p-6 border-2 border-purple-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2 text-purple-900 flex items-center gap-2">
                      🎯 Importar por Nicho
                    </h2>
                    <p className="text-gray-700 mb-4">
                      Escolha até 12 nichos de produtos para importar em lote do AliExpress
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1 mb-4">
                      <li>✨ Eletrônicos, Moda, Joias, Casa e muito mais</li>
                      <li>🚀 Importação automática com tradução em português</li>
                      <li>🛡️ Prevenção de produtos duplicados</li>
                      <li>💰 Margem de 50% aplicada automaticamente</li>
                    </ul>
                  </div>
                </div>
                <a
                  href="/admin/integracao/aliexpress/nichos"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg hover:from-purple-700 hover:to-blue-700 font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                >
                  <span>📦</span>
                  <span>Escolher Nichos de Produtos</span>
                  <span>→</span>
                </a>
              </div>
            )}

            {/* Importar Produtos */}
            {status?.configured && !status.error && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-4">Importar Produtos Manualmente</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fornecedor
                    </label>
                    <select
                      value={selectedSupplier}
                      onChange={(e) => setSelectedSupplier(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-4 py-2"
                    >
                      <option value="">Selecione um fornecedor</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Produtos serão vinculados a este fornecedor
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoria
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-4 py-2"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Selecione uma categoria ou use 'Todos' para produtos recomendados
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Palavras-chave (opcional)
                    </label>
                    <input
                      type="text"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="Ex: smartwatch, phone case, led lights"
                      className="w-full border border-gray-300 rounded-md px-4 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Deixe vazio para produtos em alta. Use palavras em inglês.
                    </p>
                  </div>

                  <button
                    onClick={handleImportProducts}
                    disabled={importing || !selectedSupplier}
                    className="bg-orange-600 text-white px-6 py-3 rounded-md hover:bg-orange-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {importing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Importando...</span>
                      </>
                    ) : (
                      <>
                        <FiDownload />
                        <span>Buscar e Importar Produtos</span>
                      </>
                    )}
                  </button>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>✅ Produtos validados para Dropshipping:</strong> A API retorna apenas produtos pré-aprovados pelo programa de Dropshipping do AliExpress para o Brasil.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Centralizado */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Cabeçalho do Modal */}
            <div className={`p-6 rounded-t-lg ${
              modal.type === 'success' ? 'bg-green-50 border-b-4 border-green-500' :
              modal.type === 'error' ? 'bg-red-50 border-b-4 border-red-500' :
              modal.type === 'warning' ? 'bg-yellow-50 border-b-4 border-yellow-500' :
              'bg-blue-50 border-b-4 border-blue-500'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {modal.type === 'success' && (
                    <FiCheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                  )}
                  {modal.type === 'error' && (
                    <FiX className="w-8 h-8 text-red-600 flex-shrink-0" />
                  )}
                  {modal.type === 'warning' && (
                    <FiAlertCircle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
                  )}
                  {modal.type === 'info' && (
                    <FiInfo className="w-8 h-8 text-blue-600 flex-shrink-0" />
                  )}
                  <h3 className={`text-xl font-bold ${
                    modal.type === 'success' ? 'text-green-900' :
                    modal.type === 'error' ? 'text-red-900' :
                    modal.type === 'warning' ? 'text-yellow-900' :
                    'text-blue-900'
                  }`}>
                    {modal.title}
                  </h3>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6">
              <p className="text-gray-700 text-base mb-4">
                {modal.message}
              </p>

              {modal.details && modal.details.length > 0 && (
                <div className="bg-gray-50 rounded-md p-4 mb-4">
                  <ul className="space-y-2">
                    {modal.details.map((detail, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <span className="mr-2">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Fechar
                </button>
                {modal.action && (
                  <button
                    onClick={modal.action.onClick}
                    className={`px-4 py-2 rounded-md font-medium text-white transition-colors ${
                      modal.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                      modal.type === 'error' ? 'bg-red-600 hover:bg-red-700' :
                      modal.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                      'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {modal.action.label}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
