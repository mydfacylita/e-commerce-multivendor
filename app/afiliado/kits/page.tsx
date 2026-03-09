'use client';

import { useState, useEffect } from 'react';
import { FiPackage, FiShoppingBag, FiExternalLink, FiCopy, FiGift } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  price: number;
  images: string;
  slug: string;
  description?: string;
}

interface Kit {
  id: string;
  name: string;
  description?: string;
  assignedAt: string;
  affiliateCode: string;
  products: { product: Product }[];
}

export default function AffiliateKitsPage() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKit, setExpandedKit] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/affiliate/kits')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setKits(d.kits); })
      .finally(() => setLoading(false));
  }, []);

  const getFirstImage = (images: string) => {
    try {
      const arr = JSON.parse(images);
      return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
    } catch { return null; }
  };

  const getAffiliateLink = (slug: string, code: string) =>
    `https://www.mydshop.com.br/produtos/${slug}?ref=${code}`;

  const copyLink = (slug: string, code: string, name: string) => {
    navigator.clipboard.writeText(getAffiliateLink(slug, code));
    toast.success(`Link de "${name}" copiado!`);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FiGift className="text-blue-600" />
          Meus Kits de Divulgação
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Produtos selecionados pela equipe para você divulgar. Use seus links exclusivos!
        </p>
      </div>

      {kits.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <FiPackage size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700">Nenhum kit disponível ainda</h3>
          <p className="text-gray-400 text-sm mt-1">
            Em breve a equipe enviará kits de produtos para você divulgar!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {kits.map(kit => (
            <div key={kit.id} className="bg-white rounded-xl shadow overflow-hidden">
              {/* Header do kit */}
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedKit(expandedKit === kit.id ? null : kit.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <FiPackage className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{kit.name}</h3>
                    <p className="text-xs text-gray-400">
                      Recebido em {formatDate(kit.assignedAt)} · {kit.products.length} produto(s)
                    </p>
                  </div>
                </div>
                <div className="text-gray-400 text-sm">
                  {expandedKit === kit.id ? '▲' : '▼'}
                </div>
              </div>

              {/* Conteúdo expandido */}
              {expandedKit === kit.id && (
                <div className="border-t">
                  {kit.description && (
                    <div className="px-5 py-3 bg-blue-50 border-b">
                      <p className="text-sm text-blue-800 leading-relaxed">{kit.description}</p>
                    </div>
                  )}

                  {kit.products.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">
                      Nenhum produto neste kit
                    </p>
                  ) : (
                    <div className="divide-y">
                      {kit.products.map(({ product }) => {
                        const img = getFirstImage(product.images);
                        const link = getAffiliateLink(product.slug, kit.affiliateCode);
                        return (
                          <div key={product.id} className="flex items-center gap-4 p-4">
                            {img ? (
                              <img
                                src={img}
                                alt={product.name}
                                className="w-16 h-16 rounded-lg object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                <FiShoppingBag className="text-gray-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm leading-tight">{product.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                R$ {product.price.toFixed(2).replace('.', ',')}
                              </p>
                              <p className="text-xs text-blue-500 mt-1 truncate">{link}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => copyLink(product.slug, kit.affiliateCode, product.name)}
                                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600"
                                title="Copiar link"
                              >
                                <FiCopy size={15} />
                              </button>
                              <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-blue-600"
                                title="Abrir produto"
                              >
                                <FiExternalLink size={15} />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
