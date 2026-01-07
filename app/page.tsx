import { prisma } from '@/lib/prisma'
import ProductCard from '@/components/ProductCard'
import Hero from '@/components/Hero'
import CategoryGrid from '@/components/CategoryGrid'
import { serializeProducts } from '@/lib/serialize'

export default async function HomePage() {
  const [featuredProductsRaw, categories, allProductsRaw] = await Promise.all([
    prisma.product.findMany({
      where: { featured: true },
      include: { category: true },
      take: 8,
    }),
    prisma.category.findMany({
      take: 6,
    }),
    prisma.product.findMany({
      include: { category: true },
      take: 12,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const featuredProducts = serializeProducts(featuredProductsRaw)
  const allProducts = serializeProducts(allProductsRaw)

  return (
    <div className="min-h-screen">
      <Hero />
      
      {/* Flash Sale Banner */}
      <section className="bg-gradient-to-r from-red-600 to-orange-600 text-white py-6">
        <div className="container mx-auto px-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl animate-bounce">⚡</span>
            <div>
              <h3 className="text-2xl font-bold">SUPER PROMOÇÃO RELÂMPAGO!</h3>
              <p className="text-sm">Descontos de até 70% em produtos selecionados</p>
            </div>
          </div>
          <div className="flex gap-2 text-center">
            <div className="bg-white/20 rounded-lg px-3 py-2">
              <div className="text-2xl font-bold">12</div>
              <div className="text-xs">HORAS</div>
            </div>
            <div className="text-2xl font-bold">:</div>
            <div className="bg-white/20 rounded-lg px-3 py-2">
              <div className="text-2xl font-bold">30</div>
              <div className="text-xs">MIN</div>
            </div>
            <div className="text-2xl font-bold">:</div>
            <div className="bg-white/20 rounded-lg px-3 py-2">
              <div className="text-2xl font-bold">45</div>
              <div className="text-xs">SEG</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-8 bg-white border-y">
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 justify-center">
            <span className="text-3xl">🚚</span>
            <div>
              <p className="font-bold text-sm">ENTREGA RÁPIDA</p>
              <p className="text-xs text-gray-600">Em todo Brasil</p>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-center">
            <span className="text-3xl">🔒</span>
            <div>
              <p className="font-bold text-sm">COMPRA SEGURA</p>
              <p className="text-xs text-gray-600">Dados protegidos</p>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-center">
            <span className="text-3xl">↩️</span>
            <div>
              <p className="font-bold text-sm">TROCA GRÁTIS</p>
              <p className="text-xs text-gray-600">30 dias garantia</p>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-center">
            <span className="text-3xl">⭐</span>
            <div>
              <p className="font-bold text-sm">+10 MIL CLIENTES</p>
              <p className="text-xs text-gray-600">Satisfeitos</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section className="py-16 px-4 w-full">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Navegue por Categorias</h2>
            <a href="/categorias" className="text-primary-600 hover:text-primary-700 font-semibold">
              Ver todas →
            </a>
          </div>
          <CategoryGrid categories={categories} />
        </div>
      </section>

      {/* Produtos em Destaque */}
      <section className="py-16 px-4 w-full bg-gray-50">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">🔥 Mais Vendidos</h2>
            <p className="text-gray-600">Os produtos que todo mundo está comprando</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {featuredProducts.map((product, index) => (
            <div 
              key={product.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* Lançamentos */}
      <section className="py-16 px-4 w-full">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">✨ Lançamentos</h2>
              <p className="text-gray-600">Novidades que acabaram de chegar</p>
            </div>
            <a href="/produtos" className="text-primary-600 hover:text-primary-700 font-semibold">
              Ver todos →
            </a>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {allProducts.slice(0, 12).map((product, index) => (
            <div 
              key={product.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 px-4 bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">📧 Receba Ofertas Exclusivas!</h2>
          <p className="mb-6 text-primary-100">
            Cadastre seu e-mail e seja o primeiro a saber das promoções
          </p>
          <form className="flex gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Seu melhor e-mail"
              className="flex-1 px-4 py-3 rounded-lg text-gray-900"
            />
            <button className="bg-accent-500 hover:bg-accent-600 px-8 py-3 rounded-lg font-bold transition">
              CADASTRAR
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
