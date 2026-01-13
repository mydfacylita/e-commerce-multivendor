'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/store'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { FiCreditCard, FiDollarSign, FiAlertCircle, FiMapPin, FiPlus, FiCheck, FiTrash2 } from 'react-icons/fi'

// Função para calcular data de entrega estimada
function calcularDataEntrega(diasUteis: number): string {
  const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  
  const hoje = new Date()
  let diasContados = 0
  const dataEntrega = new Date(hoje)
  
  while (diasContados < diasUteis) {
    dataEntrega.setDate(dataEntrega.getDate() + 1)
    const diaSemana = dataEntrega.getDay()
    // Pular sábado (6) e domingo (0)
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasContados++
    }
  }
  
  const nomeDia = diasSemana[dataEntrega.getDay()]
  const dia = dataEntrega.getDate()
  const mes = meses[dataEntrega.getMonth()]
  
  return `${nomeDia}, ${dia} de ${mes}`
}

// Função para formatar moeda no padrão brasileiro
function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Gateway {
  gateway: string
  isActive: boolean
}

interface SavedAddress {
  id: string
  label?: string
  recipientName?: string
  street: string
  complement?: string
  neighborhood?: string
  city: string
  state: string
  zipCode: string
  phone?: string
  cpf?: string
  isDefault: boolean
}

