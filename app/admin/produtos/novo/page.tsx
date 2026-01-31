import { prisma } from '@/lib/prisma'
import NovoProductForm from './novo-produto-form'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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
