'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FiMail, FiSave, FiSend, FiServer, FiLock, FiUser, 
  FiCheck, FiX, FiAlertCircle, FiRefreshCw, FiSettings,
  FiPlus, FiTrash2, FiEdit, FiUsers, FiInbox
} from 'react-icons/fi'
interface EmailConfig {
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  smtpSecure: boolean
  fromName: string
  fromEmail: string
}

interface EmailAccount {
  id: string
  email: string
  name: string
  isDefault: boolean
  createdAt: string
}

export default function EmailConfigPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [activeTab, setActiveTab] = useState<'smtp' | 'accounts' | 'templates'>('smtp')
  
  const [config, setConfig] = useState<EmailConfig>({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpSecure: false,
    fromName: '',
    fromEmail: ''
  })

  // Para contas de email no servidor próprio
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [newAccount, setNewAccount] = useState({ email: '', name: '', password: '' })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.role !== 'ADMIN') {
      router.push('/')
    }
  }, [session, status, router])

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/config/email')
      
      if (res.ok) {
        const data = await res.json()
        if (data.config) {
          setConfig(data.config)
        }
        if (data.accounts) {
          setAccounts(data.accounts)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const res = await fetch('/api/admin/config/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      })

      if (res.ok) {
        toast.success('Configurações salvas com sucesso!')
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao salvar')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!testEmail) {
      toast.error('Digite um e-mail para teste')
      return
    }

    try {
      setTesting(true)
      setTestResult(null)
      
      const res = await fetch('/api/admin/config/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: testEmail,
          config 
        })
      })

      const data = await res.json()
      
      if (res.ok && data.success) {
        setTestResult({ success: true, message: 'E-mail enviado com sucesso!' })
        toast.success('E-mail de teste enviado!')
      } else {
        setTestResult({ success: false, message: data.error || 'Falha ao enviar e-mail' })
        toast.error(data.error || 'Erro ao enviar e-mail de teste')
      }
    } catch (error) {
      console.error('Erro no teste:', error)
      setTestResult({ success: false, message: 'Erro ao testar conexão' })
      toast.error('Erro ao testar')
    } finally {
      setTesting(false)
    }
  }

  const handleAddAccount = async () => {
    if (!newAccount.email || !newAccount.password) {
      toast.error('Preencha e-mail e senha')
      return
    }

    try {
      const res = await fetch('/api/admin/config/email/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccount)
      })

      if (res.ok) {
        toast.success('Conta criada com sucesso!')
        setShowAddAccount(false)
        setNewAccount({ email: '', name: '', password: '' })
        loadConfig()
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao criar conta')
      }
    } catch (error) {
      console.error('Erro ao criar conta:', error)
      toast.error('Erro ao criar conta')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-blue-100 rounded-xl">
            <FiMail className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Configurações de E-mail</h1>
            <p className="text-gray-600">Gerencie o servidor SMTP e contas de e-mail</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('smtp')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'smtp' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          <FiServer className="inline mr-2" />
          Servidor SMTP
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'accounts' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          <FiUsers className="inline mr-2" />
          Contas de E-mail
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'templates' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          <FiInbox className="inline mr-2" />
          Templates
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'smtp' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configurações SMTP */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiServer className="text-blue-600" />
              Configurações do Servidor
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Host SMTP
                </label>
                <input
                  type="text"
                  value={config.smtpHost}
                  onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })}
                  placeholder="mail.seudominio.com.br"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ex: mail.mydsistemas.com.br, smtp.gmail.com
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Porta
                  </label>
                  <input
                    type="number"
                    value={config.smtpPort}
                    onChange={(e) => setConfig({ ...config, smtpPort: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conexão Segura
                  </label>
                  <select
                    value={config.smtpSecure ? 'ssl' : 'tls'}
                    onChange={(e) => setConfig({ ...config, smtpSecure: e.target.value === 'ssl' })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="tls">STARTTLS (587)</option>
                    <option value="ssl">SSL/TLS (465)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FiUser className="inline mr-1" />
                  Usuário
                </label>
                <input
                  type="text"
                  value={config.smtpUser}
                  onChange={(e) => setConfig({ ...config, smtpUser: e.target.value })}
                  placeholder="contato@seudominio.com.br"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FiLock className="inline mr-1" />
                  Senha
                </label>
                <input
                  type="password"
                  value={config.smtpPassword}
                  onChange={(e) => setConfig({ ...config, smtpPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Remetente */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FiMail className="text-green-600" />
                Remetente Padrão
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Remetente
                  </label>
                  <input
                    type="text"
                    value={config.fromName}
                    onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                    placeholder="MYDSHOP"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-mail do Remetente
                  </label>
                  <input
                    type="email"
                    value={config.fromEmail}
                    onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                    placeholder="noreply@seudominio.com.br"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Teste de Conexão */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FiSend className="text-orange-600" />
                Testar Conexão
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-mail para teste
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={handleTest}
                  disabled={testing || !testEmail}
                  className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {testing ? (
                    <>
                      <FiRefreshCw className="animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <FiSend />
                      Enviar E-mail de Teste
                    </>
                  )}
                </button>

                {testResult && (
                  <div className={`p-4 rounded-lg flex items-start gap-3 ${
                    testResult.success 
                      ? 'bg-green-50 text-green-800 border border-green-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {testResult.success ? (
                      <FiCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    ) : (
                      <FiX className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'accounts' && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FiUsers className="text-blue-600" />
              Contas de E-mail
            </h2>
            <button
              onClick={() => setShowAddAccount(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <FiPlus />
              Nova Conta
            </button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="text-yellow-600 w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-800 font-medium">Servidor de E-mail Local</p>
                <p className="text-yellow-700 text-sm">
                  As contas abaixo são gerenciadas pelo servidor Postfix/Dovecot na VPS.
                  Use o terminal SSH para criar novas contas: <code className="bg-yellow-100 px-1 rounded">adduser nome</code>
                </p>
              </div>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FiInbox className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma conta de e-mail cadastrada</p>
              <p className="text-sm">Crie contas no servidor via SSH</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <FiMail className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{account.email}</p>
                      <p className="text-sm text-gray-500">{account.name || 'Sem nome'}</p>
                    </div>
                    {account.isDefault && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        Padrão
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-blue-600">
                      <FiEdit />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600">
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal Adicionar Conta */}
          {showAddAccount && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Nova Conta de E-mail</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Usuário (antes do @)
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={newAccount.email}
                        onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
                        placeholder="contato"
                        className="flex-1 px-4 py-2 border rounded-l-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="px-4 py-2 bg-gray-100 border border-l-0 rounded-r-lg text-gray-600">
                        @mydsistemas.com.br
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={newAccount.name}
                      onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                      placeholder="Contato MYD"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Senha
                    </label>
                    <input
                      type="password"
                      value={newAccount.password}
                      onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowAddAccount(false)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddAccount}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Criar Conta
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiInbox className="text-purple-600" />
            Templates de E-mail
          </h2>

          <p className="text-gray-600 mb-6">
            Configure os templates de e-mail enviados automaticamente pelo sistema.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'welcome', name: 'Boas-vindas', description: 'Enviado ao criar conta' },
              { id: 'order_confirmed', name: 'Pedido Confirmado', description: 'Enviado após confirmar pedido' },
              { id: 'payment_received', name: 'Pagamento Recebido', description: 'Enviado ao receber pagamento' },
              { id: 'order_awaiting_shipment', name: 'Pedido Aguardando Envio', description: 'Enviado para pedidos prontos há mais de 2 dias' },
              { id: 'order_shipped', name: 'Pedido Enviado', description: 'Enviado ao despachar pedido' },
              { id: 'order_delivered', name: 'Pedido Entregue', description: 'Enviado quando pedido é entregue' },
              { id: 'order_cancelled', name: 'Pedido Cancelado', description: 'Enviado ao cancelar pedido' },
              { id: 'cart_abandoned', name: 'Carrinho Abandonado', description: 'Enviado após 3 dias de inatividade' },
              { id: 'password_reset', name: 'Recuperar Senha', description: 'Enviado ao solicitar nova senha' },
            ].map((template) => (
              <div
                key={template.id}
                className="p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{template.name}</h3>
                    <p className="text-sm text-gray-500">{template.description}</p>
                  </div>
                  <FiEdit className="text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botão Salvar Fixo */}
      {activeTab === 'smtp' && (
        <div className="fixed bottom-6 right-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <FiRefreshCw className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <FiSave />
                Salvar Configurações
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
