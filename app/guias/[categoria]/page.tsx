import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface Props {
  params: { categoria: string }
}

async function getCategoryData(slug: string) {
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, description: true, parentId: true }
  })
  if (!category) return null

  const products = await prisma.product.findMany({
    where: {
      categoryId: category.id,
      active: true,
      approvalStatus: 'APPROVED',
    },
    select: {
      id: true, name: true, slug: true, description: true,
      price: true, comparePrice: true, brand: true,
      images: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return { category, products }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getCategoryData(params.categoria)
  if (!data) return {}
  const { category } = data
  const year = new Date().getFullYear()
  const title = `Melhores ${category.name} de ${year} — Guia Completo com Melhores Preços | MYDSHOP`
  const description = `Veja os melhores ${category.name} de ${year}: comparativo, dicas de especialistas e os produtos mais bem avaliados. Compre com garantia na MYDSHOP.`
  const url = `https://mydshop.com.br/guias/${category.slug}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'article',
      url,
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function GuiasCategoriaPage({ params }: Props) {
  const data = await getCategoryData(params.categoria)
  if (!data) notFound()
  const { category, products } = data
  const year = new Date().getFullYear()

  // Parse product images (stored as JSON string in DB)
  const productsWithImage = products.map(p => {
    let firstImage = ''
    try {
      const imgs = JSON.parse(p.images as string)
      firstImage = Array.isArray(imgs) && imgs.length > 0
        ? (typeof imgs[0] === 'string' ? imgs[0] : imgs[0]?.url || '')
        : ''
    } catch { /* empty */ }
    return { ...p, firstImage }
  })

  const prices = products.map(p => p.price).filter(Boolean)
  const minPrice = prices.length ? Math.min(...prices) : null
  const maxPrice = prices.length ? Math.max(...prices) : null

  // JSON-LD: FAQPage
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Qual é o melhor ${category.name} de ${year}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: products[0]
            ? `Com base nas avaliações e vendas, o ${products[0].name} é uma das melhores opções disponíveis. Ele combina qualidade, durabilidade e bom custo-benefício.`
            : `Existem diversas opções excelentes disponíveis na MYDSHOP com boa relação custo-benefício.`,
        }
,
      },
      {
        '@type': 'Question',
        name: `Quanto custa um ${category.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: minPrice && maxPrice
            ? `Os preços de ${category.name} variam de R$ ${minPrice.toFixed(2).replace('.', ',')} a R$ ${maxPrice.toFixed(2).replace('.', ',')} na MYDSHOP, dependendo das especificações e marca.`
            : `Confira os melhores preços de ${category.name} na MYDSHOP com frete para todo o Brasil.`,
        },
      },
      {
        '@type': 'Question',
        name: `Como escolher o melhor ${category.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Para escolher o melhor ${category.name} considere: 1) Sua necessidade de uso (frequência e finalidade); 2) O custo-benefício entre marcas; 3) Avaliações de outros compradores; 4) Garantia e assistência técnica. Na MYDSHOP você encontra as melhores opções com comparativo de preços.`,
        },
      },
      {
        '@type': 'Question',
        name: `Qual a marca de ${category.name} mais confiável?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `As marcas mais bem avaliadas pelos nossos clientes nas categorias de ${category.name} incluem: ${[...new Set(products.map(p => p.brand).filter(Boolean))].slice(0, 4).join(', ') || 'diversas marcas reconhecidas no mercado'}. Todas com garantia e processo de compra seguro.`,
        },
      },
    ],
  }

  // JSON-LD: ItemList
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Melhores ${category.name} de ${year}`,
    description: `Top ${products.length} melhores ${category.name} com avaliações e preços atualizados`,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://mydshop.com.br/produtos/${p.slug}`,
      name: p.name,
    })),
  }

  // JSON-LD: BreadcrumbList
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mydshop.com.br' },
      { '@type': 'ListItem', position: 2, name: 'Guias de Compra', item: 'https://mydshop.com.br/guias' },
      { '@type': 'ListItem', position: 3, name: `Melhores ${category.name}`, item: `https://mydshop.com.br/guias/${category.slug}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="min-h-screen bg-gray-50 pb-16">
        {/* Hero */}
        <div className="bg-white border-b border-gray-200 py-10">
          <div className="max-w-5xl mx-auto px-4">
            <nav className="text-sm text-gray-400 mb-4 flex gap-2">
              <Link href="/" className="hover:text-blue-600">Home</Link> /
              <Link href="/guias" className="hover:text-blue-600">Guias</Link> /
              <span className="text-gray-700">{category.name}</span>
            </nav>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Melhores {category.name} de {year}
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl">
              {category.description ||
                `Guia completo com os produtos mais bem avaliados, comparativo de preços e dicas para você escolher o melhor ${category.name} com o melhor custo-benefício.`}
            </p>
            {minPrice && maxPrice && (
              <p className="mt-3 text-sm text-gray-400">
                Preços a partir de{' '}
                <strong className="text-green-600">R$ {minPrice.toFixed(2).replace('.', ',')}</strong>
                {' '}até <strong className="text-gray-700">R$ {maxPrice.toFixed(2).replace('.', ',')}</strong>
              </p>
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 mt-10 space-y-12">
          {/* Top products */}
          {productsWithImage.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                🏆 Top {productsWithImage.length} {category.name} de {year}
              </h2>
              <div className="space-y-4">
                {productsWithImage.map((product, index) => (
                  <Link
                    key={product.id}
                    href={`/produtos/${product.slug}`}
                    className="flex gap-4 bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-400 hover:shadow-md transition-all group"
                  >
                    {/* Rank badge */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                      ${index === 0 ? 'bg-yellow-400 text-white' : index === 1 ? 'bg-gray-300 text-gray-700' : index === 2 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {index + 1}
                    </div>

                    {/* Image */}
                    {product.firstImage ? (
                      <div className="flex-shrink-0 w-16 h-16 relative rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={product.firstImage}
                          alt={product.name}
                          fill
                          className="object-contain"
                          sizes="64px"
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-gray-100" />
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {product.name}
                      </h3>
                      {product.brand && <p className="text-xs text-gray-400 mt-0.5">{product.brand}</p>}
                    </div>

                    {/* Price */}
                    <div className="flex-shrink-0 text-right">
                      {product.comparePrice && product.comparePrice > product.price && (
                        <p className="text-xs text-gray-400 line-through">
                          R$ {product.comparePrice.toFixed(2).replace('.', ',')}
                        </p>
                      )}
                      <p className="font-bold text-green-600 text-lg">
                        R$ {product.price.toFixed(2).replace('.', ',')}
                      </p>
                      <span className="text-xs text-blue-600 font-medium">Ver oferta →</span>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-6 text-center">
                <Link
                  href={`/categorias/${category.slug}`}
                  className="inline-block bg-blue-600 text-white font-semibold px-8 py-3 rounded-full hover:bg-blue-700 transition-colors"
                >
                  Ver todos os {category.name}
                </Link>
              </div>
            </section>
          )}

          {/* FAQ Section */}
          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              ❓ Perguntas Frequentes sobre {category.name}
            </h2>
            <div className="space-y-4">
              {faqJsonLd.mainEntity.map((faq, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">{faq.name}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{faq.acceptedAnswer.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="bg-blue-50 rounded-2xl p-8 text-center border border-blue-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Pronto para comprar o seu {category.name}?
            </h2>
            <p className="text-gray-500 mb-6">
              Frete para todo o Brasil · Pagamento seguro · Garantia do fabricante
            </p>
            <Link
              href={`/categorias/${category.slug}`}
              className="inline-block bg-blue-600 text-white font-bold px-10 py-4 rounded-full hover:bg-blue-700 transition-colors text-lg"
            >
              Ver Ofertas de {category.name}
            </Link>
          </section>

          {/* Back */}
          <div className="text-center">
            <Link href="/guias" className="text-sm text-gray-400 hover:text-blue-600 transition-colors">
              ← Ver todos os guias de compra
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
