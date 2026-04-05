'use client'

import { useState } from 'react'

interface AttrValue {
  value_id: number
  name: string
  display_value_name: string
}

interface Attribute {
  attribute_id: number
  attribute_name: string
  display_attr_name?: string
  input_type?: string
  attribute_type?: string
  is_mandatory?: boolean
  values?: AttrValue[]
}

export default function ShopeeAtributosPage() {
  // get_attribute_tree
  const [categoryId, setCategoryId] = useState('100578')
  const [treeResult, setTreeResult] = useState<any>(null)
  const [treeLoading, setTreeLoading] = useState(false)
  const [treeError, setTreeError] = useState('')

  // search_attribute_value_list
  const [attrId, setAttrId] = useState('100408')
  const [searchKeyword, setSearchKeyword] = useState('Bluetooth')
  const [searchResult, setSearchResult] = useState<AttrValue[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [rawSearchResponse, setRawSearchResponse] = useState<any>(null)

  async function loadAttributeTree() {
    setTreeLoading(true)
    setTreeError('')
    setTreeResult(null)
    try {
      const res = await fetch('/api/admin/marketplaces/shopee/attributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: Number(categoryId) }),
      })
      const data = await res.json()
      setTreeResult(data)
    } catch (e: any) {
      setTreeError(e.message)
    } finally {
      setTreeLoading(false)
    }
  }

  async function searchValues() {
    setSearchLoading(true)
    setSearchError('')
    setSearchResult([])
    setRawSearchResponse(null)
    try {
      const params = new URLSearchParams({
        categoryId,
        attributeId: attrId,
        keyword: searchKeyword,
      })
      const res = await fetch(`/api/admin/marketplaces/shopee/search-attribute-values?${params}`)
      const data = await res.json()
      setRawSearchResponse(data)
      if (data.error) setSearchError(data.error)
      setSearchResult(data.values || [])
    } catch (e: any) {
      setSearchError(e.message)
    } finally {
      setSearchLoading(false)
    }
  }

  const attrs: Attribute[] = treeResult?.attributes || []

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">🔧 Shopee — Explorador de Atributos</h1>

      {/* ── get_attribute_tree ───────────────────────────────────── */}
      <section className="border rounded-xl p-5 space-y-4 bg-white shadow-sm">
        <h2 className="text-lg font-semibold">1. get_attribute_tree — listar atributos de categoria</h2>
        <p className="text-sm text-gray-500">
          Endpoint: <code>POST /api/admin/marketplaces/shopee/attributes</code>
        </p>
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-sm font-medium mb-1">category_id</label>
            <input
              type="number"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="border rounded px-3 py-2 w-44"
            />
          </div>
          <button
            onClick={loadAttributeTree}
            disabled={treeLoading}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded font-medium disabled:opacity-50"
          >
            {treeLoading ? 'Carregando...' : 'Buscar atributos'}
          </button>
        </div>

        {treeError && <p className="text-red-600 text-sm">Erro: {treeError}</p>}

        {treeResult && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              API usada: <strong>{treeResult.apiUsed || '—'}</strong> · Total: <strong>{attrs.length}</strong> atributos
            </p>

            {attrs.length === 0 && (
              <div>
                <p className="text-yellow-700 text-sm mb-2">Nenhum atributo parseado. Resposta raw:</p>
                <pre className="bg-gray-100 rounded p-3 text-xs overflow-auto max-h-96">
                  {JSON.stringify(treeResult.raw ?? treeResult, null, 2)}
                </pre>
              </div>
            )}

            {attrs.length > 0 && (
              <div className="overflow-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="border px-3 py-2">attribute_id</th>
                      <th className="border px-3 py-2">Nome</th>
                      <th className="border px-3 py-2">input_type</th>
                      <th className="border px-3 py-2">Obrigatório</th>
                      <th className="border px-3 py-2">Valores fixos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attrs.map((a: Attribute) => (
                      <tr key={a.attribute_id || (a as any).id} className="hover:bg-orange-50">
                        <td className="border px-3 py-2 font-mono">
                          <button
                            onClick={() => setAttrId(String(a.attribute_id || (a as any).id))}
                            className="text-orange-600 underline"
                            title="Usar neste campo de busca de valores"
                          >
                            {a.attribute_id || (a as any).id}
                          </button>
                        </td>
                        <td className="border px-3 py-2 font-medium">
                          {(a as any).name || a.display_attr_name || a.attribute_name}
                        </td>
                        <td className="border px-3 py-2 font-mono text-xs">
                          {(a as any).inputType || a.input_type || a.attribute_type || '—'}
                        </td>
                        <td className="border px-3 py-2 text-center">
                          {((a as any).isMandatory || a.is_mandatory) ? '✅' : '—'}
                        </td>
                        <td className="border px-3 py-2 text-xs text-gray-600">
                          {a.values && a.values.length > 0
                            ? a.values.map(v => `${v.name} (${(v as any).id || v.value_id})`).join(', ')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-gray-500">Ver resposta JSON completa</summary>
              <pre className="bg-gray-100 rounded p-3 text-xs overflow-auto max-h-[500px] mt-2">
                {JSON.stringify(treeResult, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </section>

      {/* ── search_attribute_value_list ──────────────────────────── */}
      <section className="border rounded-xl p-5 space-y-4 bg-white shadow-sm">
        <h2 className="text-lg font-semibold">2. search_attribute_value_list — buscar value_id pelo nome</h2>
        <p className="text-sm text-gray-500">
          Endpoint: <code>GET /api/admin/marketplaces/shopee/search-attribute-values</code>
          {' '}· Parâmetros: <code>attribute_id</code> + <code>value_name</code> + <code>cursor</code> + <code>limit</code>
        </p>
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-sm font-medium mb-1">attribute_id</label>
            <input
              type="number"
              value={attrId}
              onChange={e => setAttrId(e.target.value)}
              className="border rounded px-3 py-2 w-36"
              placeholder="ex: 100408"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">value_name (keyword)</label>
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              className="border rounded px-3 py-2 w-52"
              placeholder="ex: Bluetooth"
            />
          </div>
          <button
            onClick={searchValues}
            disabled={searchLoading}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded font-medium disabled:opacity-50"
          >
            {searchLoading ? 'Buscando...' : 'Buscar valores'}
          </button>
        </div>

        {searchError && <p className="text-red-600 text-sm">Erro: {searchError}</p>}

        {rawSearchResponse && !searchError && searchResult.length === 0 && (
          <div>
            <p className="text-yellow-700 text-sm mb-2">Nenhum valor encontrado. Resposta raw:</p>
            <pre className="bg-gray-100 rounded p-3 text-xs overflow-auto max-h-60">
              {JSON.stringify(rawSearchResponse, null, 2)}
            </pre>
          </div>
        )}

        {searchResult.length > 0 && (
          <div className="overflow-auto space-y-2">
            <p className="text-sm text-gray-600">
              <strong>{searchResult.length}</strong> valor(es) encontrado(s) para attribute_id={attrId} / keyword=&quot;{searchKeyword}&quot;
            </p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="border px-3 py-2">value_id</th>
                  <th className="border px-3 py-2">display_value_name</th>
                  <th className="border px-3 py-2">name</th>
                </tr>
              </thead>
              <tbody>
                {searchResult.map((v: AttrValue) => (
                  <tr key={v.value_id} className="hover:bg-orange-50">
                    <td className="border px-3 py-2 font-mono">{v.value_id}</td>
                    <td className="border px-3 py-2">{v.display_value_name || '—'}</td>
                    <td className="border px-3 py-2">{v.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-gray-500">Ver resposta JSON completa</summary>
              <pre className="bg-gray-100 rounded p-3 text-xs overflow-auto max-h-60 mt-2">
                {JSON.stringify(rawSearchResponse, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </section>
    </div>
  )
}
