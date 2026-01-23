'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiArrowLeft, FiPackage, FiCreditCard, FiDollarSign } from 'react-icons/fi'
import { toast } from 'react-hot-toast'

interface PackageData {
  id: string
  name: string
  description?: string
  quantity: number
  price: number
  type: 'OFFICIAL' | 'INTERNAL'
}

interface SellerBalance {
  balance: number
  storeName: string
}

export default function CheckoutEANPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const packageId = searchParams.get('package')
  
  const [loading, setLoading] = useState(true)
  const [packageData, setPackageData] = useState<PackageData | null>(null)
  const [sellerBalance, setSellerBalance] = useState<SellerBalance | null>(null)
  const [processing, setProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'gateway'>('gateway')

  useEffect(() => {
    if (packageId) {
      loadData()
    } else {
      router.push('/vendedor/ean')
    }
  }, [packageId])

  const loadData = async () => {
    try {
      const [pkgRes, balanceRes] = await Promise.all([
        fetch('/api/vendedor/ean/packages'),
        fetch('/api/vendedor/balance')
      ])

      if (pkgRes.ok) {
        const data = await pkgRes.json()
        const pkg = data.packages.find((p: PackageData) => p.id === packageId)
        if (pkg) {
          setPackageData(pkg)
        } else {
          toast.error('Pacote não encontrado')
          router.push('/vendedor/ean')
          return
        }
      }

      if (balanceRes.ok) {
        const data = await balanceRes.json()
        setSellerBalance(data)
        
        // Se tem saldo suficiente, seleciona saldo por padrão
        const pkg = await pkgRes.json().then(d => d.packages.find((p: any) => p.id === packageId))
        if (pkg && data.balance >= Number(pkg.price)) {
          setPaymentMethod('balance')
        }
      }
    } catch (error) {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!packageData) return

    setProcessing(true)
    try {
      const res = await fetch('/api/vendedor/ean/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: packageData.id,
          quantity: packageData.quantity,
          type: packageData.type,
          price: packageData.price,
          paymentMethod
        })
      })

      const result = await res.json()

      if (res.ok) {
        if (result.autoApproved) {
          toast.success(result.message)
          setTimeout(() => router.push('/vendedor/ean'), 2000)
        } else if (result.requiresPayment && result.paymentUrl) {
          toast.success('Redirecionando para pagamento...')
          window.location.href = result.paymentUrl
        } else {
          toast.success(result.message)
          setTimeout(() => router.push('/vendedor/ean'), 2000)
        }
      } else {
        toast.error(result.error || 'Erro ao processar pagamento')
      }
    } catch (error) {
      toast.error('Erro ao processar pagamento')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!packageData) {
    return null
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <FiArrowLeft />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Finalizar Compra</h1>
          <p className="text-gray-600 mt-2">Complete sua compra de códigos EAN</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Resumo do Pedido */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FiPackage />
                Resumo do Pedido
              </h2>

              <div className="border border-gray-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{packageData.name}</h3>
                    {packageData.description && (
                      <p className="text-sm text-gray-600">{packageData.description}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    packageData.type === 'OFFICIAL' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {packageData.type === 'OFFICIAL' ? '🏆 Oficial GS1' : '🏪 Interno'}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantidade:</span>
                    <span className="font-medium">{packageData.quantity} códigos</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo:</span>
                    <span className="font-medium">
                      {packageData.type === 'OFFICIAL' ? 'Oficial (789-xxx)' : 'Interno (200-xxx)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Método de Pagamento */}
              {sellerBalance && (
                <div className="mb-6">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FiCreditCard />
                    Método de Pagamento
                  </h3>
                  
                  <div className="space-y-3">
                    {/* Opção: Saldo */}
                    <label className={`block border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      paymentMethod === 'balance'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="balance"
                        checked={paymentMethod === 'balance'}
                        onChange={() => setPaymentMethod('balance')}
                        disabled={sellerBalance.balance < Number(packageData.price)}
                        className="mr-3"
                      />
                      <span className="font-medium">💰 Pagar com Saldo Interno</span>
                      <div className="ml-6 mt-2 text-sm">
                        <p className="text-gray-600">
                          Saldo disponível: <span className="font-bold text-green-600">
                            R$ {Number(sellerBalance.balance).toFixed(2)}
                          </span>
                        </p>
                        {sellerBalance.balance < Number(packageData.price) && (
                          <p className="text-red-600 text-xs mt-1">
                            ⚠️ Saldo insuficiente para este pacote
                          </p>
                        )}
                      </div>
                    </label>

                    {/* Opção: Gateway de Pagamento */}
                    <label className={`block border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      paymentMethod === 'gateway'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="gateway"
                        checked={paymentMethod === 'gateway'}
                        onChange={() => setPaymentMethod('gateway')}
                        className="mr-3"
                      />
                      <span className="font-medium">💳 Pagar com Mercado Pago</span>
                      <div className="ml-6 mt-2 text-sm text-gray-600">
                        <p>PIX, Cartão de Crédito ou Boleto</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-bold text-blue-900 mb-2">ℹ️ Como funciona?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  {paymentMethod === 'balance' ? (
                    <>
                      <li>✓ Pagamento instantâneo com saldo</li>
                      <li>✓ Códigos gerados automaticamente</li>
                      <li>✓ Sem taxas adicionais</li>
                    </>
                  ) : (
                    <>
                      <li>✓ Você será redirecionado para o Mercado Pago</li>
                      <li>✓ Após confirmação do pagamento, os códigos serão gerados</li>
                      <li>✓ Prazo: imediato para PIX, até 48h para outros métodos</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Termos */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-800 mb-2">📋 Termos e Condições</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Os códigos serão gerados após confirmação do pagamento</li>
                  <li>• Prazo de aprovação: até 24 horas úteis</li>
                  <li>• Códigos {packageData.type === 'OFFICIAL' ? 'oficiais GS1' : 'internos'} válidos para uso imediato</li>
                  <li>• Não há prazo de validade para utilização dos códigos</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Total e Ação */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Total</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">R$ {Number(packageData.price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Taxa:</span>
                  <span className="font-medium text-green-600">R$ 0,00</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="font-bold text-lg">Total:</span>
                    <span className="font-bold text-2xl text-blue-600">
                      R$ {Number(packageData.price).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={processing}
                className="w-full py-3 px-4 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processando...
                  </span>
                ) : (
                  'Confirmar Compra'
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-3">
                🔒 Compra segura e protegida
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
