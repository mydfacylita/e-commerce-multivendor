import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Guias de Compra — Melhores Produtos de 2026 | MYDSHOP',
  description: 'Guias completos para você fazer as melhores escolhas. Comparativos, dicas e os produtos mais bem avaliados em cada categoria.',
  openGraph: {
    title: 'Guias de Compra | MYDSHOP',
    description: 'Comparativos e guias completos para comprar melhor.',
    type: 'website',
  }
}

export default async function GuiasPage() {
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    select: { name: true, slug: true, description: true },
    orderBy: { name: 'asc' },
    take: 30,
  })

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">📚 Guias de Compra</h1>
          <p className="text-xl text-gray-500">Comparativos e dicas para você escolher o melhor produto</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {categories.map(cat => (
            <Link
              key={cat.slug}
              href={`/guias/${cat.slug}`}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-400 hover:shadow-md transition-all group"
            >
              <h2 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                Melhores {cat.name} de 2026
              </h2>
              <p className="text-sm text-gray-500 line-clamp-2">
                {cat.description || `Guia completo para escolher os melhores produtos de ${cat.name} com ótimo custo-benefício.`}
              </p>
              <span className="mt-3 inline-block text-xs font-semibold text-blue-600">Ver guia →</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
