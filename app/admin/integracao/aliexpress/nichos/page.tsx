'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Lista expandida de nichos
const NICHOS_PRODUTOS = [
  { id: 'electronics', nome: 'Eletrônicos', keywords: 'electronics gadgets' },
  { id: 'smartphones', nome: 'Smartphones', keywords: 'smartphone android iphone' },
  { id: 'tablets', nome: 'Tablets', keywords: 'tablet android ipad' },
  { id: 'laptops', nome: 'Notebooks', keywords: 'laptop notebook computer' },
  { id: 'headphones', nome: 'Fones de Ouvido', keywords: 'headphones earbuds wireless' },
  { id: 'speakers', nome: 'Caixas de Som', keywords: 'bluetooth speaker portable' },
  { id: 'smartwatch', nome: 'Smartwatches', keywords: 'smart watch fitness tracker' },
  { id: 'cameras', nome: 'Câmeras', keywords: 'camera digital photography' },
  { id: 'drones', nome: 'Drones', keywords: 'drone quadcopter aerial' },
  { id: 'gaming', nome: 'Games', keywords: 'gaming console controller gamer' },
  { id: 'fashion-women', nome: 'Moda Feminina', keywords: 'women fashion dress clothing' },
  { id: 'fashion-men', nome: 'Moda Masculina', keywords: 'men fashion shirt clothing' },
  { id: 'fashion-kids', nome: 'Moda Infantil', keywords: 'kids children clothing' },
  { id: 'lingerie', nome: 'Lingerie', keywords: 'lingerie underwear bra' },
  { id: 'swimwear', nome: 'Moda Praia', keywords: 'swimwear bikini beach' },
  { id: 'activewear', nome: 'Roupas Fitness', keywords: 'activewear gym workout' },
  { id: 'jewelry', nome: 'Joias', keywords: 'jewelry gold silver ring' },
  { id: 'watches', nome: 'Relógios', keywords: 'watches luxury analog' },
  { id: 'sunglasses', nome: 'Óculos de Sol', keywords: 'sunglasses polarized' },
  { id: 'handbags', nome: 'Bolsas', keywords: 'handbag purse bag women' },
  { id: 'backpacks', nome: 'Mochilas', keywords: 'backpack travel school' },
  { id: 'wallets', nome: 'Carteiras', keywords: 'wallet leather men women' },
  { id: 'shoes-women', nome: 'Calçados Femininos', keywords: 'women shoes heels sandals' },
  { id: 'shoes-men', nome: 'Calçados Masculinos', keywords: 'men shoes formal casual' },
  { id: 'sneakers', nome: 'Tênis', keywords: 'sneakers running sports shoes' },
  { id: 'boots', nome: 'Botas', keywords: 'boots ankle winter' },
  { id: 'home-decor', nome: 'Decoração Casa', keywords: 'home decor decoration' },
  { id: 'furniture', nome: 'Móveis', keywords: 'furniture chair table' },
  { id: 'lighting', nome: 'Iluminação', keywords: 'lighting lamp led' },
  { id: 'bedding', nome: 'Cama Mesa Banho', keywords: 'bedding sheets towel' },
  { id: 'kitchen', nome: 'Cozinha', keywords: 'kitchen gadgets cookware' },
  { id: 'storage', nome: 'Organização', keywords: 'storage organizer box' },
  { id: 'garden', nome: 'Jardim', keywords: 'garden outdoor plants tools' },
  { id: 'pet-supplies', nome: 'Pet Shop', keywords: 'pet dog cat supplies' },
  { id: 'baby', nome: 'Bebê', keywords: 'baby infant newborn' },
  { id: 'toys', nome: 'Brinquedos', keywords: 'toys kids children play' },
  { id: 'educational', nome: 'Educativos', keywords: 'educational learning kids' },
  { id: 'beauty', nome: 'Beleza', keywords: 'beauty makeup cosmetics' },
  { id: 'skincare', nome: 'Skincare', keywords: 'skincare face cream serum' },
  { id: 'haircare', nome: 'Cabelos', keywords: 'hair care shampoo treatment' },
  { id: 'nails', nome: 'Unhas', keywords: 'nail polish gel manicure' },
  { id: 'perfume', nome: 'Perfumaria', keywords: 'perfume fragrance cologne' },
  { id: 'health', nome: 'Saúde', keywords: 'health medical wellness' },
  { id: 'fitness', nome: 'Fitness', keywords: 'fitness gym equipment' },
  { id: 'yoga', nome: 'Yoga', keywords: 'yoga mat accessories' },
  { id: 'cycling', nome: 'Ciclismo', keywords: 'cycling bike bicycle' },
  { id: 'camping', nome: 'Camping', keywords: 'camping outdoor tent' },
  { id: 'fishing', nome: 'Pesca', keywords: 'fishing rod tackle' },
  { id: 'soccer', nome: 'Futebol', keywords: 'soccer football ball' },
  { id: 'basketball', nome: 'Basquete', keywords: 'basketball ball shoes' },
  { id: 'automotive', nome: 'Automotivo', keywords: 'car auto accessories' },
  { id: 'motorcycle', nome: 'Moto', keywords: 'motorcycle accessories helmet' },
  { id: 'tools', nome: 'Ferramentas', keywords: 'tools hardware diy' },
  { id: 'office', nome: 'Escritório', keywords: 'office supplies stationery' },
  { id: 'books', nome: 'Livros', keywords: 'books reading novel' },
  { id: 'art', nome: 'Arte e Artesanato', keywords: 'art craft painting' },
  { id: 'music', nome: 'Instrumentos', keywords: 'music instruments guitar' },
  { id: 'party', nome: 'Festas', keywords: 'party decoration celebration' },
  { id: 'wedding', nome: 'Casamento', keywords: 'wedding bride accessories' },
];

