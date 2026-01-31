'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { 
  FiLoader, FiCheckCircle, FiClock, FiArrowLeft, FiCreditCard, 
  FiSmartphone, FiCopy, FiCheck, FiShield, FiAlertCircle, FiDollarSign
} from 'react-icons/fi'
import QRCode from 'qrcode'
import NotificationModal from '@/components/ui/NotificationModal'
import { useNotification } from '@/hooks/useNotification'

interface SubscriptionData {
  id: string
  planId: string
  status: string
  price: number
  billingCycle: string
  startDate: string
  endDate: string
  plan: {
    id: string
    name: string
    description: string
    platformCommission: number
    hasMarketplaceIntegration: boolean
    hasDropshipping: boolean
    hasAdvancedAnalytics: boolean
    hasCustomBranding: boolean
    hasPrioritySupport: boolean
  }
}

export default function PagamentoPage() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const { notification, success, error: showError, hideNotification } = useNotification()
  
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'ACCOUNT_BALANCE'>('PIX')
  const [pixCode, setPixCode] = useState<string | null>(null)
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null)
  const [boletoUrl, setBoletoUrl] = useState<string | null>(null)
  const [pixCopied, setPixCopied] = useState(false)
  const [checkingPayment, setCheckingPayment] = useState(false)
  
  // Saldo da conta digital do vendedor
  const [accountBalance, setAccountBalance] = useState<number>(0)
  const [hasAccount, setHasAccount] = useState(false)

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login')
      return
    }
    
    if (sessionStatus === 'authenticated') {
      fetchSubscription()
    }
  }, [sessionStatus])

  const fetchSubscription = async () => {
    try {
      // Buscar assinatura e saldo da conta em paralelo
      const [subscriptionRes, accountRes] = await Promise.all([
        fetch('/api/seller/subscription'),
        fetch('/api/seller/account')
      ])
      
      if (subscriptionRes.ok) {
        const data = await subscriptionRes.json()
        setSubscription(data.subscription || data)
        
        // Se já está ativo ou trial, redireciona para dashboard
        if (data.subscription?.status === 'ACTIVE' || data.subscription?.status === 'TRIAL' ||
            data.status === 'ACTIVE' || data.status === 'TRIAL') {
          router.push('/vendedor/dashboard')
        }
      }
      
      // Buscar saldo da conta digital
      if (accountRes.ok) {
        const accountData = await accountRes.json()
        if (accountData.hasAccount && accountData.account) {
          setHasAccount(true)
          setAccountBalance(accountData.account.balance || 0)
          // Se tem saldo suficiente, selecionar como padrão
          if (accountData.account.balance > 0) {
            setPaymentMethod('ACCOUNT_BALANCE')
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePayment = async () => {
    setProcessing(true)
    try {
      const response = await fetch('/api/seller/subscription/generate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod })
      })

      const data = await response.json()

      if (response.ok) {
        if (paymentMethod === 'PIX' && data.pixCode) {
          setPixCode(data.pixCode)
          // Usar QR Code base64 da API do Mercado Pago se disponível
          if (data.qrCodeBase64) {
            setQrCodeBase64(data.qrCodeBase64)
          } else {
            // Fallback: gerar localmente
            try {
              const qrDataURL = await QRCode.toDataURL(data.pixCode, {
                width: 256,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
              })
              setQrCodeBase64(qrDataURL)
            } catch (qrError) {
              console.error('Erro ao gerar QR Code:', qrError)
            }
          }
        } else if (paymentMethod === 'CREDIT_CARD' && data.checkoutUrl) {
          // Redirecionar para checkout externo
          window.location.href = data.checkoutUrl
        } else if (paymentMethod === 'BOLETO' && data.boletoUrl) {
          setBoletoUrl(data.boletoUrl)
          window.open(data.boletoUrl, '_blank')
        }
      } else {
        showError('Erro', data.error || 'Erro ao gerar pagamento')
      }
    } catch (error) {
      console.error('Erro:', error)
      showError('Erro', 'Erro ao processar pagamento')
    } finally {
      setProcessing(false)
    }
  }

  const handleCopyPix = () => {
    if (pixCode) {
      navigator.clipboard.writeText(pixCode)
      setPixCopied(true)
      setTimeout(() => setPixCopied(false), 3000)
    }
  }

  const handleCheckPayment = async () => {
    setCheckingPayment(true)
    try {
      const response = await fetch('/api/seller/subscription/check-payment', {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok && data.paid) {
        success('Pagamento Confirmado!', 'Sua assinatura foi ativada com sucesso.')
        setTimeout(() => router.push('/vendedor/dashboard'), 2000)
      } else {
        showError('Aguardando', 'Pagamento ainda não identificado. Tente novamente em alguns instantes.')
      }
    } catch (error) {
      showError('Erro', 'Erro ao verificar pagamento')
    } finally {
      setCheckingPayment(false)
    }
  }

  // Pagar usando o saldo da conta digital
  const handlePayWithBalance = async () => {
    if (!subscription) return
    
    if (accountBalance < subscription.price) {
      showError('Saldo Insuficiente', `Seu saldo é ${formatCurrency(accountBalance)}, mas o plano custa ${formatCurrency(subscription.price)}.`)
      return
    }
    
    setProcessing(true)
    try {
      const response = await fetch('/api/seller/subscription/pay-with-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (response.ok) {
        success('Pagamento Realizado!', 'Seu plano foi ativado com sucesso usando o saldo da sua conta.', `Novo saldo: ${formatCurrency(data.newBalance)}`)
        setTimeout(() => router.push('/vendedor/dashboard'), 2000)
      } else {
        showError('Erro', data.error || 'Erro ao processar pagamento com saldo')
      }
    } catch (error) {
      console.error('Erro:', error)
      showError('Erro', 'Erro ao processar pagamento')
    } finally {
      setProcessing(false)
    }
  }

  // Simular confirmação de pagamento (para desenvolvimento)
  const handleSimulatePayment = async () => {
    setProcessing(true)
    try {
      const response = await fetch('/api/seller/subscription/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        success('Pagamento Confirmado!', 'Sua assinatura foi ativada com sucesso.')
        setTimeout(() => router.push('/vendedor/dashboard'), 2000)
      } else {
        const error = await response.json()
        showError('Erro', error.error || 'Erro ao processar pagamento')
      }
    } catch (error) {
      showError('Erro', 'Erro ao processar pagamento')
    } finally {
      setProcessing(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getBillingCycleText = (cycle: string) => {
    const cycles: Record<string, string> = {
      'MONTHLY': 'mensal',
      'QUARTERLY': 'trimestral', 
      'SEMIANNUAL': 'semestral',
      'ANNUAL': 'anual'
    }
    return cycles[cycle] || cycle
  }

  if (loading || sessionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <FiLoader className="animate-spin h-12 w-12 text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="container mx-auto p-6 max-w-lg">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <FiAlertCircle className="mx-auto text-yellow-500 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Nenhum Plano Selecionado</h1>
          <p className="text-gray-600 mb-6">Você precisa selecionar um plano antes de prosseguir com o pagamento.</p>
          <button
            onClick={() => router.push('/vendedor/planos')}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
          >
            Escolher Plano
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/vendedor/planos')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <FiArrowLeft className="mr-2" />
            Voltar aos planos
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Checkout do Plano</h1>
          <p className="text-gray-600 mt-1">Complete o pagamento para ativar sua assinatura</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Resumo do Plano */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border p-6 sticky top-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Resumo do Pedido</h2>
              
              <div className="border-b pb-4 mb-4">
                <h3 className="font-semibold text-primary-600">{subscription.plan.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{subscription.plan.description}</p>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Plano</span>
                  <span className="font-medium">{subscription.plan.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ciclo</span>
                  <span className="font-medium capitalize">{getBillingCycleText(subscription.billingCycle)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Comissão</span>
                  <span className="font-medium">{subscription.plan.platformCommission}%</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total</span>
                  <span className="text-2xl font-bold text-primary-600">
                    {formatCurrency(subscription.price)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 text-right mt-1">
                  /{getBillingCycleText(subscription.billingCycle)}
                </p>
              </div>

              {/* Recursos inclusos */}
              <div className="mt-6 pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">Recursos inclusos:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {subscription.plan.hasDropshipping && <li className="flex items-center gap-1"><FiCheck className="text-green-500" /> Dropshipping</li>}
                  {subscription.plan.hasMarketplaceIntegration && <li className="flex items-center gap-1"><FiCheck className="text-green-500" /> Marketplaces</li>}
                  {subscription.plan.hasAdvancedAnalytics && <li className="flex items-center gap-1"><FiCheck className="text-green-500" /> Relatórios Avançados</li>}
                  {subscription.plan.hasCustomBranding && <li className="flex items-center gap-1"><FiCheck className="text-green-500" /> Marca Personalizada</li>}
                  {subscription.plan.hasPrioritySupport && <li className="flex items-center gap-1"><FiCheck className="text-green-500" /> Suporte Prioritário</li>}
                </ul>
              </div>
            </div>
          </div>

          {/* Opções de Pagamento */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Forma de Pagamento</h2>

              {/* Opção de Saldo em Conta (se disponível) */}
              {hasAccount && accountBalance > 0 && (
                <div className="mb-6">
                  <button
                    onClick={() => { setPaymentMethod('ACCOUNT_BALANCE'); setPixCode(null); setQrCodeBase64(null); setBoletoUrl(null); }}
                    className={`w-full p-4 border-2 rounded-xl transition-all ${
                      paymentMethod === 'ACCOUNT_BALANCE' 
                        ? 'border-green-600 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${paymentMethod === 'ACCOUNT_BALANCE' ? 'bg-green-100' : 'bg-gray-100'}`}>
                          <FiDollarSign className={paymentMethod === 'ACCOUNT_BALANCE' ? 'text-green-600' : 'text-gray-400'} size={24} />
                        </div>
                        <div className="text-left">
                          <span className={`font-medium ${paymentMethod === 'ACCOUNT_BALANCE' ? 'text-green-700' : 'text-gray-700'}`}>
                            Usar Saldo da Conta
                          </span>
                          <p className="text-xs text-gray-500">Débito instantâneo na sua conta digital</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-bold ${accountBalance >= (subscription?.price || 0) ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(accountBalance)}
                        </span>
                        <p className="text-xs text-gray-500">
                          {accountBalance >= (subscription?.price || 0) ? 'Saldo disponível' : 'Saldo insuficiente'}
                        </p>
                      </div>
                    </div>
                  </button>
                  
                  {accountBalance < (subscription?.price || 0) && (
                    <p className="text-xs text-red-600 mt-2 text-center">
                      Você precisa de mais {formatCurrency((subscription?.price || 0) - accountBalance)} para usar esta opção.
                    </p>
                  )}
                </div>
              )}

              {/* Outras opções de pagamento */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <button
                  onClick={() => { setPaymentMethod('PIX'); setPixCode(null); setQrCodeBase64(null); setBoletoUrl(null); }}
                  className={`p-4 border-2 rounded-xl text-center transition-all ${
                    paymentMethod === 'PIX' 
                      ? 'border-primary-600 bg-primary-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FiSmartphone className={`mx-auto mb-2 ${paymentMethod === 'PIX' ? 'text-primary-600' : 'text-gray-400'}`} size={24} />
                  <span className={`text-sm font-medium ${paymentMethod === 'PIX' ? 'text-primary-600' : 'text-gray-600'}`}>
                    PIX
                  </span>
                  <p className="text-xs text-gray-500 mt-1">Aprovação imediata</p>
                </button>

                <button
                  onClick={() => { setPaymentMethod('CREDIT_CARD'); setPixCode(null); setQrCodeBase64(null); setBoletoUrl(null); }}
                  className={`p-4 border-2 rounded-xl text-center transition-all ${
                    paymentMethod === 'CREDIT_CARD' 
                      ? 'border-primary-600 bg-primary-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FiCreditCard className={`mx-auto mb-2 ${paymentMethod === 'CREDIT_CARD' ? 'text-primary-600' : 'text-gray-400'}`} size={24} />
                  <span className={`text-sm font-medium ${paymentMethod === 'CREDIT_CARD' ? 'text-primary-600' : 'text-gray-600'}`}>
                    Cartão
                  </span>
                  <p className="text-xs text-gray-500 mt-1">Crédito ou débito</p>
                </button>

                <button
                  onClick={() => { setPaymentMethod('BOLETO'); setPixCode(null); setQrCodeBase64(null); setBoletoUrl(null); }}
                  className={`p-4 border-2 rounded-xl text-center transition-all ${
                    paymentMethod === 'BOLETO' 
                      ? 'border-primary-600 bg-primary-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <svg className={`mx-auto mb-2 ${paymentMethod === 'BOLETO' ? 'text-primary-600' : 'text-gray-400'}`} width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2 4h2v16H2V4zm4 0h1v16H6V4zm3 0h2v16H9V4zm4 0h1v16h-1V4zm3 0h2v16h-2V4zm4 0h2v16h-2V4z"/>
                  </svg>
                  <span className={`text-sm font-medium ${paymentMethod === 'BOLETO' ? 'text-primary-600' : 'text-gray-600'}`}>
                    Boleto
                  </span>
                  <p className="text-xs text-gray-500 mt-1">Até 3 dias úteis</p>
                </button>
              </div>

              {/* Conteúdo dinâmico baseado no método */}
              
              {/* Pagamento com Saldo */}
              {paymentMethod === 'ACCOUNT_BALANCE' && (
                <div className="bg-green-50 rounded-xl p-6 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiDollarSign className="text-green-600" size={32} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Pagar com Saldo da Conta</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Seu saldo atual: <span className="font-bold text-green-600">{formatCurrency(accountBalance)}</span>
                  </p>
                  <p className="text-gray-600 text-sm mb-6">
                    Valor do plano: <span className="font-bold">{formatCurrency(subscription?.price || 0)}</span>
                  </p>
                  
                  {accountBalance >= (subscription?.price || 0) ? (
                    <>
                      <p className="text-sm text-green-700 mb-4">
                        ✓ Após o pagamento, seu novo saldo será: <strong>{formatCurrency(accountBalance - (subscription?.price || 0))}</strong>
                      </p>
                      <button
                        onClick={handlePayWithBalance}
                        disabled={processing}
                        className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                      >
                        {processing ? (
                          <span className="flex items-center justify-center">
                            <FiLoader className="animate-spin mr-2" />
                            Processando...
                          </span>
                        ) : (
                          'Confirmar Pagamento com Saldo'
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-700 text-sm">
                        Saldo insuficiente. Você precisa de mais <strong>{formatCurrency((subscription?.price || 0) - accountBalance)}</strong>.
                      </p>
                      <p className="text-gray-600 text-xs mt-2">
                        Escolha outra forma de pagamento ou adicione saldo à sua conta.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'PIX' && !pixCode && (
                <div className="bg-gray-50 rounded-xl p-6 text-center">
                  <FiSmartphone className="mx-auto text-primary-600 mb-4" size={48} />
                  <h3 className="font-semibold text-gray-900 mb-2">Pague com PIX</h3>
                  <p className="text-gray-600 text-sm mb-6">
                    Ao gerar o PIX, você terá 30 minutos para realizar o pagamento.
                    A aprovação é instantânea!
                  </p>
                  <button
                    onClick={handleGeneratePayment}
                    disabled={processing}
                    className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
                  >
                    {processing ? (
                      <span className="flex items-center justify-center">
                        <FiLoader className="animate-spin mr-2" />
                        Gerando PIX...
                      </span>
                    ) : (
                      'Gerar QR Code PIX'
                    )}
                  </button>
                </div>
              )}

              {paymentMethod === 'PIX' && pixCode && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="text-center mb-6">
                    <div className="bg-white p-4 rounded-lg inline-block mb-4">
                      {qrCodeBase64 ? (
                        <img src={qrCodeBase64} alt="QR Code PIX" className="w-48 h-48" />
                      ) : (
                        <div className="w-48 h-48 bg-gray-200 flex items-center justify-center rounded">
                          <FiLoader className="animate-spin text-gray-400" size={32} />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Ou copie o código PIX:</p>
                    <div className="flex items-center gap-2 bg-white border rounded-lg p-3">
                      <input 
                        type="text" 
                        value={pixCode} 
                        readOnly 
                        className="flex-1 bg-transparent text-xs font-mono text-gray-600 outline-none"
                      />
                      <button
                        onClick={handleCopyPix}
                        className={`p-2 rounded-lg transition-colors ${
                          pixCopied ? 'bg-green-100 text-green-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                        }`}
                      >
                        {pixCopied ? <FiCheck /> : <FiCopy />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={handleCheckPayment}
                      disabled={checkingPayment}
                      className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                    >
                      {checkingPayment ? (
                        <span className="flex items-center justify-center">
                          <FiLoader className="animate-spin mr-2" />
                          Verificando...
                        </span>
                      ) : (
                        'Já Paguei'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {paymentMethod === 'CREDIT_CARD' && (
                <div className="bg-gray-50 rounded-xl p-6 text-center">
                  <FiCreditCard className="mx-auto text-primary-600 mb-4" size={48} />
                  <h3 className="font-semibold text-gray-900 mb-2">Cartão de Crédito ou Débito</h3>
                  <p className="text-gray-600 text-sm mb-6">
                    Você será redirecionado para nosso ambiente seguro de pagamento.
                  </p>
                  <button
                    onClick={handleGeneratePayment}
                    disabled={processing}
                    className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
                  >
                    {processing ? (
                      <span className="flex items-center justify-center">
                        <FiLoader className="animate-spin mr-2" />
                        Redirecionando...
                      </span>
                    ) : (
                      'Pagar com Cartão'
                    )}
                  </button>
                </div>
              )}

              {paymentMethod === 'BOLETO' && !boletoUrl && (
                <div className="bg-gray-50 rounded-xl p-6 text-center">
                  <svg className="mx-auto text-primary-600 mb-4" width="48" height="48" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2 4h2v16H2V4zm4 0h1v16H6V4zm3 0h2v16H9V4zm4 0h1v16h-1V4zm3 0h2v16h-2V4zm4 0h2v16h-2V4z"/>
                  </svg>
                  <h3 className="font-semibold text-gray-900 mb-2">Boleto Bancário</h3>
                  <p className="text-gray-600 text-sm mb-6">
                    O boleto será gerado e você poderá pagar em qualquer banco ou lotérica.
                    A compensação leva até 3 dias úteis.
                  </p>
                  <button
                    onClick={handleGeneratePayment}
                    disabled={processing}
                    className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
                  >
                    {processing ? (
                      <span className="flex items-center justify-center">
                        <FiLoader className="animate-spin mr-2" />
                        Gerando Boleto...
                      </span>
                    ) : (
                      'Gerar Boleto'
                    )}
                  </button>
                </div>
              )}

              {paymentMethod === 'BOLETO' && boletoUrl && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiCheckCircle className="text-green-600" size={32} />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Boleto Gerado com Sucesso!</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      O boleto foi aberto em uma nova aba. Após o pagamento, a compensação leva até 3 dias úteis.
                    </p>
                    <button
                      onClick={() => window.open(boletoUrl, '_blank')}
                      className="text-primary-600 hover:text-primary-700 font-medium text-sm mb-4 flex items-center justify-center mx-auto gap-2"
                    >
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2 4h2v16H2V4zm4 0h1v16H6V4zm3 0h2v16H9V4zm4 0h1v16h-1V4zm3 0h2v16h-2V4zm4 0h2v16h-2V4z"/>
                      </svg>
                      Abrir Boleto Novamente
                    </button>
                  </div>
                  
                  <button
                    onClick={handleCheckPayment}
                    disabled={checkingPayment}
                    className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    {checkingPayment ? (
                      <span className="flex items-center justify-center">
                        <FiLoader className="animate-spin mr-2" />
                        Verificando...
                      </span>
                    ) : (
                      'Já Paguei'
                    )}
                  </button>
                </div>
              )}

              {/* Segurança */}
              <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <FiShield className="text-green-500" />
                  <span>Pagamento Seguro</span>
                </div>
                <div className="flex items-center gap-1">
                  <FiCheckCircle className="text-green-500" />
                  <span>SSL Criptografado</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Notificação */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={hideNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        details={notification.details}
      />
    </div>
  )
}
