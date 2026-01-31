'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FiMail, FiSend, FiInbox, FiTrash2, FiStar, FiPaperclip,
  FiRefreshCw, FiSearch, FiPlus, FiX, FiChevronLeft,
  FiDownload, FiFile, FiImage, FiFileText, FiArchive,
  FiEdit, FiCornerUpLeft, FiCornerUpRight, FiClock,
  FiAlertCircle, FiCheck, FiMenu, FiSettings
} from 'react-icons/fi'
interface Email {
  id: string
  from: string
  fromName: string
  to: string
  subject: string
  body: string
  bodyHtml?: string
  date: string
  read: boolean
  starred: boolean
  folder: 'inbox' | 'sent' | 'drafts' | 'trash'
  attachments?: { name: string; size: number; type: string; url?: string }[]
}

interface EmailAccount {
  email: string
  name: string
  isDefault: boolean
}

const FOLDERS = [
  { id: 'inbox', name: 'Caixa de Entrada', icon: FiInbox },
  { id: 'sent', name: 'Enviados', icon: FiSend },
  { id: 'drafts', name: 'Rascunhos', icon: FiEdit },
  { id: 'starred', name: 'Favoritos', icon: FiStar },
  { id: 'trash', name: 'Lixeira', icon: FiTrash2 },
]

