'use client'

import { useState } from 'react'
import { FiShare2, FiCopy, FiCheck } from 'react-icons/fi'
import { FaWhatsapp, FaFacebook, FaTwitter, FaTelegram } from 'react-icons/fa'

interface ShareButtonsProps {
  url: string
  title: string
  price?: string
}

export default function ShareButtons({ url, title, price }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  const encodedUrl = encodeURIComponent(url)
  const waText = encodeURIComponent(`${title}${price ? ` — ${price}` : ''}\n${url}`)
  const twitterText = encodeURIComponent(`${title}${price ? ` por ${price}` : ''}`)

  const networks = [
    {
      label: 'WhatsApp',
      href: `https://wa.me/?text=${waText}`,
      icon: <FaWhatsapp size={18} />,
      color: 'bg-green-500 hover:bg-green-600 text-white'
    },
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: <FaFacebook size={18} />,
      color: 'bg-blue-600 hover:bg-blue-700 text-white'
    },
    {
      label: 'X / Twitter',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${twitterText}`,
      icon: <FaTwitter size={18} />,
      color: 'bg-black hover:bg-gray-800 text-white'
    },
    {
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(title)}`,
      icon: <FaTelegram size={18} />,
      color: 'bg-sky-500 hover:bg-sky-600 text-white'
    }
  ]

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback para mobiles que não suportam clipboard
      const el = document.createElement('input')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Web Share API (mobile native share)
  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url, text: price ? `Por apenas ${price}` : undefined })
        return
      } catch {}
    }
    setOpen(!open)
  }

  return (
    <div className="relative">
      <button
        onClick={nativeShare}
        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-primary-300 hover:text-primary-600 transition-all duration-200 text-sm font-medium"
      >
        <FiShare2 size={16} />
        <span>Compartilhar</span>
      </button>

      {open && (
        <div className="absolute left-0 bottom-full mb-2 z-50 bg-white rounded-2xl shadow-lg border border-gray-100 p-3 min-w-[200px]">
          <p className="text-xs font-semibold text-gray-500 mb-2 px-1">Compartilhar em</p>
          <div className="space-y-1.5">
            {networks.map((n) => (
              <a
                key={n.label}
                href={n.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${n.color}`}
              >
                {n.icon}
                {n.label}
              </a>
            ))}
            <button
              onClick={() => { copyLink(); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            >
              {copied ? <FiCheck size={17} className="text-green-600" /> : <FiCopy size={17} />}
              {copied ? 'Copiado!' : 'Copiar link'}
            </button>
          </div>
        </div>
      )}

      {/* overlay para fechar */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
    </div>
  )
}
