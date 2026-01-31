'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiArrowLeft, FiSearch, FiCheckCircle, FiCircle, FiShoppingCart, FiExternalLink, FiDownload, FiFilter, FiTruck, FiClock, FiDollarSign } from 'react-icons/fi';
import toast from 'react-hot-toast';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface FreightOption {
  serviceName: string;
  deliveryDayMin: number;
  deliveryDayMax: number;
  freightCost: number;
  currency: string;
  trackingAvailable: boolean;
  company: string;
}

interface ProductFreight {
  options: FreightOption[];
  cheapest: FreightOption | null;
  hasFreightInfo: boolean;
  loading: boolean;
}

interface AliExpressProduct {
  product_id: string;
  product_title: string;
  product_main_image_url: string;
  target_sale_price: string;
  target_original_price?: string;
  product_detail_url: string;
  freight?: ProductFreight;
}

interface Supplier {
  id: string;
  name: string;
}

export default function AliExpressProductSelectionPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<AliExpressProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [freightData, setFreightData] = useState<Map<string, ProductFreight>>(new Map());
  const [loadingFreight, setLoadingFreight] = useState<Set<string>>(new Set());
  
  // Configurações de frete
  const [shippingConfig, setShippingConfig] = useState({
    country: 'BR',
    currency: 'BRL',
    quantity: 1,
    autoCalculate: true
  });
  
  // Filtros de busca
  const [searchFilters, setSearchFilters] = useState({
    keywords: '',
    categoryId: '',
    sortBy: 'SALE_PRICE_ASC',
    freeShippingOnly: false,
    maxFreightCost: ''
  });

  // Categorias AliExpress
  const categories = [
    { id: '', name: 'Todas as Categorias' },
    { id: '1524', name: 'Telefones & Eletrônicos' },
    { id: '1511', name: 'Computadores & Escritório' },
    { id: '36', name: 'Eletrodomésticos' },
    { id: '1501', name: 'Jóias & Relógios' },
    { id: '1503', name: 'Casa & Jardim' },
    { id: '34', name: 'Bolsas & Sapatos' },
    { id: '1420', name: 'Brinquedos & Hobbies' },
    { id: '200003482', name: 'Esportes & Entretenimento' },
    { id: '26', name: 'Moda Feminina' },
    { id: '200000345', name: 'Moda Masculina' },
    { id: '39', name: 'Luzes & Iluminação' },
    { id: '66', name: 'Beleza & Saúde' },
  ];

  useEffect(() => {
    setMounted(true);
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/admin/suppliers');
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.suppliers || []);
        
        // Auto-selecionar AliExpress se existir
        const aliexpressSupplier = data.suppliers?.find((s: Supplier) => 
          s.name.toLowerCase().includes('aliexpress')
        );
        if (aliexpressSupplier) {
          setSelectedSupplier(aliexpressSupplier.id);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
    }
  };

  const calculateFreight = async (productId: string, selectedSkuId?: string) => {
    if (!shippingConfig.autoCalculate) return;

    // Marcar como carregando
    setLoadingFreight(prev => new Set(prev).add(productId));
    
    try {
      const response = await fetch('/api/admin/integrations/aliexpress/freight-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quantity: shippingConfig.quantity,
          selectedSkuId,
          shipToCountry: shippingConfig.country,
          currency: shippingConfig.currency
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFreightData(prev => new Map(prev).set(productId, {
            ...data.freight,
            loading: false
          }));
        } else {
          console.error('Erro no cálculo de frete:', data.error);
          setFreightData(prev => new Map(prev).set(productId, {
            options: [],
            cheapest: null,
            hasFreightInfo: false,
            loading: false
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao calcular frete:', error);
      setFreightData(prev => new Map(prev).set(productId, {
        options: [],
        cheapest: null,
        hasFreightInfo: false,
        loading: false
      }));
    } finally {
      setLoadingFreight(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const calculateAllFreights = async (productList: AliExpressProduct[]) => {
    if (!shippingConfig.autoCalculate) return;
    
    // Calcular frete para todos os produtos (com delay para evitar rate limiting)
    for (let i = 0; i < productList.length; i++) {
      const product = productList[i];
      await calculateFreight(product.product_id);
      
      // Delay de 500ms entre requests para evitar rate limiting
      if (i < productList.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const searchProducts = async () => {
    if (!searchFilters.keywords.trim()) {
      toast.error('Digite uma palavra-chave para buscar');
      return;
    }

    setLoading(true);
    setFreightData(new Map()); // Limpar dados de frete anteriores
    
    try {
      const response = await fetch('/api/admin/integrations/aliexpress/search-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: searchFilters.keywords,
          categoryId: searchFilters.categoryId,
          sortBy: searchFilters.sortBy
        })
      });

      if (!response.ok) {
        throw new Error('Erro na busca de produtos');
      }

      const data = await response.json();
      
      if (data.success && data.products) {
        setProducts(data.products);
        setSelectedProducts(new Set()); // Limpar seleção anterior
        toast.success(`${data.products.length} produtos encontrados`);
        
        // Calcular frete para todos os produtos se habilitado
        if (shippingConfig.autoCalculate) {
          toast.loading('Calculando fretes...', { id: 'freight-calc' });
          calculateAllFreights(data.products).then(() => {
            toast.success('Fretes calculados!', { id: 'freight-calc' });
          }).catch(() => {
            toast.error('Alguns fretes não puderam ser calculados', { id: 'freight-calc' });
          });
        }
      } else {
        toast.error(data.error || 'Nenhum produto encontrado');
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      toast.error('Erro ao buscar produtos');
    } finally {
      setLoading(false);
    }
  };

  const toggleProductSelection = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const selectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set()); // Deselecionar todos
    } else {
      setSelectedProducts(new Set(products.map(p => p.product_id))); // Selecionar todos
    }
  };

  const importSelectedProducts = async () => {
    if (selectedProducts.size === 0) {
      toast.error('Selecione pelo menos um produto para importar');
      return;
    }

    if (!selectedSupplier) {
      toast.error('Selecione um fornecedor');
      return;
    }

    setImporting(true);
    try {
      const selectedProductsList = products.filter(p => 
        selectedProducts.has(p.product_id)
      );

      const response = await fetch('/api/admin/integrations/aliexpress/import-selected-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: selectedSupplier,
          products: selectedProductsList
        })
      });

      if (!response.ok) {
        throw new Error('Erro na importação');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success(`${data.imported} produtos importados com sucesso!`);
        
        // Remover produtos importados da lista
        const remainingProducts = products.filter(p => 
          !selectedProducts.has(p.product_id)
        );
        setProducts(remainingProducts);
        setSelectedProducts(new Set());
      } else {
        toast.error(data.error || 'Erro na importação');
      }
    } catch (error) {
      console.error('Erro na importação:', error);
      toast.error('Erro ao importar produtos');
    } finally {
      setImporting(false);
    }
  };

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price || '0');
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numPrice * 1.5); // Aplicar margem de 50%
  };

  const formatOriginalPrice = (price: string) => {
    const numPrice = parseFloat(price || '0');
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numPrice * 1.8); // Preço "De:"
  };

  const formatFreightPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getTotalPrice = (product: AliExpressProduct) => {
    const productPrice = parseFloat(product.target_sale_price || '0') * 1.5;
    const freight = freightData.get(product.product_id);
    const freightCost = freight?.cheapest?.freightCost || 0;
    return productPrice + freightCost;
  };

  const getFilteredProducts = () => {
    let filtered = products;
    
    if (searchFilters.freeShippingOnly) {
      filtered = filtered.filter(product => {
        const freight = freightData.get(product.product_id);
        return freight?.cheapest?.freightCost === 0;
      });
    }
    
    if (searchFilters.maxFreightCost) {
      const maxFreight = parseFloat(searchFilters.maxFreightCost);
      filtered = filtered.filter(product => {
        const freight = freightData.get(product.product_id);
        return !freight?.cheapest || freight.cheapest.freightCost <= maxFreight;
      });
    }
    
    return filtered;
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/admin/integracao/aliexpress" 
                  className="flex items-center text-blue-600 hover:text-blue-800">
              <FiArrowLeft className="mr-2" />
              Voltar
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🛍️ Seleção de Produtos</h1>
              <p className="text-gray-600 mt-1">Busque e escolha produtos para importar</p>
            </div>
          </div>
        </div>

        {/* Filtros de Busca */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiFilter className="text-blue-600" />
            <h2 className="text-lg font-semibold">Filtros de Busca</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Keywords */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Palavra-chave *
              </label>
              <input
                type="text"
                value={searchFilters.keywords}
                onChange={(e) => setSearchFilters({...searchFilters, keywords: e.target.value})}
                placeholder="Ex: wireless headphones, smartphone..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && searchProducts()}
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria
              </label>
              <select
                value={searchFilters.categoryId}
                onChange={(e) => setSearchFilters({...searchFilters, categoryId: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Ordenação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ordenar por
              </label>
              <select
                value={searchFilters.sortBy}
                onChange={(e) => setSearchFilters({...searchFilters, sortBy: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="SALE_PRICE_ASC">Menor preço</option>
                <option value="SALE_PRICE_DESC">Maior preço</option>
                <option value="LAST_VOLUME_ASC">Mais vendidos</option>
                <option value="NEWEST">Mais recentes</option>
              </select>
            </div>
          </div>

          {/* Filtros de Frete */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <input
                  type="checkbox"
                  checked={searchFilters.freeShippingOnly}
                  onChange={(e) => setSearchFilters({...searchFilters, freeShippingOnly: e.target.checked})}
                  className="mr-2"
                />
                Apenas frete grátis
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frete máximo (R$)
              </label>
              <input
                type="number"
                value={searchFilters.maxFreightCost}
                onChange={(e) => setSearchFilters({...searchFilters, maxFreightCost: e.target.value})}
                placeholder="Ex: 50"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calcular frete auto
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={shippingConfig.autoCalculate}
                  onChange={(e) => setShippingConfig({...shippingConfig, autoCalculate: e.target.checked})}
                  className="mr-2"
                />
                <span className="text-sm">Sim</span>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                País destino
              </label>
              <select
                value={shippingConfig.country}
                onChange={(e) => setShippingConfig({...shippingConfig, country: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="BR">Brasil</option>
                <option value="US">Estados Unidos</option>
                <option value="ES">Espanha</option>
                <option value="FR">França</option>
                <option value="DE">Alemanha</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantidade
              </label>
              <input
                type="number"
                min="1"
                value={shippingConfig.quantity}
                onChange={(e) => setShippingConfig({...shippingConfig, quantity: parseInt(e.target.value) || 1})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={searchProducts}
              disabled={loading || !searchFilters.keywords.trim()}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FiSearch className="w-4 h-4" />
              {loading ? 'Buscando...' : 'Buscar Produtos'}
            </button>
          </div>
        </div>

        {/* Seleção de Fornecedor e Ações */}
        {products.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fornecedor *
                </label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione um fornecedor</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {getFilteredProducts().length} produtos • {selectedProducts.size} selecionados
                </span>
                
                <button
                  onClick={selectAll}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                  {selectedProducts.size === products.length ? (
                    <><FiCheckCircle className="w-4 h-4" /> Deselecionar Todos</>
                  ) : (
                    <><FiCircle className="w-4 h-4" /> Selecionar Todos</>
                  )}
                </button>

                <button
                  onClick={importSelectedProducts}
                  disabled={importing || selectedProducts.size === 0 || !selectedSupplier}
                  className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FiDownload className="w-4 h-4" />
                  {importing ? 'Importando...' : `Importar (${selectedProducts.size})`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de Produtos */}
        {products.length === 0 && !loading ? (
          <div className="text-center py-16">
            <FiSearch className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
            <p className="text-gray-500 mb-6">
              Use os filtros acima para buscar produtos do AliExpress
            </p>
            <div className="inline-flex items-center gap-2 text-sm text-blue-600">
              <FiFilter className="w-4 h-4" />
              Dica: Tente palavras-chave em inglês para melhores resultados
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {getFilteredProducts().map((product) => {
              const productFreight = freightData.get(product.product_id);
              const isLoadingFreight = loadingFreight.has(product.product_id);
              
              return (
                <div
                  key={product.product_id}
                  className={`bg-white rounded-lg shadow-sm border cursor-pointer transition-all duration-200 hover:shadow-md relative ${
                  selectedProducts.has(product.product_id)
                    ? 'border-blue-500 ring-2 ring-blue-200 transform scale-105'
                    : 'border-gray-200'
                }`}
                onClick={() => toggleProductSelection(product.product_id)}
              >
                {/* Checkbox */}
                <div className="absolute top-3 right-3 z-10">
                  {selectedProducts.has(product.product_id) ? (
                    <div className="bg-blue-600 rounded-full p-1">
                      <FiCheckCircle className="w-5 h-5 text-white" />
                    </div>
                  ) : (
                    <div className="bg-white border-2 border-gray-300 rounded-full p-1">
                      <FiCircle className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Imagem do Produto */}
                <div className="relative h-48 w-full">
                  <Image
                    src={product.product_main_image_url || '/placeholder-product.jpg'}
                    alt={product.product_title}
                    fill
                    className="object-contain p-4 rounded-t-lg"
                    unoptimized
                  />
                </div>

                {/* Informações do Produto */}
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-3 min-h-[2.5rem]">
                    {product.product_title}
                  </h3>

                  <div className="space-y-2">
                    {product.target_original_price && (
                      <p className="text-xs text-gray-500 line-through">
                        De: {formatOriginalPrice(product.target_original_price)}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-green-600">
                        {formatPrice(product.target_sale_price)}
                      </p>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        50% margem
                      </span>
                    </div>
                    
                    {/* Informações de Frete */}
                    <div className="space-y-1">
                      {isLoadingFreight ? (
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                          Calculando frete...
                        </div>
                      ) : productFreight?.hasFreightInfo ? (
                        <div className="space-y-1">
                          {productFreight.cheapest?.freightCost === 0 ? (
                            <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                              <FiTruck className="w-3 h-3" />
                              Frete GRÁTIS
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-orange-600">
                              <FiTruck className="w-3 h-3" />
                              Frete: {formatFreightPrice(productFreight.cheapest?.freightCost || 0)}
                            </div>
                          )}
                          
                          {productFreight.cheapest && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <FiClock className="w-3 h-3" />
                              {productFreight.cheapest.deliveryDayMin}-{productFreight.cheapest.deliveryDayMax} dias
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">
                              Total: {formatFreightPrice(getTotalPrice(product))}
                            </span>
                            <span className="text-blue-600 font-medium">
                              <FiDollarSign className="w-3 h-3 inline" />
                              {productFreight.options.length} opções
                            </span>
                          </div>
                        </div>
                      ) : shippingConfig.autoCalculate ? (
                        <div className="text-xs text-gray-400">
                          <FiTruck className="w-3 h-3 inline mr-1" />
                          Frete não disponível
                        </div>
                      ) : (
                        <div className="text-xs text-blue-600">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              calculateFreight(product.product_id);
                            }}
                            className="flex items-center gap-1 hover:underline"
                          >
                            <FiTruck className="w-3 h-3" />
                            Calcular frete
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      Custo: ${product.target_sale_price}
                    </p>
                  </div>

                  {/* Link para AliExpress */}
                  <div className="mt-4 pt-3 border-t">
                    <a
                      href={product.product_detail_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FiExternalLink className="w-3 h-3" />
                      Ver no AliExpress
                    </a>
                  </div>
                </div>

                {/* Overlay quando selecionado */}
                {selectedProducts.has(product.product_id) && (
                  <div className="absolute inset-0 bg-blue-600 bg-opacity-10 rounded-lg pointer-events-none">
                    <div className="absolute bottom-3 left-3 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                      ✓ Selecionado
                    </div>
                  </div>
                )}
              </div>
            );
            })}
          </div>
        )}

        {loading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
            <p className="text-lg font-medium text-gray-900">Buscando produtos...</p>
            <p className="text-sm text-gray-500 mt-1">Isso pode levar alguns segundos</p>
          </div>
        )}
      </div>
    </div>
  );
}
