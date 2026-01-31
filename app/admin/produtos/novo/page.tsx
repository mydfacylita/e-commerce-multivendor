import { prisma } from '@/lib/prisma'
import NovoProductForm from './novo-produto-form'

export default async function NovoProdutoPage() {
  const [categories, suppliers] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: 'asc' },
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return <NovoProductForm categories={categories} suppliers={suppliers} />
}
