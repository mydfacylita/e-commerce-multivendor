'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiSearch, FiList, FiChevronDown, FiChevronRight } from 'react-icons/fi';

/* ─────────── helpers ─────────── */
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${color}`}>{label}</span>
  );
}

function JsonBox({ data }: { data: any }) {
  return (
    <pre className="bg-gray-900 text-green-300 text-xs rounded-lg p-4 overflow-auto max-h-96 whitespace-pre-wrap">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

/* ─────────── attribute tree ─────────── */
function AttrRow({ attr }: { attr: any }) {
  const [open, setOpen] = useState(false);
  const hasValues = attr.inputValues?.length > 0 || attr.values?.length > 0;
  const values = attr.inputValues || attr.values || [];
  return (
    <div className="border border-gray-200 rounded-lg mb-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50"
      >
        {hasValues
          ? (open ? <FiChevronDown size={14} className="text-gray-400 shrink-0" /> : <FiChevronRight size={14} className="text-gray-400 shrink-0" />)
          : <span className="w-3.5 shrink-0" />}
        <span className="font-medium text-gray-800 text-sm">{attr.name || attr.attribute_name || attr.display_attribute_name}</span>
        <span className="text-gray-400 text-xs">id: {attr.id ?? attr.attribute_id}</span>
        {(attr.isMandatory || attr.is_mandatory) && <Badge label="Obrigatório" color="bg-red-100 text-red-700" />}
        {attr.inputType && <Badge label={attr.inputType} color="bg-blue-100 text-blue-700" />}
        {hasValues && <Badge label={`${values.length} valores`} color="bg-gray-100 text-gray-600" />}
      </button>
      {open && hasValues && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {values.map((v: any, i: number) => (
            <span key={i} className="bg-orange-50 border border-orange-200 text-orange-800 text-xs px-2 py-0.5 rounded">
              <span className="font-mono font-bold">{v.value_id ?? v.valueId}</span>
              {' — '}{v.display_value_name || v.value_name || v.name || ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────── main page ─────────── */
export default function ShopeeTestPage() {
  /* attribute tree */
  const [categoryId, setCategoryId] = useState('100578');
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeResult, setTreeResult] = useState<any>(null);
  const [treeRaw, setTreeRaw] = useState<any>(null);
  const [showRaw, setShowRaw] = useState(false);

  /* search attribute values */
  const [attrId, setAttrId] = useState('100408');
  const [valueName, setValueName] = useState('Bluetooth');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);

  async function loadAttributeTree() {
    setTreeLoading(true);
    setTreeResult(null);
    setTreeRaw(null);
    try {
      const res = await fetch('/api/admin/marketplaces/shopee/attributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: Number(categoryId) }),
      });
      const data = await res.json();
      setTreeRaw(data);
      setTreeResult(data);
    } catch (e: any) {
      setTreeResult({ error: e.message });
    } finally {
      setTreeLoading(false);
    }
  }

  async function searchValues() {
    setSearchLoading(true);
    setSearchResult(null);
    try {
      const params = new URLSearchParams({ categoryId, attributeId: attrId, keyword: valueName });
      const res = await fetch(`/api/admin/marketplaces/shopee/search-attribute-values?${params}`);
      const data = await res.json();
      setSearchResult(data);
    } catch (e: any) {
      setSearchResult({ error: e.message });
    } finally {
      setSearchLoading(false);
    }
  }

  const attrs: any[] = treeResult?.attributes || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <Link href="/admin/integracao/shopee" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
          <FiArrowLeft size={14} /> Voltar para Integração Shopee
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Explorador de Atributos Shopee</h1>
        <p className="text-gray-500 text-sm mt-1">Consulte os atributos e valores aceitos pela API da Shopee em tempo real.</p>
      </div>

      {/* ── get_attribute_tree ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <FiList className="text-orange-500" size={20} />
          <div>
            <h2 className="font-semibold text-gray-900">get_attribute_tree</h2>
            <p className="text-xs text-gray-400">/api/v2/product/get_attribute_tree — lista atributos de uma categoria</p>
          </div>
        </div>

        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">category_id</label>
            <input
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              placeholder="ex: 100578"
            />
          </div>
          <button
            onClick={loadAttributeTree}
            disabled={treeLoading}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            {treeLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiSearch size={14} />}
            {treeLoading ? 'Buscando...' : 'Buscar'}
          </button>
          {treeRaw && (
            <button onClick={() => setShowRaw(v => !v)} className="text-xs text-gray-400 underline">
              {showRaw ? 'Ocultar JSON bruto' : 'Ver JSON bruto'}
            </button>
          )}
        </div>

        {showRaw && treeRaw && <JsonBox data={treeRaw} />}

        {treeResult?.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{treeResult.error}</div>
        )}

        {attrs.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-3">{attrs.length} atributo(s) encontrado(s) — clique para expandir os valores</p>
            {attrs.map((attr: any, i: number) => <AttrRow key={i} attr={attr} />)}
          </div>
        )}

        {treeResult && attrs.length === 0 && !treeResult.error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
            Nenhum atributo retornado para essa categoria. Veja o JSON bruto para mais detalhes.
          </div>
        )}
      </div>

      {/* ── search_attribute_value_list ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <FiSearch className="text-orange-500" size={20} />
          <div>
            <h2 className="font-semibold text-gray-900">search_attribute_value_list</h2>
            <p className="text-xs text-gray-400">/api/v2/product/search_attribute_value_list — busca valores válidos de um atributo COMBO_BOX</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">attribute_id</label>
            <input
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={attrId}
              onChange={e => setAttrId(e.target.value)}
              placeholder="ex: 100408"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">value_name (busca)</label>
            <input
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={valueName}
              onChange={e => setValueName(e.target.value)}
              placeholder="ex: Bluetooth"
            />
          </div>
          <button
            onClick={searchValues}
            disabled={searchLoading}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            {searchLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiSearch size={14} />}
            {searchLoading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {searchResult?.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{searchResult.error}</div>
        )}

        {searchResult?.values?.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-3">{searchResult.values.length} valor(es) encontrado(s)</p>
            <div className="flex flex-wrap gap-2">
              {searchResult.values.map((v: any, i: number) => (
                <div key={i} className="bg-orange-50 border border-orange-200 text-orange-900 text-xs px-3 py-1.5 rounded-lg">
                  <span className="font-mono font-bold">{v.value_id}</span>{' — '}{v.display_value_name || v.name}
                </div>
              ))}
            </div>
            <details className="mt-3">
              <summary className="text-xs text-gray-400 cursor-pointer underline">Ver JSON bruto</summary>
              <JsonBox data={searchResult} />
            </details>
          </div>
        )}

        {searchResult && searchResult.values?.length === 0 && !searchResult.error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
            Nenhum valor encontrado. Tente outro termo (ex: "Wireless", "Com Fio", "USB-C").
          </div>
        )}
      </div>
    </div>
  );
}


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
