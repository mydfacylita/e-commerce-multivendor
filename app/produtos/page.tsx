import { prisma } from '@/lib/prisma'
import ProductCard from '@/components/ProductCard'
import { serializeProduct } from '@/lib/serialize'

export default async function ProdutosPage() {
  const productsRaw = await prisma.product.findMany({
    where: { active: true },  // Apenas produtos ativos
    include: { 
      category: true,
      supplier: true,  // Para identificar produtos importados
      seller: true  // Para identificação de origem (frete)
    },
    orderBy: { createdAt: 'desc' },
  })

  // Serializar produtos para garantir que images seja um array
  const products = productsRaw.map(serializeProduct)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Todos os Produtos</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-16">
          <p className="text-xl text-gray-500">Nenhum produto encontrado.</p>
        </div>
      )}
    </div>
  )
}
