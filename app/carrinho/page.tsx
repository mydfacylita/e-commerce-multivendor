'use client'

import { useState } from 'react'
import { useCartStore } from '@/lib/store'
import Image from 'next/image'
import Link from 'next/link'
import { FiTrash2, FiMinus, FiPlus, FiTag, FiTruck, FiMapPin } from 'react-icons/fi'
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
  const [desconto, setDesconto] = useState(0)
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

  const aplicarCupom = () => {
    // Simulação de cupom
    if (cupom.toUpperCase() === 'PRIMEIRACOMPRA') {
      setDesconto(total() * 0.1) // 10% de desconto
      alert('Cupom aplicado! 10% de desconto')
    } else if (cupom.toUpperCase() === 'FRETEGRATIS') {
      setFreteGratis(true)
      setFrete(0)
      alert('Cupom aplicado! Frete grátis')
    } else {
      alert('Cupom inválido')
    }
  }

  const calcularFrete = async () => {
    if (cep.length !== 8) {
      alert('CEP inválido. Digite 8 dígitos.')
      return
    }

    setFreteCarregando(true)
    
    try {
      // Calcular peso total real dos produtos
      const totalWeight = await calcularPesoTotal()
      
      console.log('🚚 [Carrinho] Calculando frete:', { cep, cartValue: subtotal, weight: totalWeight, items: items.length })
      
      const response = await fetch('/api/shipping/quote', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
        },
        body: JSON.stringify({
          cep,
          cartValue: subtotal,
          weight: totalWeight,
          items: items.map(item => ({
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
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              🛒 Itens no Carrinho ({items.length})
            </h2>
            
            {items.map((item) => (
              <div key={item.id} className="flex flex-col md:flex-row md:items-center border-b py-4 last:border-b-0 gap-4">
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
                  
                  {/* Detalhes: Tamanho e Cor */}
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
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-2 hover:bg-gray-100 transition"
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

            <div className="flex justify-between items-center mt-6 pt-4 border-t">
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
            <div className="flex gap-2">
              <input
                type="text"
                value={cupom}
                onChange={(e) => setCupom(e.target.value.toUpperCase())}
                placeholder="Digite seu cupom"
                className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
              <button
                onClick={aplicarCupom}
                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-semibold"
              >
                Aplicar
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Cupons disponíveis: PRIMEIRACOMPRA (10% off), FRETEGRATIS
            </p>
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
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal ({items.length} {items.length === 1 ? 'item' : 'itens'})</span>
                <span className="font-semibold">R$ {formatarMoeda(subtotal)}</span>
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
                  {freteGratis ? (
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
              
              {/* Banner de promoção de frete */}
              {promoFrete && !freteGratis && (
                <div className="mt-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 flex items-start gap-2">
                    <span className="text-lg">💡</span>
                    <span>
                      Adicione mais <strong className="text-orange-600">R$ {formatarMoeda(promoFrete.missing)}</strong> para
                      aproveitar <strong className="text-green-600">{promoFrete.ruleName}</strong>!
                    </span>
                  </p>
                  <p className="text-xs text-yellow-600 mt-1 ml-6">
                    Compras acima de R$ {formatarMoeda(promoFrete.minValue)} têm frete especial para sua região
                  </p>
                </div>
              )}
            </div>

            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between text-2xl font-bold">
                <span>Total</span>
                <span className="text-primary-600">R$ {formatarMoeda(totalFinal)}</span>
              </div>
              {desconto > 0 && (
                <p className="text-sm text-green-600 mt-1 text-right">
                  Você economizou R$ {formatarMoeda(desconto)}!
                </p>
              )}
            </div>

            {/* Detalhamento dos itens */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
              <p className="font-semibold mb-2 text-gray-700">Detalhes:</p>
              <ul className="space-y-1 text-gray-600">
                {items.map(item => (
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
                  cupom,
                  desconto,
                  frete,
                  freteGratis,
                  prazoEntrega: 0 // Adicionar prazo se disponível
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
              <div className="flex items-start gap-2">
                <span>✓</span>
                <span>Frete grátis acima de R$ 199</span>
              </div>
              <div className="flex items-start gap-2">
                <span>✓</span>
                <span>Troca grátis em 7 dias</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
