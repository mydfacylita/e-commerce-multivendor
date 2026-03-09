'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { FiHeart } from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa'

const LS_KEY = 'mydshop_wishlist'

function getLocalWishlist(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  } catch {
    return []
  }
}

function setLocalWishlist(ids: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(ids))
}

interface WishlistButtonProps {
  productId: string
  className?: string
}

export default function WishlistButton({ productId, className = '' }: WishlistButtonProps) {
  const { data: session } = useSession()
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [loading, setLoading] = useState(false)

  // Carrega estado inicial
  const loadState = useCallback(async () => {
    if (session) {
      try {
        const res = await fetch('/api/wishlist')
        if (res.ok) {
          const data = await res.json()
          const ids = data.items.map((i: any) => i.productId)
          setIsWishlisted(ids.includes(productId))
          // Limpa localStorage depois de sincronizar
          localStorage.removeItem(LS_KEY)
        }
      } catch {}
    } else {
      setIsWishlisted(getLocalWishlist().includes(productId))
    }
  }, [session, productId])

  useEffect(() => { loadState() }, [loadState])

  const toggle = async () => {
    if (loading) return
    setLoading(true)
    try {
      if (session) {
        if (isWishlisted) {
          await fetch('/api/wishlist', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId }) })
        } else {
          await fetch('/api/wishlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId }) })
        }
        setIsWishlisted(!isWishlisted)
      } else {
        const list = getLocalWishlist()
        if (isWishlisted) {
          setLocalWishlist(list.filter(id => id !== productId))
        } else {
          setLocalWishlist([...list, productId])
        }
        setIsWishlisted(!isWishlisted)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={isWishlisted ? 'Remover dos desejos' : 'Adicionar aos desejos'}
      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border transition-all duration-200 text-sm font-medium
        ${isWishlisted
          ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
          : 'bg-white border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-500'}
        ${loading ? 'opacity-60 cursor-wait' : ''}
        ${className}`}
    >
      {isWishlisted
        ? <FaHeart size={16} className="text-red-500" />
        : <FiHeart size={16} />}
      <span>{isWishlisted ? 'Nos desejos' : 'Desejos'}</span>
    </button>
  )
}
