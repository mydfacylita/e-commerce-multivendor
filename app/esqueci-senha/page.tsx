'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { FiMail, FiArrowLeft, FiCheck } from 'react-icons/fi'

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailEnviado, setEmailEnviado] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      toast.error('Informe seu email')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.message || 'Erro ao enviar email')
        return
      }

      setEmailEnviado(true)
      toast.success('Email enviado com sucesso!')
    } catch (error) {
      toast.error('Erro ao processar solicitação')
    } finally {
      setIsLoading(false)
    }
  }

  if (emailEnviado) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCheck className="text-green-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-4">Email Enviado!</h1>
          <p className="text-gray-600 mb-6">
            Se existe uma conta com o email <strong>{email}</strong>, você receberá um link para redefinir sua senha.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Verifique sua caixa de entrada e também a pasta de spam.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 font-semibold"
          >
            <FiArrowLeft className="mr-2" />
            Voltar para o login
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
            <FiMail className="text-primary-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold">Esqueceu sua senha?</h1>
          <p className="text-gray-600 mt-2">
            Informe seu email e enviaremos um link para redefinir sua senha.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
              placeholder="seu@email.com"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 font-semibold disabled:bg-gray-400 transition-colors"
          >
            {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
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
