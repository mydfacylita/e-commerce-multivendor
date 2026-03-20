'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/store'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { FiCreditCard, FiDollarSign, FiAlertCircle, FiMapPin, FiPlus, FiCheck, FiTrash2, FiInfo } from 'react-icons/fi'
import { calcularImpostoImportacao, type CalculoImpostoResult } from '@/lib/import-tax'
import { trackBeginCheckout } from '@/components/GoogleAds'
import { analytics } from '@/lib/analytics-client'

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

// Função para formatar CPF com máscara
function formatarCPF(valor: string): string {
  // Remove tudo que não é número
  const numeros = valor.replace(/\D/g, '')
  
  // Limita a 11 dígitos
  const limitado = numeros.substring(0, 11)
  
  // Aplica a máscara
  if (limitado.length <= 3) {
    return limitado
  } else if (limitado.length <= 6) {
    return `${limitado.slice(0, 3)}.${limitado.slice(3)}`
  } else if (limitado.length <= 9) {
    return `${limitado.slice(0, 3)}.${limitado.slice(3, 6)}.${limitado.slice(6)}`
  } else {
    return `${limitado.slice(0, 3)}.${limitado.slice(3, 6)}.${limitado.slice(6, 9)}-${limitado.slice(9)}`
  }
}

// Função para validar CPF (algoritmo oficial)
function validarCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const numeros = cpf.replace(/\D/g, '')
  
  // Deve ter 11 dígitos
  if (numeros.length !== 11) {
    return false
  }
  
  // Verifica se todos os dígitos são iguais (CPFs inválidos como 111.111.111-11)
  if (/^(\d)\1{10}$/.test(numeros)) {
    return false
  }
  
  // Validação do primeiro dígito verificador
  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(numeros[i]) * (10 - i)
  }
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(numeros[9])) {
    return false
  }
  
  // Validação do segundo dígito verificador
  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(numeros[i]) * (11 - i)
  }
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(numeros[10])) {
    return false
  }
  
  return true
}

// Função para formatar telefone com máscara (00) 00000-0000
function formatarTelefone(valor: string): string {
  // Remove tudo que não é número
  const numeros = valor.replace(/\D/g, '')
  
  // Limita a 11 dígitos (DDD + 9 dígitos)
  const limitado = numeros.substring(0, 11)
  
  // Aplica a máscara
  if (limitado.length <= 2) {
    return limitado.length > 0 ? `(${limitado}` : ''
  } else if (limitado.length <= 7) {
    return `(${limitado.slice(0, 2)}) ${limitado.slice(2)}`
  } else {
    return `(${limitado.slice(0, 2)}) ${limitado.slice(2, 7)}-${limitado.slice(7)}`
  }
}

// Função para validar telefone (mínimo DDD + 8 dígitos)
function validarTelefone(telefone: string): boolean {
  const numeros = telefone.replace(/\D/g, '')
  // Deve ter pelo menos 10 dígitos (DDD + 8) ou 11 (DDD + 9)
  return numeros.length >= 10 && numeros.length <= 11
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
  reference?: string
  notes?: string
  isDefault: boolean
}

