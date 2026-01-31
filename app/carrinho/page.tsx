'use client'

import { useState, useEffect, useMemo } from 'react'
import { useCartStore, syncCartStock } from '@/lib/store'
import Image from 'next/image'
import Link from 'next/link'
import { FiTrash2, FiMinus, FiPlus, FiTag, FiTruck, FiMapPin, FiGlobe, FiHome } from 'react-icons/fi'
import { toast } from 'react-hot-toast'

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

export default function CarrinhoPage() {
  const { items, removeItem, updateQuantity, clearCart, total } = useCartStore()
  const [cupom, setCupom] = useState('')
  const [cupomAplicado, setCupomAplicado] = useState<string | null>(null)
  const [desconto, setDesconto] = useState(0)
  const [cupomCarregando, setCupomCarregando] = useState(false)
  const [cep, setCep] = useState('')
  const [frete, setFrete] = useState(0)
  const [prazoEntrega, setPrazoEntrega] = useState<number | null>(null)
  const [freteGratis, setFreteGratis] = useState(false)
  const [promoFrete, setPromoFrete] = useState<{ minValue: number; missing: number; ruleName: string } | null>(null)
  const [opcoesFreteState, setOpcoesFreteState] = useState<Array<{
    id: string
    name: string
    price: number
    deliveryDays: number
    carrier: string
    method: string
    service: string
  }>>([])
  const [freteCarregando, setFreteCarregando] = useState(false)
  const [freteSelecionado, setFreteSelecionado] = useState<string | null>(null)
  const [stockSynced, setStockSynced] = useState(false)
  
  // Fretes por item internacional (cada produto AliExpress tem frete próprio)
  const [fretesPorItem, setFretesPorItem] = useState<Map<string, { frete: number; prazo: number }>>(new Map())
  
  // Estado para seleção de itens (nacional ou internacional - nunca ambos)
  const [itensSelecionados, setItensSelecionados] = useState<Set<string>>(new Set())
  const [tipoSelecionado, setTipoSelecionado] = useState<'nacional' | 'internacional' | null>(null)
  const [selecaoInicial, setSelecaoInicial] = useState(false)

  // Agrupar itens por origem de envio
  // - INTERNACIONAL: Produtos importados (AliExpress) - frete calculado separadamente
  // - ADM: Produtos da plataforma sem vendedor - enviados do CEP da ADM
  // - SELLER_{id}: Produtos de vendedores - enviados do CEP do vendedor
  const gruposDeEnvio = useMemo(() => {
    const grupos: Map<string, { 
      id: string
      nome: string 
      tipo: 'internacional' | 'adm' | 'seller'
      cepOrigem?: string | null
      itens: typeof items 
    }> = new Map()
    
    for (const item of items) {
      let grupoId: string
      let grupoNome: string
      let grupoTipo: 'internacional' | 'adm' | 'seller'
      let cepOrigem: string | null = null
      
      // Usar isInternationalSupplier para classificação (não isImported que é só para impostos)
      const isInternational = item.isInternationalSupplier || item.itemType === 'DROP'
      
      if (isInternational) {
        // Produtos de fornecedor internacional (AliExpress) - mesmo com estoque BR
        grupoId = 'INTERNACIONAL'
        grupoNome = 'Produtos Importados'
        grupoTipo = 'internacional'
      } else if (item.sellerId && item.sellerCep) {
        // Produtos de vendedor com CEP próprio
        grupoId = `SELLER_${item.sellerId}`
        grupoNome = `Vendedor` // Poderia buscar nome da loja
        grupoTipo = 'seller'
        cepOrigem = item.sellerCep
      } else {
        // Produtos da ADM (estoque próprio)
        grupoId = 'ADM'
        grupoNome = 'Loja Principal'
        grupoTipo = 'adm'
      }
      
      if (!grupos.has(grupoId)) {
        grupos.set(grupoId, { id: grupoId, nome: grupoNome, tipo: grupoTipo, cepOrigem, itens: [] })
      }
      grupos.get(grupoId)!.itens.push(item)
    }
    
    return grupos
  }, [items])
  
  // Separar itens nacionais (ADM + SELLER) e internacionais para compatibilidade
  // Usar isInternationalSupplier para a classificação visual/fluxo
  const itensNacionais = useMemo(() => items.filter(item => !item.isInternationalSupplier && item.itemType !== 'DROP'), [items])
  const itensInternacionais = useMemo(() => items.filter(item => item.isInternationalSupplier || item.itemType === 'DROP'), [items])

  // Selecionar automaticamente ao carregar
  useEffect(() => {
    if (items.length > 0 && !selecaoInicial) {
      // Se só tem nacionais, marca todos nacionais
      if (itensNacionais.length > 0 && itensInternacionais.length === 0) {
        const ids = new Set(itensNacionais.map(item => item.id))
        setItensSelecionados(ids)
        setTipoSelecionado('nacional')
      }
      // Se só tem internacionais, marca todos internacionais
      else if (itensInternacionais.length > 0 && itensNacionais.length === 0) {
        const ids = new Set(itensInternacionais.map(item => item.id))
        setItensSelecionados(ids)
        setTipoSelecionado('internacional')
      }
      // Se tem ambos, marca apenas os nacionais (primeiro lote)
      else if (itensNacionais.length > 0 && itensInternacionais.length > 0) {
        const ids = new Set(itensNacionais.map(item => item.id))
        setItensSelecionados(ids)
        setTipoSelecionado('nacional')
      }
      setSelecaoInicial(true)
    }
  }, [items, itensNacionais, itensInternacionais, selecaoInicial])

  // Sincronizar estoque ao carregar a página
  useEffect(() => {
    async function syncStock() {
      if (items.length > 0 && !stockSynced) {
        console.log('🔄 Sincronizando estoque do carrinho...')
        const syncedItems = await syncCartStock(items)
        
        // Verificar se houve alterações
        let hasChanges = false
        syncedItems.forEach((syncedItem, index) => {
          if (syncedItem.quantity !== items[index].quantity || syncedItem.stock !== items[index].stock) {
            hasChanges = true
            if (syncedItem.quantity < items[index].quantity) {
              toast.error(`${syncedItem.name}: Quantidade ajustada para ${syncedItem.quantity} (estoque atual)`)
            }
            updateQuantity(syncedItem.id, syncedItem.quantity)
          }
        })
        
        if (hasChanges) {
          console.log('✅ Estoque sincronizado com correções')
        }
        setStockSynced(true)
      }
    }
    syncStock()
  }, [items, stockSynced, updateQuantity])

  const calcularPesoTotal = async () => {
    try {
      console.log('⚖️ [Carrinho] Calculando peso para itens:', items.map(item => ({ id: item.id, quantity: item.quantity })))
      
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
        console.log('📦 [Carrinho] Peso calculado:', data.totalWeight, 'kg')
        return data.totalWeight || items.length * 0.5 // Fallback: 0.5kg por item
      }
      console.warn('⚠️ [Carrinho] API de peso não retornou OK, usando fallback')
      return items.length * 0.5
    } catch (error) {
      console.error('❌ [Carrinho] Erro ao calcular peso:', error)
      return items.length * 0.5 // Fallback em caso de erro
    }
  }

  const aplicarCupom = async () => {
    if (!cupom.trim()) {
      toast.error('Digite um código de cupom')
      return
    }

    setCupomCarregando(true)
    
    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
        },
        body: JSON.stringify({
          code: cupom.toUpperCase(),
          subtotal: subtotal,
          state: null // Pode ser obtido do CEP depois
        })
      })

      const data = await response.json()

      if (response.ok && data.valid) {
        setDesconto(data.discountAmount)
        setCupomAplicado(cupom.toUpperCase())
        
        // Verificar se é cupom de frete grátis (pode ser tratado no futuro)
        if (data.discountType === 'FIXED' && data.discountAmount === 0) {
          setFreteGratis(true)
          setFrete(0)
        }
        
        toast.success(`Cupom aplicado! Desconto de R$ ${formatarMoeda(data.discountAmount)}`)
        setCupom('')
      } else {
        toast.error(data.message || 'Cupom inválido')
      }
    } catch (error) {
      console.error('Erro ao validar cupom:', error)
      toast.error('Erro ao validar cupom')
    } finally {
      setCupomCarregando(false)
    }
  }

  const removerCupom = () => {
    setCupomAplicado(null)
    setDesconto(0)
    toast.success('Cupom removido')
  }

  const calcularFrete = async () => {
    if (cep.length !== 8) {
      alert('CEP inválido. Digite 8 dígitos.')
      return
    }

    // Se é pedido internacional, calcular por item
    if (tipoSelecionado === 'internacional') {
      await calcularFreteInternacional()
      return
    }

    setFreteCarregando(true)
    
    try {
      // Calcular peso total real dos produtos selecionados
      const itensSelecionadosList = items.filter(item => itensSelecionados.has(item.id))
      const totalWeight = await calcularPesoTotal()
      const subtotalSelecionado = itensSelecionadosList.reduce((sum, item) => sum + item.price * item.quantity, 0)
      
      console.log('🚚 [Carrinho] Calculando frete:', { cep, cartValue: subtotalSelecionado, weight: totalWeight, items: itensSelecionadosList.length })
      
      const response = await fetch('/api/shipping/quote', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
        },
        body: JSON.stringify({
          cep,
          cartValue: subtotalSelecionado,
          weight: totalWeight,
          items: itensSelecionadosList.map(item => ({
            id: item.id,
            quantity: item.quantity
          }))
        })
      })

      console.log('📦 [Carrinho] Resposta do frete:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ [Carrinho] Dados do frete:', data)
        
        // Guardar info de promoção se existir
        if (data.promo) {
          setPromoFrete(data.promo)
        } else {
          setPromoFrete(null)
        }
        
        // Se tiver opções de frete, salvar
        if (data.shippingOptions && data.shippingOptions.length > 0) {
          setOpcoesFreteState(data.shippingOptions)
          // Selecionar a primeira opção (mais barata) como padrão
          const maisBarata = data.shippingOptions[0]
          setFreteSelecionado(maisBarata.id)
          setFrete(maisBarata.price)
          setPrazoEntrega(maisBarata.deliveryDays)
          setFreteGratis(false)
          toast.success(`${data.shippingOptions.length} opções de frete encontradas!`)
        } else if (data.isFree) {
          setFreteGratis(true)
          setFrete(0)
          setPrazoEntrega(data.deliveryDays || null)
          setOpcoesFreteState([])
          toast.success(data.message || 'Frete grátis!')
        } else {
          setFreteGratis(false)
          setFrete(data.shippingCost)
          setPrazoEntrega(data.deliveryDays || null)
          setOpcoesFreteState([])
          toast.success(`Frete: R$ ${formatarMoeda(data.shippingCost)} - ${data.deliveryDays} dias úteis`)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ [Carrinho] Erro na API de frete:', response.status, errorData)
        toast.error(errorData.error || 'Erro ao calcular frete')
      }
    } catch (error) {
      console.error('❌ [Carrinho] Exceção ao calcular frete:', error)
      toast.error('Erro ao calcular frete')
    } finally {
      setFreteCarregando(false)
    }
  }
  
  // Calcular frete internacional por item (cada produto AliExpress tem frete próprio)
  const calcularFreteInternacional = async () => {
    if (cep.length !== 8) return
    
    const itensSelecionadosInternacionais = itensInternacionais.filter(item => itensSelecionados.has(item.id))
    if (itensSelecionadosInternacionais.length === 0) {
      setFrete(0)
      setPrazoEntrega(null)
      setFretesPorItem(new Map())
      return
    }
    
    setFreteCarregando(true)
    
    try {
      const novosFretes = new Map<string, { frete: number; prazo: number }>()
      let freteTotal = 0
      let prazoMax = 0
      
      console.log('🌍 [Carrinho] Calculando frete internacional para', itensSelecionadosInternacionais.length, 'itens')
      
      for (const item of itensSelecionadosInternacionais) {
        const response = await fetch('/api/shipping/quote', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
          },
          body: JSON.stringify({
            cep,
            cartValue: item.price * item.quantity,
            items: [{ id: item.id, quantity: item.quantity }]
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          let itemFrete = 0
          let itemPrazo = 0
          
          if (data.shippingOptions && data.shippingOptions.length > 0) {
            itemFrete = data.shippingOptions[0].price
            itemPrazo = data.shippingOptions[0].deliveryDays
          } else if (!data.isFree) {
            itemFrete = data.shippingCost || 0
            itemPrazo = data.deliveryDays || 0
          } else {
            itemPrazo = data.deliveryDays || 0
          }
          
          novosFretes.set(item.id, { frete: itemFrete, prazo: itemPrazo })
          freteTotal += itemFrete
          prazoMax = Math.max(prazoMax, itemPrazo)
          
          console.log(`📦 [${item.name.substring(0, 30)}...] Frete: R$ ${itemFrete.toFixed(2)} | ${itemPrazo} dias`)
        }
      }
      
      setFretesPorItem(novosFretes)
      setFrete(freteTotal)
      setPrazoEntrega(prazoMax > 0 ? prazoMax : null)
      setFreteGratis(freteTotal === 0)
      
      if (itensSelecionadosInternacionais.length > 0) {
        toast.success(`Frete calculado para ${itensSelecionadosInternacionais.length} produto(s): R$ ${formatarMoeda(freteTotal)}`)
      }
    } catch (error) {
      console.error('❌ [Carrinho] Erro ao calcular frete internacional:', error)
      toast.error('Erro ao calcular frete internacional')
    } finally {
      setFreteCarregando(false)
    }
  }
  
  // Recalcular frete quando mudar seleção de itens internacionais
  useEffect(() => {
    if (tipoSelecionado === 'internacional' && cep.length === 8) {
      calcularFreteInternacional()
    }
  }, [itensSelecionados, tipoSelecionado])
  
  // Função para selecionar uma opção de frete
  const selecionarFrete = (opcaoId: string) => {
    const opcao = opcoesFreteState.find(o => o.id === opcaoId)
    if (opcao) {
      setFreteSelecionado(opcaoId)
      setFrete(opcao.price)
      setPrazoEntrega(opcao.deliveryDays)
    }
  }

  const subtotal = total()
  const totalFinal = subtotal - desconto + (freteGratis ? 0 : frete)

  // Calcular subtotais por grupo
  const subtotalNacional = useMemo(() => 
    itensNacionais.reduce((sum, item) => sum + item.price * item.quantity, 0), 
    [itensNacionais]
  )
  
  const subtotalInternacional = useMemo(() => 
    itensInternacionais
      .filter(item => itensSelecionados.has(item.id))
      .reduce((sum, item) => sum + item.price * item.quantity, 0), 
    [itensInternacionais, itensSelecionados]
  )

  // Verificar se todos os itens de um grupo estão selecionados
  const todosNacionaisSelecionados = useMemo(() => 
    itensNacionais.length > 0 && itensNacionais.every(item => itensSelecionados.has(item.id)),
    [itensNacionais, itensSelecionados]
  )
  
  const todosInternacionaisSelecionados = useMemo(() => 
    itensInternacionais.length > 0 && itensInternacionais.every(item => itensSelecionados.has(item.id)),
    [itensInternacionais, itensSelecionados]
  )

  // Calcular subtotal apenas dos itens selecionados
  const subtotalSelecionados = useMemo(() => {
    return items
      .filter(item => itensSelecionados.has(item.id))
      .reduce((sum, item) => sum + item.price * item.quantity, 0)
  }, [items, itensSelecionados])

  // Itens selecionados para checkout
  const itensSelecionadosParaCheckout = useMemo(() => 
    items.filter(item => itensSelecionados.has(item.id)),
    [items, itensSelecionados]
  )

  // Calcular quantas origens de envio diferentes estão selecionadas
  const origensDeEnvioSelecionadas = useMemo(() => {
    const origens = new Set<string>()
    itensSelecionadosParaCheckout.forEach(item => {
      if (item.itemType === 'SELLER' && item.sellerId && item.sellerCep) {
        origens.add(`SELLER_${item.sellerId}`)
      } else {
        origens.add('ADM')
      }
    })
    return origens
  }, [itensSelecionadosParaCheckout])

  const temMultiplasOrigens = origensDeEnvioSelecionadas.size > 1

  // Funções de seleção
  const toggleItemSelecionado = (itemId: string, isImported: boolean) => {
    const novoTipo = isImported ? 'internacional' : 'nacional'
    
    setItensSelecionados(prev => {
      const newSet = new Set(prev)
      
      if (newSet.has(itemId)) {
        // Desmarcar item
        newSet.delete(itemId)
        // Se não tem mais itens selecionados, limpar tipo
        if (newSet.size === 0) {
          setTipoSelecionado(null)
        }
      } else {
        // Se já tem um tipo selecionado diferente, não permitir
        if (tipoSelecionado && tipoSelecionado !== novoTipo) {
          toast.error(`Não é possível misturar produtos nacionais e internacionais no mesmo pedido`)
          return prev
        }
        // Marcar item e definir tipo
        newSet.add(itemId)
        setTipoSelecionado(novoTipo)
      }
      
      return newSet
    })
  }

  const toggleGrupo = (tipo: 'nacional' | 'internacional') => {
    const itensDoGrupo = tipo === 'nacional' ? itensNacionais : itensInternacionais
    const todosSelecionados = tipo === 'nacional' ? todosNacionaisSelecionados : todosInternacionaisSelecionados
    
    if (todosSelecionados) {
      // Desmarcar todos do grupo
      setItensSelecionados(prev => {
        const newSet = new Set(prev)
        itensDoGrupo.forEach(item => newSet.delete(item.id))
        if (newSet.size === 0) {
          setTipoSelecionado(null)
        }
        return newSet
      })
    } else {
      // Se já tem outro tipo selecionado, não permitir
      if (tipoSelecionado && tipoSelecionado !== tipo) {
        toast.error(`Não é possível misturar produtos nacionais e internacionais no mesmo pedido`)
        return
      }
      // Marcar todos do grupo
      setItensSelecionados(prev => {
        const newSet = new Set(prev)
        itensDoGrupo.forEach(item => newSet.add(item.id))
        setTipoSelecionado(tipo)
        return newSet
      })
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold mb-8">Carrinho de Compras</h1>
        <p className="text-xl text-gray-500 mb-8">Seu carrinho está vazio</p>
        <Link
          href="/produtos"
          className="bg-primary-600 text-white px-8 py-3 rounded-md hover:bg-primary-700 inline-block"
        >
          Continuar Comprando
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Carrinho de Compras</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Produtos Nacionais */}
          {itensNacionais.length > 0 && (
            <div className={`bg-white rounded-lg shadow-md p-6 mb-6 ${tipoSelecionado === 'internacional' ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={todosNacionaisSelecionados}
                      onChange={() => toggleGrupo('nacional')}
                      disabled={tipoSelecionado === 'internacional'}
                      className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500 disabled:opacity-50"
                    />
                    <FiHome className="text-green-600" />
                    <span>Produtos Nacionais</span>
                  </label>
                  <span className="text-sm font-normal text-gray-500">({itensNacionais.length} {itensNacionais.length === 1 ? 'item' : 'itens'})</span>
                </h2>
              </div>
              
              {itensNacionais.map((item) => (
                <div key={item.id} className={`flex flex-col md:flex-row md:items-center border-b py-4 last:border-b-0 gap-4 ${itensSelecionados.has(item.id) ? 'border-l-4 border-l-green-500 -mx-6 px-6 bg-white' : 'opacity-50 grayscale'}`}>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itensSelecionados.has(item.id)}
                      onChange={() => toggleItemSelecionado(item.id, false)}
                      disabled={tipoSelecionado === 'internacional'}
                      className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500 disabled:opacity-50"
                    />
                  </label>
                  <div className="relative h-32 w-32 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1">
                    <Link href={`/produtos/${item.slug || item.id}`} className="hover:text-primary-600">
                      <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                    </Link>
                    
                    {/* Badge de origem do item - produtos de vendedor têm CEP próprio */}
                    {item.itemType === 'SELLER' && item.sellerCep && (
                      <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded mb-2">
                        <FiTruck size={12} />
                        Enviado por vendedor parceiro
                      </span>
                    )}
                    
                    <div className="flex flex-wrap gap-3 mb-2">
                      {item.selectedSize && (
                        <div className="flex items-center gap-1 text-sm">
                          <span className="font-medium text-gray-600">Tamanho:</span>
                          <span className="bg-gray-100 px-2 py-1 rounded font-semibold">{item.selectedSize}</span>
                        </div>
                      )}
                      {item.selectedColor && (
                        <div className="flex items-center gap-1 text-sm">
                          <span className="font-medium text-gray-600">Cor:</span>
                          <span className="bg-gray-100 px-2 py-1 rounded font-semibold">{item.selectedColor}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <p className="text-primary-600 font-bold text-xl">
                        R$ {formatarMoeda(item.price)}
                      </p>
                      {item.stock && (
                        <span className="text-xs text-gray-500">
                          {item.stock} disponíveis
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4">
                    <div className="flex items-center border rounded-md">
                      <button
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="p-2 hover:bg-gray-100 transition"
                        disabled={item.quantity <= 1}
                      >
                        <FiMinus />
                      </button>
                      <span className="px-4 py-2 border-x min-w-[60px] text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => {
                          const maxStock = item.stock || 999
                          if (item.quantity >= maxStock) {
                            toast.error(`Estoque máximo: ${maxStock} unidades`)
                            return
                          }
                          updateQuantity(item.id, item.quantity + 1)
                        }}
                        className="p-2 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!!item.stock && item.quantity >= item.stock}
                      >
                        <FiPlus />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Subtotal</p>
                        <p className="font-bold text-lg text-primary-600">
                          R$ {formatarMoeda(item.price * item.quantity)}
                        </p>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition"
                        title="Remover item"
                      >
                        <FiTrash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Subtotal Nacional */}
              <div className="flex justify-between items-center pt-4 mt-4 border-t bg-green-50 -mx-6 px-6 py-3 -mb-6 rounded-b-lg">
                <span className="font-semibold text-gray-700">Subtotal Nacional:</span>
                <span className="font-bold text-lg text-green-700">R$ {formatarMoeda(subtotalNacional)}</span>
              </div>
            </div>
          )}

          {/* Produtos Internacionais */}
          {itensInternacionais.length > 0 && (
            <div className={`bg-white rounded-lg shadow-md p-6 mb-6 ${tipoSelecionado === 'nacional' ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={todosInternacionaisSelecionados}
                      onChange={() => toggleGrupo('internacional')}
                      disabled={tipoSelecionado === 'nacional'}
                      className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500 disabled:opacity-50"
                    />
                    <FiGlobe className="text-orange-600" />
                    <span>Produtos Importados</span>
                  </label>
                  <span className="text-sm font-normal text-gray-500">({itensInternacionais.length} {itensInternacionais.length === 1 ? 'item' : 'itens'})</span>
                </h2>
              </div>
              
              {itensInternacionais.map((item) => (
                <div key={item.id} className={`flex flex-col md:flex-row md:items-center border-b py-4 last:border-b-0 gap-4 ${itensSelecionados.has(item.id) ? 'border-l-4 border-l-orange-500 -mx-6 px-6 bg-white' : 'opacity-50 grayscale'}`}>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itensSelecionados.has(item.id)}
                      onChange={() => toggleItemSelecionado(item.id, true)}
                      disabled={tipoSelecionado === 'nacional'}
                      className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500 disabled:opacity-50"
                    />
                  </label>
                  <div className="relative h-32 w-32 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1">
                    <Link href={`/produtos/${item.slug || item.id}`} className="hover:text-primary-600">
                      <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                    </Link>
                    
                    <div className="flex flex-wrap gap-3 mb-2">
                      {item.selectedSize && (
                        <div className="flex items-center gap-1 text-sm">
                          <span className="font-medium text-gray-600">Tamanho:</span>
                          <span className="bg-gray-100 px-2 py-1 rounded font-semibold">{item.selectedSize}</span>
                        </div>
                      )}
                      {item.selectedColor && (
                        <div className="flex items-center gap-1 text-sm">
                          <span className="font-medium text-gray-600">Cor:</span>
                          <span className="bg-gray-100 px-2 py-1 rounded font-semibold">{item.selectedColor}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <p className="text-primary-600 font-bold text-xl">
                        R$ {formatarMoeda(item.price)}
                      </p>
                      {item.stock && (
                        <span className="text-xs text-gray-500">
                          {item.stock} disponíveis
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4">
                    <div className="flex items-center border rounded-md">
                      <button
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="p-2 hover:bg-gray-100 transition"
                        disabled={item.quantity <= 1}
                      >
                        <FiMinus />
                      </button>
                      <span className="px-4 py-2 border-x min-w-[60px] text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => {
                          const maxStock = item.stock || 999
                          if (item.quantity >= maxStock) {
                            toast.error(`Estoque máximo: ${maxStock} unidades`)
                            return
                          }
                          updateQuantity(item.id, item.quantity + 1)
                        }}
                        className="p-2 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!!item.stock && item.quantity >= item.stock}
                      >
                        <FiPlus />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Subtotal</p>
                        <p className="font-bold text-lg text-primary-600">
                          R$ {formatarMoeda(item.price * item.quantity)}
                        </p>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition"
                        title="Remover item"
                      >
                        <FiTrash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Subtotal Internacional */}
              <div className="flex justify-between items-center pt-4 mt-4 border-t bg-orange-50 -mx-6 px-6 py-3 -mb-6 rounded-b-lg">
                <div>
                  <span className="font-semibold text-gray-700">Subtotal Internacional:</span>
                  <span className="text-xs text-orange-600 ml-2">(+ impostos no checkout)</span>
                </div>
                <span className="font-bold text-lg text-orange-700">R$ {formatarMoeda(subtotalInternacional)}</span>
              </div>
            </div>
          )}

          {/* Ações do Carrinho */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between items-center">
              <button
                onClick={clearCart}
                className="text-red-500 hover:text-red-700 font-semibold flex items-center gap-2"
              >
                <FiTrash2 /> Limpar Carrinho
              </button>
              <Link
                href="/produtos"
                className="text-primary-600 hover:text-primary-700 font-semibold"
              >
                ← Continuar Comprando
              </Link>
            </div>
          </div>

          {/* Cupom de Desconto */}
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <FiTag className="text-primary-600" /> Cupom de Desconto
            </h3>
            
            {cupomAplicado ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <FiTag className="text-green-600" />
                  <div>
                    <span className="font-semibold text-green-700">{cupomAplicado}</span>
                    <p className="text-sm text-green-600">
                      Desconto de R$ {formatarMoeda(desconto)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={removerCupom}
                  className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded transition"
                  title="Remover cupom"
                >
                  <FiTrash2 size={18} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cupom}
                  onChange={(e) => setCupom(e.target.value.toUpperCase())}
                  placeholder="Digite seu cupom"
                  disabled={cupomCarregando}
                  className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600 disabled:opacity-50"
                />
                <button
                  onClick={aplicarCupom}
                  disabled={cupomCarregando || !cupom.trim()}
                  className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {cupomCarregando ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Validando...
                    </>
                  ) : 'Aplicar'}
                </button>
              </div>
            )}
          </div>

          {/* Calcular Frete */}
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <FiTruck className="text-primary-600" /> Calcular Frete
            </h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={cep}
                  onChange={(e) => setCep(e.target.value.replace(/\D/g, ''))}
                  placeholder="00000-000"
                  maxLength={8}
                  className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
              <button
                onClick={calcularFrete}
                disabled={freteCarregando}
                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {freteCarregando ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Calculando...
                  </>
                ) : 'Calcular'}
              </button>
            </div>
            
            {/* Opções de frete disponíveis */}
            {opcoesFreteState.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-gray-700">Escolha a forma de envio:</p>
                {opcoesFreteState.map((opcao) => (
                  <label
                    key={opcao.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${
                      freteSelecionado === opcao.id
                        ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="freteOpcao"
                        value={opcao.id}
                        checked={freteSelecionado === opcao.id}
                        onChange={() => selecionarFrete(opcao.id)}
                        className="h-4 w-4 text-primary-600"
                      />
                      <div>
                        <span className="font-semibold text-gray-900">{opcao.name}</span>
                        <p className="text-xs text-gray-500">
                          Entrega em até {opcao.deliveryDays} dias úteis
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-gray-900">
                      R$ {formatarMoeda(opcao.price)}
                    </span>
                  </label>
                ))}
              </div>
            )}
            
            {opcoesFreteState.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Informe o CEP para calcular o frete e prazo de entrega
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
            <h2 className="text-2xl font-bold mb-6">💰 Resumo do Pedido</h2>
            
            {/* Instrução para selecionar produtos */}
            {itensSelecionados.size === 0 ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">👆</div>
                <p className="text-gray-600 font-medium mb-2">Selecione os produtos</p>
                <p className="text-sm text-gray-500">
                  Marque os itens que deseja comprar para ver o resumo
                </p>
                {itensNacionais.length > 0 && itensInternacionais.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-700">
                      ⚠️ Produtos nacionais e internacionais devem ser comprados separadamente
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {/* Tipo selecionado */}
                  <div className={`flex justify-between items-center p-3 rounded-lg ${tipoSelecionado === 'nacional' ? 'bg-green-50' : 'bg-orange-50'}`}>
                    <span className="flex items-center gap-2 font-medium">
                      {tipoSelecionado === 'nacional' ? (
                        <>
                          <FiHome className="text-green-600" />
                          <span className="text-green-700">Pedido Nacional</span>
                        </>
                      ) : (
                        <>
                          <FiGlobe className="text-orange-600" />
                          <span className="text-orange-700">Pedido Internacional</span>
                        </>
                      )}
                    </span>
                    <span className="text-sm text-gray-600">
                      {itensSelecionados.size} {itensSelecionados.size === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                  
                  {/* Aviso de impostos para internacionais */}
                  {tipoSelecionado === 'internacional' && (
                    <div className="bg-orange-50 border border-orange-200 rounded p-2 text-xs text-orange-700">
                      <p>⚠️ Impostos de importação serão calculados no checkout</p>
                    </div>
                  )}
                  
                  {/* Aviso de múltiplas origens de envio */}
                  {temMultiplasOrigens && tipoSelecionado === 'nacional' && (
                    <div className="bg-purple-50 border border-purple-200 rounded p-2 text-xs text-purple-700">
                      <p>📦 Pedido híbrido: produtos serão enviados de {origensDeEnvioSelecionadas.size} locais diferentes</p>
                      <p className="mt-1">O frete será calculado separadamente para cada origem</p>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-gray-700 border-t pt-3">
                    <span>Subtotal</span>
                    <span className="font-semibold">R$ {formatarMoeda(subtotalSelecionados)}</span>
                  </div>
                  
                  {desconto > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="flex items-center gap-1">
                        <FiTag size={16} /> Desconto
                      </span>
                      <span className="font-semibold">- R$ {formatarMoeda(desconto)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-gray-700">
                    <span className="flex items-center gap-1">
                      <FiTruck size={16} /> Frete
                    </span>
                    <div className="text-right">
                      {freteCarregando ? (
                        <span className="text-gray-500">Calculando...</span>
                      ) : freteGratis ? (
                        <span className="font-semibold text-green-600">Grátis</span>
                      ) : (
                        <span className="font-semibold">
                          {frete > 0 ? `R$ ${formatarMoeda(frete)}` : 'A calcular'}
                        </span>
                      )}
                      {prazoEntrega && (
                        <p className="text-xs text-green-600 mt-0.5 font-medium">
                          📦 Chegará {calcularDataEntrega(prazoEntrega)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Detalhes do frete por item (para internacionais) */}
                  {tipoSelecionado === 'internacional' && fretesPorItem.size > 0 && (
                    <div className="mt-2 pt-2 border-t border-dashed text-xs text-gray-500">
                      {Array.from(fretesPorItem.entries()).map(([itemId, info]) => {
                        const item = items.find(i => i.id === itemId)
                        if (!item) return null
                        return (
                          <div key={itemId} className="flex justify-between py-0.5">
                            <span className="truncate mr-2">📦 {item.name.substring(0, 25)}...</span>
                            <span>R$ {formatarMoeda(info.frete)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 mb-6">
                  <div className="flex justify-between text-2xl font-bold">
                    <span>Total</span>
                    <span className="text-primary-600">R$ {formatarMoeda(subtotalSelecionados - desconto + (freteGratis ? 0 : frete))}</span>
                  </div>
                </div>

                {/* Detalhamento dos itens selecionados */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
                  <p className="font-semibold mb-2 text-gray-700">Itens selecionados:</p>
                  <ul className="space-y-1 text-gray-600">
                    {itensSelecionadosParaCheckout.map(item => (
                      <li key={item.id} className="flex justify-between">
                        <span className="truncate mr-2">
                          {item.quantity}x {item.name}
                          {item.selectedSize && ` (${item.selectedSize})`}
                        </span>
                        <span className="font-semibold whitespace-nowrap">
                          R$ {formatarMoeda(item.price * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href="/checkout"
                  onClick={() => {
                    // Salvar dados do carrinho para o checkout
                    localStorage.setItem('checkoutData', JSON.stringify({
                      cupom: cupomAplicado,
                      desconto,
                      frete,
                      freteGratis,
                      prazoEntrega: prazoEntrega || 0,
                      tipoSelecionado,
                      itensSelecionados: Array.from(itensSelecionados)
                    }))
                  }}
                  className="block w-full bg-primary-600 text-white py-4 rounded-md hover:bg-primary-700 text-center font-bold text-lg transition shadow-lg hover:shadow-xl"
                >
                  🛍️ Finalizar Compra
                </Link>

                <div className="mt-6 space-y-3 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <span>✓</span>
                    <span>Compra 100% segura</span>
                  </div>
                  {tipoSelecionado === 'nacional' && (
                    <div className="flex items-start gap-2">
                      <span>✓</span>
                      <span>Frete grátis acima de R$ 199</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <span>✓</span>
                    <span>Troca grátis em 7 dias</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
