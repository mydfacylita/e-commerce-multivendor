'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FiUser, FiMail, FiPackage, FiSettings, FiLogOut, FiGift, FiMapPin, FiEdit2, FiTrash2, FiPlus, FiCreditCard } from 'react-icons/fi'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/LoadingSpinner'

interface Address {
  id: string
  label: string | null
  recipientName: string | null
  street: string
  complement: string | null
  neighborhood: string | null
  city: string
  state: string
  zipCode: string
  phone: string | null
  isDefault: boolean
}

export default function PerfilPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: '',
  })

  // Função para formatar CPF
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }

  // Função para formatar telefone
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
    }
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
  }

  // Buscar dados atualizados do usuário do banco
  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const userData = await response.json()
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          cpf: formatCPF(userData.cpf || ''),
          phone: formatPhone(userData.phone || ''),
        })
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error)
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated' && session?.user) {
      // Buscar dados frescos do banco, não do cache da sessão
      fetchUserProfile()
      fetchAddresses()
    }
  }, [status, session, router])

  const fetchAddresses = async () => {
    try {
      const response = await fetch('/api/user/addresses')
      if (response.ok) {
        const data = await response.json()
        setAddresses(data)
      }
    } catch (error) {
      console.error('Erro ao carregar endereços:', error)
    } finally {
      setLoadingAddresses(false)
    }
  }

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Tem certeza que deseja excluir este endereço?')) return

    try {
      const response = await fetch(`/api/user/addresses/${addressId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Endereço excluído!')
        setAddresses(addresses.filter(a => a.id !== addressId))
      } else {
        toast.error('Erro ao excluir endereço')
      }
    } catch (error) {
      toast.error('Erro ao excluir endereço')
    }
  }

  const handleSetDefault = async (addressId: string) => {
    try {
      const response = await fetch(`/api/user/addresses/${addressId}/default`, {
        method: 'PUT',
      })

      if (response.ok) {
        toast.success('Endereço definido como padrão!')
        setAddresses(addresses.map(a => ({
          ...a,
          isDefault: a.id === addressId
        })))
      }
    } catch (error) {
      toast.error('Erro ao definir endereço padrão')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const payload = {
        name: formData.name,
        cpf: formData.cpf.replace(/\D/g, ''),
        phone: formData.phone.replace(/\D/g, ''),
      }
      
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao atualizar perfil')
      }

      // Atualizar sessão com novos dados
      await update({
        ...session,
        user: {
          ...session?.user,
          name: formData.name,
          cpf: payload.cpf,
          phone: payload.phone,
        },
      })

      toast.success('Perfil atualizado com sucesso!')
      setIsEditing(false)
    } catch (error) {
      toast.error('Erro ao atualizar perfil')
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return <LoadingSpinner message="Carregando Perfil..." />
  }



  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      <h1 className="text-4xl font-bold mb-8">Meu Perfil</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiUser size={48} className="text-primary-600" />
              </div>
              <h2 className="text-xl font-bold">{session?.user?.name}</h2>
              <p className="text-gray-600 text-sm">{session?.user?.email}</p>
              {session?.user?.role === 'ADMIN' && (
                <span className="inline-block mt-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                  Administrador
                </span>
              )}
            </div>

            <nav className="space-y-2">
              <button
                onClick={() => setIsEditing(true)}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-md hover:bg-gray-50 text-left"
              >
                <FiSettings />
                <span>Editar Perfil</span>
              </button>
              <button
                onClick={() => router.push('/pedidos')}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-md hover:bg-gray-50 text-left"
              >
                <FiPackage />
                <span>Meus Pedidos</span>
              </button>
              <button
                onClick={() => router.push('/perfil/cashback')}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-md hover:bg-green-50 text-green-700 text-left"
              >
                <FiGift />
                <span>Meu Cashback</span>
              </button>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-md hover:bg-red-50 text-red-600 text-left"
              >
                <FiLogOut />
                <span>Sair</span>
              </button>
            </nav>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">Informações da Conta</h2>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome Completo</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-2 border rounded-md bg-gray-100 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    O email não pode ser alterado
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">CPF</label>
                    <input
                      type="text"
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                      placeholder="000.000.000-00"
                      className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                      maxLength={14}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Telefone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                      placeholder="(00) 00000-0000"
                      className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                      maxLength={15}
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 disabled:bg-gray-400"
                  >
                    {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false)
                      setFormData({
                        name: session?.user?.name || '',
                        email: session?.user?.email || '',
                        cpf: (session?.user as any)?.cpf || '',
                        phone: (session?.user as any)?.phone || '',
                      })
                    }}
                    className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-md">
                  <FiUser className="text-gray-400" size={24} />
                  <div>
                    <p className="text-sm text-gray-600">Nome</p>
                    <p className="font-semibold">{session?.user?.name || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-md">
                  <FiMail className="text-gray-400" size={24} />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-semibold">{session?.user?.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-md">
                  <FiCreditCard className="text-gray-400" size={24} />
                  <div>
                    <p className="text-sm text-gray-600">CPF</p>
                    <p className="font-semibold">{formatCPF((session?.user as any)?.cpf || '') || 'Não informado'}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full bg-primary-600 text-white py-3 rounded-md hover:bg-primary-700 font-semibold"
                >
                  Editar Perfil
                </button>
              </div>
            )}
          </div>

          {/* Seção de Segurança */}
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-2xl font-bold mb-4">Segurança</h2>
            <button 
              onClick={() => router.push('/esqueci-senha')}
              className="w-full border border-gray-300 text-gray-700 py-3 rounded-md hover:bg-gray-50 font-semibold"
            >
              Alterar Senha
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Você receberá um email para redefinir sua senha
            </p>
          </div>

          {/* Seção de Endereços */}
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Meus Endereços</h2>
              <button
                onClick={() => router.push('/checkout?addAddress=true')}
                className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 text-sm"
              >
                <FiPlus size={16} />
                <span>Novo Endereço</span>
              </button>
            </div>

            {loadingAddresses ? (
              <div className="text-center py-8 text-gray-500">
                Carregando endereços...
              </div>
            ) : addresses.length === 0 ? (
              <div className="text-center py-8">
                <FiMapPin size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Nenhum endereço cadastrado</p>
                <button
                  onClick={() => router.push('/checkout?addAddress=true')}
                  className="mt-4 text-primary-600 hover:underline"
                >
                  Adicionar primeiro endereço
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className={`p-4 border rounded-lg ${address.isDefault ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <FiMapPin className={address.isDefault ? 'text-primary-600' : 'text-gray-400'} />
                          <span className="font-semibold">
                            {address.label || address.recipientName || 'Endereço'}
                          </span>
                          {address.isDefault && (
                            <span className="text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full">
                              Padrão
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm">
                          {address.street}
                          {address.complement && `, ${address.complement}`}
                        </p>
                        <p className="text-gray-600 text-sm">
                          {address.neighborhood && `${address.neighborhood} - `}
                          {address.city}/{address.state}
                        </p>
                        <p className="text-gray-500 text-sm">CEP: {address.zipCode}</p>
                        {address.phone && (
                          <p className="text-gray-500 text-sm">Tel: {address.phone}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {!address.isDefault && (
                          <button
                            onClick={() => handleSetDefault(address.id)}
                            className="text-primary-600 hover:text-primary-700 text-sm"
                            title="Definir como padrão"
                          >
                            Usar como padrão
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAddress(address.id)}
                          className="text-red-500 hover:text-red-600 p-2"
                          title="Excluir"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
