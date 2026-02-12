'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { FiShare2, FiUser, FiMail, FiLock, FiPhone, FiInstagram, FiYoutube, FiDollarSign, FiAlertCircle } from 'react-icons/fi'
import { FaTiktok } from 'react-icons/fa'
import Link from 'next/link'

// Função para validar CPF
const validateCPF = (cpf: string): boolean => {
  cpf = cpf.replace(/[^\d]/g, '')
  
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false
  
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i)
  }
  let digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cpf.charAt(9))) return false
  
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i)
  }
  digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cpf.charAt(10))) return false
  
  return true
}

// Função para validar email
const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

// Função para validar telefone brasileiro
const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/[^\d]/g, '')
  return cleaned.length === 10 || cleaned.length === 11
}

// Função para formatar CPF
const formatCPF = (value: string): string => {
  const cleaned = value.replace(/[^\d]/g, '')
  if (cleaned.length <= 3) return cleaned
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`
  if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`
}

// Função para formatar telefone
const formatPhone = (value: string): string => {
  const cleaned = value.replace(/[^\d]/g, '')
  if (cleaned.length <= 2) return cleaned
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
  if (cleaned.length <= 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`
}

export default function AffiliateCadastroPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    cpf: '',
    phone: '',
    socialMedia: ''
  })

  // Verificar se usuário já é afiliado
  useEffect(() => {
    const checkAffiliate = async () => {
      if (status === 'loading') return
      
      if (status === 'authenticated' && session?.user) {
        try {
          const response = await fetch('/api/affiliate/me')
          if (response.ok) {
            const data = await response.json()
            
            if (data.affiliate) {
              if (data.affiliate.status === 'APPROVED') {
                // Já é afiliado aprovado, redirecionar para dashboard
                router.push('/afiliado/dashboard')
                return
              } else if (data.affiliate.status === 'PENDING') {
                // Já tem cadastro pendente
                setError('Você já possui um cadastro de afiliado pendente de aprovação.')
                setIsChecking(false)
                return
              }
            }
          }
        } catch (err) {
          console.error('Erro ao verificar afiliado:', err)
        }
      }
      
      setIsChecking(false)
    }
    
    checkAffiliate()
  }, [session, status, router])

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    cpf: '',
    instagram: '',
    youtube: '',
    tiktok: '',
    otherSocial: '',
    chavePix: '',
    banco: '',
    agencia: '',
    conta: '',
    tipoConta: 'CORRENTE'
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    let formattedValue = value
    
    // Aplicar máscaras
    if (name === 'cpf') {
      formattedValue = formatCPF(value)
    } else if (name === 'phone') {
      formattedValue = formatPhone(value)
    }
    
    setFormData({
      ...formData,
      [name]: formattedValue
    })
    
    // Limpar erro do campo ao digitar
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors({
        ...fieldErrors,
        [name]: ''
      })
    }
  }
  
  const validateForm = (): boolean => {
    const errors = {
      email: '',
      cpf: '',
      phone: '',
      socialMedia: ''
    }
    
    let isValid = true
    
    // Validar email
    if (!validateEmail(formData.email)) {
      errors.email = 'Email inválido'
      isValid = false
    }
    
    // Validar CPF
    if (!validateCPF(formData.cpf)) {
      errors.cpf = 'CPF inválido'
      isValid = false
    }
    
    // Validar telefone
    if (!validatePhone(formData.phone)) {
      errors.phone = 'Telefone inválido (use formato (00) 00000-0000)'
      isValid = false
    }
    
    // Validar pelo menos uma rede social
    if (!formData.instagram && !formData.youtube && !formData.tiktok && !formData.otherSocial) {
      errors.socialMedia = 'Informe pelo menos uma rede social'
      isValid = false
    }
    
    setFieldErrors(errors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validações básicas
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres')
      return
    }
    
    // Validar campos
    if (!validateForm()) {
      setError('Por favor, corrija os erros no formulário')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/affiliate/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          cpf: formData.cpf,
          instagram: formData.instagram,
          youtube: formData.youtube,
          tiktok: formData.tiktok,
          otherSocial: formData.otherSocial,
          chavePix: formData.chavePix,
          banco: formData.banco,
          agencia: formData.agencia,
          conta: formData.conta,
          tipoConta: formData.tipoConta
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cadastrar')
      }

      // Sucesso - redirecionar para página de sucesso
      router.push('/afiliado/cadastro/sucesso?code=' + data.data.code)
    } catch (err: any) {
      setError(err.message || 'Erro ao processar cadastro')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent-50 to-purple-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-accent-500 rounded-full">
              <FiShare2 className="text-white" size={48} />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Seja um Afiliado MYDSHOP
          </h1>
          <p className="text-gray-600 text-lg">
            Divulgue nossos produtos e ganhe comissão em cada venda realizada através do seu link exclusivo
          </p>
        </div>

        {/* Loading State */}
        {isChecking ? (
          <div className="bg-white rounded-xl shadow-lg p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
              <p className="text-gray-600">Verificando suas informações...</p>
            </div>
          </div>
        ) : error && error.includes('pendente') ? (
          /* Mensagem de cadastro pendente */
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <FiAlertCircle className="text-yellow-400 flex-shrink-0 mt-1 mr-3" size={24} />
                <div>
                  <p className="text-yellow-800 font-medium mb-2">{error}</p>
                  <p className="text-yellow-700 text-sm">
                    Aguarde a análise do seu cadastro. Você receberá um email assim que for aprovado.
                  </p>
                </div>
              </div>
            </div>
            <div className="text-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Voltar para Home
              </Link>
            </div>
          </div>
        ) : (
          /* Formulário */
          <div className="bg-white rounded-xl shadow-lg p-8">
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <FiAlertCircle className="text-red-400 flex-shrink-0 mt-1 mr-3" size={24} />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações Pessoais */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiUser /> Informações Pessoais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder="Seu nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent ${
                      fieldErrors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="seu@email.com"
                  />
                  {fieldErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone/WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    maxLength={15}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent ${
                      fieldErrors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="(00) 00000-0000"
                  />
                  {fieldErrors.phone && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPF <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleChange}
                    required
                    maxLength={14}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent ${
                      fieldErrors.cpf ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="000.000.000-00"
                  />
                  {fieldErrors.cpf && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.cpf}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Senha *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    minLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder="Digite a senha novamente"
                  />
                </div>
              </div>
            </div>

            {/* Redes Sociais */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiShare2 /> Suas Redes Sociais
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Informe suas principais redes onde você irá divulgar os produtos <span className="text-red-500">(pelo menos uma obrigatória)</span>
              </p>
              {fieldErrors.socialMedia && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-3">
                  <p className="text-sm text-red-800">{fieldErrors.socialMedia}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FiInstagram className="text-pink-500" /> Instagram
                  </label>
                  <input
                    type="text"
                    name="instagram"
                    value={formData.instagram}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder="@seuperfil"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FiYoutube className="text-red-500" /> YouTube
                  </label>
                  <input
                    type="text"
                    name="youtube"
                    value={formData.youtube}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder="youtube.com/c/seucanal"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FaTiktok /> TikTok
                  </label>
                  <input
                    type="text"
                    name="tiktok"
                    value={formData.tiktok}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder="@seuperfil"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Outras Redes
                  </label>
                  <input
                    type="text"
                    name="otherSocial"
                    value={formData.otherSocial}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder="Facebook, Twitter, etc"
                  />
                </div>
              </div>
            </div>

            {/* Dados Bancários */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiDollarSign /> Dados Bancários (para receber comissões)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chave PIX
                  </label>
                  <input
                    type="text"
                    name="chavePix"
                    value={formData.chavePix}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder="CPF, Email, Telefone ou Chave Aleatória"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Banco
                  </label>
                  <input
                    type="text"
                    name="banco"
                    value={formData.banco}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder="Ex: Nubank, Itaú, etc"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Conta
                  </label>
                  <select
                    name="tipoConta"
                    value={formData.tipoConta}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  >
                    <option value="CORRENTE">Conta Corrente</option>
                    <option value="POUPANCA">Poupança</option>
                    <option value="PAGAMENTO">Pagamento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agência
                  </label>
                  <input
                    type="text"
                    name="agencia"
                    value={formData.agencia}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder="0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Conta
                  </label>
                  <input
                    type="text"
                    name="conta"
                    value={formData.conta}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder="00000-0"
                  />
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Dica:</strong> Preencha seus dados bancários agora para facilitar o recebimento das comissões no futuro. Você poderá atualizar essas informações depois se necessário.
              </p>
            </div>

            {/* Botões */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-accent-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <FiShare2 />
                    Enviar Cadastro
                  </>
                )}
              </button>

              <Link
                href="/"
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-center"
              >
                Cancelar
              </Link>
            </div>

            <p className="text-sm text-gray-600 text-center">
              Já tem uma conta? <Link href="/login" className="text-accent-500 hover:underline font-semibold">Faça login</Link>
            </p>
          </form>
        </div>
        )}

        {/* Benefícios */}
        {!isChecking && !error?.includes('pendente') && (
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Por que ser um afiliado MYDSHOP?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl mb-2">💰</div>
              <h4 className="font-semibold text-gray-900 mb-1">Comissão Atrativa</h4>
              <p className="text-sm text-gray-600">Ganhe em todas as vendas geradas por você</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">📊</div>
              <h4 className="font-semibold text-gray-900 mb-1">Painel Completo</h4>
              <p className="text-sm text-gray-600">Acompanhe suas vendas em tempo real</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🎯</div>
              <h4 className="font-semibold text-gray-900 mb-1">Link Único</h4>
              <p className="text-sm text-gray-600">Rastreamento automático de vendas</p>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
