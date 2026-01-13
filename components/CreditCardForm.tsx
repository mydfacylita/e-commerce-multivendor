'use client'

import { useEffect, useState, useCallback } from 'react'
import { FiCreditCard, FiLock, FiUser, FiCalendar } from 'react-icons/fi'
import toast from 'react-hot-toast'

declare global {
  interface Window {
    MercadoPago: any
  }
}

interface CreditCardFormProps {
  amount: number
  orderId: string
  onSuccess: () => void
  onError: (error: string) => void
  publicKey: string
  maxInstallments?: number // Máximo de parcelas permitidas
  installmentsFreeInterest?: number // Parcelas sem juros
}

interface Installment {
  installments: number
  recommended_message: string
  installment_amount: number
  total_amount: number
}

export default function CreditCardForm({
  amount,
  orderId,
  onSuccess,
  onError,
  publicKey,
  maxInstallments = 12,
  installmentsFreeInterest = 1
}: CreditCardFormProps) {
  const [mp, setMp] = useState<any>(null)
  const [cardForm, setCardForm] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [installments, setInstallments] = useState<Installment[]>([])
  const [selectedInstallment, setSelectedInstallment] = useState(1)
  const [cardBrand, setCardBrand] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardHolder: '',
    expirationDate: '',
    securityCode: '',
    identificationType: 'CPF',
    identificationNumber: ''
  })

  // Carregar SDK do Mercado Pago
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://sdk.mercadopago.com/js/v2'
    script.async = true
    script.onload = () => {
      if (window.MercadoPago) {
        const mpInstance = new window.MercadoPago(publicKey, {
          locale: 'pt-BR'
        })
        setMp(mpInstance)
        setLoading(false)
      }
    }
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [publicKey])

  // Buscar parcelas quando mudar bandeira do cartão
  const fetchInstallments = useCallback(async (bin: string) => {
    if (!mp || bin.length < 6) return

    try {
      const response = await mp.getInstallments({
        amount: String(amount),
        bin: bin.substring(0, 6)
      })

      if (response && response.length > 0) {
        let payerCosts = response[0].payer_costs || []
        
        // Filtrar parcelas baseado no máximo permitido
        payerCosts = payerCosts.filter((p: Installment) => p.installments <= maxInstallments)
        
        // Marcar parcelas sem juros (para exibição)
        payerCosts = payerCosts.map((p: Installment) => ({
          ...p,
          isFreeInterest: p.installments <= installmentsFreeInterest
        }))
        
        setInstallments(payerCosts)
        setCardBrand(response[0].payment_method_id)
      }
    } catch (error) {
      console.error('Erro ao buscar parcelas:', error)
    }
  }, [mp, amount, maxInstallments, installmentsFreeInterest])

  // Detectar bandeira do cartão
  useEffect(() => {
    const cardNumber = formData.cardNumber.replace(/\s/g, '')
    if (cardNumber.length >= 6) {
      fetchInstallments(cardNumber)
    } else {
      setInstallments([])
      setCardBrand(null)
    }
  }, [formData.cardNumber, fetchInstallments])

  // Formatar número do cartão
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ''
    const parts = []

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
      return parts.join(' ')
    } else {
      return value
    }
  }

  // Formatar data de expiração
  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  // Formatar CPF
  const formatCPF = (value: string) => {
    const v = value.replace(/\D/g, '')
    if (v.length <= 11) {
      return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }
    return v
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!mp) {
      onError('SDK do Mercado Pago não carregado')
      return
    }

    setProcessing(true)

    try {
      // Validações
      if (!formData.cardNumber || !formData.cardHolder || !formData.expirationDate || !formData.securityCode) {
        throw new Error('Preencha todos os campos do cartão')
      }

      if (!formData.identificationNumber) {
        throw new Error('CPF é obrigatório')
      }

      // Separar mês e ano
      const [expMonth, expYear] = formData.expirationDate.split('/')
      
      // Criar token do cartão
      const cardToken = await mp.createCardToken({
        cardNumber: formData.cardNumber.replace(/\s/g, ''),
        cardholderName: formData.cardHolder.toUpperCase(),
        cardExpirationMonth: expMonth,
        cardExpirationYear: '20' + expYear,
        securityCode: formData.securityCode,
        identificationType: formData.identificationType,
        identificationNumber: formData.identificationNumber.replace(/\D/g, '')
      })

      if (cardToken.error) {
        throw new Error(cardToken.error)
      }

      console.log('✅ Token criado:', cardToken.id)

      // Enviar pagamento para API
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          paymentMethod: 'credit_card',
          amount,
          type: 'ORDER',
          referenceId: orderId,
          description: `Pedido #${orderId.slice(0, 8)}`,
          cardToken: cardToken.id,
          installments: selectedInstallment,
          paymentMethodId: cardBrand,
          payer: {
            identification: {
              type: formData.identificationType,
              number: formData.identificationNumber.replace(/\D/g, '')
            }
          }
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar pagamento')
      }

      if (result.status === 'approved') {
        toast.success('Pagamento aprovado! 🎉')
        onSuccess()
      } else if (result.status === 'in_process' || result.status === 'pending') {
        toast.success('Pagamento em análise. Você será notificado.')
        onSuccess()
      } else if (result.status === 'rejected') {
        throw new Error(getRejectMessage(result.statusDetail))
      } else {
        throw new Error('Status de pagamento desconhecido')
      }

    } catch (error: any) {
      console.error('Erro no pagamento:', error)
      onError(error.message || 'Erro ao processar pagamento')
    } finally {
      setProcessing(false)
    }
  }

  const getRejectMessage = (statusDetail: string): string => {
    const messages: Record<string, string> = {
      'cc_rejected_bad_filled_card_number': 'Número do cartão incorreto',
      'cc_rejected_bad_filled_date': 'Data de validade incorreta',
      'cc_rejected_bad_filled_other': 'Dados do cartão incorretos',
      'cc_rejected_bad_filled_security_code': 'Código de segurança incorreto',
      'cc_rejected_blacklist': 'Cartão não permitido',
      'cc_rejected_call_for_authorize': 'Ligue para sua operadora para autorizar',
      'cc_rejected_card_disabled': 'Cartão desabilitado. Ligue para sua operadora',
      'cc_rejected_card_error': 'Erro no cartão. Tente outro cartão',
      'cc_rejected_duplicated_payment': 'Pagamento duplicado',
      'cc_rejected_high_risk': 'Pagamento recusado por segurança',
      'cc_rejected_insufficient_amount': 'Saldo insuficiente',
      'cc_rejected_invalid_installments': 'Parcelas inválidas',
      'cc_rejected_max_attempts': 'Limite de tentativas excedido',
      'cc_rejected_other_reason': 'Pagamento não processado. Tente outro cartão'
    }
    return messages[statusDetail] || 'Pagamento recusado. Tente outro cartão'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Carregando...</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Número do Cartão */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Número do Cartão
        </label>
        <div className="relative">
          <FiCreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={formData.cardNumber}
            onChange={(e) => setFormData({ ...formData, cardNumber: formatCardNumber(e.target.value) })}
            placeholder="0000 0000 0000 0000"
            maxLength={19}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={processing}
          />
          {cardBrand && (
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs font-semibold text-gray-500 uppercase">
              {cardBrand}
            </span>
          )}
        </div>
      </div>

      {/* Nome do Titular */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome no Cartão
        </label>
        <div className="relative">
          <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={formData.cardHolder}
            onChange={(e) => setFormData({ ...formData, cardHolder: e.target.value.toUpperCase() })}
            placeholder="NOME COMO ESTÁ NO CARTÃO"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase"
            disabled={processing}
          />
        </div>
      </div>

      {/* Validade e CVV */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Validade
          </label>
          <div className="relative">
            <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={formData.expirationDate}
              onChange={(e) => setFormData({ ...formData, expirationDate: formatExpiry(e.target.value) })}
              placeholder="MM/AA"
              maxLength={5}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={processing}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CVV
          </label>
          <div className="relative">
            <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={formData.securityCode}
              onChange={(e) => setFormData({ ...formData, securityCode: e.target.value.replace(/\D/g, '') })}
              placeholder="123"
              maxLength={4}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={processing}
            />
          </div>
        </div>
      </div>

      {/* CPF */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          CPF do Titular
        </label>
        <input
          type="text"
          value={formData.identificationNumber}
          onChange={(e) => setFormData({ ...formData, identificationNumber: formatCPF(e.target.value) })}
          placeholder="000.000.000-00"
          maxLength={14}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={processing}
        />
      </div>

      {/* Parcelas */}
      {installments.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Parcelas
          </label>
          <select
            value={selectedInstallment}
            onChange={(e) => setSelectedInstallment(Number(e.target.value))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={processing}
          >
            {installments.map((inst) => (
              <option key={inst.installments} value={inst.installments}>
                {inst.installments}x de R$ {inst.installment_amount.toFixed(2)}
                {inst.installments > 1 && ` (Total: R$ ${inst.total_amount.toFixed(2)})`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Botão de Pagamento */}
      <button
        type="submit"
        disabled={processing || !cardBrand}
        className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
          processing || !cardBrand
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {processing ? (
          <span className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Processando...
          </span>
        ) : (
          <span className="flex items-center justify-center">
            <FiLock className="mr-2" />
            Pagar R$ {amount.toFixed(2)}
          </span>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center flex items-center justify-center">
        <FiLock className="mr-1" />
        Pagamento seguro processado pelo Mercado Pago
      </p>
    </form>
  )
}