export default function CheckoutPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { items: allItems, total: cartTotal, clearCart } = useCartStore()
  
  // Estado para itens selecionados do carrinho
  const [itensSelecionadosIds, setItensSelecionadosIds] = useState<Set<string>>(new Set())
  
  // Filtrar apenas itens selecionados
  const items = useMemo(() => {
    if (itensSelecionadosIds.size === 0) return allItems // fallback se não tiver seleção
    return allItems.filter(item => itensSelecionadosIds.has(item.id))
  }, [allItems, itensSelecionadosIds])
  
  // Calcular total apenas dos itens selecionados
  const total = useMemo(() => {
    return () => items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }, [items])
  
  // Agrupar itens por origem de envio
  const gruposDeEnvio = useMemo(() => {
    const grupos: Map<string, { 
      id: string
      nome: string 
      itens: typeof items 
    }> = new Map()
    
    for (const item of items) {
      let grupoId: string
      let grupoNome: string
      
      // Internacional = fornecedor AliExpress/importado E produto vem de fora do BR
      // Se shipFromCountry = BR (estoque local AliExpress), trata como nacional
      const isInternational = (item.isInternationalSupplier || item.itemType === 'DROP') && item.shipFromCountry !== 'BR'
      
      if (isInternational) {
        // Cada fornecedor internacional = envio separado
        // Agrupa pelo sellerId (vendedor AliExpress); se não tiver, cada produto é um envio
        const supplierId = item.sellerId || item.productId || item.id
        grupoId = `INTERNACIONAL_${supplierId}`
        grupoNome = 'Internacional'
      } else if (item.sellerId && item.sellerCep) {
        grupoId = `SELLER_${item.sellerId}`
        grupoNome = 'Vendedor Parceiro'
      } else {
        grupoId = 'ADM'
        grupoNome = 'Loja Principal'
      }
      
      if (!grupos.has(grupoId)) {
        grupos.set(grupoId, { id: grupoId, nome: grupoNome, itens: [] })
      }
      grupos.get(grupoId)!.itens.push(item)
    }
    
    return Array.from(grupos.values())
  }, [items])
  
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
  const [prazoDescricaoGeral, setPrazoDescricaoGeral] = useState('') // Ex: "02 - 06 de Fev."
  const [freteErro, setFreteErro] = useState<string | null>(null)
  const [freteCalculado, setFreteCalculado] = useState(false)
  const [calculandoFrete, setCalculandoFrete] = useState(false)
  
  // Fretes por grupo de envio (para pedidos híbridos)
  const [fretesPorGrupo, setFretesPorGrupo] = useState<Array<{
    grupoId: string
    grupoNome: string
    frete: number
    prazo: number
    prazoDescricao?: string // Ex: "10 - 27 de Fev."
    gratis: boolean
  }>>([])
  
  // Campos de transportadora
  const [shippingMethod, setShippingMethod] = useState<string | null>(null)
  const [shippingService, setShippingService] = useState<string | null>(null)
  const [shippingCarrier, setShippingCarrier] = useState<string | null>(null)
  // Opções de frete disponíveis
  const [opcoesFreteState, setOpcoesFreteState] = useState<Array<{
    id: string
    name: string
    price: number
    deliveryDays: number
    carrier: string
    method: string
    service: string
  }>>([])
  const [freteSelecionado, setFreteSelecionado] = useState<string | null>(null)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  // Estados e cidades
  const [states, setStates] = useState<{id: number, name: string, uf: string}[]>([])
  const [cities, setCities] = useState<{id: number, name: string}[]>([])
  const [loadingCities, setLoadingCities] = useState(false)
  const [cepValidado, setCepValidado] = useState(false) // CEP foi validado pelo ViaCEP
  const [cepErro, setCepErro] = useState('') // Erro de validação do CEP
  const [buscandoCep, setBuscandoCep] = useState(false) // Buscando dados do CEP
  const [cpfError, setCpfError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [cpfUsuario, setCpfUsuario] = useState('') // CPF do usuário logado
  const [formData, setFormData] = useState({
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    cpf: '',
    reference: '', // Ponto de referência
    notes: '', // Observações
  })

  // Carregar CPF do usuário da sessão
  useEffect(() => {
    if (session?.user?.cpf) {
      const cpfFormatado = formatarCPF(session.user.cpf)
      setCpfUsuario(cpfFormatado)
      setFormData(prev => ({ ...prev, cpf: cpfFormatado }))
    }
  }, [session])

  // Rastrear InitiateCheckout para Facebook Pixel e Google Ads
  useEffect(() => {
    if (items.length > 0 && status === 'authenticated') {
      const totalValue = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      
      // Facebook Pixel - InitiateCheckout
      analytics.initiateCheckout({
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        total: totalValue
      })
      
      // Google Ads - BeginCheckout
      trackBeginCheckout(
        items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        totalValue
      )
    }
  }, [items.length, status])

  useEffect(() => {
    // Carregar dados do carrinho incluindo itens selecionados
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
      
      // Carregar itens selecionados do carrinho
      if (data.itensSelecionados && Array.isArray(data.itensSelecionados)) {
        setItensSelecionadosIds(new Set(data.itensSelecionados))
      }
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
              address: defaultAddr.street || '',
              number: 'S/N',
              complement: defaultAddr.complement || '',
              neighborhood: defaultAddr.neighborhood || '',
              city: defaultAddr.city,
              state: defaultAddr.state,
              zipCode: defaultAddr.zipCode,
              phone: formatarTelefone(defaultAddr.phone || ''),
              cpf: formatarCPF(defaultAddr.cpf || ''),
              reference: defaultAddr.reference || '',
              notes: defaultAddr.notes || '',
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

  // Carregar lista de estados
  useEffect(() => {
    const loadStates = async () => {
      try {
        const res = await fetch('/api/location/states')
        if (res.ok) {
          setStates(await res.json())
        }
      } catch (error) {
        console.error('Erro ao carregar estados:', error)
      }
    }
    loadStates()
  }, [])

  // Calcular impostos de importação baseado nos itens do carrinho e estado de destino
  const calculoImpostos = useMemo((): CalculoImpostoResult => {
    // Só calcular se tiver estado selecionado
    const ufDestino = formData.state || ''
    
    // Converter itens do carrinho para formato de cálculo
    // Verificação dupla: usa isImported E verifica shipFromCountry
    // Se shipFromCountry = 'BR', NÃO é importado para fins de impostos
    const produtosParaCalculo = items.map(item => {
      const shipFrom = item.shipFromCountry?.toUpperCase()
      // Se vem do Brasil, NÃO é importado para impostos
      const isImportadoParaImposto = shipFrom === 'BR' ? false : (item.isImported || false)
      
      return {
        preco: item.price,
        quantidade: item.quantity,
        isImportado: isImportadoParaImposto,
        shipFromCountry: item.shipFromCountry || null
      }
    })
    
    return calcularImpostoImportacao(produtosParaCalculo, ufDestino)
  }, [items, formData.state])

  // Calcular peso total dos produtos
  const calcularPesoTotal = async (): Promise<number> => {
    try {
      const response = await fetch('/api/products/weights', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
        },
        body: JSON.stringify({
          productIds: items.map(item => ({ id: item.id, quantity: item.quantity }))
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.totalWeight || items.length * 0.5
      }
      return items.length * 0.5
    } catch (error) {
      console.error('Erro ao calcular peso:', error)
      return items.length * 0.5
    }
  }

  // Calcular frete quando CEP for preenchido
  const calcularFrete = async (cep: string) => {
    if (cep.length !== 8) return

    setCalculandoFrete(true)
    setFreteErro(null)

    try {
      const pesoTotal = await calcularPesoTotal()
      console.log('⚖️ [Checkout] Peso calculado:', pesoTotal, 'kg')
      console.log('📦 [Checkout] Grupos de envio:', gruposDeEnvio.length)

      const fretesCalculados: typeof fretesPorGrupo = []
      let freteTotal = 0
      let prazoMax = 0
      let todosGratis = true

      for (let i = 0; i < gruposDeEnvio.length; i++) {
        const grupo = gruposDeEnvio[i]

        const payload = {
          cep,
          cartValue: grupo.itens.reduce((sum, item) => sum + item.price * item.quantity, 0),
          items: grupo.itens.map(item => ({ id: item.productId || item.id, quantity: item.quantity }))
        }

        const response = await fetch('/api/shipping/quote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => null)
          throw new Error(errData?.error || errData?.message || 'Erro ao calcular frete')
        }

        const data = await response.json()
        if (data.error) {
          throw new Error(data.error)
        }

        const options = [] as Array<{
          id: string
          name: string
          price: number
          deliveryDays: number
          carrier: string
          method: string
          service: string
          isFree?: boolean
        }>

        // Helper para sanitizar dias (evita NaN)
        const safeDays = (v: any, fallback: number) => { const n = Number(v); return isNaN(n) || n <= 0 ? fallback : n }

        if (Array.isArray(data.shippingOptions) && data.shippingOptions.length > 0) {
          for (const opt of data.shippingOptions) {
            options.push({
              id: opt.id || `frete_${opt.method || 'propria'}_${opt.service || 'padrão'}`.toLowerCase().replace(/\s+/g, '_'),
              name: opt.name || opt.service || 'Frete',
              price: Number(opt.price || 0),
              deliveryDays: safeDays(opt.deliveryDays ?? opt.days, 7),
              carrier: opt.carrier || 'Transportadora',
              method: opt.method || 'propria',
              service: opt.service || '',
              isFree: !!opt.isFree || Number(opt.price || 0) === 0
            })
          }
        } else if (Array.isArray(data.allOptions) && data.allOptions.length > 0) {
          for (const opt of data.allOptions) {
            options.push({
              id: opt.id || `frete_${opt.method || 'internacional'}_${opt.name || 'padrão'}`.toLowerCase().replace(/\s+/g, '_'),
              name: opt.name || 'Frete',
              price: Number(opt.price || 0),
              deliveryDays: safeDays(opt.days ?? opt.deliveryDays, 30),
              carrier: opt.carrier || 'Fornecedor Internacional',
              method: opt.method || 'internacional',
              service: opt.service || '',
              isFree: !!opt.isFree || Number(opt.price || 0) === 0
            })
          }
        } else if (data.isFree || Number(data.shippingCost || 0) === 0) {
          options.push({
            id: 'frete_gratis',
            name: data.shippingService || 'Frete Grátis',
            price: 0,
            deliveryDays: safeDays(data.deliveryDays, 0),
            carrier: data.shippingCarrier || 'Grátis',
            method: data.shippingMethod || 'gratis',
            service: data.shippingService || 'Frete Grátis',
            isFree: true
          })
        } else if (typeof data.shippingCost === 'number') {
          options.push({
            id: 'frete_padrao',
            name: data.shippingService || 'Entrega Padrão',
            price: data.shippingCost,
            deliveryDays: safeDays(data.deliveryDays, 10),
            carrier: data.shippingCarrier || 'Entrega Própria',
            method: data.shippingMethod || 'propria',
            service: data.shippingService || 'Padrão',
            isFree: false
          })
        } else {
          throw new Error('Não foi possível calcular o frete para o endereço informado')
        }

        options.sort((a, b) => a.price - b.price)
        const chosen = options[0]

        setOpcoesFreteState(options)
        setFreteSelecionado(chosen.id)
        setShippingMethod(chosen.method)
        setShippingService(chosen.service)
        setShippingCarrier(chosen.carrier)

        fretesCalculados.push({
          grupoId: grupo.id,
          grupoNome: grupo.nome || `Envio ${i + 1}`,
          frete: chosen.price,
          prazo: chosen.deliveryDays > 0 ? chosen.deliveryDays : 0,
          prazoDescricao: chosen.deliveryDays > 0 ? `${chosen.deliveryDays} dias` : '',
          gratis: chosen.isFree || false
        })

        freteTotal += chosen.price
        prazoMax = Math.max(prazoMax, Number(chosen.deliveryDays) || 0)
        if (!chosen.isFree) todosGratis = false

        console.log(`📦 [Grupo ${i + 1}] ${grupo.nome}: R$ ${chosen.price.toFixed(2)} | ${chosen.deliveryDays} | Método: ${chosen.method}`)
      }

      if (fretesCalculados.length === 0) {
        throw new Error('Não foi possível calcular o frete para este carrinho. Contate o suporte.')
      }

      setFretesPorGrupo(fretesCalculados)
      setFrete(freteTotal)
      setPrazoEntrega(prazoMax > 0 ? prazoMax : 0)
      const descPrazoMaior = fretesCalculados.find(f => f.prazoDescricao && !f.prazoDescricao.includes('dias úteis'))?.prazoDescricao || ''
      setPrazoDescricaoGeral(descPrazoMaior)
      setFreteGratis(todosGratis && fretesCalculados.length > 0)
      setFreteCalculado(true)

      console.log('📦 Frete total calculado:', {
        grupos: fretesCalculados.length,
        total: freteTotal,
        prazoMax,
        prazoDesc: descPrazoMaior
      })
    } catch (error: any) {
      console.error('Erro ao calcular frete:', error)
      setFreteErro(error?.message || 'Não foi possível calcular o frete. Entre em contato com a administração do marketplace.')
      setOpcoesFreteState([])
      setFreteSelecionado(null)
      setFreteCalculado(false)
    } finally {
      setCalculandoFrete(false)
    }
  }

  // Função para selecionar uma opção de frete
  const selecionarFrete = (opcaoId: string) => {
    const opcao = opcoesFreteState.find(o => o.id === opcaoId)
    if (opcao) {
      setFreteSelecionado(opcaoId)
      setFrete(opcao.price)
      setPrazoEntrega(opcao.deliveryDays)
      setShippingMethod(opcao.method)
      setShippingService(opcao.service)
      setShippingCarrier(opcao.carrier)
    }
  }

  // Consultar ViaCEP para preencher endereço automaticamente
  const consultarCep = async (cep: string) => {
    if (cep.length !== 8) {
      setCepValidado(false)
      setCepErro('')
      return
    }
    
    setBuscandoCep(true)
    setCepErro('')
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      if (response.ok) {
        const data = await response.json()
        if (data.erro) {
          setCepErro('CEP não encontrado. Verifique e tente novamente.')
          setCepValidado(false)
          return
        }
        
        // Preencher campos automaticamente
        setFormData(prev => ({
          ...prev,
          address: data.logradouro || prev.address,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || '',
          state: data.uf || ''
        }))
        
        // Carregar cidades do estado retornado
        if (data.uf) {
          try {
            const res = await fetch(`/api/location/cities/${data.uf}`)
            if (res.ok) setCities(await res.json())
          } catch (err) {
            console.error('Erro ao buscar cidades:', err)
          }
        }
        
        setCepValidado(true)
        setCepErro('')
      } else {
        setCepErro('Erro ao buscar CEP. Tente novamente.')
        setCepValidado(false)
      }
    } catch (error) {
      console.error('Erro ao consultar CEP:', error)
      setCepErro('Erro ao buscar CEP. Verifique sua conexão.')
      setCepValidado(false)
    } finally {
      setBuscandoCep(false)
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
      // Limpar dados de transportadora
      setShippingMethod(null)
      setShippingService(null)
      setShippingCarrier(null)
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
      address: address.street || '',
      number: 'S/N',
      complement: address.complement || '',
      neighborhood: address.neighborhood || '',
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      phone: formatarTelefone(address.phone || ''),
      cpf: formatarCPF(address.cpf || ''),
      reference: address.reference || '',
      notes: address.notes || '',
    })
    setShowNewAddressForm(false)
    
    // Limpar erros de validação
    setPhoneError('')
    setCpfError('')
    
    // Calcular frete automaticamente ao selecionar endereço
    const cepNumeros = address.zipCode.replace(/\D/g, '')
    if (cepNumeros.length === 8) {
      setFreteCalculado(false)
      setOpcoesFreteState([])
      setFreteSelecionado(null)
      calcularFrete(cepNumeros)
    }
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
          setFormData({ address: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '', phone: '', cpf: '', reference: '', notes: '' })
          setShowNewAddressForm(true)
        }
        toast.success('Endereço removido')
      }
    } catch (error) {
      toast.error('Erro ao remover endereço')
    }
  }

  // Redirecionar se não estiver logado
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Redirecionar se carrinho vazio (exceto quando já tem pedido)
  useEffect(() => {
    if (items.length === 0 && !orderId && step !== 'payment' && status === 'authenticated') {
      router.push('/carrinho')
    }
  }, [items.length, orderId, step, status, router])

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Mostrar loading enquanto redireciona
  if (items.length === 0 && !orderId && step !== 'payment') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
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
    
    // SEGURANÇA: Validar telefone antes de continuar
    if (!formData.phone || formData.phone.length < 14) {
      toast.error('Por favor, informe seu telefone completo com DDD')
      setPhoneError('Telefone é obrigatório')
      return
    }
    
    if (!validarTelefone(formData.phone)) {
      toast.error('Telefone inválido. Informe DDD + número.')
      setPhoneError('Telefone inválido. Informe DDD + número.')
      return
    }
    
    // SEGURANÇA: Usar CPF do usuário se disponível, senão usar do formulário
    const cpfParaUsar = cpfUsuario || formData.cpf
    
    if (!cpfParaUsar || cpfParaUsar.length < 14) {
      toast.error('Por favor, informe seu CPF completo')
      setCpfError('CPF é obrigatório')
      return
    }
    
    if (!validarCPF(cpfParaUsar)) {
      toast.error('CPF inválido. Verifique os números digitados.')
      setCpfError('CPF inválido. Verifique os números digitados.')
      return
    }
    
    // VALIDAÇÃO: Campos obrigatórios para NF-e, Etiqueta e Expedição
    if (!formData.address || formData.address.trim().length < 3) {
      toast.error('Por favor, informe o endereço (Rua/Logradouro)')
      return
    }
    
    if (!formData.number || formData.number.trim().length === 0) {
      toast.error('Por favor, informe o número do endereço')
      return
    }
    
    if (!formData.neighborhood || formData.neighborhood.trim().length < 2) {
      toast.error('Por favor, informe o bairro')
      return
    }
    
    if (!formData.state || formData.state.length !== 2) {
      toast.error('Por favor, selecione o estado')
      return
    }
    
    if (!formData.city || formData.city.trim().length < 2) {
      toast.error('Por favor, selecione a cidade')
      return
    }
    
    // SEGURANÇA: Verificar se o frete foi calculado para o CEP atual
    const cepNumeros = formData.zipCode.replace(/\D/g, '')
    if (cepNumeros.length !== 8) {
      toast.error('Por favor, informe um CEP válido com 8 dígitos')
      return
    }
    
    // SEGURANÇA: Verificar se o CEP foi validado pelo ViaCEP
    if (!cepValidado) {
      toast.error('CEP não validado. Verifique se o CEP está correto.')
      return
    }
    
    if (!freteCalculado || calculandoFrete) {
      toast.error('Aguarde o cálculo do frete antes de continuar')
      return
    }

    // VALIDAÇÃO CRÍTICA: Verificar se o frete foi calculado com sucesso
    // Se não há opções de frete válidas, significa que houve erro no cálculo
    if (opcoesFreteState.length === 0) {
      toast.error('Não foi possível calcular o frete para este endereço. Entre em contato com a administração do marketplace, provavelmente o produto não pode ser entregue no Brasil.')
      return
    }

    // Verificar se há pelo menos uma opção de frete válida (não erro)
    const temFreteValido = opcoesFreteState.some(opcao => opcao.price >= 0)
    if (!temFreteValido) {
      toast.error('Erro no cálculo do frete. Entre em contato com a administração do marketplace, provavelmente o produto não pode ser entregue no Brasil.')
      return
    }

    // Verificar se o frete selecionado é válido
    if (freteSelecionado && !opcoesFreteState.find(op => op.id === freteSelecionado)) {
      toast.error('Opção de frete selecionada não é válida. Selecione uma opção de frete disponível.')
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
            street: formData.number ? `${formData.address}, ${formData.number}` : formData.address,
            complement: formData.complement || '',
            neighborhood: formData.neighborhood,
            city: formData.city,
            state: formData.state,
            zipCode: cepNumeros,
            phone: formData.phone.replace(/\D/g, ''), // Salvar apenas números
            cpf: (cpfUsuario || formData.cpf).replace(/\D/g, ''), // Usar CPF do usuário
            reference: formData.reference || '', // Ponto de referência
            notes: formData.notes || '', // Observações
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
        street: selectedAddr?.street || formData.address,
        number: selectedAddr?.street?.match(/\d+$/)?.[0] || formData.number || 'SN',
        complement: selectedAddr?.complement || formData.complement || '',
        neighborhood: selectedAddr?.neighborhood || formData.neighborhood || 'Centro',
        city: formData.city,
        state: formData.state, // Já é a UF de 2 caracteres
        zipCode: formData.zipCode.replace(/\D/g, ''),
        reference: formData.reference || '', // Ponto de referência
        notes: formData.notes || '', // Observações para entrega
        phone: formData.phone.replace(/\D/g, ''), // Telefone só números
        cpf: (cpfUsuario || formData.cpf).replace(/\D/g, ''), // CPF do usuário
        // Texto legível para exibição
        formatted: `${formData.address}, ${formData.number}${formData.complement ? ` - ${formData.complement}` : ''}, ${formData.neighborhood}, ${formData.city} - ${formData.state}, CEP ${formData.zipCode}`
      }
      
      const itemsSubtotal = total()
      const importTax = calculoImpostos.totalImpostos
      const finalTotal = itemsSubtotal - desconto + (freteGratisAtual ? 0 : freteAtual) + importTax
      
      const orderData = {
        items: items.map(item => ({
          productId: item.productId || item.id,
          quantity: item.quantity,
          price: item.price,
          selectedSize: item.selectedSize || null,
          selectedColor: item.selectedColor || null,
          skuId: item.skuId || null,  // SUB-SKU do fornecedor
        })),
        total: finalTotal,
        subtotal: itemsSubtotal,
        shippingCost: freteGratisAtual ? 0 : freteAtual,
        couponCode: cupom || null,
        discountAmount: desconto,
        shippingAddress: JSON.stringify(shippingAddressData),
        deliveryDays: prazoEntrega || null,
        buyerPhone: formData.phone,
        buyerCpf: (cpfUsuario || formData.cpf).replace(/\D/g, ''),
        // Campos de transportadora
        shippingMethod: shippingMethod || 'propria',
        shippingService: shippingService || null,
        shippingCarrier: shippingCarrier || null,
        // Impostos de importação
        importTax: calculoImpostos.impostoImportacao,
        icmsTax: calculoImpostos.icms,
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
        
        // Obter código de afiliado do localStorage (fallback se cookie não funcionar)
        const affiliateRef = localStorage.getItem('affiliate_ref')
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        
        if (affiliateRef) {
          headers['x-affiliate-ref'] = affiliateRef
          console.log('🎯 [AFILIADO] Enviando código via header:', affiliateRef)
        }
        
        response = await fetch('/api/orders', {
          method: 'POST',
          headers,
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
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Finalizar Compra</h1>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium transition-colors text-sm sm:text-base"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="hidden sm:inline">Adicionar mais produtos</span>
          <span className="sm:hidden">Adicionar produtos</span>
        </button>
      </div>

      <div className="mb-6 sm:mb-8 overflow-x-auto">
        <div className="flex items-center justify-center min-w-[300px]">
          {/* Step 1 - Carrinho (clicável para voltar) */}
          <button 
            onClick={() => router.push('/carrinho')}
            className="flex items-center text-green-600 hover:opacity-80 transition-opacity"
            title="Voltar ao carrinho"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 border-green-600 bg-green-600 text-white text-sm sm:text-base">
              ✓
            </div>
            <span className="ml-1 sm:ml-2 font-medium text-xs sm:text-sm">Carrinho</span>
          </button>
          <div className="w-8 sm:w-16 h-0.5 mx-1 sm:mx-2 bg-green-600"></div>
          
          {/* Step 2 - Endereço */}
          <div className={`flex items-center ${step === 'address' ? 'text-primary-600' : 'text-green-600'}`}>
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 text-sm sm:text-base ${
              step === 'address' ? 'border-primary-600 bg-primary-600 text-white' : 'border-green-600 bg-green-600 text-white'
            }`}>
              {step === 'payment' ? '✓' : '2'}
            </div>
            <span className="ml-1 sm:ml-2 font-medium text-xs sm:text-sm">Endereço</span>
          </div>
          <div className={`w-8 sm:w-16 h-0.5 mx-1 sm:mx-2 ${step === 'payment' ? 'bg-primary-600' : 'bg-gray-300'}`}></div>
          
          {/* Step 3 - Pagamento */}
          <div className={`flex items-center ${step === 'payment' ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 text-sm sm:text-base ${
              step === 'payment' ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300'
            }`}>
              3
            </div>
            <span className="ml-1 sm:ml-2 font-medium text-xs sm:text-sm">Pagamento</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-8">
        {step === 'address' ? (
          <form onSubmit={handleAddressSubmit} className="lg:col-span-3 space-y-4 sm:space-y-6 order-2 lg:order-1">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">Endereço de Entrega</h2>

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
                      setFormData({ address: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '', phone: '', cpf: '', reference: '', notes: '' })
                    }}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-400 hover:text-primary-600 flex items-center justify-center gap-2"
                  >
                    <FiPlus /> Adicionar novo endereço
                  </button>
                </div>
              ) : null}

              {/* Formulário de endereço (novo ou quando não tem salvos) */}
              {(showNewAddressForm || savedAddresses.length === 0) && (
                <div className="space-y-3 sm:space-y-4">
                  {savedAddresses.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
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
                  
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1 sm:mb-2">
                      Rua / Logradouro <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600 text-sm sm:text-base"
                      placeholder="Rua, Avenida, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 sm:mb-2">
                      Número <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600 text-sm sm:text-base"
                      placeholder="Nº"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 sm:mb-2">Complemento</label>
                    <input
                      type="text"
                      value={formData.complement}
                      onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600 text-sm sm:text-base"
                      placeholder="Apt, Bloco, etc. (opcional)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 sm:mb-2">
                      Bairro <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600 text-sm sm:text-base"
                      placeholder="Bairro"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 sm:mb-2">Ponto de Referência</label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600 text-sm sm:text-base"
                    placeholder="Próximo ao mercado, em frente à farmácia, etc. (opcional)"
                  />
                </div>

                {/* CEP PRIMEIRO - com validação automática */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 sm:mb-2">
                      CEP <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.zipCode}
                      onChange={(e) => {
                        const cep = e.target.value.replace(/\D/g, '').slice(0, 8)
                        setFormData({ ...formData, zipCode: cep })
                        setCepValidado(false)
                        if (cep.length === 8) {
                          consultarCep(cep)
                        } else {
                          setCepErro('')
                          // Limpar estado e cidade se CEP incompleto
                          if (cep.length < 8) {
                            setFormData(prev => ({ ...prev, zipCode: cep, state: '', city: '' }))
                          }
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                        cepErro 
                          ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                          : cepValidado 
                            ? 'border-green-500 focus:ring-green-500 bg-green-50' 
                            : 'border-gray-300 focus:ring-primary-600'
                      }`}
                      placeholder="00000000"
                      maxLength={8}
                    />
                    {buscandoCep && (
                      <p className="text-sm text-gray-500 mt-1">⏳ Buscando endereço...</p>
                    )}
                    {cepErro && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <FiAlertCircle className="w-4 h-4" />
                        {cepErro}
                      </p>
                    )}
                    {cepValidado && !calculandoFrete && (
                      <p className="text-sm text-green-600 mt-1">
                        ✅ CEP válido
                        {freteCalculado && (
                          <span> • Frete: {freteGratis ? 'GRÁTIS' : `R$ ${formatarMoeda(frete)}`}
                          {prazoEntrega > 0 && ` (${prazoEntrega} dias)`}</span>
                        )}
                      </p>
                    )}
                    {calculandoFrete && (
                      <p className="text-sm text-gray-500 mt-1">⏳ Calculando frete...</p>
                    )}
                  </div>

                  {/* Estado - TRAVADO após CEP validado */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Estado <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      readOnly
                      className="w-full px-4 py-2 border rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                      placeholder="Preenchido pelo CEP"
                    />
                    {!formData.state && formData.zipCode.length < 8 && (
                      <p className="text-xs text-gray-500 mt-1">Digite o CEP para preencher</p>
                    )}
                  </div>

                  {/* Cidade - TRAVADO após CEP validado */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Cidade <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      readOnly
                      className="w-full px-4 py-2 border rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                      placeholder="Preenchido pelo CEP"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Telefone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => {
                        const formatted = formatarTelefone(e.target.value)
                        setFormData({ ...formData, phone: formatted })
                        
                        if (formatted.length >= 14) {
                          if (!validarTelefone(formatted)) {
                            setPhoneError('Telefone inválido. Informe DDD + número.')
                          } else {
                            setPhoneError('')
                          }
                        } else {
                          setPhoneError('')
                        }
                      }}
                      onBlur={() => {
                        if (formData.phone && formData.phone.length > 0) {
                          if (!validarTelefone(formData.phone)) {
                            setPhoneError('Telefone inválido. Informe DDD + número.')
                          }
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                        phoneError 
                          ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                          : 'border-gray-300 focus:ring-primary-600'
                      }`}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                    {phoneError && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <FiAlertCircle className="w-4 h-4" />
                        {phoneError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      CPF <span className="text-red-500">*</span>
                    </label>
                    {cpfUsuario ? (
                      <>
                        <input
                          type="text"
                          value={cpfUsuario}
                          readOnly
                          className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          CPF vinculado à sua conta. Para alterar, acesse Minha Conta.
                        </p>
                      </>
                    ) : (
                      <>
                        <input
                          type="text"
                          required
                          value={formData.cpf}
                          onChange={(e) => {
                            const formatted = formatarCPF(e.target.value)
                            setFormData({ ...formData, cpf: formatted })
                            
                            if (formatted.length === 14) {
                              if (!validarCPF(formatted)) {
                                setCpfError('CPF inválido')
                              } else {
                                setCpfError('')
                              }
                            } else {
                              setCpfError('')
                            }
                          }}
                          onBlur={() => {
                            if (formData.cpf && formData.cpf.length > 0) {
                              if (!validarCPF(formData.cpf)) {
                                setCpfError('CPF inválido')
                              }
                            }
                          }}
                          className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                            cpfError 
                              ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                              : 'border-gray-300 focus:ring-primary-600'
                          }`}
                          placeholder="000.000.000-00"
                          maxLength={14}
                        />
                        {cpfError && (
                          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                            <FiAlertCircle className="w-4 h-4" />
                            {cpfError}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Observações para Entrega</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="Instruções especiais para o entregador, horário preferido, etc. (opcional)"
                    rows={2}
                    maxLength={200}
                  />
                </div>
                </div>
              )}
            </div>

            {/* Seção de Escolha de Frete */}
            {freteCalculado && !freteGratis && opcoesFreteState.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  🚚 Escolha a Forma de Envio
                </h2>
                
                {calculandoFrete ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    <span className="ml-3 text-gray-600">Calculando opções de frete...</span>
                  </div>
                ) : opcoesFreteState.length > 0 ? (
                  <div className="space-y-3">
                    {opcoesFreteState.map((opcao) => (
                      <label
                        key={opcao.id}
                        className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                          freteSelecionado === opcao.id
                            ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-200'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <input
                            type="radio"
                            name="freteOpcaoCheckout"
                            value={opcao.id}
                            checked={freteSelecionado === opcao.id}
                            onChange={() => selecionarFrete(opcao.id)}
                            className="h-5 w-5 text-primary-600"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 text-lg">{opcao.name}</span>
                            </div>
                            <p className="text-sm text-gray-600">
                              📦 Entrega em até <strong>{opcao.deliveryDays} dias úteis</strong>
                            </p>
                            <p className="text-xs text-green-600">
                              🗓️ Chegará {calcularDataEntrega(opcao.deliveryDays)}
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-xl text-gray-900">
                          R$ {formatarMoeda(opcao.price)}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-700">
                      <strong>Frete:</strong> R$ {formatarMoeda(frete)}
                    </p>
                    {(prazoDescricaoGeral || prazoEntrega > 0) && (
                      <p className="text-sm text-gray-500">
                        {prazoDescricaoGeral ? `📦 Chegará ${prazoDescricaoGeral}` : `Entrega em ${prazoEntrega} dias úteis`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {freteGratis && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <span className="text-2xl">🎉</span>
                  <div>
                    <p className="font-bold text-lg">Frete Grátis!</p>
                    {prazoDescricaoGeral && prazoDescricaoGeral !== '0 dias' && (
                      <p className="text-sm">📦 Chegará {prazoDescricaoGeral}</p>
                    )}
                    {!prazoDescricaoGeral && prazoEntrega > 0 && !isNaN(prazoEntrega) && (
                      <p className="text-sm">Entrega em até {prazoEntrega} dias úteis</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {freteErro && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex items-start gap-3">
                <span className="text-2xl">🚫</span>
                <div>
                  <p className="font-bold text-red-700">Frete indisponível</p>
                  <p className="text-sm text-red-600 mt-1">{freteErro}</p>
                  <p className="text-sm text-red-600 mt-1">Entre em contato com a administração para mais informações.</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !freteCalculado || calculandoFrete || !!freteErro}
              className="w-full bg-primary-600 text-white py-4 rounded-md hover:bg-primary-700 font-semibold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processando...' : calculandoFrete ? '⏳ Calculando frete...' : freteErro ? '🚫 Frete indisponível — contate a administração' : !freteCalculado ? '📦 Selecione um endereço para calcular o frete' : 'Continuar para Pagamento'}
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

        <div className="lg:col-span-2 order-1 lg:order-2">
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
              {/* Frete - por grupo de envio */}
              {fretesPorGrupo.length > 1 ? (
                // Múltiplos envios - mostrar cada um separado
                <>
                  {fretesPorGrupo.map((grupo, index) => (
                    <div key={grupo.grupoId} className="flex justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <span className="text-blue-600">📦</span>
                        {grupo.grupoNome}
                      </span>
                      <div className="text-right">
                        {grupo.gratis ? (
                          <span className="text-green-600 font-medium">Grátis</span>
                        ) : (
                          <span>R$ {formatarMoeda(grupo.frete)}</span>
                        )}
                        {(grupo.prazoDescricao || grupo.prazo > 0) && (
                          <p className="text-xs text-gray-500">
                            {grupo.prazoDescricao || `${grupo.prazo} dias úteis`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Prazo máximo de entrega */}
                  {(prazoDescricaoGeral || prazoEntrega > 0) && (
                    <p className="text-xs text-green-600 font-medium text-right">
                      📦 Todos chegarão até {prazoDescricaoGeral || calcularDataEntrega(prazoEntrega)}
                    </p>
                  )}
                </>
              ) : (
                // Envio único - mostrar normal
                <div className="flex justify-between">
                  <span>Frete</span>
                  <div className="text-right">
                    {freteGratis ? (
                      <span className="text-green-600 font-semibold">Grátis</span>
                    ) : (
                      <span>R$ {formatarMoeda(frete)}</span>
                    )}
                    {(prazoDescricaoGeral || prazoEntrega > 0) && (
                      <p className="text-xs text-green-600 font-medium">
                        📦 Chegará {prazoDescricaoGeral || calcularDataEntrega(prazoEntrega)}
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Impostos de Importação */}
              {calculoImpostos.temProdutosImportados && formData.state && (
                <>
                  <div className="flex justify-between text-amber-700 bg-amber-50 p-2 rounded -mx-2">
                    <div className="flex items-center gap-1">
                      <FiInfo size={14} />
                      <span className="text-sm">Imposto de Importação (20%)</span>
                    </div>
                    <span className="text-sm font-medium">R$ {formatarMoeda(calculoImpostos.impostoImportacao)}</span>
                  </div>
                  <div className="flex justify-between text-amber-700 bg-amber-50 p-2 rounded -mx-2">
                    <div className="flex items-center gap-1">
                      <FiInfo size={14} />
                      <span className="text-sm">ICMS {formData.state} ({calculoImpostos.aliquotaIcms}%)</span>
                    </div>
                    <span className="text-sm font-medium">R$ {formatarMoeda(calculoImpostos.icms)}</span>
                  </div>
                  <p className="text-xs text-gray-500 italic">
                    Impostos aplicados conforme Lei 14.902/2024 (Remessa Conforme) para produtos importados.
                  </p>
                </>
              )}
              
              <div className="flex justify-between text-xl font-bold border-t pt-2">
                <span>Total</span>
                <span className="text-primary-600">R$ {formatarMoeda(total() - desconto + (freteGratis ? 0 : frete) + calculoImpostos.totalImpostos)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
