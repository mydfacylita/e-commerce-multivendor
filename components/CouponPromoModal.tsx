'use client'

import { useEffect, useState, useCallback } from 'react'
import { FiX, FiCopy, FiCheck, FiChevronLeft, FiChevronRight, FiGift } from 'react-icons/fi'

interface PromoCoupon {
  id: string
  code: string
  description: string | null
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: number
  minOrderValue: number | null
  maxDiscountValue: number | null
  validUntil: string | null
  promoImage: string | null
  firstPurchaseOnly: boolean
}

const SESSION_KEY = 'promo_modal_closed'

export default function CouponPromoModal() {
  const [coupons, setCoupons] = useState<PromoCoupon[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    // Não mostrar se já fechou nessa sessão
    if (sessionStorage.getItem(SESSION_KEY)) return

    fetch('/api/coupons/promo')
      .then(r => r.json())
      .then(data => {
        if (!data.coupons?.length) return

        // Embaralhar aleatoriamente
        const shuffled = [...data.coupons].sort(() => Math.random() - 0.5)
        setCoupons(shuffled)

        // Mostrar com pequeno delay
        setTimeout(() => setVisible(true), 800)
      })
      .catch(() => {})
  }, [])

  const close = useCallback(() => {
    setClosing(true)
    setTimeout(() => {
      setVisible(false)
      setClosing(false)
      sessionStorage.setItem(SESSION_KEY, '1')
    }, 300)
  }, [])

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback
      const el = document.createElement('input')
      el.value = code
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const prev = () => setCurrentIndex(i => (i - 1 + coupons.length) % coupons.length)
  const next = () => setCurrentIndex(i => (i + 1) % coupons.length)

  if (!visible || !coupons.length) return null

  const coupon = coupons[currentIndex]

  const discountLabel = coupon.discountType === 'PERCENTAGE'
    ? `${coupon.discountValue}% OFF`
    : `R$ ${coupon.discountValue.toFixed(2)} OFF`

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${
        closing ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div
        className={`relative w-full max-w-[640px] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
          closing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        style={{ background: '#fff' }}
      >
        {/* Botão fechar */}
        <button
          onClick={close}
          className="absolute top-3 right-3 z-10 bg-black/40 hover:bg-black/70 text-white rounded-full p-1.5 transition"
        >
          <FiX size={18} />
        </button>

        {/* Navegação — só aparece se tiver mais de 1 */}
        {coupons.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/70 text-white rounded-full p-1.5 transition"
            >
              <FiChevronLeft size={20} />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/70 text-white rounded-full p-1.5 transition"
            >
              <FiChevronRight size={20} />
            </button>
          </>
        )}

        {/* Imagem de fundo / área superior */}
        <div
          className="relative w-full flex items-center justify-center overflow-hidden"
          style={{ height: 340 }}
        >
          {coupon.promoImage ? (
            <img
              src={coupon.promoImage}
              alt="Promoção"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ display: 'block', maxWidth: 'none', maxHeight: 'none' }}
            />
          ) : (
            /* Fallback visual bonito quando não há imagem */
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-500 via-orange-500 to-yellow-400 text-white">
              <FiGift size={48} className="mb-3 opacity-90" />
              <p className="text-xl font-bold uppercase tracking-wide opacity-90">
              Mês do Consumidor
            </p>
            <p className="text-5xl font-black mt-2">{discountLabel}</p>
            </div>
          )}

          {/* Overlay com o código no centro da imagem */}
          {coupon.promoImage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.35)' }}>
              <span className="text-white text-base font-semibold uppercase tracking-widest mb-2 drop-shadow">
                Seu cupom
              </span>
              <span className="text-white text-6xl font-black tracking-widest drop-shadow-lg">
                {coupon.code}
              </span>
              <span className="text-white/90 text-3xl font-bold mt-2 drop-shadow">
                {discountLabel}
              </span>
            </div>
          )}
        </div>

        {/* Conteúdo inferior */}
        <div className="p-5">
          {/* Título */}
          <div className="text-center mb-4">
            {!coupon.promoImage && (
              <>
                <p className="text-gray-500 text-sm mb-1">Use o código abaixo:</p>
                <p className="text-4xl font-black text-gray-900 tracking-widest">{coupon.code}</p>
              </>
            )}
            {coupon.description && (
              <p className="text-gray-600 text-sm mt-1">{coupon.description}</p>
            )}
          </div>

          {/* Regras */}
          <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-500 mb-4">
            {coupon.minOrderValue && (
              <span className="bg-gray-100 rounded-full px-3 py-1">
                Mín. R$ {coupon.minOrderValue.toFixed(2)}
              </span>
            )}
            {coupon.validUntil && (
              <span className="bg-gray-100 rounded-full px-3 py-1">
                Válido até {new Date(coupon.validUntil).toLocaleDateString('pt-BR')}
              </span>
            )}
            {coupon.firstPurchaseOnly && (
              <span className="bg-purple-100 text-purple-700 rounded-full px-3 py-1">
                Apenas 1ª compra
              </span>
            )}
          </div>

          {/* Botão copiar */}
          <button
            onClick={() => copyCode(coupon.code)}
            className={`w-full py-4 rounded-xl font-bold text-xl flex items-center justify-center gap-2 transition-all ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-gray-900 hover:bg-gray-700 text-white'
            }`}
          >
            {copied ? (
              <><FiCheck size={20} /> Código Copiado!</>
            ) : (
              <><FiCopy size={20} /> Copiar Código: {coupon.code}</>
            )}
          </button>

          {/* Indicador de páginas */}
          {coupons.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-3">
              {coupons.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentIndex ? 'bg-gray-900 w-5' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
