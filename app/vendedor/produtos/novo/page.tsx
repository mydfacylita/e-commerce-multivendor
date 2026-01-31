import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import NovoProductForm from './novo-produto-form'

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function NovoProdutoVendedorPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'SELLER') {
    redirect('/login')
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  })

  return <NovoProductForm categories={categories} />
}
