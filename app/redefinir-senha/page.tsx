'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { FiLock, FiArrowLeft, FiCheck, FiAlertCircle } from 'react-icons/fi'

export default function RedefinirSenhaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [tokenValido, setTokenValido] = useState(false)
  const [senhaAlterada, setSenhaAlterada] = useState(false)

  useEffect(() => {
    if (token) {
      validarToken()
    } else {
      setIsValidating(false)
    }
  }, [token])

  const validarToken = async () => {
    try {
      const response = await fetch(`/api/auth/validate-reset-token?token=${token}`)
      const data = await response.json()
      setTokenValido(data.valid)
    } catch (error) {
      setTokenValido(false)
    } finally {
      setIsValidating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.message || 'Erro ao redefinir senha')
        return
      }

      setSenhaAlterada(true)
      toast.success('Senha alterada com sucesso!')
    } catch (error) {
      toast.error('Erro ao processar solicitação')
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidating) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!token || !tokenValido) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle className="text-red-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-4">Link Inválido ou Expirado</h1>
          <p className="text-gray-600 mb-6">
            O link de recuperação de senha é inválido ou já expirou. Solicite um novo link.
          </p>
          <Link
            href="/esqueci-senha"
            className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-semibold"
          >
            Solicitar Novo Link
          </Link>
        </div>
      </div>
    )
  }

  if (senhaAlterada) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCheck className="text-green-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-4">Senha Alterada!</h1>
          <p className="text-gray-600 mb-6">
            Sua senha foi alterada com sucesso. Você já pode fazer login com a nova senha.
          </p>
          <Link
            href="/login"
            className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-semibold"
          >
            Fazer Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiLock className="text-primary-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold">Redefinir Senha</h1>
          <p className="text-gray-600 mt-2">
            Escolha uma nova senha para sua conta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Nova Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
              placeholder="••••••••"
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Confirmar Nova Senha</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 font-semibold disabled:bg-gray-400 transition-colors"
          >
            {isLoading ? 'Salvando...' : 'Salvar Nova Senha'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 font-semibold"
          >
            <FiArrowLeft className="mr-2" />
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  )
}
