'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  FiMail, FiSend, FiInbox, FiTrash2, FiStar, 
  FiRefreshCw, FiSearch, FiPlus, FiX, FiLogOut,
  FiChevronLeft, FiPaperclip, FiArchive, FiEdit
} from 'react-icons/fi'
import toast from 'react-hot-toast'

interface Email {
  id: string
  from: string
  fromName: string
  to: string
  subject: string
  body: string
  date: string
  read: boolean
  starred: boolean
  folder: string
  attachments?: any[]
}

const FOLDERS = [
  { id: 'inbox', name: 'Caixa de Entrada', icon: FiInbox },
  { id: 'sent', name: 'Enviados', icon: FiSend },
  { id: 'drafts', name: 'Rascunhos', icon: FiEdit },
  { id: 'starred', name: 'Favoritos', icon: FiStar },
  { id: 'trash', name: 'Lixeira', icon: FiTrash2 }
]

export default function WebmailInboxPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFolder, setActiveFolder] = useState('inbox')
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  
  const [composeData, setComposeData] = useState({
    to: '',
    subject: '',
    body: ''
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (userEmail) {
      loadEmails()
    }
  }, [activeFolder, userEmail])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/webmail/session')
      const data = await res.json()
      
      if (data.authenticated) {
        setUserEmail(data.email)
      } else {
        router.push('/webmail')
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error)
      router.push('/webmail')
    } finally {
      setLoading(false)
    }
  }

  const loadEmails = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/webmail/emails?folder=${activeFolder}`)
      
      if (res.ok) {
        const data = await res.json()
        setEmails(data.emails || [])
      } else {
        toast.error('Erro ao carregar emails')
      }
    } catch (error) {
      console.error('Erro ao carregar emails:', error)
      toast.error('Erro ao conectar com servidor')
    } finally {
      setLoading(false)
    }
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
      const res = await fetch('/api/webmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(composeData)
      })

      if (res.ok) {
        toast.success('E-mail enviado!')
        setShowCompose(false)
        setComposeData({ to: '', subject: '', body: '' })
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao enviar')
      }
    } catch (error) {
      console.error('Erro ao enviar:', error)
      toast.error('Erro ao enviar e-mail')
    }
  }

  const handleLogout = async () => {
    await fetch('/api/webmail/logout', { method: 'POST' })
    router.push('/webmail')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 86400000) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  const filteredEmails = emails.filter(email => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <button
            onClick={() => setShowCompose(true)}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium"
          >
            <FiPlus />
            Novo E-mail
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {FOLDERS.map(folder => {
            const Icon = folder.icon
            const count = emails.filter(e => e.folder === folder.id).length
            
            return (
              <button
                key={folder.id}
                onClick={() => setActiveFolder(folder.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeFolder === folder.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} />
                <span className="flex-1 text-left">{folder.name}</span>
                {count > 0 && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FiMail className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userEmail}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
          >
            <FiLogOut size={16} />
            Sair
          </button>
        </div>
      </div>

      {/* Lista de Emails */}
      <div className={`w-96 bg-white border-r flex flex-col ${selectedEmail ? 'hidden md:flex' : 'flex'}`}>
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
              placeholder="Buscar..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FiInbox size={48} className="mb-3 opacity-50" />
              <p>Nenhum e-mail</p>
            </div>
          ) : (
            filteredEmails.map(email => (
              <div
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                  !email.read ? 'bg-blue-50' : ''
                } ${selectedEmail?.id === email.id ? 'bg-blue-100' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    {email.fromName[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-sm truncate ${!email.read ? 'font-semibold' : 'font-medium'}`}>
                        {email.fromName}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatDate(email.date)}
                      </span>
                    </div>
                    <p className={`text-sm mb-1 truncate ${!email.read ? 'font-medium' : 'text-gray-600'}`}>
                      {email.subject}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {email.body}
                    </p>
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
            <div className="p-4 border-b">
              <button
                onClick={() => setSelectedEmail(null)}
                className="md:hidden mb-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <FiChevronLeft size={20} />
              </button>
              
              <h2 className="text-xl font-semibold mb-3">{selectedEmail.subject}</h2>
              
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  {selectedEmail.fromName[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{selectedEmail.fromName}</p>
                  <p className="text-sm text-gray-600">{selectedEmail.from}</p>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(selectedEmail.date).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              <div className="whitespace-pre-wrap">{selectedEmail.body}</div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FiMail size={64} className="mb-4 opacity-50" />
            <p className="text-lg">Selecione um e-mail</p>
          </div>
        )}
      </div>

      {/* Modal Compor */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-lg">Nova Mensagem</h3>
              <button onClick={() => setShowCompose(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <FiX size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-4 border-b">
                <input
                  type="email"
                  value={composeData.to}
                  onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                  placeholder="Para:"
                  className="w-full py-2 focus:outline-none"
                />
              </div>
              <div className="p-4 border-b">
                <input
                  type="text"
                  value={composeData.subject}
                  onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  placeholder="Assunto:"
                  className="w-full py-2 focus:outline-none"
                />
              </div>
              <textarea
                value={composeData.body}
                onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                placeholder="Escreva sua mensagem..."
                className="w-full h-64 p-4 focus:outline-none resize-none"
              />
            </div>

            <div className="px-4 py-3 border-t flex items-center justify-between">
              <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <FiPaperclip />
              </button>
              <button
                onClick={handleSendEmail}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <FiSend />
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
