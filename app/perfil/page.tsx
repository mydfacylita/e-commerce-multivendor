'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FiUser, FiMail, FiPackage, FiSettings, FiLogOut, FiGift } from 'react-icons/fi'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function PerfilPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (session?.user) {
      setFormData({
        name: session.user.name || '',
        email: session.user.email || '',
      })
    }
  }, [status, session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar perfil')
      }

      await update({
        ...session,
        user: {
          ...session?.user,
          name: formData.name,
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
    return <LoadingSpinner message="Carregando perfil..." />
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
                  <label className="block text-sm font-medium mb-2">Nome</label>
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
                    <p className="font-semibold">{session?.user?.name}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-md">
                  <FiMail className="text-gray-400" size={24} />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-semibold">{session?.user?.email}</p>
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

          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-2xl font-bold mb-4">Segurança</h2>
            <button className="w-full border border-gray-300 text-gray-700 py-3 rounded-md hover:bg-gray-50 font-semibold">
              Alterar Senha
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
