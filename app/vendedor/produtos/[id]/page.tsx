import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import EditarProductForm from './editar-produto-form'

export default async function EditarProdutoVendedorPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'SELLER') {
    redirect('/login')
  }

  // Buscar vendedor
  const seller = await prisma.seller.findUnique({
    where: { userId: session.user.id },
  })

  if (!seller) {
    redirect('/vendedor/cadastro')
  }

  // Buscar produto
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      category: true,
    },
  })

  if (!product) {
    notFound()
  }

  // Verificar se o produto pertence ao vendedor
  if (product.sellerId !== seller.id) {
    redirect('/vendedor/produtos')
  }

  // Buscar categorias
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  })

  // Se for dropshipping, buscar preço mínimo do produto original
  let minPrice = 0
  if (product.isDropshipping && product.supplierSku) {
    const sourceProduct = await prisma.product.findUnique({
      where: { id: product.supplierSku },
      select: { price: true }
    })
    if (sourceProduct) {
      minPrice = sourceProduct.price
    }
  }

  return <EditarProductForm product={product} categories={categories} minPrice={minPrice} />
}
