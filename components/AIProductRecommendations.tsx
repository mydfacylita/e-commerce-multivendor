'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice?: number | null
  image: string
}

interface Props {
  productId: string
}

export default function AIProductRecommendations({ productId }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!productId) return
    fetch(`/api/ai/recommendations?productId=${productId}`)
      .then(r => r.json())
      .then(data => {
        setProducts(data.products || [])
        setTitle(data.title || 'Você também pode gostar')
        setSubtitle(data.subtitle || null)
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [productId])

  if (loading) {
    return (
      <section className="py-10 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-100">
                <div className="aspect-square bg-gray-200 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-2/3 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (products.length === 0) return null

  const formatPrice = (p: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p)

  return (
    <section className="py-10 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">✨</span>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <span className="ml-auto text-xs bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full font-medium">
            Curadoria IA
          </span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {products.map(p => (
            <Link
              key={p.id}
              href={`/produtos/${p.slug}`}
              className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-violet-300 hover:shadow-md transition-all group"
            >
              <div className="relative aspect-square overflow-hidden bg-gray-50">
                {p.image ? (
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 17vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-gray-200">📦</div>
                )}
                {p.comparePrice && p.comparePrice > p.price && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    -{Math.round((1 - p.price / p.comparePrice) * 100)}%
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed group-hover:text-violet-600 font-medium">{p.name}</p>
                <div className="mt-2">
                  <span className="text-sm font-bold text-gray-900">{formatPrice(p.price)}</span>
                  {p.comparePrice && p.comparePrice > p.price && (
                    <span className="text-xs text-gray-400 line-through ml-1">{formatPrice(p.comparePrice)}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
