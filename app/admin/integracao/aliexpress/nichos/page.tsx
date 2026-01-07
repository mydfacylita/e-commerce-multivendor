'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const NICHOS_PRODUTOS = [
  { id: 'electronics', nome: 'Eletrônicos', keywords: 'electronics gadgets' },
  { id: 'fashion-women', nome: 'Moda Feminina', keywords: 'women fashion clothing' },
  { id: 'fashion-men', nome: 'Moda Masculina', keywords: 'men fashion clothing' },
  { id: 'jewelry', nome: 'Joias e Acessórios', keywords: 'jewelry accessories' },
  { id: 'home-decor', nome: 'Decoração Casa', keywords: 'home decor decoration' },
  { id: 'sports', nome: 'Esportes e Fitness', keywords: 'sports fitness' },
  { id: 'beauty', nome: 'Beleza e Saúde', keywords: 'beauty health care' },
  { id: 'toys', nome: 'Brinquedos', keywords: 'toys kids' },
  { id: 'phones', nome: 'Celulares e Acessórios', keywords: 'phone accessories mobile' },
  { id: 'watches', nome: 'Relógios', keywords: 'watches smart watch' },
  { id: 'bags', nome: 'Bolsas e Malas', keywords: 'bags backpack luggage' },
  { id: 'shoes', nome: 'Calçados', keywords: 'shoes sneakers' },
];

export default function NichosAliExpressPage() {
  const router = useRouter();
  const [selectedNichos, setSelectedNichos] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Buscar fornecedor AliExpress ao carregar
  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        const response = await fetch('/api/admin/suppliers');
        const suppliers = await response.json();
        
        // Procurar fornecedor AliExpress
        const aliexpressSupplier = suppliers.find((s: any) => 
          s.name.toLowerCase().includes('aliexpress')
        );
        
        if (aliexpressSupplier) {
          setSupplierId(aliexpressSupplier.id);
        } else {
          setMessage('⚠️ Fornecedor AliExpress não encontrado. Crie um fornecedor com o nome "AliExpress" primeiro.');
        }
      } catch (error) {
        console.error('Erro ao buscar fornecedores:', error);
        setMessage('❌ Erro ao buscar fornecedores');
      } finally {
        setLoading(false);
      }
    };

    fetchSupplier();
  }, []);

  const toggleNicho = (nichoId: string) => {
    setSelectedNichos(prev => 
      prev.includes(nichoId) 
        ? prev.filter(id => id !== nichoId)
        : [...prev, nichoId]
    );
  };

  const importarProdutos = async () => {
    if (selectedNichos.length === 0) {
      setMessage('⚠️ Selecione pelo menos um nicho');
      return;
    }

    if (!supplierId) {
      setMessage('⚠️ Fornecedor não encontrado. Crie um fornecedor "AliExpress" primeiro.');
      return;
    }

    setImporting(true);
    setMessage('');

    try {
      let totalImportados = 0;
      let totalAtualizados = 0;
      let totalPulados = 0;
      let totalErros = 0;

      for (const nichoId of selectedNichos) {
        const nicho = NICHOS_PRODUTOS.find(n => n.id === nichoId);
        if (!nicho) continue;

        setMessage(`📦 Importando: ${nicho.nome}...`);

        const response = await fetch('/api/admin/integrations/aliexpress/import-products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            keywords: nicho.keywords,
            supplierId: supplierId 
          })
        });

        const data = await response.json();
        
        console.log('📊 Resposta da API:', data);
        
        if (data.createdCount) {
          totalImportados += data.createdCount;
        }
        
        if (data.updatedCount) {
          totalAtualizados += data.updatedCount;
        }
        
        if (data.skippedProducts) {
          totalPulados += data.skippedProducts;
        }
        
        if (data.errors) {
          totalErros += data.errors.length;
        }

        // Mostrar progresso detalhado
        setMessage(`${nicho.nome}: ✅ ${data.createdCount || 0} novos, 🔄 ${data.updatedCount || 0} atualizados`);

        // Aguardar 2 segundos entre cada nicho (rate limit)
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const mensagemFinal = `✅ ${totalImportados} novos, 🔄 ${totalAtualizados} atualizados! ${totalPulados > 0 ? `(${totalPulados} pulados)` : ''}`;
      setMessage(mensagemFinal);
      
      console.log('📊 TOTAIS FINAIS:');
      console.log(`   ✅ Novos: ${totalImportados}`);
      console.log(`   🔄 Atualizados: ${totalAtualizados}`);
      console.log(`   ⏭️  Pulados: ${totalPulados}`);
      console.log(`   ❌ Erros: ${totalErros}`);
      
      setTimeout(() => router.push('/admin/produtos'), 2000);
    } catch (error) {
      setMessage('❌ Erro ao importar produtos');
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Escolher Nichos de Produtos</h1>
            <p className="text-gray-600 mt-2">Selecione os nichos para importar produtos do AliExpress</p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            ← Voltar
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Nichos Disponíveis</h2>
          <p className="text-sm text-gray-600 mb-4">
            Selecione um ou mais nichos. Aproximadamente 20 produtos por nicho.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {NICHOS_PRODUTOS.map(nicho => (
              <label
                key={nicho.id}
                className={`
                  relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${selectedNichos.includes(nicho.id) 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300 bg-white'
                  }
                `}
              >
                <input
                  type="checkbox"
                  checked={selectedNichos.includes(nicho.id)}
                  onChange={() => toggleNicho(nicho.id)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900">{nicho.nome}</div>
                  <div className="text-xs text-gray-500">{nicho.keywords}</div>
                </div>
              </label>
            ))}
          </div>

          {selectedNichos.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>{selectedNichos.length} nicho(s) selecionado(s)</strong>
                <br />
                Tempo estimado: ~{selectedNichos.length * 3} segundos
              </p>
            </div>
          )}
        </div>

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

        <div className="flex gap-4">
          <button
            onClick={importarProdutos}
            disabled={importing || selectedNichos.length === 0}
            className={`
              flex-1 py-3 px-6 rounded-lg font-semibold transition-colors
              ${importing || selectedNichos.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {importing ? '⏳ Importando...' : `🚀 Importar Produtos (${selectedNichos.length} nichos)`}
          </button>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">ℹ️ Informações</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Produtos duplicados não serão importados novamente</li>
            <li>• Preços com 50% de margem automaticamente</li>
            <li>• Títulos parcialmente traduzidos para português</li>
            <li>• Estoque infinito (dropshipping)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