export default function EmailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFolder, setActiveFolder] = useState('inbox')
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [sending, setSending] = useState(false)
  const [accounts, setAccounts] = useState<EmailAccount[]>([
    { email: 'contato@mydsistemas.com.br', name: 'Contato MYD', isDefault: true }
  ])
  
  // Compose form
  const [composeData, setComposeData] = useState({
    to: '',
    cc: '',
    subject: '',
    body: '',
    attachments: [] as File[]
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.role !== 'ADMIN') {
      router.push('/')
    }
  }, [session, status, router])

  useEffect(() => {
    loadEmails()
  }, [activeFolder])

  const loadEmails = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/email?folder=${activeFolder}`)
      
      if (res.ok) {
        const data = await res.json()
        setEmails(data.emails || [])
      } else {
        // Mock data para demonstração
        setEmails(getMockEmails())
      }
    } catch (error) {
      console.error('Erro ao carregar emails:', error)
      setEmails(getMockEmails())
    } finally {
      setLoading(false)
    }
  }

  const getMockEmails = (): Email[] => {
    if (activeFolder === 'inbox') {
      return [
        {
          id: '1',
          from: 'suporte@meta.com',
          fromName: 'Meta Business',
          to: 'contato@mydsistemas.com.br',
          subject: 'Código de verificação: 847291',
          body: 'Seu código de verificação é: 847291\n\nUse este código para verificar sua conta do WhatsApp Business.',
          date: new Date().toISOString(),
          read: false,
          starred: false,
          folder: 'inbox'
        },
        {
          id: '2',
          from: 'noreply@mercadopago.com',
          fromName: 'Mercado Pago',
          to: 'contato@mydsistemas.com.br',
          subject: 'Pagamento recebido - Pedido #12345',
          body: 'Você recebeu um pagamento de R$ 150,00 referente ao pedido #12345.',
          date: new Date(Date.now() - 3600000).toISOString(),
          read: true,
          starred: true,
          folder: 'inbox'
        }
      ]
    }
    return []
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadEmails()
    setRefreshing(false)
    toast.success('Emails atualizados')
  }

  const handleSendEmail = async () => {
    if (!composeData.to || !composeData.subject) {
      toast.error('Preencha destinatário e assunto')
      return
    }

    try {
      setSending(true)
      
      const formData = new FormData()
      formData.append('to', composeData.to)
      formData.append('cc', composeData.cc)
      formData.append('subject', composeData.subject)
      formData.append('body', composeData.body)
      
      composeData.attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file)
      })

      const res = await fetch('/api/admin/email/send', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        toast.success('E-mail enviado com sucesso!')
        setShowCompose(false)
        setComposeData({ to: '', cc: '', subject: '', body: '', attachments: [] })
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao enviar')
      }
    } catch (error) {
      console.error('Erro ao enviar:', error)
      toast.error('Erro ao enviar e-mail')
    } finally {
      setSending(false)
    }
  }

  const handleDeleteEmail = async (emailId: string) => {
    try {
      await fetch(`/api/admin/email/${emailId}`, { method: 'DELETE' })
      setEmails(emails.filter(e => e.id !== emailId))
      setSelectedEmail(null)
      toast.success('E-mail movido para lixeira')
    } catch (error) {
      toast.error('Erro ao excluir')
    }
  }

  const handleStarEmail = (emailId: string) => {
    setEmails(emails.map(e => 
      e.id === emailId ? { ...e, starred: !e.starred } : e
    ))
  }

  const handleMarkAsRead = (emailId: string) => {
    setEmails(emails.map(e => 
      e.id === emailId ? { ...e, read: true } : e
    ))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setComposeData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }))
  }

  const removeAttachment = (index: number) => {
    setComposeData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 86400000) { // Menos de 24h
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
    if (diff < 604800000) { // Menos de 7 dias
      return date.toLocaleDateString('pt-BR', { weekday: 'short' })
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  const filteredEmails = emails.filter(email => {
    if (activeFolder === 'starred') return email.starred
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        email.subject.toLowerCase().includes(query) ||
        email.from.toLowerCase().includes(query) ||
        email.body.toLowerCase().includes(query)
      )
    }
    return true
  })

  const unreadCount = emails.filter(e => !e.read).length

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-64px)] flex bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r flex flex-col">
        {/* Botão Novo Email */}
        <div className="p-4">
          <button
            onClick={() => setShowCompose(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
          >
            <FiPlus size={20} />
            <span className="font-medium">Novo E-mail</span>
          </button>
        </div>

        {/* Pastas */}
        <nav className="flex-1 px-3">
          {FOLDERS.map(folder => {
            const Icon = folder.icon
            const isActive = activeFolder === folder.id
            const count = folder.id === 'inbox' ? unreadCount : 0
            
            return (
              <button
                key={folder.id}
                onClick={() => {
                  setActiveFolder(folder.id)
                  setSelectedEmail(null)
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} />
                <span className="flex-1 text-left text-sm">{folder.name}</span>
                {count > 0 && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Conta de Email */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FiMail className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {accounts[0]?.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {accounts[0]?.email}
              </p>
            </div>
            <button 
              onClick={() => router.push('/admin/configuracoes')}
              className="p-1.5 text-gray-400 hover:text-gray-600"
            >
              <FiSettings size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Emails */}
      <div className={`w-96 bg-white border-r flex flex-col ${selectedEmail ? 'hidden md:flex' : 'flex'}`}>
        {/* Header da Lista */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold flex-1">
              {FOLDERS.find(f => f.id === activeFolder)?.name}
            </h2>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <FiRefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
          
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar e-mails..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FiInbox size={48} className="mb-3 opacity-50" />
              <p>Nenhum e-mail encontrado</p>
            </div>
          ) : (
            filteredEmails.map(email => (
              <div
                key={email.id}
                onClick={() => {
                  setSelectedEmail(email)
                  handleMarkAsRead(email.id)
                }}
                className={`p-4 border-b cursor-pointer transition-colors ${
                  selectedEmail?.id === email.id 
                    ? 'bg-blue-50' 
                    : email.read 
                      ? 'bg-white hover:bg-gray-50' 
                      : 'bg-blue-50/50 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStarEmail(email.id)
                    }}
                    className={`mt-1 ${email.starred ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'}`}
                  >
                    <FiStar size={16} fill={email.starred ? 'currentColor' : 'none'} />
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm truncate ${!email.read ? 'font-semibold' : ''}`}>
                        {email.fromName || email.from}
                      </span>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {formatDate(email.date)}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${!email.read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                      {email.subject}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {(email.body || '').substring(0, 80) || 'Clique para visualizar'}...
                    </p>
                    {email.attachments && email.attachments.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-gray-400">
                        <FiPaperclip size={12} />
                        <span className="text-xs">{email.attachments.length} anexo(s)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Visualização do Email */}
      <div className={`flex-1 bg-white flex flex-col ${selectedEmail ? 'flex' : 'hidden md:flex'}`}>
        {selectedEmail ? (
          <>
            {/* Header do Email */}
            <div className="p-4 border-b">
              <div className="flex items-center gap-2 mb-4 md:hidden">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <FiChevronLeft size={20} />
                </button>
                <span className="font-medium">Voltar</span>
              </div>
              
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {selectedEmail.subject}
                  </h2>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-lg font-medium text-gray-600">
                        {(selectedEmail.fromName || selectedEmail.from)[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {selectedEmail.fromName || selectedEmail.from}
                      </p>
                      <p className="text-sm text-gray-500">
                        {selectedEmail.from}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {new Date(selectedEmail.date).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="px-4 py-2 border-b flex items-center gap-2">
              <button
                onClick={() => {
                  setShowCompose(true)
                  setComposeData(prev => ({
                    ...prev,
                    to: selectedEmail.from,
                    subject: `Re: ${selectedEmail.subject}`
                  }))
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <FiCornerUpLeft size={16} />
                Responder
              </button>
              <button
                onClick={() => {
                  setShowCompose(true)
                  setComposeData(prev => ({
                    ...prev,
                    subject: `Fwd: ${selectedEmail.subject}`,
                    body: `\n\n---------- Mensagem encaminhada ----------\nDe: ${selectedEmail.from}\nData: ${new Date(selectedEmail.date).toLocaleString('pt-BR')}\nAssunto: ${selectedEmail.subject}\n\n${selectedEmail.body}`
                  }))
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <FiCornerUpRight size={16} />
                Encaminhar
              </button>
              <button
                onClick={() => handleStarEmail(selectedEmail.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg ${
                  selectedEmail.starred 
                    ? 'text-yellow-600 bg-yellow-50' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FiStar size={16} fill={selectedEmail.starred ? 'currentColor' : 'none'} />
                {selectedEmail.starred ? 'Remover' : 'Favoritar'}
              </button>
              <div className="flex-1" />
              <button
                onClick={() => handleDeleteEmail(selectedEmail.id)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
              >
                <FiTrash2 size={16} />
                Excluir
              </button>
            </div>

            {/* Conteúdo do Email */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedEmail.bodyHtml ? (
                <iframe
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <style>
                        body { 
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                          margin: 0;
                          padding: 0;
                          color: #333;
                          line-height: 1.6;
                        }
                        img { max-width: 100%; height: auto; }
                        a { color: #2563eb; }
                        table { max-width: 100%; }
                      </style>
                    </head>
                    <body>${selectedEmail.bodyHtml}</body>
                    </html>
                  `}
                  sandbox="allow-same-origin"
                  className="w-full min-h-[400px] border-0"
                  style={{ height: 'calc(100vh - 400px)' }}
                  title="Email Content"
                />
              ) : selectedEmail.body ? (
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-gray-700">
                    {selectedEmail.body}
                  </pre>
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  <FiMail size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Nenhum conteúdo disponível</p>
                </div>
              )}

              {/* Anexos */}
              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div className="mt-8 pt-6 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Anexos ({selectedEmail.attachments.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedEmail.attachments.map((att, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        {att.type.startsWith('image/') ? (
                          <FiImage className="text-blue-500" size={24} />
                        ) : att.type === 'application/pdf' ? (
                          <FiFileText className="text-red-500" size={24} />
                        ) : (
                          <FiFile className="text-gray-500" size={24} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{att.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(att.size)}</p>
                        </div>
                        <FiDownload className="text-gray-400" size={18} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <FiMail size={64} className="mb-4 opacity-30" />
            <p className="text-lg">Selecione um e-mail para visualizar</p>
            <p className="text-sm mt-1">Ou clique em "Novo E-mail" para começar</p>
          </div>
        )}
      </div>

      {/* Modal Compor Email */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white w-full max-w-2xl rounded-t-xl md:rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-lg">Nova Mensagem</h3>
              <button
                onClick={() => setShowCompose(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto">
              <div className="border-b">
                <div className="flex items-center px-4 py-2 border-b">
                  <label className="w-16 text-sm text-gray-500">Para:</label>
                  <input
                    type="text"
                    value={composeData.to}
                    onChange={(e) => setComposeData(prev => ({ ...prev, to: e.target.value }))}
                    placeholder="destinatario@email.com"
                    className="flex-1 py-1 focus:outline-none"
                  />
                </div>
                <div className="flex items-center px-4 py-2 border-b">
                  <label className="w-16 text-sm text-gray-500">Cc:</label>
                  <input
                    type="text"
                    value={composeData.cc}
                    onChange={(e) => setComposeData(prev => ({ ...prev, cc: e.target.value }))}
                    placeholder="copia@email.com"
                    className="flex-1 py-1 focus:outline-none"
                  />
                </div>
                <div className="flex items-center px-4 py-2">
                  <label className="w-16 text-sm text-gray-500">Assunto:</label>
                  <input
                    type="text"
                    value={composeData.subject}
                    onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Assunto do e-mail"
                    className="flex-1 py-1 focus:outline-none"
                  />
                </div>
              </div>

              {/* Corpo */}
              <textarea
                value={composeData.body}
                onChange={(e) => setComposeData(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Escreva sua mensagem..."
                className="w-full h-64 p-4 focus:outline-none resize-none"
              />

              {/* Anexos */}
              {composeData.attachments.length > 0 && (
                <div className="px-4 py-3 border-t bg-gray-50">
                  <p className="text-sm text-gray-600 mb-2">
                    Anexos ({composeData.attachments.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {composeData.attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-lg text-sm"
                      >
                        <FiPaperclip size={14} className="text-gray-400" />
                        <span className="truncate max-w-[150px]">{file.name}</span>
                        <span className="text-gray-400">({formatFileSize(file.size)})</span>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="p-0.5 hover:bg-gray-100 rounded"
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-4 py-3 border-t bg-gray-50">
              <button
                onClick={handleSendEmail}
                disabled={sending || !composeData.to}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <FiRefreshCw className="animate-spin" size={18} />
                    Enviando...
                  </>
                ) : (
                  <>
                    <FiSend size={18} />
                    Enviar
                  </>
                )}
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
              >
                <FiPaperclip size={18} />
                Anexar
              </button>

              <div className="flex-1" />
              
              <button
                onClick={() => setShowCompose(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
