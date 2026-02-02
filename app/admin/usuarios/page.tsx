'use client'

import { useState, useEffect } from 'react'
import { 
  FiSearch, FiUserX, FiUserCheck, FiTrash2, FiShield, 
  FiShieldOff, FiAlertTriangle, FiFilter, FiRefreshCw,
  FiUser, FiMail, FiPhone, FiCalendar, FiPackage
} from 'react-icons/fi'
import toast from 'react-hot-toast'

interface User {
  id: string
  name: string | null
  email: string
  phone: string | null
  cpf: string | null
  role: 'USER' | 'ADMIN' | 'SELLER'
  isActive: boolean
  blockedAt: string | null
  blockedReason: string | null
  createdAt: string
  _count: {
    orders: number
  }
}

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalAction, setModalAction] = useState<string>('')
  const [blockReason, setBlockReason] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [statusFilter, roleFilter])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (roleFilter !== 'all') params.append('role', roleFilter)
      
      const response = await fetch(`/api/admin/users?${params}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadUsers()
  }

  const openActionModal = (user: User, action: string) => {
    setSelectedUser(user)
    setModalAction(action)
    setBlockReason('')
    setShowModal(true)
  }

  const executeAction = async () => {
    if (!selectedUser || !modalAction) return

    setProcessing(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: modalAction,
          userId: selectedUser.id,
          reason: blockReason
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar ação')
      }

      toast.success(data.message)
      setShowModal(false)
      loadUsers()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar ação')
    } finally {
      setProcessing(false)
    }
  }

  const getActionTitle = () => {
    switch (modalAction) {
      case 'block': return 'Bloquear Usuário'
      case 'unblock': return 'Desbloquear Usuário'
      case 'delete': return 'Excluir Usuário'
      case 'makeAdmin': return 'Promover a Administrador'
      case 'removeAdmin': return 'Remover Privilégios de Admin'
      default: return 'Confirmar Ação'
    }
  }

  const getActionDescription = () => {
    if (!selectedUser) return ''
    switch (modalAction) {
      case 'block': 
        return `Deseja bloquear o usuário "${selectedUser.name || selectedUser.email}"? Ele não poderá fazer login.`
      case 'unblock': 
        return `Deseja desbloquear o usuário "${selectedUser.name || selectedUser.email}"? Ele poderá fazer login novamente.`
      case 'delete': 
        return `Deseja excluir permanentemente o usuário "${selectedUser.name || selectedUser.email}"? Esta ação não pode ser desfeita.`
      case 'makeAdmin': 
        return `Deseja promover "${selectedUser.name || selectedUser.email}" a administrador? Ele terá acesso total ao sistema.`
      case 'removeAdmin': 
        return `Deseja remover os privilégios de administrador de "${selectedUser.name || selectedUser.email}"?`
      default: 
        return ''
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">Administrador</span>
      case 'SELLER':
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Vendedor</span>
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Usuário</span>
    }
  }

  const getStatusBadge = (user: User) => {
    if (!user.isActive) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 flex items-center gap-1">
          <FiUserX size={12} />
          Bloqueado
        </span>
      )
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 flex items-center gap-1">
        <FiUserCheck size={12} />
        Ativo
      </span>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
          <p className="text-gray-600 mt-1">{users.length} usuário(s) encontrado(s)</p>
        </div>
        <button
          onClick={loadUsers}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <form onSubmit={handleSearch} className="flex-1 min-w-[300px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome, email, CPF ou telefone..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </form>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="blocked">Bloqueados</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Todas</option>
              <option value="USER">Usuários</option>
              <option value="ADMIN">Administradores</option>
              <option value="SELLER">Vendedores</option>
            </select>
          </div>

          <button
            type="submit"
            onClick={handleSearch}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <FiFilter className="inline mr-2" />
            Filtrar
          </button>
        </div>
      </div>

      {/* Tabela de usuários */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold">Usuário</th>
                  <th className="text-left py-4 px-6 font-semibold">Contato</th>
                  <th className="text-left py-4 px-6 font-semibold">Função</th>
                  <th className="text-left py-4 px-6 font-semibold">Status</th>
                  <th className="text-left py-4 px-6 font-semibold">Pedidos</th>
                  <th className="text-left py-4 px-6 font-semibold">Cadastro</th>
                  <th className="text-right py-4 px-6 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className={`border-b hover:bg-gray-50 ${!user.isActive ? 'bg-red-50' : ''}`}>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          user.role === 'ADMIN' ? 'bg-purple-100' : 'bg-gray-100'
                        }`}>
                          <FiUser className={user.role === 'ADMIN' ? 'text-purple-600' : 'text-gray-600'} />
                        </div>
                        <div>
                          <p className="font-semibold">{user.name || 'Sem nome'}</p>
                          <p className="text-sm text-gray-500">{user.cpf || 'CPF não informado'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <p className="text-sm flex items-center gap-1">
                          <FiMail size={12} className="text-gray-400" />
                          {user.email}
                        </p>
                        {user.phone && (
                          <p className="text-sm flex items-center gap-1 text-gray-600">
                            <FiPhone size={12} className="text-gray-400" />
                            {user.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">{getRoleBadge(user.role)}</td>
                    <td className="py-4 px-6">
                      <div>
                        {getStatusBadge(user)}
                        {user.blockedReason && (
                          <p className="text-xs text-red-600 mt-1">{user.blockedReason}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="flex items-center gap-1">
                        <FiPackage size={14} className="text-gray-400" />
                        {user._count.orders}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm flex items-center gap-1">
                        <FiCalendar size={12} className="text-gray-400" />
                        {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end gap-2">
                        {/* Bloquear / Desbloquear */}
                        {user.isActive ? (
                          <button
                            onClick={() => openActionModal(user, 'block')}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Bloquear usuário"
                            disabled={user.role === 'ADMIN'}
                          >
                            <FiUserX size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={() => openActionModal(user, 'unblock')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Desbloquear usuário"
                          >
                            <FiUserCheck size={18} />
                          </button>
                        )}

                        {/* Promover / Remover Admin */}
                        {user.role !== 'ADMIN' ? (
                          <button
                            onClick={() => openActionModal(user, 'makeAdmin')}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Promover a administrador"
                          >
                            <FiShield size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={() => openActionModal(user, 'removeAdmin')}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Remover privilégios de admin"
                          >
                            <FiShieldOff size={18} />
                          </button>
                        )}

                        {/* Excluir - só se não tiver pedidos e não for admin */}
                        {user._count.orders === 0 && user.role !== 'ADMIN' && (
                          <button
                            onClick={() => openActionModal(user, 'delete')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir usuário"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && users.length === 0 && (
          <div className="text-center py-12">
            <FiUser size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Nenhum usuário encontrado</p>
          </div>
        )}
      </div>

      {/* Modal de Confirmação */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-full ${
                  modalAction === 'delete' ? 'bg-red-100' : 
                  modalAction === 'block' ? 'bg-orange-100' : 
                  'bg-blue-100'
                }`}>
                  {modalAction === 'delete' ? <FiTrash2 className="text-red-600" size={24} /> :
                   modalAction === 'block' ? <FiUserX className="text-orange-600" size={24} /> :
                   modalAction === 'unblock' ? <FiUserCheck className="text-green-600" size={24} /> :
                   <FiAlertTriangle className="text-blue-600" size={24} />}
                </div>
                <h3 className="text-xl font-bold">{getActionTitle()}</h3>
              </div>

              <p className="text-gray-600 mb-4">{getActionDescription()}</p>

              {modalAction === 'block' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo do bloqueio (opcional)
                  </label>
                  <input
                    type="text"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Ex: Tentativa de fraude, conta duplicada..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={processing}
                >
                  Cancelar
                </button>
                <button
                  onClick={executeAction}
                  disabled={processing}
                  className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors ${
                    modalAction === 'delete' ? 'bg-red-600 hover:bg-red-700' :
                    modalAction === 'block' ? 'bg-orange-600 hover:bg-orange-700' :
                    'bg-primary-600 hover:bg-primary-700'
                  }`}
                >
                  {processing ? 'Processando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
