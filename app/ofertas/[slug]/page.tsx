import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ProductCard from '@/components/ProductCard'
import { serializeProduct } from '@/lib/serialize'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await prisma.promoPage.findUnique({ where: { slug: params.slug } })
  if (!page) return { title: 'Ofertas' }
  return {
    title: `${page.title} | Ofertas Exclusivas`,
    description: page.description || `Aproveite as ofertas exclusivas: ${page.title}`,
  }
}

export default async function OfertasSlugPage({ params }: Props) {
  const now = new Date()

  const page = await prisma.promoPage.findFirst({
    where: {
      slug: params.slug,
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }]
    },
    include: {
      products: {
        orderBy: { position: 'asc' },
        include: {
          product: {
            include: { supplier: true, category: true, seller: true }
          }
        }
      }
    }
  })

  if (!page) notFound()

  const activeProducts = page.products.filter(pp => pp.product.active)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero da promoção */}
      {page.bannerImageUrl ? (
        // Hero com imagem
        <div className="relative w-full">
          <img
            src={page.bannerImageUrl}
            alt={page.title}
            className="w-full max-h-[400px] object-cover"
          />
          {/* Overlay com título se quiser */}
        </div>
      ) : (
        // Hero com cor
        <div style={{ backgroundColor: page.bannerBgColor, color: page.bannerTextColor }}
          className="py-10 px-4 text-center">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">{page.title}</h1>
          {page.description && (
            <p className="mt-3 text-lg opacity-90 max-w-xl mx-auto">{page.description}</p>
          )}
          {page.discountBadge && (
            <div className="inline-block mt-4 bg-white/20 rounded-full px-6 py-2 text-xl font-bold border-2 border-white/40">
              {page.discountBadge}
            </div>
          )}
          {page.couponCode && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <span className="opacity-80 text-sm">Use o cupom:</span>
              <CouponBadge code={page.couponCode} />
            </div>
          )}
          {page.endsAt && (
            <p className="mt-3 text-sm opacity-70">
              Promoção válida até {new Date(page.endsAt).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
      )}

      {/* Informações abaixo da imagem (quando há imagem) */}
      {page.bannerImageUrl && (page.discountBadge || page.couponCode || page.endsAt || page.description) && (
        <div className="bg-white border-b px-4 py-4 text-center space-y-2">
          {page.description && <p className="text-gray-600 text-sm max-w-xl mx-auto">{page.description}</p>}
          {page.discountBadge && (
            <span className="inline-block bg-red-600 text-white rounded-full px-5 py-1 font-bold text-sm">{page.discountBadge}</span>
          )}
          {page.couponCode && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-gray-500 text-sm">Cupom:</span>
              <CouponBadge code={page.couponCode} />
            </div>
          )}
          {page.endsAt && (
            <p className="text-xs text-gray-400">Válido até {new Date(page.endsAt).toLocaleString('pt-BR')}</p>
          )}
        </div>
      )}

      {/* Produtos */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        {activeProducts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">🛍️</p>
            <p className="text-xl font-medium">Em breve!</p>
            <p className="text-sm mt-1">Os produtos desta promoção serão anunciados em breve.</p>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-sm mb-6">{activeProducts.length} ofertas disponíveis</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {activeProducts.map(pp => {
                const serialized = serializeProduct(pp.product)
                // Override de preço promocional, se configurado
                const product = pp.customPrice ? { ...serialized, price: pp.customPrice } : serialized
                return (
                  <div key={pp.id} className="relative">
                    {pp.badgeText && (
                      <div className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
                        {pp.badgeText}
                      </div>
                    )}
                    <ProductCard product={product} />
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CouponBadge({ code }: { code: string }) {
  return (
    <span className="bg-white text-gray-900 font-mono font-bold px-4 py-1.5 rounded-lg text-sm border-2 border-dashed border-gray-300 select-all cursor-copy">
      {code}
    </span>
  )
}
