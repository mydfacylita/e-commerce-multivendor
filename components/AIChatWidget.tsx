'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { X, ShoppingCart, Trash2, CheckCircle } from 'lucide-react'
import { useCartStore } from '@/lib/store'
import toast from 'react-hot-toast'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice?: number | null
  image: string
  category?: string
  stock?: number
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  products?: Product[]
  loading?: boolean
  actions?: ('cart' | 'checkout' | 'view_cart')[]
}

// Gera ou recupera sessionId único por sessão do browser
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = sessionStorage.getItem('mydi_session_id')
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem('mydi_session_id', id)
  }
  return id
}

const PROACTIVE_MESSAGES = [
  'Oi! 👋 Estou aqui se precisar de ajuda.\n\nPosso te mostrar produtos, comparar opções ou te ajudar a encontrar algo específico. O que você procura hoje?',
  'Que tal uma ajudinha? 😊\n\nEstou vendo que você está navegando há um tempinho. Quer que eu sugira algo ou te ajude a encontrar o produto certo?',
  'Olá! Posso ajudar? 🛍️\n\nSe ficou em dúvida sobre algum produto, pode me perguntar — conheço todo o catálogo da MydShop!',
]

const WELCOME: Message = {
  role: 'assistant',
  content: 'Olá! Sou a Mydi, sua assistente de compras da MydShop! 🛍️\n\nPosso te ajudar a encontrar produtos, adicionar ao carrinho e guiar sua compra. O que você procura?',
}

const QUICK_SUGGESTIONS = [
  'Me mostre os destaques',
  'Presente até R$100',
  'Ver meu carrinho',
  'Finalizar compra',
]

