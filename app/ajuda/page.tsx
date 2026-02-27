import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { FiSearch, FiChevronRight, FiBookOpen } from 'react-icons/fi'
import { RenderBlocks } from '@/components/help/RenderBlocks'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const CATEGORIES = [
  { value: 'primeiros-passos', label: 'Primeiros Passos', icon: '🚀' },
  { value: 'clientes', label: 'Clientes', icon: '👥' },
  { value: 'vendedores', label: 'Vendedores', icon: '🏪' },
  { value: 'integracoes', label: 'Integrações', icon: '🔌' },
  { value: 'financeiro', label: 'Financeiro', icon: '💰' },
  { value: 'logistica', label: 'Logística', icon: '📦' },
  { value: 'produtos', label: 'Produtos', icon: '🛍️' },
  { value: 'geral', label: 'Geral', icon: '📋' },
]

export default async function HelpCenterPage({
  searchParams,
}: {
  searchParams: { q?: string; artigo?: string; cat?: string }
}) {
  const search = searchParams?.q || ''
  const articleSlug = searchParams?.artigo || ''
  const categoryFilter = searchParams?.cat || ''

  // Buscar artigos publicados
  const articles = await prisma.helpArticle.findMany({
    where: {
      published: true,
      ...(categoryFilter ? { category: categoryFilter } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: [{ category: 'asc' }, { position: 'asc' }],
  })

  // Artigo específico selecionado
  const activeArticle = articleSlug
    ? await prisma.helpArticle.findFirst({
        where: { slug: articleSlug, published: true },
      })
    : null

  // Agrupados por categoria
  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: articles.filter(a => a.category === cat.value),
  })).filter(g => g.items.length > 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 py-16 px-4 text-white text-center">
        <div className="flex justify-center mb-4">
          <FiBookOpen size={40} className="opacity-80" />
        </div>
        <h1 className="text-4xl font-bold mb-2">Central de Ajuda</h1>
        <p className="text-primary-100 mb-8 max-w-md mx-auto">
          Encontre tutoriais, guias e respostas para usar a plataforma.
        </p>
        <form method="get" action="/ajuda" className="max-w-xl mx-auto">
          <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 shadow-md">
            <FiSearch className="text-gray-400 shrink-0" size={18} />
            <input
              name="q"
              defaultValue={search}
              placeholder="Buscar artigos..."
              className="flex-1 text-gray-800 bg-transparent outline-none text-sm"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition"
            >
              Buscar
            </button>
          </div>
        </form>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {activeArticle ? (
          // ── Single article view ──
          <div>
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
              <Link href="/ajuda" className="hover:text-primary-600 transition">← Voltar</Link>
              <FiChevronRight size={14} />
              <Link
                href={`/ajuda?cat=${activeArticle.category}`}
                className="hover:text-primary-600 transition"
              >
                {CATEGORIES.find(c => c.value === activeArticle.category)?.label}
              </Link>
              <FiChevronRight size={14} />
              <span className="text-gray-700 font-medium">{activeArticle.title}</span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full">
              <div className="flex items-start gap-4 mb-6">
                <span className="text-5xl">{activeArticle.icon || '📄'}</span>
                <div>
                  <p className="text-xs font-bold text-primary-600 uppercase tracking-wide mb-1">
                    {CATEGORIES.find(c => c.value === activeArticle.category)?.label}
                  </p>
                  <h1 className="text-3xl font-bold text-gray-900">{activeArticle.title}</h1>
                  {activeArticle.description && (
                    <p className="text-gray-500 mt-2 text-base">{activeArticle.description}</p>
                  )}
                </div>
              </div>

              <hr className="mb-6" />

              <RenderBlocks blocks={JSON.parse(activeArticle.blocks)} />
            </div>
          </div>
        ) : (
          // ── Category / search listing ──
          <div>
            {/* Category filter pills */}
            <div className="flex flex-wrap gap-2 mb-8">
              <Link
                href="/ajuda"
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition border ${
                  !categoryFilter
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400 hover:text-primary-600'
                }`}
              >
                Todos
              </Link>
              {CATEGORIES.filter(c => articles.some(a => a.category === c.value)).map(cat => (
                <Link
                  key={cat.value}
                  href={`/ajuda?cat=${cat.value}`}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition border ${
                    categoryFilter === cat.value
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400 hover:text-primary-600'
                  }`}
                >
                  {cat.icon} {cat.label}
                </Link>
              ))}
            </div>

            {search && (
              <p className="text-sm text-gray-500 mb-6">
                {articles.length} resultado{articles.length !== 1 ? 's' : ''} para{' '}
                <strong>"{search}"</strong>
              </p>
            )}

            {grouped.length === 0 && (
              <div className="text-center py-16">
                <p className="text-5xl mb-4">🔍</p>
                <p className="text-xl font-semibold text-gray-600">Nenhum artigo encontrado</p>
                <p className="text-gray-400 mt-2">Tente buscar por outro termo.</p>
                <Link href="/ajuda" className="mt-4 inline-block text-primary-600 hover:underline">
                  Ver todos os artigos
                </Link>
              </div>
            )}

            <div className="space-y-10">
              {grouped.map(group => (
                <section key={group.value}>
                  <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-2xl">{group.icon}</span>
                    {group.label}
                    <span className="text-xs text-gray-400 font-normal">{group.items.length} artigo{group.items.length !== 1 ? 's' : ''}</span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.items.map(a => (
                      <Link
                        key={a.id}
                        href={`/ajuda?artigo=${a.slug}`}
                        className="bg-white border border-gray-100 rounded-xl p-5 hover:border-primary-300 hover:shadow-md transition group"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{a.icon || '📄'}</span>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-800 group-hover:text-primary-700 transition text-sm leading-snug">
                              {a.title}
                            </h3>
                            {a.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.description}</p>
                            )}
                            <p className="text-xs text-primary-500 mt-2 flex items-center gap-1">
                              Ler artigo <FiChevronRight size={12} />
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer help block */}
      <div className="bg-white border-t mt-16 py-10 text-center text-gray-500">
        <p className="text-base">Não encontrou o que procurava?</p>
        <p className="mt-1 text-sm">
          Entre em contato através do{' '}
          <Link href="/" className="text-primary-600 hover:underline">
            site
          </Link>{' '}
          ou por e-mail.
        </p>
      </div>
    </div>
  )
}
