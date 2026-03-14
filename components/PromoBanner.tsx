'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface BannerData {
  active: boolean
  banner?: {
    enabled: boolean
    text?: string
    bgColor: string
    textColor: string
    link?: string
    imageUrl?: string
  }
  slug?: string
  endsAt?: string
}

export default function PromoBanner() {
  const [data, setData] = useState<BannerData | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch('/api/promo-page')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
  }, [])

  if (!data?.active || !data.banner?.enabled || dismissed) return null

  const { banner, slug, endsAt } = data

  // Nem imagem nem texto configurado — não exibe
  if (!banner.imageUrl && !banner.text) return null

  const link = banner.link || (slug ? `/ofertas/${slug}` : null)

  const dismissBtn = (
    <button
      onClick={e => { e.preventDefault(); e.stopPropagation(); setDismissed(true) }}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-xl leading-none opacity-60 hover:opacity-100 z-10"
      style={{ color: banner.imageUrl ? '#fff' : banner.textColor }}
      aria-label="Fechar banner"
    >
      ×
    </button>
  )

  const content = banner.imageUrl ? (
    // Banner com imagem
    <div className="relative w-full">
      <Image
        src={banner.imageUrl}
        alt={banner.text || 'Banner promocional'}
        width={1440}
        height={250}
        className="w-full h-auto object-cover max-h-[250px]"
        priority
        unoptimized
      />
      {dismissBtn}
    </div>
  ) : (
    // Banner texto + cor
    <div
      style={{ backgroundColor: banner.bgColor, color: banner.textColor }}
      className="relative w-full px-4 py-2 text-center text-sm font-semibold flex items-center justify-center gap-3"
    >
      <span>{banner.text}</span>
      {endsAt && <CountdownTimer endsAt={endsAt} textColor={banner.textColor} />}
      {dismissBtn}
    </div>
  )

  return link ? (
    <Link href={link} className="block hover:opacity-95 transition-opacity">
      {content}
    </Link>
  ) : (
    <div>{content}</div>
  )
}

function CountdownTimer({ endsAt, textColor }: { endsAt: string; textColor: string }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    function calc() {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) return setTimeLeft('')
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`)
    }
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [endsAt])

  if (!timeLeft) return null
  return (
    <span style={{ color: textColor }} className="font-mono font-bold text-xs border border-current rounded px-2 py-0.5">
      ⏱ {timeLeft}
    </span>
  )
}
