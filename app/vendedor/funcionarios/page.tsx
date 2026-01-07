'use client'

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { FiUserPlus, FiTrash2, FiUsers, FiMail, FiEdit2 } from "react-icons/fi"

interface Employee {
  id: string
  name: string
  email: string
  employeeRole: 'MANAGER' | 'OPERATOR' | 'VIEWER' | null
  createdAt: string
}

export default function FuncionariosPage() {
  const { data: session, status } = useSession()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    employeeRole: "OPERATOR" as 'MANAGER' | 'OPERATOR' | 'VIEWER'
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/login')
    }
    if (status === 'authenticated' && session?.user?.role !== 'SELLER') {
      redirect('/')
    }
    
    loadEmployees()
  }, [status, session])

  const loadEmployees = async () => {
    try {
      const res = await fetch('/api/seller/employees')
      if (res.ok) {
        const data = await res.json()
        setEmployees(data)
      }
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/seller/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        alert('Funcionário adicionado com sucesso!')
        setShowModal(false)
        setFormData({ name: "", email: "", password: "", employeeRole: "OPERATOR" })
        loadEmployees()
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao adicionar funcionário')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao adicionar funcionário')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (employeeId: string) => {
    if (!confirm('Deseja realmente remover este funcionário?')) return

    try {
      const res = await fetch('/api/seller/employees', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId })
      })

      if (res.ok) {
        alert('Funcionário removido com sucesso!')
        loadEmployees()
      } else {
        alert('Erro ao remover funcionário')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao remover funcionário')
    }
  }

  const handleEditClick = (employee: Employee) => {
    setEditingEmployee(employee)
    setShowEditModal(true)
  }

  const handleUpdateRole = async (newRole: 'MANAGER' | 'OPERATOR' | 'VIEWER') => {
    if (!editingEmployee) return
    setLoading(true)

    try {
      const res = await fetch('/api/seller/employees/update-role', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          employeeId: editingEmployee.id,
          employeeRole: newRole
        })
      })

      if (res.ok) {
        alert('Nível de acesso atualizado com sucesso!')
        setShowEditModal(false)
        setEditingEmployee(null)
        loadEmployees()
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao atualizar nível de acesso')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao atualizar nível de acesso')
    } finally {
      setLoading(false)
    }
  }

  const getRolePermissions = (role: 'MANAGER' | 'OPERATOR' | 'VIEWER' | null) => {
    switch (role) {
      case 'MANAGER':
        return {
          canManageProducts: true,
          canManageOrders: true,
          canViewFinancial: true,
          canManageEmployees: false,
          canManageIntegrations: false,
          canManageDropshipping: true
        }
      case 'OPERATOR':
        return {
          canManageProducts: true,
          canManageOrders: true,
          canViewFinancial: false,
          canManageEmployees: false,
          canManageIntegrations: false,
          canManageDropshipping: false
        }
      case 'VIEWER':
        return {
          canManageProducts: false,
          canManageOrders: false,
          canViewFinancial: true,
          canManageEmployees: false,
          canManageIntegrations: false,
          canManageDropshipping: false
        }
      default:
        return {
          canManageProducts: false,
          canManageOrders: false,
          canViewFinancial: false,
          canManageEmployees: false,
          canManageIntegrations: false,
          canManageDropshipping: false
        }
    }
  }

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>
  }

  if (!session || session.user.role !== 'SELLER') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Funcionários</h1>
            <p className="text-gray-600 mt-2">
              Gerencie os funcionários que têm acesso à sua loja
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FiUserPlus />
            Adicionar Funcionário
          </button>
        </div>

        {/* Estatísticas */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-4 rounded-lg">
              <FiUsers className="text-3xl text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total de Funcionários</p>
              <p className="text-3xl font-bold text-gray-900">{employees.length}</p>
            </div>
          </div>
        </div>

        {/* Lista de Funcionários */}
        <div className="bg-white rounded-lg shadow">
          {employees.length === 0 ? (
            <div className="p-12 text-center">
              <FiUsers className="text-6xl text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhum funcionário cadastrado
              </h3>
              <p className="text-gray-600 mb-6">
                Adicione funcionários para ajudar a gerenciar sua loja
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <FiUserPlus />
                Adicionar Primeiro Funcionário
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold">Nome</th>
                    <th className="text-left py-4 px-6 font-semibold">Email</th>
                    <th className="text-left py-4 px-6 font-semibold">Nível de Acesso</th>
                    <th className="text-left py-4 px-6 font-semibold">Adicionado em</th>
                    <th className="text-right py-4 px-6 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => {
                    const roleConfig = {
                      MANAGER: { label: 'Gerente', color: 'bg-purple-100 text-purple-800' },
                      OPERATOR: { label: 'Operador', color: 'bg-blue-100 text-blue-800' },
                      VIEWER: { label: 'Visualizador', color: 'bg-gray-100 text-gray-800' }
                    }
                    const config = roleConfig[employee.employeeRole as keyof typeof roleConfig] || { label: 'Não definido', color: 'bg-gray-100 text-gray-600' }
                    
                    return (
                    <tr key={employee.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <p className="font-semibold text-gray-900">{employee.name}</p>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-gray-600">
                          <FiMail className="text-sm" />
                          {employee.email}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                          {config.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-600">
                        {new Date(employee.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(employee)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Editar Permissões"
                          >
                            <FiEdit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(employee.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Remover"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Adicionar Funcionário */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-2 mb-4">
              <FiUserPlus className="text-blue-600 text-2xl" />
              <h3 className="text-xl font-bold">Adicionar Funcionário</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="João Silva"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="joao@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Mínimo 6 caracteres"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Esta senha será usada pelo funcionário para fazer login
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nível de Acesso
                </label>
                <select
                  value={formData.employeeRole}
                  onChange={(e) => setFormData({...formData, employeeRole: e.target.value as any})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="OPERATOR">Operador - Produtos e Pedidos</option>
                  <option value="MANAGER">Gerente - Produtos, Pedidos e Financeiro</option>
                  <option value="VIEWER">Visualizador - Apenas Visualizar</option>
                </select>
                <div className="mt-2 text-xs text-gray-500 space-y-1">
                  <p><strong>Operador:</strong> Gerencia produtos e pedidos</p>
                  <p><strong>Gerente:</strong> + Acesso ao financeiro e dropshipping</p>
                  <p><strong>Visualizador:</strong> Apenas visualiza relatórios</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setFormData({ name: "", email: "", password: "", employeeRole: "OPERATOR" })
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Permissões */}
      {showEditModal && editingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <FiEdit2 className="text-blue-600 text-2xl" />
              <h3 className="text-xl font-bold">Gerenciar Permissões</h3>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700">
                <strong>Funcionário:</strong> {editingEmployee.name}
              </p>
              <p className="text-gray-600 text-sm">
                {editingEmployee.email}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                <strong>Nível atual:</strong>{' '}
                {editingEmployee.employeeRole 
                  ? { MANAGER: 'Gerente', OPERATOR: 'Operador', VIEWER: 'Visualizador' }[editingEmployee.employeeRole]
                  : 'Não definido'}
              </p>
            </div>

            {/* Níveis Predefinidos */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">
                🎯 Níveis de Acesso Predefinidos
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Escolha um perfil predefinido ou veja as permissões específicas abaixo:
              </p>

              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleUpdateRole('OPERATOR')}
                  disabled={loading}
                  className={`p-3 border-2 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 ${
                    editingEmployee.employeeRole === 'OPERATOR' 
                      ? 'border-blue-600 bg-blue-50' 
                      : 'border-gray-300'
                  }`}
                >
                  <p className="font-semibold text-sm">👷 Operador</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Produtos e Pedidos
                  </p>
                </button>

                <button
                  onClick={() => handleUpdateRole('MANAGER')}
                  disabled={loading}
                  className={`p-3 border-2 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50 ${
                    editingEmployee.employeeRole === 'MANAGER' 
                      ? 'border-purple-600 bg-purple-50' 
                      : 'border-gray-300'
                  }`}
                >
                  <p className="font-semibold text-sm">👔 Gerente</p>
                  <p className="text-xs text-gray-600 mt-1">
                    + Financeiro
                  </p>
                </button>

                <button
                  onClick={() => handleUpdateRole('VIEWER')}
                  disabled={loading}
                  className={`p-3 border-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 ${
                    editingEmployee.employeeRole === 'VIEWER' 
                      ? 'border-gray-600 bg-gray-50' 
                      : 'border-gray-300'
                  }`}
                >
                  <p className="font-semibold text-sm">👀 Visualizador</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Apenas visualizar
                  </p>
                </button>
              </div>
            </div>

            {/* Detalhamento de Permissões */}
            <div className="border-t pt-6">
              <h4 className="font-semibold text-gray-900 mb-4">
                🔐 Permissões Detalhadas
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                {editingEmployee.employeeRole 
                  ? `Permissões do nível "${
                      { MANAGER: 'Gerente', OPERATOR: 'Operador', VIEWER: 'Visualizador' }[editingEmployee.employeeRole]
                    }":`
                  : 'Nenhum nível definido. Selecione um nível acima.'}
              </p>

              <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                {Object.entries(getRolePermissions(editingEmployee.employeeRole)).map(([key, value]) => {
                  const permissionLabels: Record<string, { icon: string; label: string; description: string }> = {
                    canManageProducts: { 
                      icon: '📦', 
                      label: 'Gerenciar Produtos',
                      description: 'Criar, editar e excluir produtos'
                    },
                    canManageOrders: { 
                      icon: '🛒', 
                      label: 'Gerenciar Pedidos',
                      description: 'Ver e processar pedidos de clientes'
                    },
                    canViewFinancial: { 
                      icon: '💰', 
                      label: 'Ver Financeiro',
                      description: 'Acessar relatórios e dados financeiros'
                    },
                    canManageEmployees: { 
                      icon: '👥', 
                      label: 'Gerenciar Funcionários',
                      description: 'Adicionar e remover funcionários (apenas proprietário)'
                    },
                    canManageIntegrations: { 
                      icon: '🔌', 
                      label: 'Gerenciar Integrações',
                      description: 'Configurar Mercado Livre, AliExpress, etc (apenas proprietário)'
                    },
                    canManageDropshipping: { 
                      icon: '🚚', 
                      label: 'Gerenciar Dropshipping',
                      description: 'Configurar e gerenciar produtos de dropshipping'
                    }
                  }
                  
                  const permission = permissionLabels[key]
                  if (!permission) return null

                  return (
                    <div 
                      key={key}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        value 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={value}
                          readOnly
                          disabled
                          className="w-5 h-5 text-blue-600 rounded cursor-not-allowed"
                        />
                        <div>
                          <p className={`font-medium ${value ? 'text-green-800' : 'text-gray-600'}`}>
                            {permission.icon} {permission.label}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {permission.description}
                          </p>
                        </div>
                      </div>
                      {value ? (
                        <span className="text-green-600 text-sm font-medium">✓ Ativo</span>
                      ) : (
                        <span className="text-gray-400 text-sm">✗ Inativo</span>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>💡 Nota:</strong> Apenas o proprietário da loja pode gerenciar funcionários e integrações.
                  Para permissões personalizadas, escolha o nível que mais se aproxima das necessidades do funcionário.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingEmployee(null)
                }}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