interface AliProduct {
  productId: string;
  title: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  rating?: number;
  orders?: number;
  shipping?: string;
  selected?: boolean;
  nicho?: string;
}

export default function NichosAliExpressPage() {
  const router = useRouter();
  const [selectedNichos, setSelectedNichos] = useState<string[]>([]);
  const [products, setProducts] = useState<AliProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualSearch, setManualSearch] = useState('');
  const [productLinks, setProductLinks] = useState('');
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Marcar como montado no cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  // Buscar fornecedor AliExpress ao carregar
  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        const response = await fetch('/api/admin/suppliers');
        const suppliers = await response.json();
        
        const aliexpressSupplier = suppliers.find((s: any) => 
          s.name.toLowerCase().includes('aliexpress')
        );
        
        if (aliexpressSupplier) {
          setSupplierId(aliexpressSupplier.id);
        } else {
          setMessage('⚠️ Fornecedor AliExpress não encontrado. Crie um fornecedor "AliExpress" primeiro.');
        }
      } catch (error) {
        console.error('Erro ao buscar fornecedores:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchSupplier();
  }, []);

  // Buscar produtos quando nichos são selecionados
  const buscarProdutos = async () => {
    if (selectedNichos.length === 0 && !manualSearch.trim()) {
      setMessage('⚠️ Selecione pelo menos um nicho ou digite uma busca');
      return;
    }

    setLoading(true);
    setProducts([]);
    setMessage('');

    try {
      const allProducts: AliProduct[] = [];

      // Se tem busca manual, usar ela primeiro
      if (manualSearch.trim()) {
        setMessage(`🔍 Buscando: "${manualSearch}"...`);

        const response = await fetch('/api/admin/integrations/aliexpress/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            keywords: manualSearch.trim(),
            limit: 100,
            exactMatch: true
          })
        });

        const data = await response.json();
        
        if (data.products && Array.isArray(data.products)) {
          allProducts.push(...data.products.map((p: any) => ({
            ...p,
            selected: false,
            nicho: 'Busca Manual'
          })));
        }
      }

      // Buscar por nichos selecionados
      for (const nichoId of selectedNichos) {
        const nicho = NICHOS_PRODUTOS.find(n => n.id === nichoId);
        if (!nicho) continue;

        setMessage(`🔍 Buscando: ${nicho.nome}...`);

        const response = await fetch('/api/admin/integrations/aliexpress/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            keywords: nicho.keywords,
            limit: 100
          })
        });

        const data = await response.json();
        
        if (data.products && Array.isArray(data.products)) {
          allProducts.push(...data.products.map((p: any) => ({
            ...p,
            selected: false,
            nicho: nicho.nome
          })));
        }

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Remover duplicatas por productId
      const uniqueProducts = allProducts.filter((product, index, self) =>
        index === self.findIndex((p) => p.productId === product.productId)
      );

      setProducts(uniqueProducts);
      setMessage(`✅ ${uniqueProducts.length} produtos encontrados`);
    } catch (error) {
      setMessage('❌ Erro ao buscar produtos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar produtos por Link/ID (MAIS PRECISO!)
  const buscarPorLinks = async () => {
    if (!productLinks.trim()) {
      setMessage('⚠️ Cole links ou IDs de produtos');
      return;
    }

    setLoadingLinks(true);
    setProducts([]);
    setMessage('🔍 Buscando produtos por ID...');

    try {
      // Extrair IDs dos links
      const lines = productLinks.split('\n').filter(l => l.trim());
      const productIds: string[] = [];

      for (const line of lines) {
        // Extrair ID do link ou usar diretamente
        const match = line.match(/item\/(\d+)\.html/) || line.match(/^(\d{10,})$/);
        if (match) {
          productIds.push(match[1]);
        }
      }

      if (productIds.length === 0) {
        setMessage('⚠️ Nenhum ID válido encontrado. Cole links como: https://www.aliexpress.com/item/1005006515868213.html');
        setLoadingLinks(false);
        return;
      }

      setMessage(`🔍 Buscando ${productIds.length} produtos...`);

      const allProducts: AliProduct[] = [];

      for (const productId of productIds) {
        try {
          const response = await fetch('/api/admin/integrations/aliexpress/test-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId })
          });

          const data = await response.json();
          
          if (data.found && data.data?.aliexpress_ds_product_get_response?.result) {
            const result = data.data.aliexpress_ds_product_get_response.result;
            const baseInfo = result.ae_item_base_info_dto;
            const skus = result.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o || [];
            const firstSku = Array.isArray(skus) ? skus[0] : skus;

            // Tentar diferentes formatos de imagem
            let imageUrl = '';
            
            // Formato 1: image_u_r_ls (string separada por ;)
            if (baseInfo?.image_u_r_ls) {
              const firstImg = baseInfo.image_u_r_ls.split(';')[0];
              imageUrl = firstImg.startsWith('http') ? firstImg : `https:${firstImg}`;
            }
            // Formato 2: imageUrls (string)
            else if (baseInfo?.imageUrls) {
              const firstImg = baseInfo.imageUrls.split(';')[0];
              imageUrl = firstImg.startsWith('http') ? firstImg : `https:${firstImg}`;
            }
            // Formato 3: ae_multimedia_info_dto (pode ter imagens)
            else if (result.ae_multimedia_info_dto?.image_urls) {
              const firstImg = result.ae_multimedia_info_dto.image_urls.split(';')[0];
              imageUrl = firstImg.startsWith('http') ? firstImg : `https:${firstImg}`;
            }
            // Formato 4: SKU image
            else if (firstSku?.sku_image) {
              imageUrl = firstSku.sku_image.startsWith('http') ? firstSku.sku_image : `https:${firstSku.sku_image}`;
            }
            
            console.log('📸 Imagem encontrada:', imageUrl);

            allProducts.push({
              productId: productId,
              title: baseInfo?.subject || 'Produto AliExpress',
              price: parseFloat(firstSku?.sku_price) || 0,
              originalPrice: parseFloat(firstSku?.sku_price) || 0,
              imageUrl: imageUrl,
              rating: undefined,
              orders: 0,
              selected: true, // Já seleciona automaticamente
              nicho: 'Importação Direta'
            });
          }

          // Rate limit
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error(`Erro ao buscar produto ${productId}:`, err);
        }
      }

      setProducts(allProducts);
      setMessage(`✅ ${allProducts.length} de ${productIds.length} produtos encontrados e selecionados!`);
    } catch (error) {
      setMessage('❌ Erro ao buscar produtos');
      console.error(error);
    } finally {
      setLoadingLinks(false);
    }
  };

  // Toggle seleção de produto
  const toggleProduct = (productId: string) => {
    setProducts(prev => 
      prev.map(p => 
        p.productId === productId 
          ? { ...p, selected: !p.selected }
          : p
      )
    );
  };

  // Selecionar todos
  const selectAll = () => {
    const allSelected = products.every(p => p.selected);
    setProducts(prev => prev.map(p => ({ ...p, selected: !allSelected })));
  };

  // Importar produtos selecionados
  const importarSelecionados = async () => {
    const selecionados = products.filter(p => p.selected);
    
    if (selecionados.length === 0) {
      setMessage('⚠️ Selecione pelo menos um produto');
      return;
    }

    if (!supplierId) {
      setMessage('⚠️ Fornecedor AliExpress não configurado');
      return;
    }

    setImporting(true);
    setMessage(`📦 Importando ${selecionados.length} produtos...`);

    try {
      const response = await fetch('/api/admin/integrations/aliexpress/import-selected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          products: selecionados,
          supplierId,
          active: false // Sempre desativados
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ ${data.imported} produtos importados (desativados)!`);
        // Remover produtos importados da lista
        setProducts(prev => prev.filter(p => !p.selected));
      } else {
        setMessage(`❌ Erro: ${data.error}`);
      }
    } catch (error) {
      setMessage('❌ Erro ao importar produtos');
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = products.filter(p => p.selected).length;

  // Filtrar produtos por busca
  const filteredProducts = products.filter(p => 
    searchQuery === '' || 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (initialLoading || !mounted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Importar Produtos AliExpress</h1>
            <p className="text-gray-600 mt-1">Selecione nichos, busque produtos e escolha quais importar</p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/admin/integracao/aliexpress/produto-detalhes"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
            >
              🔍 Analisar Produto (Ver Dados API)
            </a>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Voltar
            </button>
          </div>
        </div>

        {/* Seleção de Nichos */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">1️⃣ Importar Produtos</h2>
          
          {/* OPÇÃO 1: Importar por Link/ID (MAIS PRECISO) */}
          <div className="mb-4 p-4 bg-green-50 rounded-lg border-2 border-green-200">
            <label className="block text-sm font-medium text-green-800 mb-2">
              🎯 MÉTODO PRECISO: Cole Links ou IDs do AliExpress (um por linha)
            </label>
            <textarea
              value={productLinks}
              onChange={(e) => setProductLinks(e.target.value)}
              placeholder={`Cole aqui os links ou IDs dos produtos, um por linha:
https://www.aliexpress.com/item/1005006515868213.html
https://pt.aliexpress.com/item/1005009893493933.html
1005010180387001`}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 h-32 font-mono text-sm"
            />
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={buscarPorLinks}
                disabled={loadingLinks || !productLinks.trim()}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  loadingLinks || !productLinks.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {loadingLinks ? '⏳ Buscando...' : '✅ Buscar por Link/ID'}
              </button>
              <span className="text-xs text-green-700">
                💡 Copie links direto do site AliExpress para importação exata
              </span>
            </div>
          </div>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">OU busque por palavra-chave</span>
            </div>
          </div>
          
          {/* OPÇÃO 2: Campo de Busca Manual */}
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <label className="block text-sm font-medium text-blue-800 mb-2">
              🔍 Buscar por Palavra-chave (menos preciso)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                placeholder="Digite o produto que deseja buscar..."
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualSearch.trim()) {
                    buscarProdutos();
                  }
                }}
              />
              <button
                onClick={() => {
                  if (manualSearch.trim()) {
                    setSelectedNichos([]);
                    buscarProdutos();
                  }
                }}
                disabled={loading || !manualSearch.trim()}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  loading || !manualSearch.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                🔍 Buscar
              </button>
            </div>
          </div>
          
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">ou selecione nichos</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4 max-h-48 overflow-y-auto p-2 border rounded-lg">
            {NICHOS_PRODUTOS.map(nicho => (
              <button
                key={nicho.id}
                onClick={() => {
                  setSelectedNichos(prev => 
                    prev.includes(nicho.id) 
                      ? prev.filter(id => id !== nicho.id)
                      : [...prev, nicho.id]
                  );
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedNichos.includes(nicho.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {nicho.nome}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {selectedNichos.length} nicho(s) selecionado(s)
            </span>
            <button
              onClick={buscarProdutos}
              disabled={loading || selectedNichos.length === 0}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                loading || selectedNichos.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? '🔍 Buscando...' : '🔍 Buscar Produtos'}
            </button>
            {selectedNichos.length > 0 && (
              <button
                onClick={() => setSelectedNichos([])}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Limpar seleção
              </button>
            )}
          </div>
        </div>

        {/* Mensagem */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('✅') ? 'bg-green-50 text-green-800' :
            message.includes('❌') ? 'bg-red-50 text-red-800' :
            message.includes('⚠️') ? 'bg-yellow-50 text-yellow-800' :
            'bg-blue-50 text-blue-800'
          }`}>
            {message}
          </div>
        )}

        {/* Lista de Produtos */}
        {products.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                2️⃣ Selecione os Produtos ({products.length} encontrados)
              </h2>
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  placeholder="Filtrar produtos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 border rounded-lg text-sm w-64"
                />
                <button
                  onClick={selectAll}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {products.every(p => p.selected) ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-h-[600px] overflow-y-auto p-2">
              {filteredProducts.map(product => (
                <div
                  key={product.productId}
                  onClick={() => toggleProduct(product.productId)}
                  className={`relative border-2 rounded-lg p-3 cursor-pointer transition-all ${
                    product.selected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center ${
                    product.selected ? 'bg-blue-600 text-white' : 'bg-gray-200'
                  }`}>
                    {product.selected && '✓'}
                  </div>

                  {/* Imagem */}
                  <div className="aspect-square mb-2 overflow-hidden rounded-lg bg-gray-100">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.png';
                      }}
                    />
                  </div>

                  {/* Título */}
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 h-10">
                    {product.title}
                  </h3>

                  {/* Preço */}
                  <div className="mt-2">
                    <span className="text-lg font-bold text-green-600">
                      R$ {(product.price * 1.5).toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      (custo: ${product.price.toFixed(2)})
                    </span>
                  </div>

                  {/* Nicho */}
                  {product.nicho && (
                    <div className="mt-1 text-xs text-blue-600">
                      {product.nicho}
                    </div>
                  )}

                  {/* Rating e Pedidos */}
                  {(product.rating || product.orders) && (
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      {product.rating && <span>⭐ {product.rating}</span>}
                      {product.orders && <span>📦 {product.orders}+</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Barra de Ação */}
            {selectedCount > 0 && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-semibold text-blue-800">
                    {selectedCount} produto(s) selecionado(s)
                  </span>
                  <p className="text-sm text-blue-600">
                    Os produtos serão importados como DESATIVADOS
                  </p>
                </div>
                <button
                  onClick={importarSelecionados}
                  disabled={importing}
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                    importing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {importing ? '⏳ Importando...' : `✅ Importar ${selectedCount} Produtos`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">ℹ️ Informações</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Produtos são importados <strong>DESATIVADOS</strong> por padrão</li>
            <li>• Preços calculados com margem de 50%</li>
            <li>• Ative manualmente os produtos que deseja vender</li>
            <li>• Produtos duplicados não serão importados novamente</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