export default function CheckoutPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { items, total, clearCart } = useCartStore()
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'address' | 'payment'>('address')
  const [orderId, setOrderId] = useState<string>('')
  const [activeGateways, setActiveGateways] = useState<Gateway[]>([])
  const [loadingGateways, setLoadingGateways] = useState(false)
  const [cupom, setCupom] = useState('')
  const [desconto, setDesconto] = useState(0)
  const [frete, setFrete] = useState(0)
  const [freteGratis, setFreteGratis] = useState(false)
  const [prazoEntrega, setPrazoEntrega] = useState(0)
  const [freteCalculado, setFreteCalculado] = useState(false)
  const [calculandoFrete, setCalculandoFrete] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [formData, setFormData] = useState({
    address: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    cpf: '',
  })

  useEffect(() => {
    // Carregar apenas cupom e desconto do carrinho
    // SEGURANÇA: NÃO carregar frete - deve ser recalculado baseado no CEP do endereço
    const savedCartData = localStorage.getItem('checkoutData')
    if (savedCartData) {
      const data = JSON.parse(savedCartData)
      setCupom(data.cupom || '')
      setDesconto(data.desconto || 0)
      // Frete será calculado quando o CEP do endereço for preenchido
      setFrete(0)
      setFreteGratis(false)
      setFreteCalculado(false)
    }
  }, [])

  // Carregar endereços salvos do usuário
  useEffect(() => {
    const loadSavedAddresses = async () => {
      try {
        const response = await fetch('/api/user/addresses')
        if (response.ok) {
          const addresses = await response.json()
          setSavedAddresses(addresses)
          
          // Se tiver endereços, selecionar o padrão ou o mais recente
          if (addresses.length > 0) {
            const defaultAddr = addresses.find((a: SavedAddress) => a.isDefault) || addresses[0]
            setSelectedAddressId(defaultAddr.id)
            
            // Preencher formulário com os dados do endereço selecionado
            setFormData({
              address: defaultAddr.street + (defaultAddr.complement ? `, ${defaultAddr.complement}` : ''),
              neighborhood: defaultAddr.neighborhood || '',
              city: defaultAddr.city,
              state: defaultAddr.state,
              zipCode: defaultAddr.zipCode,
              phone: defaultAddr.phone || '',
              cpf: defaultAddr.cpf || '',
            })
            setShowNewAddressForm(false)
          } else {
            // Sem endereços salvos, mostrar formulário
            setShowNewAddressForm(true)
          }
        }
      } catch (error) {
        console.error('Erro ao carregar endereços:', error)
        setShowNewAddressForm(true)
      } finally {
        setLoadingAddresses(false)
      }
    }
    
    if (session?.user) {
      loadSavedAddresses()
    }
  }, [session])

  // Calcular frete quando CEP for preenchido
  const calcularFrete = async (cep: string) => {
    if (cep.length !== 8) return
    
    setCalculandoFrete(true)
    try {
      const response = await fetch('/api/shipping/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cep,
          cartValue: total(),
          weight: 1 // peso padrão
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.isFree) {
          setFreteGratis(true)
          setFrete(0)
        } else {
          setFreteGratis(false)
          setFrete(data.shippingCost || 0)
        }
        setPrazoEntrega(data.deliveryDays || 0)
        setFreteCalculado(true)
      }
    } catch (error) {
      console.error('Erro ao calcular frete:', error)
    } finally {
      setCalculandoFrete(false)
    }
  }

  // Consultar ViaCEP para preencher endereço automaticamente
  const consultarCep = async (cep: string) => {
    if (cep.length !== 8) return
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      if (response.ok) {
        const data = await response.json()
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            address: prev.address || data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || ''
          }))
        }
      }
    } catch (error) {
      console.error('Erro ao consultar CEP:', error)
    }
  }

  // SEGURANÇA: Recalcular frete automaticamente quando CEP do endereço mudar
  useEffect(() => {
    const cepNumeros = formData.zipCode.replace(/\D/g, '')
    if (cepNumeros.length === 8) {
      // Consultar ViaCEP para preencher dados
      consultarCep(cepNumeros)
      // Invalidar frete anterior e recalcular
      setFreteCalculado(false)
      calcularFrete(cepNumeros)
    } else {
      // CEP incompleto - resetar frete
      setFrete(0)
      setFreteGratis(false)
      setFreteCalculado(false)
    }
  }, [formData.zipCode])

  useEffect(() => {
    if (step === 'payment') {
      loadActiveGateways()
    }
  }, [step])

  const loadActiveGateways = async () => {
    setLoadingGateways(true)
    try {
      const response = await fetch('/api/payment/gateways')
      if (response.ok) {
        const data = await response.json()
        setActiveGateways(data.gateways)
      }
    } catch (error) {
      console.error('Erro ao carregar gateways:', error)
    } finally {
      setLoadingGateways(false)
    }
  }

  // Selecionar um endereço salvo
  const handleSelectAddress = (address: SavedAddress) => {
    setSelectedAddressId(address.id)
    setFormData({
      address: address.street + (address.complement ? `, ${address.complement}` : ''),
      neighborhood: address.neighborhood || '',
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      phone: address.phone || '',
      cpf: address.cpf || '',
    })
    setShowNewAddressForm(false)
  }

  // Deletar endereço
  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Remover este endereço?')) return
    
    try {
      const response = await fetch(`/api/user/addresses/${addressId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setSavedAddresses(prev => prev.filter(a => a.id !== addressId))
        if (selectedAddressId === addressId) {
          setSelectedAddressId(null)
          setFormData({ address: '', neighborhood: '', city: '', state: '', zipCode: '', phone: '', cpf: '' })
          setShowNewAddressForm(true)
        }
        toast.success('Endereço removido')
      }
    } catch (error) {
      toast.error('Erro ao remover endereço')
    }
  }

  if (!session) {
    router.push('/login')
    return null
  }

  // Só redirecionar se carrinho vazio E não tiver pedido criado
  // (quando há orderId, o cliente está na etapa de pagamento e o carrinho pode estar vazio)
  if (items.length === 0 && !orderId && step !== 'payment') {
    router.push('/carrinho')
    return null
  }

  const getGatewayInfo = (gateway: string) => {
    const gateways: Record<string, { name: string; description: string; icon: any; color: string }> = {
      MERCADOPAGO: {
        name: 'MYDSHOP PAGAMENTOS',
        description: 'Pix, Cartão ou Boleto',
        icon: FiCreditCard,
        color: 'blue'
      },
      PAGSEGURO: {
        name: 'PagSeguro',
        description: 'Pix, Cartão ou Boleto',
        icon: FiDollarSign,
        color: 'green'
      },
      STRIPE: {
        name: 'Stripe',
        description: 'Cartão Internacional',
        icon: FiCreditCard,
        color: 'purple'
      },
      PAYPAL: {
        name: 'PayPal',
        description: 'PayPal e Cartão',
        icon: FiDollarSign,
        color: 'indigo'
      }
    }
    return gateways[gateway] || {
      name: gateway,
      description: 'Pagamento Online',
      icon: FiCreditCard,
      color: 'gray'
    }
  }

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // SEGURANÇA: Verificar se o frete foi calculado para o CEP atual
    const cepNumeros = formData.zipCode.replace(/\D/g, '')
    if (cepNumeros.length !== 8) {
      toast.error('Por favor, informe um CEP válido com 8 dígitos')
      return
    }
    
    if (!freteCalculado || calculandoFrete) {
      toast.error('Aguarde o cálculo do frete antes de continuar')
      return
    }
    
    setIsLoading(true)

    try {
      // Se é um novo endereço, salvar no cadastro do usuário
      if (showNewAddressForm && !selectedAddressId) {
        const addressResponse = await fetch('/api/user/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            street: formData.address,
            neighborhood: formData.neighborhood,
            city: formData.city,
            state: formData.state,
            zipCode: cepNumeros,
            phone: formData.phone,
            cpf: formData.cpf,
            isDefault: savedAddresses.length === 0 // Primeiro endereço é padrão
          })
        })
        
        if (addressResponse.ok) {
          const newAddress = await addressResponse.json()
          setSavedAddresses(prev => [newAddress, ...prev])
          console.log('✅ Novo endereço salvo:', newAddress.id)
        }
      }
      
      // Usar o frete calculado (já validado pelo useEffect do CEP)
      const freteAtual = frete
      const freteGratisAtual = freteGratis

      // Buscar endereço completo se selecionado
      const selectedAddr = savedAddresses.find(a => a.id === selectedAddressId)
      
      // Montar endereço como JSON estruturado para boleto/cartão
      const shippingAddressData = {
        street: selectedAddr?.street || formData.address.split(',')[0]?.trim() || formData.address,
        number: selectedAddr?.street?.match(/\d+$/)?.[0] || formData.address.match(/\d+/)?.[0] || 'SN',
        complement: selectedAddr?.complement || '',
        neighborhood: selectedAddr?.neighborhood || formData.neighborhood || 'Centro',
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode.replace(/\D/g, ''),
        // Texto legível para exibição
        formatted: `${formData.address}, ${formData.neighborhood ? formData.neighborhood + ', ' : ''}${formData.city}, ${formData.state} - ${formData.zipCode}`
      }
      
      const itemsSubtotal = total()
      const finalTotal = itemsSubtotal - desconto + (freteGratisAtual ? 0 : freteAtual)
      
      const orderData = {
        items: items.map(item => ({
          productId: item.productId || item.id,
          quantity: item.quantity,
          price: item.price,
          selectedSize: item.selectedSize || null,
          selectedColor: item.selectedColor || null,
        })),
        total: finalTotal,
        subtotal: itemsSubtotal,
        shippingCost: freteGratisAtual ? 0 : freteAtual,
        couponCode: cupom || null,
        discountAmount: desconto,
        shippingAddress: JSON.stringify(shippingAddressData),
        deliveryDays: prazoEntrega || null,
        buyerPhone: formData.phone,
        buyerCpf: formData.cpf,
      }
      
      let response: Response
      let newOrderId = orderId
      
      // Se já existe um pedido, fazer UPDATE em vez de CREATE
      if (orderId) {
        console.log('📦 Atualizando pedido existente:', orderId)
        response = await fetch(`/api/orders/${orderId}/update`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Erro ao atualizar pedido')
        }
        
        toast.success('Pedido atualizado!')
      } else {
        // Criar novo pedido
        console.log('📦 Criando novo pedido')
        response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        })

        if (!response.ok) {
          throw new Error('Erro ao criar pedido')
        }

        const data = await response.json()
        console.log('📦 Resposta da API de pedido:', data)
        
        if (!data.orderId) {
          console.error('❌ OrderId não retornado pela API:', data)
          throw new Error('ID do pedido não foi retornado')
        }
        
        newOrderId = data.orderId
        setOrderId(newOrderId)
        console.log('✅ Order ID salvo:', newOrderId)
        
        toast.success('Pedido criado com sucesso!')
      }
      
      setStep('payment')
    } catch (error) {
      console.error('❌ Erro ao processar pedido:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao processar pedido')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePayment = async (gateway?: string) => {
    setIsLoading(true)

    try {
      console.log('💳 Processando pagamento com gateway:', gateway)
      console.log('📦 Order ID atual:', orderId)
      
      if (!orderId) {
        console.error('❌ Order ID não existe!')
        toast.error('Erro: Pedido não encontrado')
        setIsLoading(false)
        return
      }
      
      console.log('🔄 Redirecionando para:', `/checkout/pagamento/${orderId}`)
      
      // Redirecionar para página de pagamento
      // O carrinho será limpo na página de pagamento ao carregar
      router.push(`/checkout/pagamento/${orderId}`)
    } catch (error) {
      console.error('❌ Erro ao processar pagamento:', error)
      toast.error('Erro ao processar pagamento')
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Finalizar Compra</h1>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Adicionar mais produtos
        </button>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-center">
          {/* Step 1 - Carrinho (clicável para voltar) */}
          <button 
            onClick={() => router.push('/carrinho')}
            className="flex items-center text-green-600 hover:opacity-80 transition-opacity"
            title="Voltar ao carrinho"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-green-600 bg-green-600 text-white">
              ✓
            </div>
            <span className="ml-2 font-medium">Carrinho</span>
          </button>
          <div className="w-16 h-0.5 mx-2 bg-green-600"></div>
          
          {/* Step 2 - Endereço */}
          <div className={`flex items-center ${step === 'address' ? 'text-primary-600' : 'text-green-600'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
              step === 'address' ? 'border-primary-600 bg-primary-600 text-white' : 'border-green-600 bg-green-600 text-white'
            }`}>
              {step === 'payment' ? '✓' : '2'}
            </div>
            <span className="ml-2 font-medium">Endereço</span>
          </div>
          <div className={`w-16 h-0.5 mx-2 ${step === 'payment' ? 'bg-primary-600' : 'bg-gray-300'}`}></div>
          
          {/* Step 3 - Pagamento */}
          <div className={`flex items-center ${step === 'payment' ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
              step === 'payment' ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300'
            }`}>
              3
            </div>
            <span className="ml-2 font-medium">Pagamento</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
        {step === 'address' ? (
          <form onSubmit={handleAddressSubmit} className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">Endereço de Entrega</h2>

              {/* Lista de endereços salvos */}
              {loadingAddresses ? (
                <div className="text-center py-4 text-gray-500">
                  Carregando endereços...
                </div>
              ) : savedAddresses.length > 0 && !showNewAddressForm ? (
                <div className="space-y-3 mb-6">
                  {savedAddresses.map((addr) => (
                    <div 
                      key={addr.id}
                      onClick={() => handleSelectAddress(addr)}
                      className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedAddressId === addr.id 
                          ? 'border-primary-600 bg-primary-50' 
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                            selectedAddressId === addr.id 
                              ? 'border-primary-600 bg-primary-600' 
                              : 'border-gray-300'
                          }`}>
                            {selectedAddressId === addr.id && <FiCheck className="text-white text-xs" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <FiMapPin className="text-gray-500" />
                              <span className="font-medium">
                                {addr.label || 'Endereço'} 
                                {addr.isDefault && <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded ml-2">Padrão</span>}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm mt-1">{addr.street}</p>
                            <p className="text-gray-500 text-sm">{addr.city}, {addr.state} - CEP {addr.zipCode}</p>
                            {addr.phone && <p className="text-gray-500 text-xs mt-1">Tel: {addr.phone}</p>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteAddress(addr.id); }}
                          className="text-gray-400 hover:text-red-500 p-1"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Botão para adicionar novo endereço */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewAddressForm(true)
                      setSelectedAddressId(null)
                      setFormData({ address: '', neighborhood: '', city: '', state: '', zipCode: '', phone: '', cpf: '' })
                    }}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-400 hover:text-primary-600 flex items-center justify-center gap-2"
                  >
                    <FiPlus /> Adicionar novo endereço
                  </button>
                </div>
              ) : null}

              {/* Formulário de endereço (novo ou quando não tem salvos) */}
              {(showNewAddressForm || savedAddresses.length === 0) && (
                <div className="space-y-4">
                  {savedAddresses.length > 0 && (
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-gray-700">Novo Endereço</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewAddressForm(false)
                          if (savedAddresses.length > 0) {
                            handleSelectAddress(savedAddresses[0])
                          }
                        }}
                        className="text-sm text-primary-600 hover:underline"
                      >
                        ← Voltar para endereços salvos
                      </button>
                    </div>
                  )}
                  
                <div>
                  <label className="block text-sm font-medium mb-2">Endereço</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="Rua, número, complemento"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Bairro</label>
                  <input
                    type="text"
                    required
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="Bairro"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Cidade</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Estado</label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">CEP</label>
                    <input
                      type="text"
                      required
                      value={formData.zipCode}
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                      className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                      placeholder="00000000"
                      maxLength={8}
                    />
                    {/* Feedback do frete calculado */}
                    {calculandoFrete && (
                      <p className="text-sm text-gray-500 mt-1">⏳ Calculando frete...</p>
                    )}
                    {freteCalculado && !calculandoFrete && (
                      <p className="text-sm text-green-600 mt-1">
                        ✅ Frete: {freteGratis ? 'GRÁTIS' : `R$ ${formatarMoeda(frete)}`}
                        {prazoEntrega > 0 && ` (${prazoEntrega} dias úteis)`}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Telefone</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">CPF</label>
                  <input
                    type="text"
                    required
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="000.000.000-00"
                  />
                </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-600 text-white py-4 rounded-md hover:bg-primary-700 font-semibold text-lg disabled:bg-gray-400"
            >
              {isLoading ? 'Processando...' : 'Continuar para Pagamento'}
            </button>
          </form>
        ) : (
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">Forma de Pagamento</h2>
              
              <div className="mb-6 p-4 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600 mb-1">Pedido criado com sucesso!</p>
                <p className="text-xs text-gray-500">ID: {orderId}</p>
              </div>

              {loadingGateways ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando formas de pagamento...</p>
                  </div>
                </div>
              ) : activeGateways.length === 0 ? (
                <div className="text-center py-12">
                  <FiAlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Nenhuma forma de pagamento disponível
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Entre em contato com o suporte para finalizar seu pedido.
                  </p>
                  <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded">
                    O administrador precisa configurar ao menos um gateway de pagamento na plataforma.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-gray-600 mb-6">
                    Escolha como deseja pagar seu pedido:
                  </p>

                  <div className="space-y-4">
                    {activeGateways.map((gateway) => {
                      const info = getGatewayInfo(gateway.gateway)
                      const Icon = info.icon
                      
                      return (
                        <button
                          key={gateway.gateway}
                          onClick={() => handlePayment(gateway.gateway)}
                          disabled={isLoading}
                          className="w-full flex items-center justify-between p-6 border-2 border-gray-200 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 bg-${info.color}-100 rounded-lg flex items-center justify-center group-hover:bg-${info.color}-200`}>
                              <Icon className={`text-2xl text-${info.color}-600`} />
                            </div>
                            <div className="text-left">
                              <h3 className="font-bold text-lg">{info.name}</h3>
                              <p className="text-sm text-gray-500">{info.description}</p>
                            </div>
                          </div>
                          <div className="text-primary-600 font-medium">
                            {isLoading ? 'Processando...' : 'Escolher →'}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              <button
                onClick={() => setStep('address')}
                disabled={isLoading}
                className="w-full mt-6 py-3 border border-gray-300 rounded-md hover:bg-gray-50 font-medium disabled:opacity-50"
              >
                ← Voltar ao Endereço
              </button>
            </div>
          </div>
        )}

        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
            <h2 className="text-2xl font-bold mb-4">Resumo</h2>

            <div className="space-y-4 mb-4 max-h-80 overflow-y-auto">
              {items.map((item) => (
                <div key={`${item.id}_${item.selectedSize}_${item.selectedColor}`} className="flex gap-3 items-start">
                  <div className="relative w-16 h-16 bg-gray-200 rounded flex-shrink-0">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" title={item.name}>{item.name}</p>
                    <p className="text-xs text-gray-500">Qtd: {item.quantity}</p>
                    {(item.selectedSize || item.selectedColor) && (
                      <p className="text-xs text-gray-500">
                        {item.selectedSize && <span>Tam: {item.selectedSize}</span>}
                        {item.selectedSize && item.selectedColor && <span> • </span>}
                        {item.selectedColor && <span>Cor: {item.selectedColor}</span>}
                      </p>
                    )}
                    <p className="font-semibold text-primary-600 mt-1">R$ {formatarMoeda(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>R$ {formatarMoeda(total())}</span>
              </div>
              {desconto > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Desconto ({cupom})</span>
                  <span>- R$ {formatarMoeda(desconto)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Frete</span>
                <div className="text-right">
                  {freteGratis ? (
                    <span className="text-green-600 font-semibold">Grátis</span>
                  ) : (
                    <span>R$ {formatarMoeda(frete)}</span>
                  )}
                  {prazoEntrega > 0 && (
                    <p className="text-xs text-green-600 font-medium">
                      📦 Chegará {calcularDataEntrega(prazoEntrega)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-between text-xl font-bold border-t pt-2">
                <span>Total</span>
                <span className="text-primary-600">R$ {formatarMoeda(total() - desconto + (freteGratis ? 0 : frete))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
