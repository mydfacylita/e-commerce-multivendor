import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { FiMapPin, FiStar, FiClock, FiPackage } from 'react-icons/fi';
import { serializeProducts } from '@/lib/serialize';

interface Props {
  params: {
    slug: string;
  };
}

export default async function StorePage({ params }: Props) {
  const seller = await prisma.seller.findUnique({
    where: { storeSlug: params.slug },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      products: {
        where: { active: true },
        include: {
          category: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!seller || seller.status !== 'ACTIVE') {
    notFound();
  }

  const products = serializeProducts(seller.products);

  const stats = {
    totalProducts: products.length,
    memberSince: new Date(seller.createdAt).getFullYear(),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner da Loja */}
      <div className="relative h-64 bg-gradient-to-r from-blue-600 to-purple-600">
        {seller.storeBanner && (
          <img
            src={seller.storeBanner}
            alt={seller.storeName}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto flex items-end">
            {seller.storeLogo ? (
              <img
                src={seller.storeLogo}
                alt={seller.storeName}
                className="w-32 h-32 rounded-lg border-4 border-white shadow-lg bg-white"
              />
            ) : (
              <div className="w-32 h-32 rounded-lg border-4 border-white shadow-lg bg-white flex items-center justify-center">
                <span className="text-4xl font-bold text-gray-400">
                  {seller.storeName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            
            <div className="ml-6 pb-2">
              <h1 className="text-4xl font-bold text-white mb-2">{seller.storeName}</h1>
              <div className="flex items-center gap-4 text-white text-sm">
                {seller.cidade && seller.estado && (
                  <span className="flex items-center gap-1">
                    <FiMapPin size={16} />
                    {seller.cidade}, {seller.estado}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <FiClock size={16} />
                  Membro desde {stats.memberSince}
                </span>
                <span className="flex items-center gap-1">
                  <FiPackage size={16} />
                  {stats.totalProducts} produtos
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <h2 className="font-bold text-lg mb-4">Sobre a Loja</h2>
              
              {seller.storeDescription && (
                <p className="text-gray-600 text-sm mb-4">{seller.storeDescription}</p>
              )}

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-500">Tipo:</span>
                  <p className="font-medium">
                    {seller.sellerType === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                  </p>
                </div>

                {seller.sellerType === 'PJ' && seller.nomeFantasia && (
                  <div>
                    <span className="text-gray-500">Nome Fantasia:</span>
                    <p className="font-medium">{seller.nomeFantasia}</p>
                  </div>
                )}

                <div>
                  <span className="text-gray-500">Localização:</span>
                  <p className="font-medium">
                    {seller.cidade}, {seller.estado}
                  </p>
                </div>

                <div>
                  <span className="text-gray-500">Total de Produtos:</span>
                  <p className="font-medium">{stats.totalProducts}</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FiStar className="text-yellow-500" />
                  Avaliações
                </h3>
                <p className="text-sm text-gray-600">
                  Em breve você poderá ver as avaliações desta loja
                </p>
              </div>
            </div>
          </div>

          {/* Produtos */}
          <div className="md:col-span-3">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Produtos ({stats.totalProducts})
              </h2>
            </div>

            {products.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <FiPackage className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum produto disponível
                </h3>
                <p className="text-gray-600">
                  Esta loja ainda não tem produtos cadastrados
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé da Loja */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-sm text-gray-600">
            <p>
              Esta loja é gerenciada por <strong>{seller.storeName}</strong>
            </p>
            <p className="mt-2">
              Todos os produtos são de responsabilidade do vendedor
            </p>
            <Link
              href="/"
              className="text-blue-600 hover:underline mt-4 inline-block"
            >
              ← Voltar para a página inicial
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Gerar páginas estáticas para todas as lojas
export async function generateStaticParams() {
  const sellers = await prisma.seller.findMany({
    where: { status: 'ACTIVE' },
    select: { storeSlug: true },
  });

  return sellers.map((seller) => ({
    slug: seller.storeSlug,
  }));
}
