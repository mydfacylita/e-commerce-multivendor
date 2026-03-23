'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiRefreshCw, FiCheckCircle, FiXCircle } from 'react-icons/fi';

export default function ShopeeTestPage() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const runTest = async (name: string, fn: () => Promise<any>) => {
    setLoading(prev => ({ ...prev, [name]: true }));
    try {
      const result = await fn();
      setResults(prev => ({ ...prev, [name]: { ok: true, data: result } }));
    } catch (e: any) {
      setResults(prev => ({ ...prev, [name]: { ok: false, error: e.message } }));
    } finally {
      setLoading(prev => ({ ...prev, [name]: false }));
    }
  };

  const tests = [
    {
      id: 'shop_info',
      label: 'Informações da Loja',
      desc: 'GET /api/v2/shop/get_shop_info',
      run: () => fetch('/api/admin/marketplaces/shopee/auth').then(r => r.json()),
    },
    {
      id: 'products',
      label: 'Listar Produtos',
      desc: 'GET /api/v2/product/get_item_list',
      run: () => fetch('/api/admin/marketplaces/shopee/products').then(r => r.json()),
    },
    {
      id: 'orders',
      label: 'Listar Pedidos',
      desc: 'GET /api/v2/order/get_order_list',
      run: () => fetch('/api/admin/marketplaces/shopee/orders').then(r => r.json()),
    },
  ];

  const runAll = async () => {
    for (const t of tests) {
      await runTest(t.id, t.run);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/integracao/shopee" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
            <FiArrowLeft size={14} /> Voltar para Integração Shopee
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Teste de Integração Shopee</h1>
          <p className="text-gray-500 text-sm mt-1">Valide a conexão com a API da Shopee em tempo real.</p>
        </div>
        <button
          onClick={runAll}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <FiRefreshCw size={16} /> Testar Tudo
        </button>
      </div>

      <div className="space-y-4">
        {tests.map(t => {
          const result = results[t.id];
          const isLoading = loading[t.id];

          return (
            <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    {result?.ok === true && <FiCheckCircle className="text-green-500" size={18} />}
                    {result?.ok === false && <FiXCircle className="text-red-500" size={18} />}
                    {!result && !isLoading && <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                    {isLoading && <div className="w-4 h-4 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />}
                    <span className="font-semibold text-gray-800">{t.label}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 ml-6">{t.desc}</p>
                </div>
                <button
                  onClick={() => runTest(t.id, t.run)}
                  disabled={isLoading}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50"
                >
                  {isLoading ? 'Testando...' : 'Testar'}
                </button>
              </div>

              {result && (
                <div className={`mt-3 rounded-lg p-3 text-xs font-mono overflow-auto max-h-64 ${result.ok ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                  {result.ok
                    ? <pre className="text-green-800 whitespace-pre-wrap">{JSON.stringify(result.data, null, 2)}</pre>
                    : <pre className="text-red-700 whitespace-pre-wrap">Erro: {result.error}</pre>
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
