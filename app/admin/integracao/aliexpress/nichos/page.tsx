'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiSearch, FiPackage, FiShoppingCart, FiCheck, FiX, 
  FiExternalLink, FiRefreshCw, FiChevronLeft, FiPlus,
  FiTrash2, FiStar, FiTruck, FiDollarSign, FiCopy,
  FiCheckSquare, FiSquare, FiDownload, FiLink,
  FiZap, FiPercent, FiFolder, FiEdit3, FiSettings, FiTag
} from 'react-icons/fi';

// Interface para categoria
interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  parent?: { id: string; name: string } | null;
  children?: Category[];
}

// Interface para configuração de importação
interface ImportConfig {
  product: AliProduct | null;
  categoryId: string;
  margin: number;
  comparePrice: number | null; // Preço riscado/de comparação
  title: string;
  description: string;
  isGeneratingDescription: boolean;
}

interface AliProduct {
  productId: string;
  title: string;
  price: number;
  maxPrice?: number; // Preço máximo das variações
  originalPrice?: number;
  imageUrl: string;
  rating?: number;
  orders?: number;
  shipping?: string;
  selected?: boolean;
  skus?: any[];
  status?: string;
  inStock?: boolean;
  // Novos campos para variações
  variations?: {
    type: string; // 'Cor', 'Tamanho', etc
    values: string[];
  }[];
  allImages?: string[];
  attributes?: { name: string; value: string }[];
}