const formatPrice = (price: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(0)
  const [wasProactive, setWasProactive] = useState(false)
  const [sessionId] = useState(() => getSessionId())
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const proactiveTriggeredRef = useRef(false)

  const { items, addItem, removeItem, total } = useCartStore()
  const cartCount = items.reduce((s, i) => s + i.quantity, 0)
  const cartTotal = total()

  // ── Proactive: dispara após tempo em página ou scroll confuso ───────────────
  useEffect(() => {
    // Não disparar se já abriu, já foi proativo ou se está em checkout
    if (proactiveTriggeredRef.current) return
    if (typeof window === 'undefined') return

    // Não disparar em páginas de checkout/pagamento/admin
    const restrictedPaths = ['/checkout', '/pagamento', '/admin', '/login', '/cadastro', '/carrinho']
    if (restrictedPaths.some(p => window.location.pathname.startsWith(p))) return

    // Timer: 40s na página sem interagir com o chat
    const idleTimer = setTimeout(() => {
      if (!proactiveTriggeredRef.current && !isOpen) {
        proactiveTriggeredRef.current = true
        const msg = PROACTIVE_MESSAGES[Math.floor(Math.random() * PROACTIVE_MESSAGES.length)]
        setMessages(prev => [...prev, { role: 'assistant', content: msg }])
        setWasProactive(true)
        setIsOpen(true)
        setUnread(0)
      }
    }, 40000)

    // Scroll bounce: detectar indecisão (rolar para cima depois de rolar para baixo rapidamente)
    let lastScrollY = window.scrollY
    let scrollDownCount = 0
    let scrollUpCount = 0
    let scrollCheckTimer: NodeJS.Timeout | null = null

    const handleScroll = () => {
      if (proactiveTriggeredRef.current || isOpen) return
      const currentY = window.scrollY
      if (currentY > lastScrollY + 50) { scrollDownCount++; scrollUpCount = 0 }
      else if (currentY < lastScrollY - 50) { scrollUpCount++; }
      lastScrollY = currentY

      // Se rolou para baixo >3x e para cima >2x em 8s = cliente confuso
      if (scrollDownCount >= 3 && scrollUpCount >= 2) {
        proactiveTriggeredRef.current = true
        clearTimeout(idleTimer)
        if (scrollCheckTimer) clearTimeout(scrollCheckTimer)
        const msg = 'Parece que você está buscando algo específico! 🔍\n\nPosso te ajudar a encontrar o produto certo. Me diga o que você procura!'
        setMessages(prev => [...prev, { role: 'assistant', content: msg }])
        setWasProactive(true)
        setIsOpen(true)
        setUnread(0)
        scrollDownCount = 0; scrollUpCount = 0
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      clearTimeout(idleTimer)
      if (scrollCheckTimer) clearTimeout(scrollCheckTimer)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleAddToCart = useCallback((product: Product) => {
    addItem({
      id: `${product.id}_none_none`,
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image || '',
      quantity: 1,
      slug: product.slug,
      stock: product.stock || 999,
    })
    toast.success(`Adicionado ao carrinho!`, { duration: 2000 })
    const newCount = cartCount + 1
    const newTotal = cartTotal + product.price
    const confirmMsg: Message = {
      role: 'assistant',
      content: `**${product.name.length > 40 ? product.name.slice(0, 40) + '...' : product.name}** foi adicionado ao carrinho! 🎉\n\nCarrinho: ${newCount} ${newCount === 1 ? 'item' : 'itens'} · ${formatPrice(newTotal)}\n\nQuer continuar comprando ou finalizar?`,
      actions: ['view_cart', 'checkout']
    }
    setMessages(prev => [...prev, confirmMsg])
  }, [addItem, cartCount, cartTotal])

  const handleRemoveFromCart = useCallback((itemId: string, itemName: string) => {
    removeItem(itemId)
    toast.success('Item removido')
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `Removi **${itemName.length > 30 ? itemName.slice(0, 30) + '...' : itemName}** do carrinho.\n\nPosso te ajudar com mais alguma coisa?`
    }])
  }, [removeItem])

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || loading) return

    setInput('')
    const history = messages.filter(m => !m.loading).map(m => ({ role: m.role, content: m.content }))
    const cartContext = items.length > 0
      ? items.map(i => `${i.name} x${i.quantity} (R$${(i.price * i.quantity).toFixed(2)})`).join(', ')
      : null

    setMessages(prev => [
      ...prev,
      { role: 'user', content: msg },
      { role: 'assistant', content: '', loading: true }
    ])
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history,
          cartContext,
          cartTotal,
          sessionId,
          pageUrl: window.location.href,
          pageTitle: document.title,
          wasProactive,
        })
      })
      const data = await res.json()

      const newMsg: Message = {
        role: 'assistant',
        content: data.message || 'Desculpe, não consegui responder.',
        products: data.products?.length > 0 ? data.products : undefined,
        actions: data.actions || undefined
      }
      setMessages(prev => [...prev.slice(0, -1), newMsg])

      if (data.intent === 'cart_checkout') {
        setTimeout(() => { setIsOpen(false); router.push('/checkout') }, 1500)
      }
      if (!isOpen) setUnread(n => n + 1)
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Ops! Tive um problema. Pode tentar novamente? 😊' }
      ])
    } finally {
      setLoading(false)
    }
  }

  const pathname = usePathname();
  // Não mostrar o chat nas rotas internas (afiliado, vendedor)
  if (pathname?.startsWith('/afiliado') || pathname?.startsWith('/vendedor')) return null;

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(o => !o)}
          className="relative flex items-center justify-center w-14 h-14 rounded-full overflow-hidden bg-white shadow-lg hover:scale-110 transition-transform"
          aria-label="Abrir assistente de compras"
        >
          {(unread > 0 || cartCount > 0) && !isOpen && (
            <span className="absolute -top-1 -right-1 z-10 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {cartCount > 0 ? cartCount : unread}
            </span>
          )}
          {isOpen ? <X size={22} strokeWidth={2.5} color="#1E88E5" /> : (
            <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              {/* Handle */}
              <path d="M20 22 C20 14 36 14 36 22" stroke="#FF6B35" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
              {/* Bag body */}
              <rect x="10" y="22" width="36" height="28" rx="6" fill="#1E88E5"/>
              {/* Shine */}
              <rect x="14" y="26" width="10" height="4" rx="2" fill="white" opacity="0.25"/>
              {/* Eyes */}
              <circle cx="22" cy="34" r="3" fill="white"/>
              <circle cx="34" cy="34" r="3" fill="white"/>
              <circle cx="23" cy="34.5" r="1.5" fill="#1565C0"/>
              <circle cx="35" cy="34.5" r="1.5" fill="#1565C0"/>
              {/* Smile */}
              <path d="M22 41 Q28 46 34 41" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
            </svg>
          )}
        </button>
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[370px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
          style={{ maxHeight: 'calc(100vh - 120px)', height: 580 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-white/20">
              <Image src="/icon 100x100.png" alt="Mydi" width={44} height={44} className="object-cover w-full h-full" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white text-sm">Mydi — Assistente de Compras</p>
              <p className="text-white/75 text-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                Powered by IA
              </p>
            </div>
            {cartCount > 0 && (
              <button
                onClick={() => { setIsOpen(false); router.push('/carrinho') }}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs px-2.5 py-1.5 rounded-full transition-colors"
              >
                <ShoppingCart size={13} />
                <span className="font-bold">{cartCount}</span>
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i}>
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.loading ? (
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-2.5">
                      <div className="flex gap-1 items-center h-5">
                        {[0, 150, 300].map(d => (
                          <span key={d} className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'bg-violet-600 text-white rounded-tr-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                    }`}>
                      {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                        part.startsWith('**') && part.endsWith('**')
                          ? <strong key={j}>{part.slice(2, -2)}</strong>
                          : <span key={j}>{part}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Product Cards com botão + carrinho */}
                {msg.products && msg.products.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {msg.products.slice(0, 4).map(p => (
                      <div key={p.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-2.5 hover:border-violet-300 transition-all">
                        <Link href={`/produtos/${p.slug}`} onClick={() => setIsOpen(false)} className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                          {p.image
                            ? <Image src={p.image} alt={p.name} fill className="object-cover" sizes="48px" />
                            : <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">📦</div>
                          }
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/produtos/${p.slug}`} onClick={() => setIsOpen(false)}>
                            <p className="text-xs font-medium text-gray-800 line-clamp-2 hover:text-violet-600">{p.name}</p>
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm font-bold text-violet-600">{formatPrice(p.price)}</span>
                            {p.comparePrice && p.comparePrice > p.price && (
                              <span className="text-xs text-gray-400 line-through">{formatPrice(p.comparePrice)}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddToCart(p)}
                          title="Adicionar ao carrinho"
                          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-violet-600 hover:bg-violet-700 active:scale-90 text-white transition-all"
                        >
                          <ShoppingCart size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botões de ação (Ver Carrinho / Finalizar) */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {msg.actions.includes('view_cart') && (
                      <button
                        onClick={() => { setIsOpen(false); router.push('/carrinho') }}
                        className="flex items-center gap-1.5 text-xs bg-white border border-violet-300 text-violet-700 px-3 py-1.5 rounded-full hover:bg-violet-50 transition-colors font-medium"
                      >
                        <ShoppingCart size={12} /> Ver Carrinho
                      </button>
                    )}
                    {msg.actions.includes('checkout') && (
                      <button
                        onClick={() => { setIsOpen(false); router.push('/checkout') }}
                        className="flex items-center gap-1.5 text-xs bg-violet-600 text-white px-3 py-1.5 rounded-full hover:bg-violet-700 transition-colors font-medium"
                      >
                        <CheckCircle size={12} /> Finalizar Compra →
                      </button>
                    )}
                  </div>
                )}

                {/* Lista do carrinho inline (quando IA retorna __SHOW_CART__) */}
                {msg.role === 'assistant' && msg.content.includes('__SHOW_CART__') && items.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">x{item.quantity} · {formatPrice(item.price * item.quantity)}</p>
                        </div>
                        <button onClick={() => handleRemoveFromCart(item.id, item.name)} className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-bold text-gray-800 px-1 pt-1 border-t border-gray-100">
                      <span>Total</span>
                      <span className="text-violet-600">{formatPrice(cartTotal)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {QUICK_SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => sendMessage(s)} className="text-xs bg-white border border-violet-200 text-violet-700 px-3 py-1.5 rounded-full hover:bg-violet-50 hover:border-violet-400 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-3 py-3 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="O que você procura?"
                disabled={loading}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-gray-50 placeholder:text-gray-400"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-violet-600 text-white disabled:opacity-40 hover:bg-violet-700 transition-colors flex-shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
