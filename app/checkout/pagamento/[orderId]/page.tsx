'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FiCreditCard, FiLock, FiCheck, FiFileText } from 'react-icons/fi'
import { SiPix } from 'react-icons/si'
import toast from 'react-hot-toast'
import QRCode from 'qrcode'
import { formatOrderNumber } from '@/lib/format'
import CreditCardForm from '@/components/CreditCardForm'
import { useCartStore } from '@/lib/store'

interface Order {
  id: string
  parentOrderId?: string | null
  total: number
  status: string
}

export default function CheckoutPagamentoPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params?.orderId as string
  const { clearCart } = useCartStore()
  
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix' | 'boleto'>('credit_card')
  const [processing, setProcessing] = useState(false)
  const [cardData, setCardData] = useState({
    number: '',
    holder: '',
    expiry: '',
    cvv: '',
    installments: 1
  })
  const [pixData, setPixData] = useState<{ qrCode: string; qrCodeBase64: string } | null>(null)
  const [boletoUrl, setBoletoUrl] = useState<string | null>(null)
  const [checkingPayment, setCheckingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  
  // Regras de parcelamento
  const [paymentRules, setPaymentRules] = useState<{
    acceptsCreditCard: boolean
    maxInstallments: number
    installmentsFreeInterest: number
  }>({
    acceptsCreditCard: true,
    maxInstallments: 12,
    installmentsFreeInterest: 1
  })

  // Limpar carrinho ao chegar na página de pagamento
  useEffect(() => {
    clearCart()
  }, [])

  useEffect(() => {
    loadOrder()
    loadPublicKey()
    loadPaymentRules()
  }, [orderId])

  const loadPaymentRules = async () => {
    try {
      const response = await fetch(`/api/payment/installments-rules?orderId=${orderId}`)
      if (response.ok) {
        const data = await response.json()
        setPaymentRules({
          acceptsCreditCard: data.acceptsCreditCard,
          maxInstallments: data.maxInstallments,
          installmentsFreeInterest: data.installmentsFreeInterest
        })
        
        // Se não aceita cartão, mudar para PIX
        if (!data.acceptsCreditCard) {
          setPaymentMethod('pix')
        }
      }
    } catch (error) {
      console.error('Erro ao carregar regras de pagamento:', error)
    }
  }

  const loadPublicKey = async () => {
    try {
      const response = await fetch('/api/payment/public-key')
      if (response.ok) {
        const data = await response.json()
        setPublicKey(data.publicKey)
      }
    } catch (error) {
      console.error('Erro ao carregar public key:', error)
    }
  }

  // Verificar status do pagamento existente ao carregar
  useEffect(() => {
    if (!order) return
    
    const checkExistingPayment = async () => {
      try {
        const response = await fetch(`/api/payment/check-status/${orderId}`)
        if (response.ok) {
          const data = await response.json()
          
          console.log('🔍 Verificação inicial do pagamento:', data)
          
          // Se já foi aprovado, redirecionar
          if (data.status === 'PROCESSING' || data.alreadyPaid || data.justApproved) {
            toast.success('Pagamento já foi confirmado! 🎉')
            router.push(`/pedidos/${orderId}`)
            return
          }
          
          // Se foi rejeitado E já temos um PIX gerado nesta sessão, mostrar erro
          // Não mostrar erro se ainda não geramos PIX (é um pedido novo com paymentId antigo)
          // O usuário pode simplesmente gerar um novo PIX
          if (pixData && (data.paymentStatus === 'rejected' || data.paymentStatus === 'cancelled' || data.paymentStatus === 'refunded')) {
            console.log('⚠️ Pagamento anterior foi rejeitado - limpando para novo PIX')
            setPixData(null)
            setCheckingPayment(false)
            setPaymentError('O pagamento foi rejeitado. Clique no botão para gerar um novo código PIX.')
          }
        }
      } catch (error) {
        console.error('Erro ao verificar pagamento existente:', error)
      }
    }
    
    checkExistingPayment()
  }, [order, orderId, router, pixData])

  // Polling para verificar status do pagamento Pix
  useEffect(() => {
    if (!pixData || !checkingPayment) return

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payment/check-status/${orderId}`)
        if (response.ok) {
          const data = await response.json()
          
          console.log('📊 Status do pagamento:', data)
          
          // Se o pagamento foi aprovado, redirecionar para sucesso
          if (data.status === 'PROCESSING' || data.justApproved || data.alreadyPaid) {
            clearInterval(interval)
            toast.success('Pagamento Pix confirmado! 🎉')
            setTimeout(() => {
              router.push(`/pedidos/${orderId}`)
            }, 1500)
            return
          }
          
          // Se foi rejeitado, cancelado ou qualquer status negativo
          const rejectedStatuses = ['rejected', 'cancelled', 'refunded', 'charged_back']
          if (rejectedStatuses.includes(data.paymentStatus)) {
            console.log('⚠️ Pagamento rejeitado/cancelado - limpando dados:', data.paymentStatus)
            clearInterval(interval)
            setCheckingPayment(false)
            setPixData(null) // LIMPAR O QR CODE ANTIGO
            
            // Mensagem específica para cada tipo de rejeição
            let errorMsg = 'Pagamento rejeitado. Clique no botão para gerar um novo código PIX.'
            if (data.paymentStatus === 'rejected') {
              errorMsg = '⚠️ Pagamento rejeitado pelo banco. Tente novamente com um novo código PIX.'
            }
            
            setPaymentError(errorMsg)
            toast.error('Pagamento rejeitado! Gere um novo código.', { duration: 5000 })
            return
          }
        }
      } catch (error) {
        console.error('Erro ao verificar pagamento:', error)
      }
    }, 5000) // Verifica a cada 5 segundos

    return () => clearInterval(interval)
  }, [pixData, checkingPayment, orderId, router])

  const loadOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        
        // Se tem parentOrderId, buscar todos os pedidos relacionados e somar totais
        if (data.parentOrderId) {
          const allOrdersResponse = await fetch('/api/orders')
          if (allOrdersResponse.ok) {
            const allOrders = await allOrdersResponse.json()
            const related = allOrders.filter((o: Order) => 
              o.parentOrderId === data.parentOrderId || o.id === data.parentOrderId
            )
            
            if (related.length > 1) {
              // Somar os totais de todos os pedidos agrupados
              const totalAgrupado = related.reduce((sum: number, o: Order) => sum + o.total, 0)
              setOrder({ ...data, total: totalAgrupado })
              return
            }
          }
        }
        
        setOrder(data)
      } else {
        router.push('/pedidos')
      }
    } catch (error) {
      toast.error('Erro ao carregar pedido')
      router.push('/pedidos')
    } finally {
      setLoading(false)
    }
  }

  const handleCreditCardPayment = async () => {
    setProcessing(true)
    try {
      // Validações básicas
      if (!cardData.number || !cardData.holder || !cardData.expiry || !cardData.cvv) {
        toast.error('Preencha todos os campos do cartão')
        return
      }

      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          paymentMethod: 'credit_card',
          amount: order?.total,
          type: 'ORDER',
          referenceId: orderId,
          description: `Pedido #${orderId.slice(0, 8)}`,
          cardData // Enviar dados do cartão para tokenização
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Pagamento processado com sucesso! 🎉')
        setTimeout(() => {
          router.push(`/pedidos/${orderId}`)
        }, 1500)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Pagamento recusado')
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error)
      toast.error('Erro ao processar pagamento')
    } finally {
      setProcessing(false)
    }
  }

  const handlePixPayment = async () => {
    setProcessing(true)
    setPaymentError(null) // Limpar erro anterior
    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          paymentMethod: 'pix',
          amount: order?.total,
          type: 'ORDER',
          referenceId: orderId,
          // IMPORTANTE: Usar APENAS orderId como external_reference para que o polling funcione
          externalReference: orderId,
          description: `Pedido #${orderId.slice(0, 8)}`
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Gerar QR Code localmente a partir do código Pix
        if (data.qrCode) {
          const qrCodeDataURL = await QRCode.toDataURL(data.qrCode, {
            width: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          })
          
          setPixData({
            qrCode: data.qrCode,
            qrCodeBase64: qrCodeDataURL
          })
          
          // Iniciar verificação automática do pagamento
          setCheckingPayment(true)
          toast.success('QR Code gerado! Aguardando pagamento...')
        } else {
          toast.error('Código Pix não foi gerado')
        }
      } else {
        toast.error('Erro ao gerar Pix')
      }
    } catch (error) {
      console.error('Erro ao processar Pix:', error)
      toast.error('Erro ao processar Pix')
    } finally {
      setProcessing(false)
    }
  }

  const handleBoletoPayment = async () => {
    setProcessing(true)
    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          paymentMethod: 'boleto',
          amount: order?.total,
          type: 'ORDER',
          referenceId: orderId,
          description: `Pedido #${orderId.slice(0, 8)}`
        })
      })

      const data = await response.json()
      
      if (response.ok && data.boletoUrl) {
        setBoletoUrl(data.boletoUrl)
        toast.success('Boleto gerado com sucesso!')
      } else {
        console.error('Erro boleto:', data)
        toast.error(data.error || 'Erro ao gerar boleto')
      }
    } catch (error: any) {
      console.error('Erro ao processar boleto:', error)
      toast.error(error.message || 'Erro ao processar boleto')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!order) return null

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header com Segurança */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full mb-4">
            <FiLock size={16} />
            <span className="text-sm font-medium">Ambiente Seguro - Criptografia SSL</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pagamento Seguro</h1>
          <p className="text-gray-600">Pedido #{formatOrderNumber(orderId)} - R$ {order.total.toFixed(2)}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Container Principal - Card Maior */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Formas de Pagamento */}
                <div className="lg:col-span-2">
                  <div className="pr-0 lg:pr-6 lg:border-r border-gray-200">
                    <h2 className="text-2xl font-bold mb-6 flex items-center">
                      <FiCreditCard className="mr-3 text-primary-600" />
                      Escolha a forma de pagamento
                    </h2>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6">
                      {paymentRules.acceptsCreditCard && (
                        <button
                          onClick={() => setPaymentMethod('credit_card')}
                          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                            paymentMethod === 'credit_card'
                              ? 'bg-primary-600 text-white shadow-lg'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <FiCreditCard className="inline mr-2" />
                          Cartão
                          {paymentRules.maxInstallments > 1 && (
                            <span className="text-xs ml-1">até {paymentRules.maxInstallments}x</span>
                          )}
                        </button>
                      )}
                <button
                  onClick={() => setPaymentMethod('pix')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                    paymentMethod === 'pix'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <SiPix className="inline mr-2" />
                  Pix
                </button>
                <button
                  onClick={() => setPaymentMethod('boleto')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                    paymentMethod === 'boleto'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FiFileText className="inline mr-2" />
                  Boleto
                </button>
              </div>

              {/* Aviso se cartão não aceito */}
              {!paymentRules.acceptsCreditCard && paymentMethod === 'credit_card' && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ Um ou mais produtos do seu pedido não aceitam pagamento com cartão de crédito.
                    Por favor, escolha Pix ou Boleto.
                  </p>
                </div>
              )}

              {/* Formulário Cartão */}
              {paymentMethod === 'credit_card' && paymentRules.acceptsCreditCard && (
                <div>
                  {publicKey ? (
                    <CreditCardForm
                      amount={order.total}
                      orderId={orderId}
                      publicKey={publicKey}
                      maxInstallments={paymentRules.maxInstallments}
                      installmentsFreeInterest={paymentRules.installmentsFreeInterest}
                      onSuccess={() => {
                        setTimeout(() => {
                          router.push(`/pedidos/${orderId}`)
                        }, 1500)
                      }}
                      onError={(error) => {
                        toast.error(error)
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      <span className="ml-3 text-gray-600">Carregando...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Pix */}
              {paymentMethod === 'pix' && (
                <div className="text-center py-8">
                  {/* Mensagem de erro se pagamento anterior foi rejeitado */}
                  {paymentError && !pixData && (
                    <div className="mb-6 bg-red-50 border-2 border-red-400 rounded-lg p-4">
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-red-600 text-2xl">⚠️</span>
                        <span className="text-red-800 font-medium">
                          {paymentError}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {!pixData ? (
                    <div>
                      <SiPix className="mx-auto text-6xl text-teal-600 mb-4" />
                      <h3 className="text-xl font-bold mb-2">Pagamento via Pix</h3>
                      <p className="text-gray-600 mb-6">Aprovação instantânea após o pagamento</p>
                      <button
                        onClick={handlePixPayment}
                        disabled={processing}
                        className="bg-teal-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-teal-700 disabled:bg-gray-400"
                      >
                        {processing ? 'Gerando...' : paymentError ? 'Gerar Novo QR Code' : 'Gerar QR Code Pix'}
                      </button>
                    </div>
                  ) : (
                    <div>
                      {checkingPayment && (
                        <div className="mb-6 bg-blue-50 border-2 border-blue-400 rounded-lg p-4">
                          <div className="flex items-center justify-center gap-3">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                            <span className="text-blue-800 font-medium">
                              Aguardando confirmação do pagamento...
                            </span>
                          </div>
                          <p className="text-xs text-blue-600 mt-2 text-center">
                            Atualizaremos automaticamente quando o pagamento for detectado
                          </p>
                        </div>
                      )}
                      
                      <div className="bg-white p-4 rounded-lg inline-block mb-4 shadow-lg">
                        <img src={pixData.qrCodeBase64} alt="QR Code Pix" className="w-64 h-64" />
                      </div>
                      <p className="text-sm text-gray-600 mb-4 font-medium">
                        Escaneie o QR Code ou copie o código Pix
                      </p>
                      <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                        <code className="text-xs break-all text-gray-700">{pixData.qrCode}</code>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(pixData.qrCode)
                          toast.success('Código Pix copiado!')
                        }}
                        className="bg-teal-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-teal-700 shadow-md hover:shadow-lg transition-all"
                      >
                        📋 Copiar Código Pix
                      </button>
                      
                      <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm text-green-800">
                          ⚡ <strong>Pagamento instantâneo!</strong> Após o pagamento, seu pedido será confirmado automaticamente.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Boleto */}
              {paymentMethod === 'boleto' && (
                <div className="text-center py-8">
                  {!boletoUrl ? (
                    <div>
                      <FiFileText className="mx-auto text-6xl text-gray-600 mb-4" />
                      <h3 className="text-xl font-bold mb-2">Boleto Bancário</h3>
                      <p className="text-gray-600 mb-6">Pagamento em até 3 dias úteis</p>
                      <button
                        onClick={handleBoletoPayment}
                        disabled={processing}
                        className="bg-gray-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-700 disabled:bg-gray-400"
                      >
                        {processing ? 'Gerando...' : 'Gerar Boleto'}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <FiCheck className="mx-auto text-6xl text-green-600 mb-4" />
                      <h3 className="text-xl font-bold mb-4">Boleto Gerado!</h3>
                      <a
                        href={boletoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-gray-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-700"
                      >
                        Baixar Boleto
                      </a>
                      <p className="text-sm text-gray-600 mt-4">
                        O boleto também foi enviado para seu email
                      </p>
                    </div>
                  )}
                </div>
              )}
                  </div>
                </div>

                {/* Resumo */}
                <div>
                  <div className="pl-0 lg:pl-6">
                    <h3 className="font-bold text-xl mb-6 flex items-center">
                      <FiCheck className="mr-2 text-green-600" />
                      Resumo do Pedido
                    </h3>
                    <div className="space-y-3 mb-4 pb-4 border-b">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Pedido</span>
                        <span className="font-mono font-medium">#{formatOrderNumber(orderId)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium">R$ {order.total.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between font-bold text-xl mb-6">
                      <span>Total</span>
                      <span className="text-primary-600">R$ {order.total.toFixed(2)}</span>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                      <div className="flex items-center gap-2 text-green-800 text-sm mb-2">
                        <FiLock size={18} />
                        <span className="font-bold">Pagamento 100% Seguro</span>
                      </div>
                      <p className="text-xs text-green-700 leading-relaxed">
                        Seus dados são protegidos com criptografia de ponta a ponta
                      </p>
                    </div>

                    {/* Botão Pagar Depois */}
                    <button
                      onClick={() => router.push('/pedidos')}
                      className="w-full mt-4 py-3 px-4 border border-gray-300 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition-all"
                    >
                      Pagar depois
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