export default function BuscaProdutosAliExpressPage() {
  const router = useRouter();
  
  // Estados
  const [searchType, setSearchType] = useState<'sku' | 'name' | 'link'>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<AliProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [supplierId, setSupplierId] = useState<string>('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  
  // Novos estados para configuração de importação
  const [categories, setCategories] = useState<Category[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [importConfig, setImportConfig] = useState<ImportConfig>({
    product: null,
    categoryId: '',
    margin: 50,
    comparePrice: null,
    title: '',
    description: '',
    isGeneratingDescription: false
  });

  // Buscar categorias ao carregar
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/admin/categories');
        const data = await response.json();
        setCategories(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Erro ao buscar categorias:', error);
      }
    };
    fetchCategories();
  }, []);

  // Buscar fornecedor AliExpress ao carregar
  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        const response = await fetch('/api/admin/suppliers');
        const data = await response.json();
        
        // A API retorna { suppliers: [...] }
        const suppliers = data.suppliers || data || [];
        
        const aliexpressSupplier = suppliers.find((s: any) => 
          s.name.toLowerCase().includes('aliexpress') || s.type === 'aliexpress'
        );
        
        if (aliexpressSupplier) {
          setSupplierId(aliexpressSupplier.id);
          console.log('Fornecedor AliExpress encontrado:', aliexpressSupplier.id);
        } else {
          toast.error('Fornecedor AliExpress não encontrado. Crie um primeiro.');
        }
      } catch (error) {
        console.error('Erro ao buscar fornecedores:', error);
        toast.error('Erro ao buscar fornecedores');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchSupplier();
  }, []);

  // Extrair IDs de produtos de links ou SKUs
  const extractProductIds = (input: string): string[] => {
    const lines = input.split(/[\n,]/).filter(l => l.trim());
    const ids: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Padrão 1: Link completo do AliExpress
      const linkMatch = trimmed.match(/item\/(\d+)\.html/);
      if (linkMatch) {
        ids.push(linkMatch[1]);
        continue;
      }
      // Padrão 2: ID numérico direto (10+ dígitos)
      const idMatch = trimmed.match(/^(\d{10,})$/);
      if (idMatch) {
        ids.push(idMatch[1]);
        continue;
      }
      // Padrão 3: ID dentro de texto
      const embeddedMatch = trimmed.match(/(\d{12,})/);
      if (embeddedMatch) {
        ids.push(embeddedMatch[1]);
      }
    }

    return [...new Set(ids)]; // Remove duplicatas
  };

  // Buscar produto por ID/SKU
  const searchByProductId = async (productId: string): Promise<AliProduct | null> => {
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
        const skuList = result.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o || [];
        const skus = Array.isArray(skuList) ? skuList : [skuList];
        const firstSku = skus[0];

        // Extrair imagem
        let imageUrl = '';
        if (result.ae_multimedia_info_dto?.image_urls) {
          const firstImg = result.ae_multimedia_info_dto.image_urls.split(';')[0];
          imageUrl = firstImg.startsWith('http') ? firstImg : `https:${firstImg}`;
        } else if (baseInfo?.image_u_r_ls) {
          const firstImg = baseInfo.image_u_r_ls.split(';')[0];
          imageUrl = firstImg.startsWith('http') ? firstImg : `https:${firstImg}`;
        } else if (firstSku?.sku_image) {
          imageUrl = firstSku.sku_image.startsWith('http') ? firstSku.sku_image : `https:${firstSku.sku_image}`;
        }

        // Encontrar o menor e maior preço entre todas as SKUs
        let minPrice = Infinity;
        let maxPrice = 0;
        let originalPrice = 0;
        
        // Taxa de câmbio USD -> BRL (aproximada)
        const USD_TO_BRL = 6.0;
        
        // Verificar a moeda retornada pela API
        const currencyCode = firstSku?.currency_code?.toUpperCase() || 'USD';
        const isAlreadyBRL = currencyCode === 'BRL';
        
        // Debug: ver todos os campos de preço
        console.log('🔍 Debug preços produto:', productId);
        console.log('   - Primeiro SKU:', {
          offer_sale_price: firstSku?.offer_sale_price,
          sku_price: firstSku?.sku_price,
          sku_bulk_order_price: firstSku?.sku_bulk_order_price,
          currency: firstSku?.currency_code,
        });
        console.log('   - Moeda detectada:', currencyCode, isAlreadyBRL ? '(já em BRL)' : '(precisa converter)');
        
        for (const sku of skus) {
          // offer_sale_price = preço com desconto (promocional)
          // sku_price = preço original sem desconto
          const salePrice = parseFloat(sku.offer_sale_price) || 0;
          const regularPrice = parseFloat(sku.sku_price) || 0;
          
          // Usar o preço promocional se disponível
          const effectivePrice = salePrice > 0 ? salePrice : regularPrice;
          
          if (effectivePrice > 0) {
            if (effectivePrice < minPrice) {
              minPrice = effectivePrice;
            }
            if (effectivePrice > maxPrice) {
              maxPrice = effectivePrice;
              originalPrice = regularPrice;
            }
          }
        }
        
        // Só converter para BRL se a moeda NÃO for BRL
        if (!isAlreadyBRL && minPrice > 0 && minPrice < 500) {
          console.log('   - Convertendo USD -> BRL (x', USD_TO_BRL, ')');
          minPrice = minPrice * USD_TO_BRL;
          maxPrice = maxPrice * USD_TO_BRL;
          originalPrice = originalPrice * USD_TO_BRL;
        }
        
        console.log('   - Preço mínimo (BRL):', minPrice.toFixed(2));
        console.log('   - Preço máximo (BRL):', maxPrice.toFixed(2));

        // Se não encontrou preço válido, usar o primeiro SKU
        if (minPrice === Infinity) {
          minPrice = parseFloat(firstSku?.offer_sale_price || firstSku?.sku_price) || 0;
          originalPrice = parseFloat(firstSku?.sku_price) || minPrice;
        }

        // Extrair TODAS as imagens
        let allImages: string[] = [];
        if (result.ae_multimedia_info_dto?.image_urls) {
          const imgs = result.ae_multimedia_info_dto.image_urls.split(';');
          allImages = imgs.map((img: string) => 
            img.startsWith('http') ? img : `https:${img}`
          ).filter((img: string) => img.length > 10);
        }
        
        // Adicionar imagens das variações
        for (const sku of skus) {
          if (sku.sku_image) {
            const skuImg = sku.sku_image.startsWith('http') ? sku.sku_image : `https:${sku.sku_image}`;
            if (!allImages.includes(skuImg)) {
              allImages.push(skuImg);
            }
          }
        }

        // Extrair variações (cores, tamanhos, etc)
        const variationsMap: { [key: string]: Set<string> } = {};
        
        for (const sku of skus) {
          if (sku.ae_sku_property_dtos?.ae_sku_property_d_t_o) {
            const props = sku.ae_sku_property_dtos.ae_sku_property_d_t_o;
            const propList = Array.isArray(props) ? props : [props];
            
            for (const prop of propList) {
              const propName = prop.sku_property_name || prop.property_value_definition_name || 'Opção';
              const propValue = prop.property_value_definition_name || prop.sku_property_value || '';
              
              if (!variationsMap[propName]) {
                variationsMap[propName] = new Set();
              }
              if (propValue) {
                variationsMap[propName].add(propValue);
              }
            }
          }
        }
        
        const variations = Object.entries(variationsMap).map(([type, valuesSet]) => ({
          type,
          values: Array.from(valuesSet)
        }));

        // Extrair atributos/características
        let attributes: { name: string; value: string }[] = [];
        if (result.ae_item_properties?.ae_item_property) {
          const props = result.ae_item_properties.ae_item_property;
          const propList = Array.isArray(props) ? props : [props];
          attributes = propList.map((prop: any) => ({
            name: prop.attr_name || prop.attr_name_id || '',
            value: prop.attr_value || prop.attr_value_id || '',
          })).filter((a: any) => a.name && a.value);
        }

        return {
          productId: productId,
          title: baseInfo?.subject || 'Produto AliExpress',
          price: minPrice,
          maxPrice: maxPrice > minPrice ? maxPrice : undefined, // Só inclui se for diferente
          originalPrice: originalPrice,
          imageUrl: imageUrl,
          status: baseInfo?.product_status_type,
          inStock: skus.some((s: any) => s.sku_available_stock > 0 || s.sku_stock),
          skus: skus.map((sku: any) => ({
            skuId: sku.sku_id,
            skuAttr: sku.sku_attr,
            price: parseFloat(sku.offer_sale_price) || parseFloat(sku.sku_price) || 0,
            stock: sku.sku_available_stock || (sku.sku_stock ? 999 : 0),
            image: sku.sku_image ? (sku.sku_image.startsWith('http') ? sku.sku_image : `https:${sku.sku_image}`) : null,
          })),
          variations,
          allImages,
          attributes,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar produto:', productId, error);
      return null;
    }
  };

  // Buscar produtos por nome
  const searchByName = async (query: string): Promise<AliProduct[]> => {
    try {
      const response = await fetch('/api/admin/integrations/aliexpress/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          keywords: query,
          limit: 50,
          exactMatch: false
        })
      });

      const data = await response.json();
      
      if (data.products && Array.isArray(data.products)) {
        return data.products.map((p: any) => ({
          productId: p.productId,
          title: p.title,
          price: p.price,
          originalPrice: p.originalPrice,
          imageUrl: p.imageUrl,
          rating: p.rating,
          orders: p.orders,
          shipping: p.shipping,
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Erro na busca:', error);
      return [];
    }
  };

  // Executar busca
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Digite algo para buscar');
      return;
    }

    setLoading(true);
    setProducts([]);
    setSelectedProducts(new Set());

    try {
      if (searchType === 'sku' || searchType === 'link') {
        // Buscar por ID/Link
        const productIds = extractProductIds(searchQuery);
        
        if (productIds.length === 0) {
          toast.error('Nenhum ID de produto válido encontrado');
          setLoading(false);
          return;
        }

        toast.loading(`Buscando ${productIds.length} produto(s)...`, { id: 'search' });
        
        const foundProducts: AliProduct[] = [];
        
        for (const id of productIds) {
          const product = await searchByProductId(id);
          if (product) {
            foundProducts.push(product);
          }
          // Rate limit
          if (productIds.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        setProducts(foundProducts);
        toast.success(`${foundProducts.length} de ${productIds.length} produtos encontrados`, { id: 'search' });
        
        if (foundProducts.length < productIds.length) {
          toast(`${productIds.length - foundProducts.length} produto(s) não encontrados na lista DS`, { icon: '⚠️' });
        }
      } else {
        // Buscar por nome
        toast.loading('Buscando produtos...', { id: 'search' });
        const results = await searchByName(searchQuery);
        setProducts(results);
        toast.success(`${results.length} produtos encontrados`, { id: 'search' });
      }
    } catch (error) {
      toast.error('Erro na busca', { id: 'search' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle seleção de produto
  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  // Selecionar todos
  const selectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.productId)));
    }
  };

  // ====== NOVAS FUNÇÕES: Modal de Configuração ======
  
  // Abrir modal de configuração para um produto
  const openConfigModal = (product: AliProduct) => {
    // Calcula preço de venda sugerido com margem padrão
    const suggestedPrice = product.price * (1 + 50 / 100);
    // Preço riscado sugerido (20% acima do preço de venda)
    const suggestedComparePrice = suggestedPrice * 1.2;
    
    setImportConfig({
      product,
      categoryId: '',
      margin: 50,
      comparePrice: Math.ceil(suggestedComparePrice * 100) / 100, // Arredonda para cima
      title: product.title,
      description: '',
      isGeneratingDescription: false
    });
    setShowConfigModal(true);
  };

  // Gerar descrição com IA
  const generateAIDescription = async () => {
    if (!importConfig.product) return;
    
    setImportConfig(prev => ({ ...prev, isGeneratingDescription: true }));
    
    try {
      const response = await fetch('/api/admin/ai/improve-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: importConfig.title,
          description: '',
          action: 'generate'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar descrição');
      }
      
      setImportConfig(prev => ({
        ...prev,
        description: data.description,
        isGeneratingDescription: false
      }));
      
      toast.success('Descrição gerada com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar descrição');
      setImportConfig(prev => ({ ...prev, isGeneratingDescription: false }));
    }
  };

  // Traduzir título com IA
  const translateTitle = async () => {
    if (!importConfig.product) return;
    
    // Verifica se parece estar em inglês
    const hasEnglishWords = /\b(with|for|and|the|new|free|shipping|portable|wireless)\b/i.test(importConfig.title);
    if (!hasEnglishWords) {
      toast('O título já parece estar em português', { icon: 'ℹ️' });
      return;
    }
    
    setImportConfig(prev => ({ ...prev, isGeneratingDescription: true }));
    
    try {
      const response = await fetch('/api/admin/ai/improve-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: '',
          description: importConfig.title,
          action: 'translate'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao traduzir');
      }
      
      setImportConfig(prev => ({
        ...prev,
        title: data.description,
        isGeneratingDescription: false
      }));
      
      toast.success('Título traduzido!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao traduzir');
      setImportConfig(prev => ({ ...prev, isGeneratingDescription: false }));
    }
  };

  // Importar produto com configuração personalizada
  const importWithConfig = async () => {
    if (!importConfig.product || !importConfig.categoryId) {
      toast.error('Selecione uma categoria');
      return;
    }
    
    if (!supplierId) {
      toast.error('Fornecedor AliExpress não configurado');
      return;
    }
    
    setImporting(true);
    toast.loading('Importando produto...', { id: 'import' });
    
    try {
      const product = importConfig.product;
      
      // Buscar detalhes completos do produto
      const detailsRes = await fetch('/api/admin/integrations/aliexpress/test-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.productId })
      });
      
      const detailsData = await detailsRes.json();
      
      let allImages: string[] = [];
      let variations: any[] = [];
      let costPrice = product.price;
      let mainAttributes: any[] = [];
      let brand = '';
      let variationOptions: { type: string; values: string[] }[] = [];
      
      // Dados do fornecedor
      let supplierStoreId = '';
      let supplierStoreName = '';
      let supplierCountryCode = '';
      let shipFromCountry = '';
      let deliveryDays: number | null = null;
      let gtin = '';
      let weightWithPackage: number | null = null;
      let lengthWithPackage: number | null = null;
      let widthWithPackage: number | null = null;
      let heightWithPackage: number | null = null;
      let supplierStock: number | null = null;
      
      if (detailsData.found && detailsData.data?.aliexpress_ds_product_get_response?.result) {
        const result = detailsData.data.aliexpress_ds_product_get_response.result;
        const baseInfo = result.ae_item_base_info_dto;
        const skuList = result.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o || [];
        const skus = Array.isArray(skuList) ? skuList : [skuList];
        
        // Dados do fornecedor
        const storeInfo = result.ae_store_info;
        if (storeInfo) {
          supplierStoreId = storeInfo.store_id?.toString() || '';
          supplierStoreName = storeInfo.store_name || '';
          supplierCountryCode = storeInfo.store_country_code || '';
        }
        
        // Dados de logística
        const logisticsInfo = result.logistics_info_dto;
        if (logisticsInfo) {
          shipFromCountry = supplierCountryCode || 'CN';
          deliveryDays = logisticsInfo.delivery_time || null;
        }
        
        // Dados do pacote
        const packageInfo = result.package_info_dto;
        if (packageInfo) {
          weightWithPackage = parseFloat(packageInfo.gross_weight) || null;
          lengthWithPackage = packageInfo.package_length > 1 ? packageInfo.package_length : null;
          widthWithPackage = packageInfo.package_width > 1 ? packageInfo.package_width : null;
          heightWithPackage = packageInfo.package_height > 1 ? packageInfo.package_height : null;
        }
        
        // GTIN e estoque
        if (skus.length > 0) {
          gtin = skus[0].ean_code || '';
          supplierStock = skus[0].sku_available_stock || null;
        }
        
        // Imagens
        if (result.ae_multimedia_info_dto?.image_urls) {
          const imgs = result.ae_multimedia_info_dto.image_urls.split(';');
          allImages = imgs.map((img: string) => 
            img.startsWith('http') ? img : `https:${img}`
          ).filter((img: string) => img.length > 10);
        }
        
        // Atributos importantes
        if (result.ae_item_properties?.ae_item_property) {
          const props = result.ae_item_properties.ae_item_property;
          const allAttrs = (Array.isArray(props) ? props : [props]).map((prop: any) => ({
            name: prop.attr_name || prop.attr_name_id || '',
            value: prop.attr_value || prop.attr_value_id || '',
          })).filter((a: any) => a.name && a.value);
          
          const importantKeys = ['marca', 'brand', 'material', 'tamanho', 'size', 'cor', 'color', 
                                 'modelo', 'model', 'capacidade', 'capacity', 'tela', 'screen',
                                 'memória', 'memory', 'bateria', 'battery', 'resolução', 'resolution'];
          
          mainAttributes = allAttrs.filter((a: any) => 
            importantKeys.some(key => a.name.toLowerCase().includes(key))
          ).slice(0, 8);
          
          const brandAttr = allAttrs.find((a: any) => 
            a.name.toLowerCase().includes('marca') || a.name.toLowerCase().includes('brand')
          );
          if (brandAttr) brand = brandAttr.value;
        }
        
        // Variações
        const variationsMap: { [key: string]: { id: string; name: string; options: Map<string, { id: string; value: string; image?: string }> } } = {};
        for (const sku of skus) {
          if (sku.ae_sku_property_dtos?.ae_sku_property_d_t_o) {
            const props = sku.ae_sku_property_dtos.ae_sku_property_d_t_o;
            const propList = Array.isArray(props) ? props : [props];
            for (const prop of propList) {
              const propId = String(prop.sku_property_id || '');
              const propName = prop.sku_property_name || 'Opção';
              const optionId = String(prop.property_value_id || prop.property_value_id_long || '');
              const optionValue = prop.property_value_definition_name || prop.sku_property_value || '';
              const optionImage = prop.sku_image || sku.sku_image;
              
              if (!variationsMap[propName]) {
                variationsMap[propName] = { id: propId, name: propName, options: new Map() };
              }
              if (optionValue && !variationsMap[propName].options.has(optionId)) {
                variationsMap[propName].options.set(optionId, { 
                  id: optionId, 
                  value: optionValue,
                  image: optionImage ? (optionImage.startsWith('http') ? optionImage : `https:${optionImage}`) : undefined
                });
              }
            }
          }
        }
        variationOptions = Object.entries(variationsMap).map(([type, data]) => ({
          type, 
          id: data.id,
          values: Array.from(data.options.values()).map(o => o.value),
          optionsWithIds: Array.from(data.options.values())
        }));
        
        // SKUs
        if (skus.length > 0) {
          variations = skus.map((sku: any) => {
            const skuProperties: any[] = [];
            let skuImage = sku.sku_image ? (sku.sku_image.startsWith('http') ? sku.sku_image : `https:${sku.sku_image}`) : null;
            
            if (sku.ae_sku_property_dtos?.ae_sku_property_d_t_o) {
              const props = sku.ae_sku_property_dtos.ae_sku_property_d_t_o;
              const propList = Array.isArray(props) ? props : [props];
              for (const prop of propList) {
                skuProperties.push({
                  propertyId: String(prop.sku_property_id || ''),
                  propertyName: prop.sku_property_name || '',
                  optionId: String(prop.property_value_id || prop.property_value_id_long || ''),
                  optionValue: prop.sku_property_value || '',
                  optionLabel: prop.property_value_definition_name || prop.sku_property_value || ''
                });
                
                if (!skuImage && prop.sku_image) {
                  skuImage = prop.sku_image.startsWith('http') ? prop.sku_image : `https:${prop.sku_image}`;
                }
              }
            }
            
            return {
              skuId: sku.sku_id,
              skuAttr: sku.sku_attr,
              price: parseFloat(sku.offer_sale_price || sku.sku_price) || 0,
              originalPrice: parseFloat(sku.sku_price) || 0,
              stock: sku.sku_available_stock || (sku.sku_stock ? 999 : 0),
              image: skuImage,
              properties: skuProperties
            };
          });
          
          variations.forEach((v: any) => {
            if (v.image && !allImages.includes(v.image)) {
              allImages.push(v.image);
            }
          });
          
          costPrice = variations[0]?.price || product.price;
        }
      }
      
      // Se não tem imagens, usar a do produto
      if (allImages.length === 0 && product.imageUrl) {
        allImages = [product.imageUrl];
      }
      
      // Calcular preço de venda com margem configurada
      const margin = importConfig.margin;
      const salePrice = Math.round(costPrice * (1 + margin / 100) * 100) / 100;
      
      // Gerar slug
      const slug = importConfig.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 100) + '-' + product.productId.slice(-6);
      
      // Verificar se produto já existe
      const checkResponse = await fetch(`/api/admin/products/check-sku?sku=${product.productId}`);
      const checkData = await checkResponse.json();
      
      if (checkData.exists) {
        toast.error('Produto já importado!', { id: 'import' });
        setImporting(false);
        return;
      }
      
      // Criar descrição
      let finalDescription = importConfig.description;
      if (!finalDescription) {
        // Descrição padrão se não foi gerada pela IA
        finalDescription = `<h2>${importConfig.title}</h2>\n`;
        if (mainAttributes.length > 0) {
          finalDescription += '<h3>📋 Especificações</h3><ul>';
          mainAttributes.forEach((attr: any) => {
            finalDescription += `<li><strong>${attr.name}:</strong> ${attr.value}</li>`;
          });
          finalDescription += '</ul>';
        }
        finalDescription += `
<h3>📦 Informações de Entrega</h3>
<ul>
  <li>Prazo de envio: 2-5 dias úteis</li>
  <li>Prazo de entrega: 15-40 dias úteis</li>
  <li>Código de rastreamento fornecido</li>
</ul>
<h3>✅ Garantia</h3>
<p>Produto com garantia de 30 dias contra defeitos de fabricação.</p>`;
      }
      
      // Criar produto
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: importConfig.title,
          slug: slug,
          description: finalDescription,
          price: salePrice,
          comparePrice: importConfig.comparePrice || undefined, // Preço riscado
          costPrice: costPrice,
          stock: supplierStock || 999,
          images: allImages,
          categoryId: importConfig.categoryId,
          supplierId: supplierId,
          supplierSku: product.productId,
          supplierUrl: `https://www.aliexpress.com/item/${product.productId}.html`,
          availableForDropship: true,
          active: false,
          brand: brand || undefined,
          supplierStoreId: supplierStoreId || undefined,
          supplierStoreName: supplierStoreName || undefined,
          supplierCountryCode: supplierCountryCode || undefined,
          shipFromCountry: shipFromCountry || undefined,
          deliveryDays: deliveryDays || undefined,
          gtin: gtin || undefined,
          supplierStock: supplierStock || undefined,
          weightWithPackage: weightWithPackage || undefined,
          lengthWithPackage: lengthWithPackage || undefined,
          widthWithPackage: widthWithPackage || undefined,
          heightWithPackage: heightWithPackage || undefined,
          variants: variations.length > 0 ? JSON.stringify({
            version: '1.0',
            source: 'aliexpress',
            sourceProductId: product.productId,
            lastUpdated: new Date().toISOString(),
            properties: variationOptions.map((opt: any) => {
              const nameLower = opt.type.toLowerCase();
              let propType = 'other';
              if (nameLower.includes('cor') || nameLower.includes('color')) propType = 'color';
              else if (nameLower.includes('tamanho') || nameLower.includes('size')) propType = 'size';
              else if (nameLower.includes('memória') || nameLower.includes('memory') || nameLower.includes('storage')) propType = 'storage';
              else if (nameLower.includes('voltagem') || nameLower.includes('voltage') || nameLower.includes('plug')) propType = 'voltage';
              
              return {
                id: opt.id || String(variationOptions.indexOf(opt) + 1),
                name: opt.type.toLowerCase(),
                type: propType,
                options: (opt.optionsWithIds || []).map((o: any) => ({
                  id: o.id,
                  value: o.value,
                  label: o.value,
                  image: o.image || null
                }))
              };
            }),
            skus: variations.map(v => ({
              skuId: v.skuId,
              skuAttr: v.skuAttr,
              price: v.price,
              originalPrice: v.originalPrice,
              stock: v.stock,
              available: v.stock > 0,
              image: v.image,
              properties: v.properties || []
            })),
            metadata: {
              currency: 'BRL',
              minPrice: Math.min(...variations.map(v => v.price)),
              maxPrice: Math.max(...variations.map(v => v.price)),
              totalStock: variations.reduce((sum, v) => sum + v.stock, 0),
              hasImages: variations.some(v => v.image)
            }
          }) : undefined,
          selectedSkus: variations.length > 0 ? variations.map(v => ({
            skuId: v.skuId,
            enabled: true,
            customPrice: Math.round(v.price * (1 + margin / 100) * 100) / 100,
            margin: margin,
            costPrice: v.price
          })) : undefined,
        })
      });
      
      if (response.ok) {
        toast.success('Produto importado com sucesso!', { id: 'import' });
        setShowConfigModal(false);
        setImportConfig({
          product: null,
          categoryId: '',
          margin: 50,
          comparePrice: null,
          title: '',
          description: '',
          isGeneratingDescription: false
        });
        // Remover produto da lista
        setProducts(prev => prev.filter(p => p.productId !== product.productId));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao importar');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao importar produto', { id: 'import' });
    } finally {
      setImporting(false);
    }
  };

  // Importar produtos selecionados (com todas as fotos e características)
  const importProducts = async () => {
    if (selectedProducts.size === 0) {
      toast.error('Selecione pelo menos um produto');
      return;
    }

    if (!supplierId) {
      toast.error('Fornecedor AliExpress não configurado');
      return;
    }

    setImporting(true);
    toast.loading(`Importando ${selectedProducts.size} produto(s) com detalhes completos...`, { id: 'import' });

    try {
      // Buscar ou criar categoria "Importados"
      let categoryId = '';
      try {
        const catRes = await fetch('/api/admin/categories');
        const categories = await catRes.json();
        const importadosCat = categories.find((c: any) => c.slug === 'importados');
        
        if (importadosCat) {
          categoryId = importadosCat.id;
        } else {
          // Criar categoria
          const createCatRes = await fetch('/api/admin/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Importados',
              slug: 'importados',
              description: 'Produtos importados internacionais'
            })
          });
          const newCat = await createCatRes.json();
          categoryId = newCat.id;
        }
      } catch (error) {
        console.error('Erro ao buscar/criar categoria:', error);
        toast.error('Erro ao preparar categoria');
        setImporting(false);
        return;
      }

      const productsToImport = products.filter(p => selectedProducts.has(p.productId));
      let success = 0;
      let errors = 0;

      for (const product of productsToImport) {
        try {
          // Buscar detalhes completos do produto
          toast.loading(`Buscando detalhes: ${product.productId}...`, { id: 'import' });
          
          const detailsRes = await fetch('/api/admin/integrations/aliexpress/test-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: product.productId })
          });

          const detailsData = await detailsRes.json();
          
          let allImages: string[] = [];
          let htmlDescription = '';
          let variations: any[] = [];
          let costPrice = product.price;
          let title = product.title;
          let mainAttributes: any[] = []; // Atributos principais (poucos, importantes)
          let brand = '';
          let variationOptions: { type: string; values: string[] }[] = [];
          
          // Novos campos para salvar dados completos da API
          let supplierStoreId = '';
          let supplierStoreName = '';
          let supplierCountryCode = '';
          let shipFromCountry = '';
          let deliveryDays: number | null = null;
          let gtin = '';
          let weightWithPackage: number | null = null;
          let lengthWithPackage: number | null = null;
          let widthWithPackage: number | null = null;
          let heightWithPackage: number | null = null;
          let supplierStock: number | null = null;

          if (detailsData.found && detailsData.data?.aliexpress_ds_product_get_response?.result) {
            const result = detailsData.data.aliexpress_ds_product_get_response.result;
            const baseInfo = result.ae_item_base_info_dto;
            const skuList = result.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o || [];
            const skus = Array.isArray(skuList) ? skuList : [skuList];
            
            // ========== EXTRAIR DADOS DO FORNECEDOR ==========
            const storeInfo = result.ae_store_info;
            if (storeInfo) {
              supplierStoreId = storeInfo.store_id?.toString() || '';
              supplierStoreName = storeInfo.store_name || '';
              supplierCountryCode = storeInfo.store_country_code || '';
            }
            
            // ========== EXTRAIR DADOS DE LOGÍSTICA ==========
            const logisticsInfo = result.logistics_info_dto;
            if (logisticsInfo) {
              // ATENÇÃO: ship_to_country é o DESTINO, não a origem!
              // A origem do envio é o país da loja (store_country_code)
              shipFromCountry = supplierCountryCode || 'CN'; // País da loja = origem
              deliveryDays = logisticsInfo.delivery_time || null;
            }
            
            // ========== EXTRAIR DADOS DO PACOTE ==========
            const packageInfo = result.package_info_dto;
            if (packageInfo) {
              weightWithPackage = parseFloat(packageInfo.gross_weight) || null;
              // API retorna 1 quando não tem dimensões reais, ignorar nesses casos
              lengthWithPackage = packageInfo.package_length > 1 ? packageInfo.package_length : null;
              widthWithPackage = packageInfo.package_width > 1 ? packageInfo.package_width : null;
              heightWithPackage = packageInfo.package_height > 1 ? packageInfo.package_height : null;
            }
            
            // ========== EXTRAIR GTIN/EAN E ESTOQUE DO PRIMEIRO SKU ==========
            if (skus.length > 0) {
              gtin = skus[0].ean_code || '';
              supplierStock = skus[0].sku_available_stock || null;
            }

            // Título limpo
            title = baseInfo?.subject || product.title;

            // Extrair TODAS as imagens
            if (result.ae_multimedia_info_dto?.image_urls) {
              const imgs = result.ae_multimedia_info_dto.image_urls.split(';');
              allImages = imgs.map((img: string) => 
                img.startsWith('http') ? img : `https:${img}`
              ).filter((img: string) => img.length > 10);
            }

            // Descrição HTML (não usar os atributos como descrição)
            if (baseInfo?.detail) {
              htmlDescription = baseInfo.detail;
            } else if (baseInfo?.mobile_detail) {
              htmlDescription = baseInfo.mobile_detail;
            }

            // Filtrar apenas atributos IMPORTANTES (não todos)
            if (result.ae_item_properties?.ae_item_property) {
              const props = result.ae_item_properties.ae_item_property;
              const allAttrs = (Array.isArray(props) ? props : [props]).map((prop: any) => ({
                name: prop.attr_name || prop.attr_name_id || '',
                value: prop.attr_value || prop.attr_value_id || '',
              })).filter((a: any) => a.name && a.value);
              
              // Atributos importantes para mostrar
              const importantKeys = ['marca', 'brand', 'material', 'tamanho', 'size', 'cor', 'color', 
                                     'modelo', 'model', 'capacidade', 'capacity', 'tela', 'screen',
                                     'memória', 'memory', 'bateria', 'battery', 'resolução', 'resolution'];
              
              mainAttributes = allAttrs.filter((a: any) => 
                importantKeys.some(key => a.name.toLowerCase().includes(key))
              ).slice(0, 8); // Máximo 8 atributos
              
              // Extrair marca
              const brandAttr = allAttrs.find((a: any) => 
                a.name.toLowerCase().includes('marca') || a.name.toLowerCase().includes('brand')
              );
              if (brandAttr) brand = brandAttr.value;
            }

            // Extrair variações (cores, tamanhos) com IDs originais
            const variationsMap: { [key: string]: { id: string; name: string; options: Map<string, { id: string; value: string; image?: string }> } } = {};
            for (const sku of skus) {
              if (sku.ae_sku_property_dtos?.ae_sku_property_d_t_o) {
                const props = sku.ae_sku_property_dtos.ae_sku_property_d_t_o;
                const propList = Array.isArray(props) ? props : [props];
                for (const prop of propList) {
                  const propId = String(prop.sku_property_id || '');
                  const propName = prop.sku_property_name || 'Opção';
                  const optionId = String(prop.property_value_id || prop.property_value_id_long || '');
                  const optionValue = prop.property_value_definition_name || prop.sku_property_value || '';
                  const optionImage = prop.sku_image || sku.sku_image;
                  
                  if (!variationsMap[propName]) {
                    variationsMap[propName] = { id: propId, name: propName, options: new Map() };
                  }
                  if (optionValue && !variationsMap[propName].options.has(optionId)) {
                    variationsMap[propName].options.set(optionId, { 
                      id: optionId, 
                      value: optionValue,
                      image: optionImage ? (optionImage.startsWith('http') ? optionImage : `https:${optionImage}`) : undefined
                    });
                  }
                }
              }
            }
            variationOptions = Object.entries(variationsMap).map(([type, data]) => ({
              type, 
              id: data.id,
              values: Array.from(data.options.values()).map(o => o.value),
              optionsWithIds: Array.from(data.options.values())
            }));

            // Variações/SKUs
            if (skus.length > 0) {
              variations = skus.map((sku: any) => {
                // Parsear properties do sku_attr ou ae_sku_property_dtos
                const skuProperties: any[] = [];
                let skuImage = sku.sku_image ? (sku.sku_image.startsWith('http') ? sku.sku_image : `https:${sku.sku_image}`) : null;
                
                if (sku.ae_sku_property_dtos?.ae_sku_property_d_t_o) {
                  const props = sku.ae_sku_property_dtos.ae_sku_property_d_t_o;
                  const propList = Array.isArray(props) ? props : [props];
                  for (const prop of propList) {
                    skuProperties.push({
                      propertyId: String(prop.sku_property_id || ''),
                      propertyName: prop.sku_property_name || '',
                      optionId: String(prop.property_value_id || prop.property_value_id_long || ''),
                      optionValue: prop.sku_property_value || '',
                      optionLabel: prop.property_value_definition_name || prop.sku_property_value || ''
                    });
                    
                    // Se SKU não tem imagem, buscar da propriedade (ex: cor)
                    if (!skuImage && prop.sku_image) {
                      skuImage = prop.sku_image.startsWith('http') ? prop.sku_image : `https:${prop.sku_image}`;
                    }
                  }
                }

                return {
                  skuId: sku.sku_id,
                  skuAttr: sku.sku_attr,
                  price: parseFloat(sku.offer_sale_price || sku.sku_price) || 0,
                  originalPrice: parseFloat(sku.sku_price) || 0,
                  stock: sku.sku_available_stock || (sku.sku_stock ? 999 : 0),
                  image: skuImage,
                  properties: skuProperties
                };
              });

              // Adicionar imagens das variações
              variations.forEach((v: any) => {
                if (v.image && !allImages.includes(v.image)) {
                  allImages.push(v.image);
                }
              });

              // Usar preço da primeira variação
              costPrice = variations[0]?.price || product.price;
            }
          }

          // Se não conseguiu imagens da API, usar a do produto
          if (allImages.length === 0 && product.imageUrl) {
            allImages = [product.imageUrl];
          }

          // Calcular preço de venda (markup de 2x)
          const salePrice = costPrice * 2;

          // Gerar slug a partir do título
          const slug = title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 100) + '-' + product.productId.slice(-6);

          // Criar descrição LIMPA e organizada
          let descriptionParts: string[] = [];
          
          // 1. Título como destaque
          descriptionParts.push(`<h2>${title}</h2>`);
          
          // 2. Especificações principais (apenas as importantes)
          if (mainAttributes.length > 0) {
            descriptionParts.push('<h3>📋 Especificações</h3>');
            descriptionParts.push('<ul>');
            mainAttributes.forEach((attr: any) => {
              descriptionParts.push(`<li><strong>${attr.name}:</strong> ${attr.value}</li>`);
            });
            descriptionParts.push('</ul>');
          }
          
          // 3. Variações disponíveis
          if (variationOptions.length > 0) {
            descriptionParts.push('<h3>🎨 Opções Disponíveis</h3>');
            variationOptions.forEach((v: any) => {
              descriptionParts.push(`<p><strong>${v.type}:</strong> ${v.values.join(', ')}</p>`);
            });
          }
          
          // 4. Informações de entrega
          descriptionParts.push(`
<h3>📦 Informações de Entrega</h3>
<ul>
  <li>Prazo de envio: 2-5 dias úteis</li>
  <li>Prazo de entrega: 15-40 dias úteis</li>
  <li>Código de rastreamento fornecido</li>
</ul>
          `);
          
          // 5. Garantia
          descriptionParts.push(`
<h3>✅ Garantia</h3>
<p>Produto com garantia de 30 dias contra defeitos de fabricação.</p>
          `);
          
          const fullDescription = descriptionParts.join('\n');

          // ========== VERIFICAR SE PRODUTO JÁ EXISTE ==========
          const checkResponse = await fetch(`/api/admin/products/check-sku?sku=${product.productId}`);
          const checkData = await checkResponse.json();
          
          if (checkData.exists) {
            console.log(`⚠️ Produto ${product.productId} já existe no banco, pulando...`);
            toast.error(`Produto já importado: ${title.substring(0, 30)}...`);
            errors++;
            continue;
          }

          const response = await fetch('/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: title,
              slug: slug,
              description: fullDescription,
              price: salePrice,
              costPrice: costPrice,
              stock: supplierStock || 999,
              images: allImages,
              categoryId: categoryId,
              supplierId: supplierId,
              supplierSku: product.productId,
              supplierUrl: `https://www.aliexpress.com/item/${product.productId}.html`,
              availableForDropship: true,
              active: false, // Importar desativado
              brand: brand || undefined,
              // Novos campos da API
              supplierStoreId: supplierStoreId || undefined,
              supplierStoreName: supplierStoreName || undefined,
              supplierCountryCode: supplierCountryCode || undefined,
              shipFromCountry: shipFromCountry || undefined,
              deliveryDays: deliveryDays || undefined,
              gtin: gtin || undefined,
              supplierStock: supplierStock || undefined,
              weightWithPackage: weightWithPackage || undefined,
              lengthWithPackage: lengthWithPackage || undefined,
              widthWithPackage: widthWithPackage || undefined,
              heightWithPackage: heightWithPackage || undefined,
              // Variantes (SKUs com cores, tamanhos, etc) - estrutura padronizada
              variants: variations.length > 0 ? JSON.stringify({
                version: '1.0',
                source: 'aliexpress',
                sourceProductId: product.productId,
                lastUpdated: new Date().toISOString(),
                properties: variationOptions.map((opt: any) => {
                  const nameLower = opt.type.toLowerCase();
                  let propType: string = 'other';
                  
                  if (nameLower.includes('cor') || nameLower.includes('color')) {
                    propType = 'color';
                  } else if (nameLower.includes('tamanho') || nameLower.includes('size')) {
                    propType = 'size';
                  } else if (nameLower.includes('memória') || nameLower.includes('memory') || 
                             nameLower.includes('storage') || nameLower.includes('capacity') ||
                             nameLower.includes('capacidade')) {
                    propType = 'storage';
                  } else if (nameLower.includes('pacote') || nameLower.includes('package') ||
                             nameLower.includes('versão') || nameLower.includes('version') ||
                             nameLower.includes('modelo') || nameLower.includes('model')) {
                    propType = 'style';
                  } else if (nameLower.includes('voltagem') || nameLower.includes('voltage') ||
                             nameLower.includes('plug') || nameLower.includes('tomada')) {
                    propType = 'voltage';
                  } else if (nameLower.includes('material')) {
                    propType = 'material';
                  }
                  
                  return {
                    id: opt.id || String(variationOptions.indexOf(opt) + 1),
                    name: opt.type.toLowerCase(),
                    type: propType,
                    options: (opt.optionsWithIds || []).map((o: any) => ({
                      id: o.id,
                      value: o.value,
                      label: o.value,
                      image: o.image || null
                    }))
                  };
                }),
                skus: variations.map(v => ({
                  skuId: v.skuId,
                  skuAttr: v.skuAttr,
                  price: v.price,
                  originalPrice: v.originalPrice,
                  stock: v.stock,
                  available: v.stock > 0,
                  image: v.image,
                  properties: v.properties || []
                })),
                metadata: {
                  currency: 'BRL',
                  minPrice: Math.min(...variations.map(v => v.price)),
                  maxPrice: Math.max(...variations.map(v => v.price)),
                  totalStock: variations.reduce((sum, v) => sum + v.stock, 0),
                  hasImages: variations.some(v => v.image)
                }
              }) : undefined,
              // SKUs selecionados com preços (formato simples)
              selectedSkus: variations.length > 0 ? variations.map(v => ({
                skuId: v.skuId,
                enabled: true,
                customPrice: Math.round(v.price * 1.5 * 100) / 100, // 50% de margem
                margin: 50,
                costPrice: v.price
              })) : undefined,
            })
          });

          if (response.ok) {
            success++;
            toast.loading(`Importado: ${success}/${productsToImport.length}`, { id: 'import' });
          } else {
            const errorData = await response.json();
            console.error('Erro ao importar:', errorData);
            errors++;
          }

          // Rate limit
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error('Erro ao importar produto:', error);
          errors++;
        }
      }

      if (success > 0) {
        toast.success(`${success} produto(s) importado(s) com todas as fotos e detalhes!`, { id: 'import' });
      }
      if (errors > 0) {
        toast.error(`${errors} produto(s) com erro`, { id: 'import' });
      }

      // Limpar seleção
      setSelectedProducts(new Set());
    } catch (error) {
      toast.error('Erro ao importar produtos', { id: 'import' });
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  // Copiar ID do produto
  const copyProductId = (productId: string) => {
    navigator.clipboard.writeText(productId);
    toast.success('ID copiado!');
  };

  // Abrir no AliExpress
  const openInAliExpress = (productId: string) => {
    window.open(`https://www.aliexpress.com/item/${productId}.html`, '_blank');
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FiRefreshCw className="animate-spin text-3xl text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/integracao/aliexpress" className="p-2 hover:bg-gray-100 rounded-lg">
                <FiChevronLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Buscar Produtos AliExpress</h1>
                <p className="text-sm text-gray-500">Busque por SKU, nome ou link do produto</p>
              </div>
            </div>
            
            {selectedProducts.size > 0 && (
              <button
                onClick={importProducts}
                disabled={importing}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2 disabled:opacity-50"
              >
                {importing ? (
                  <FiRefreshCw className="animate-spin" />
                ) : (
                  <FiDownload />
                )}
                Importar {selectedProducts.size} Selecionado(s)
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Área de Busca */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          {/* Tipo de Busca */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSearchType('name')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                searchType === 'name' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiSearch size={16} />
              Por Nome
            </button>
            <button
              onClick={() => setSearchType('sku')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                searchType === 'sku' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiPackage size={16} />
              Por SKU/ID
            </button>
            <button
              onClick={() => setSearchType('link')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                searchType === 'link' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiLink size={16} />
              Por Link
            </button>
          </div>

          {/* Campo de Busca */}
          <div className="flex gap-3">
            {searchType === 'name' ? (
              <input
                type="text"
                placeholder="Digite o nome do produto (ex: wireless earbuds, smart watch)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <textarea
                placeholder={
                  searchType === 'sku' 
                    ? "Cole SKUs/IDs (um por linha ou separados por vírgula):\n1005010616256769\n1005006515868213" 
                    : "Cole links do AliExpress (um por linha):\nhttps://www.aliexpress.com/item/1005010616256769.html"
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                rows={4}
                className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
            )}
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 disabled:opacity-50 self-start"
            >
              {loading ? (
                <FiRefreshCw className="animate-spin" />
              ) : (
                <FiSearch />
              )}
              Buscar
            </button>
          </div>

          {/* Dicas */}
          <div className="mt-4 text-sm text-gray-500">
            {searchType === 'name' && (
              <p>💡 Use termos em inglês para melhores resultados. Ex: "bluetooth headphones", "phone case"</p>
            )}
            {searchType === 'sku' && (
              <p>💡 O SKU é o número do produto (ex: 1005010616256769). Pode buscar vários de uma vez.</p>
            )}
            {searchType === 'link' && (
              <p>💡 Copie links diretamente do AliExpress. O ID será extraído automaticamente.</p>
            )}
          </div>
        </div>

        {/* Resultados */}
        {products.length > 0 && (
          <>
            {/* Barra de Ações */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={selectAll}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  {selectedProducts.size === products.length ? (
                    <FiCheckSquare className="text-blue-500" />
                  ) : (
                    <FiSquare />
                  )}
                  Selecionar Todos ({products.length})
                </button>
                
                {selectedProducts.size > 0 && (
                  <span className="text-sm text-blue-600 font-medium">
                    {selectedProducts.size} selecionado(s)
                  </span>
                )}
              </div>
            </div>

            {/* Grid de Produtos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => {
                const isSelected = selectedProducts.has(product.productId);
                
                return (
                  <div 
                    key={product.productId}
                    className={`bg-white rounded-xl border overflow-hidden transition hover:shadow-lg ${
                      isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''
                    }`}
                  >
                    {/* Imagem */}
                    <div className="relative aspect-square bg-gray-100">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.png';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <FiPackage size={48} />
                        </div>
                      )}
                      
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleProduct(product.productId)}
                        className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center transition ${
                          isSelected 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-white/80 text-gray-600 hover:bg-white'
                        }`}
                      >
                        {isSelected ? <FiCheck /> : <FiPlus />}
                      </button>

                      {/* Status */}
                      {product.status && (
                        <div className={`absolute top-3 right-3 px-2 py-1 rounded text-xs font-medium ${
                          product.status === 'onSelling' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {product.status === 'onSelling' ? 'Ativo' : product.status}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 line-clamp-2 min-h-[48px] text-sm">
                        {product.title}
                      </h3>

                      <div className="mt-3">
                        {/* Custo Real (do AliExpress) - com faixa de preços */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Custo:</span>
                          <span className="text-sm font-semibold text-red-600">
                            R$ {product.price?.toFixed(2) || '0.00'}
                            {product.maxPrice && (
                              <span className="text-red-500"> - R$ {product.maxPrice.toFixed(2)}</span>
                            )}
                          </span>
                        </div>
                        
                        {/* Preço de Venda Sugerido (2x) - com faixa de preços */}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">Venda:</span>
                          <span className="text-lg font-bold text-green-600">
                            R$ {((product.price || 0) * 2).toFixed(2)}
                            {product.maxPrice && (
                              <span className="text-green-500"> - R$ {(product.maxPrice * 2).toFixed(2)}</span>
                            )}
                          </span>
                        </div>
                        
                        <div className="text-xs text-green-500 mt-0.5">(+100% margem)</div>
                        
                        {product.originalPrice && product.originalPrice > (product.maxPrice || product.price) && (
                          <div className="text-xs text-gray-400 line-through mt-1">
                            Original: R$ {product.originalPrice.toFixed(2)}
                          </div>
                        )}
                      </div>
                        
                      <div className="mt-2 flex items-center justify-between">
                        {product.rating && (
                          <div className="flex items-center gap-1 text-sm text-yellow-600">
                            <FiStar size={14} />
                            {product.rating}
                          </div>
                        )}
                        
                        {product.orders !== undefined && (
                          <div className="text-xs text-gray-500">
                            {product.orders.toLocaleString()} vendas
                          </div>
                        )}
                      </div>

                      {/* Variações (Cores, Tamanhos, etc) */}
                      {product.variations && product.variations.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {product.variations.map((variation, idx) => (
                            <div key={idx} className="text-xs">
                              <span className="font-medium text-gray-700">{variation.type}:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {variation.values.slice(0, 8).map((val, i) => (
                                  <span 
                                    key={i} 
                                    className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
                                  >
                                    {val}
                                  </span>
                                ))}
                                {variation.values.length > 8 && (
                                  <span className="px-2 py-0.5 bg-gray-200 text-gray-500 rounded-full text-xs">
                                    +{variation.values.length - 8}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Galeria de Imagens */}
                      {product.allImages && product.allImages.length > 1 && (
                        <div className="mt-3">
                          <div className="flex gap-1 overflow-x-auto pb-1">
                            {product.allImages.slice(0, 6).map((img, i) => (
                              <img
                                key={i}
                                src={img}
                                alt={`Foto ${i + 1}`}
                                className="w-10 h-10 object-cover rounded border flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400"
                                onClick={() => window.open(img, '_blank')}
                              />
                            ))}
                            {product.allImages.length > 6 && (
                              <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
                                +{product.allImages.length - 6}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Atributos/Características */}
                      {product.attributes && product.attributes.length > 0 && (
                        <div className="mt-3 border-t pt-2">
                          <div className="text-xs text-gray-500 space-y-0.5 max-h-20 overflow-y-auto">
                            {product.attributes.slice(0, 5).map((attr, i) => (
                              <div key={i} className="truncate">
                                <span className="text-gray-600">{attr.name}:</span> {attr.value}
                              </div>
                            ))}
                            {product.attributes.length > 5 && (
                              <div className="text-gray-400">+{product.attributes.length - 5} mais...</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* SKUs */}
                      {product.skus && product.skus.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          📦 {product.skus.length} variação(ões) • 🖼️ {product.allImages?.length || 1} fotos
                        </div>
                      )}

                      {/* Botão Configurar e Importar */}
                      <button
                        onClick={() => openConfigModal(product)}
                        className="mt-3 w-full py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 flex items-center justify-center gap-2 font-medium transition"
                      >
                        <FiSettings size={16} />
                        Configurar e Importar
                      </button>

                      {/* Ações */}
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => copyProductId(product.productId)}
                          className="flex-1 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center justify-center gap-1"
                          title="Copiar ID"
                        >
                          <FiCopy size={14} />
                          ID
                        </button>
                        <button
                          onClick={() => openInAliExpress(product.productId)}
                          className="flex-1 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center justify-center gap-1"
                          title="Abrir no AliExpress"
                        >
                          <FiExternalLink size={14} />
                          Ver
                        </button>
                        <button
                          onClick={() => router.push(`/admin/integracao/aliexpress/produto-detalhes?id=${product.productId}`)}
                          className="flex-1 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-1"
                          title="Ver detalhes"
                        >
                          <FiPackage size={14} />
                          Detalhes
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Estado Vazio */}
        {!loading && products.length === 0 && (
          <div className="bg-white rounded-xl border p-12 text-center">
            <FiSearch size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
            <p className="text-gray-500">
              {searchQuery 
                ? 'Tente outro termo de busca ou verifique se o produto está na sua lista DS' 
                : 'Use a busca acima para encontrar produtos'}
            </p>
          </div>
        )}

        {/* Dicas Adicionais */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-3">💡 Dicas para Busca</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-1">Busca por Nome</h4>
              <p className="text-blue-700">Use termos em inglês. Ex: "wireless earbuds", "phone case", "led strip"</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Busca por SKU</h4>
              <p className="text-blue-700">Cole o número do produto (13 dígitos). Aceita múltiplos IDs.</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Busca por Link</h4>
              <p className="text-blue-700">Copie o link diretamente do site AliExpress. O ID é extraído automaticamente.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ====== MODAL DE CONFIGURAÇÃO DE IMPORTAÇÃO ====== */}
      {showConfigModal && importConfig.product && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FiSettings />
                Configurar Produto para Importação
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Coluna Esquerda - Preview do Produto */}
                <div className="space-y-4">
                  {/* Imagem */}
                  <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden">
                    {importConfig.product.imageUrl && (
                      <img
                        src={importConfig.product.imageUrl}
                        alt={importConfig.product.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Galeria de Imagens */}
                  {importConfig.product.allImages && importConfig.product.allImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {importConfig.product.allImages.slice(0, 8).map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt={`Foto ${i + 1}`}
                          className="w-16 h-16 object-cover rounded-lg border flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-orange-400"
                          onClick={() => window.open(img, '_blank')}
                        />
                      ))}
                      {importConfig.product.allImages.length > 8 && (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg border flex items-center justify-center text-sm text-gray-500 flex-shrink-0">
                          +{importConfig.product.allImages.length - 8}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Informações do Produto */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <h4 className="font-semibold text-gray-900">Informações do Produto</h4>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">SKU AliExpress:</span>
                        <p className="font-mono text-gray-900">{importConfig.product.productId}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <p className={`font-medium ${importConfig.product.status === 'onSelling' ? 'text-green-600' : 'text-yellow-600'}`}>
                          {importConfig.product.status === 'onSelling' ? '✓ Ativo' : importConfig.product.status}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Custo:</span>
                        <p className="font-bold text-red-600">R$ {importConfig.product.price?.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Venda (com margem):</span>
                        <p className="font-bold text-green-600">
                          R$ {(importConfig.product.price * (1 + importConfig.margin / 100)).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Variações */}
                    {importConfig.product.variations && importConfig.product.variations.length > 0 && (
                      <div className="border-t pt-3 mt-3">
                        <span className="text-gray-500 text-sm">Variações disponíveis:</span>
                        {importConfig.product.variations.map((v, i) => (
                          <div key={i} className="mt-1">
                            <span className="font-medium text-gray-700">{v.type}: </span>
                            <span className="text-gray-600">{v.values.slice(0, 5).join(', ')}</span>
                            {v.values.length > 5 && <span className="text-gray-400"> +{v.values.length - 5}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Coluna Direita - Configurações */}
                <div className="space-y-4">
                  {/* Categoria */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiFolder className="inline mr-1" />
                      Categoria <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={importConfig.categoryId}
                      onChange={(e) => setImportConfig(prev => ({ ...prev, categoryId: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="">Selecione uma categoria...</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.parent ? `${cat.parent.name} → ` : ''}{cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Margem */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiPercent className="inline mr-1" />
                      Margem de Lucro (%)
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        min="0"
                        max="500"
                        value={importConfig.margin}
                        onChange={(e) => {
                          const newMargin = parseInt(e.target.value) || 0;
                          const newPrice = importConfig.product!.price * (1 + newMargin / 100);
                          const newComparePrice = newPrice * 1.2; // 20% acima do preço de venda
                          setImportConfig(prev => ({ 
                            ...prev, 
                            margin: newMargin,
                            comparePrice: Math.ceil(newComparePrice * 100) / 100
                          }));
                        }}
                        className="w-32 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                      <div className="flex gap-2">
                        {[30, 50, 80, 100].map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              const newPrice = importConfig.product!.price * (1 + m / 100);
                              const newComparePrice = newPrice * 1.2;
                              setImportConfig(prev => ({ 
                                ...prev, 
                                margin: m,
                                comparePrice: Math.ceil(newComparePrice * 100) / 100
                              }));
                            }}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                              importConfig.margin === m 
                                ? 'bg-orange-500 text-white' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {m}%
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Custo: R$ {importConfig.product.price?.toFixed(2)} → 
                      Venda: <span className="font-bold text-green-600">R$ {(importConfig.product.price * (1 + importConfig.margin / 100)).toFixed(2)}</span>
                    </p>
                  </div>

                  {/* Preço Riscado (Compare Price) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiTag className="inline mr-1" />
                      Preço Riscado (De:)
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={importConfig.comparePrice || ''}
                          onChange={(e) => setImportConfig(prev => ({ ...prev, comparePrice: parseFloat(e.target.value) || null }))}
                          className="w-40 pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex gap-2">
                        {[10, 20, 30].map(percent => {
                          const salePrice = importConfig.product!.price * (1 + importConfig.margin / 100);
                          const compareValue = salePrice * (1 + percent / 100);
                          return (
                            <button
                              key={percent}
                              type="button"
                              onClick={() => setImportConfig(prev => ({ ...prev, comparePrice: Math.ceil(compareValue * 100) / 100 }))}
                              className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                            >
                              +{percent}%
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Aparece riscado: <span className="line-through text-red-500">R$ {importConfig.comparePrice?.toFixed(2) || '0.00'}</span>
                      {' '}→ Por: <span className="font-bold text-green-600">R$ {(importConfig.product.price * (1 + importConfig.margin / 100)).toFixed(2)}</span>
                      {importConfig.comparePrice && (
                        <span className="ml-2 text-orange-600 font-medium">
                          ({Math.round((1 - (importConfig.product.price * (1 + importConfig.margin / 100)) / importConfig.comparePrice) * 100)}% OFF)
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Título */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiEdit3 className="inline mr-1" />
                      Título do Produto
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={importConfig.title}
                        onChange={(e) => setImportConfig(prev => ({ ...prev, title: e.target.value }))}
                        className="flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                      <button
                        type="button"
                        onClick={translateTitle}
                        disabled={importConfig.isGeneratingDescription}
                        className="px-4 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 flex items-center gap-2 disabled:opacity-50"
                        title="Traduzir para PT-BR"
                      >
                        {importConfig.isGeneratingDescription ? (
                          <FiRefreshCw className="animate-spin" size={16} />
                        ) : (
                          <FiZap size={16} />
                        )}
                        PT
                      </button>
                    </div>
                  </div>

                  {/* Descrição */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descrição do Produto
                    </label>
                    <div className="relative">
                      <textarea
                        value={importConfig.description}
                        onChange={(e) => setImportConfig(prev => ({ ...prev, description: e.target.value }))}
                        rows={6}
                        placeholder="Clique em 'Gerar com IA' para criar uma descrição automática ou digite manualmente..."
                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={generateAIDescription}
                      disabled={importConfig.isGeneratingDescription}
                      className="mt-2 w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 flex items-center justify-center gap-2 font-medium disabled:opacity-50"
                    >
                      {importConfig.isGeneratingDescription ? (
                        <>
                          <FiRefreshCw className="animate-spin" size={18} />
                          Gerando descrição...
                        </>
                      ) : (
                        <>
                          <FiZap size={18} />
                          Gerar Descrição com IA ✨
                        </>
                      )}
                    </button>
                    <p className="text-xs text-gray-500 mt-1">
                      A IA irá criar uma descrição atraente baseada no título do produto
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-6 py-3 text-gray-600 hover:bg-gray-200 rounded-xl transition flex items-center gap-2"
              >
                <FiX size={18} />
                Cancelar
              </button>
              
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  Preço Final: <span className="text-xl font-bold text-green-600">R$ {(importConfig.product.price * (1 + importConfig.margin / 100)).toFixed(2)}</span>
                </div>
                <button
                  type="button"
                  onClick={importWithConfig}
                  disabled={importing || !importConfig.categoryId}
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 flex items-center gap-2 font-medium disabled:opacity-50 transition"
                >
                  {importing ? (
                    <>
                      <FiRefreshCw className="animate-spin" size={18} />
                      Importando...
                    </>
                  ) : (
                    <>
                      <FiDownload size={18} />
                      Importar Produto
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
