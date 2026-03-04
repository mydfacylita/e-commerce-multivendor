'use client'

import { useState, useEffect, useCallback } from 'react'
import { FiTag, FiX, FiCheck, FiAlertCircle, FiLoader, FiArrowRight } from 'react-icons/fi'

interface Category {
  id: string
  name: string
  parentId: string | null
  children?: Category[]
}

interface Supplier {
  id: string
  name: string
}

export default function BulkCategoryUpdateButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; updated?: number } | null>(null)
  const [confirmStep, setConfirmStep] = useState(false)

  // Form
  const [sourceCategoryId, setSourceCategoryId] = useState('')
  const [targetCategoryId, setTargetCategoryId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [onlyInactive, setOnlyInactive] = useState(false)

  useEffect(() => {
    if (isOpen) loadData()
  }, [isOpen])

  // Atualiza preview sempre que os filtros mudarem
  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => fetchPreview(), 400)
    return () => clearTimeout(timer)
  }, [sourceCategoryId, supplierId, onlyInactive, isOpen])

  const loadData = async () => {
    setLoading(true)
    try {
      const [catRes, supRes] = await Promise.all([
        fetch('/api/admin/categories'),
        fetch('/api/admin/suppliers?active=true'),
      ])
      if (catRes.ok) setCategories(await catRes.json())
      if (supRes.ok) {
        const supData = await supRes.json()
        setSuppliers(Array.isArray(supData) ? supData : supData.suppliers || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchPreview = async () => {
    setPreviewLoading(true)
    try {
      const params = new URLSearchParams()
      if (sourceCategoryId) params.set('sourceCategoryId', sourceCategoryId)
      if (supplierId) params.set('supplierId', supplierId)
      if (onlyInactive) params.set('onlyInactive', 'true')
      const res = await fetch(`/api/admin/products/bulk-category-update?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPreviewCount(data.count)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setPreviewLoading(false)
    }
  }

  // Organizar categorias em árvore
  const buildCategoryTree = (cats: Category[]): Category[] => {
    const map = new Map<string, Category>()
    const roots: Category[] = []
    cats.forEach(cat => map.set(cat.id, { ...cat, children: [] }))
    cats.forEach(cat => {
      const node = map.get(cat.id)!
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children!.push(node)
      } else {
        roots.push(node)
      }
    })
    return roots
  }

  const renderOptions = (cats: Category[], level = 0): JSX.Element[] => {
    const opts: JSX.Element[] = []
    cats.forEach(cat => {
      opts.push(
        <option key={cat.id} value={cat.id}>
          {'—'.repeat(level)} {cat.name}
        </option>
      )
      if (cat.children?.length) opts.push(...renderOptions(cat.children, level + 1))
    })
    return opts
  }

  const categoryTree = buildCategoryTree(categories)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirmStep) {
      setConfirmStep(true)
      return
    }

    setProcessing(true)
    setResult(null)

    try {
      const res = await fetch('/api/admin/products/bulk-category-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCategoryId: sourceCategoryId || null,
          targetCategoryId,
          supplierId: supplierId || null,
          onlyInactive,
        }),
      })
      const data = await res.json()
      setResult({ success: res.ok, message: data.message || data.error, updated: data.updated })
      setConfirmStep(false)
      if (res.ok) {
        // Recarrega a página após 2s para refletir mudanças
        setTimeout(() => window.location.reload(), 2000)
      }
    } catch (e: any) {
      setResult({ success: false, message: e.message })
    } finally {
      setProcessing(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setResult(null)
    setConfirmStep(false)
    setSourceCategoryId('')
    setTargetCategoryId('')
    setSupplierId('')
    setOnlyInactive(false)
    setPreviewCount(null)
  }

  const targetCategoryName = categories.find(c => c.id === targetCategoryId)?.name
  const sourceCategoryName = categories.find(c => c.id === sourceCategoryId)?.name

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 lg:px-5 lg:py-2.5 rounded-md hover:bg-indigo-700 text-sm font-medium transition-colors"
      >
        <FiTag size={16} />
        <span>Trocar Categoria</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <FiTag className="text-indigo-600" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Trocar Categoria em Massa</h2>
                  <p className="text-xs text-gray-500">Mova produtos de uma categoria para outra</p>
                </div>
              </div>
              <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <FiX size={20} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-gray-400">
                  <FiLoader className="animate-spin mr-2" />
                  Carregando categorias...
                </div>
              ) : (
                <>
                  {/* Origem */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Categoria de origem
                      <span className="font-normal text-gray-400 ml-1">(opcional — vazio = todos os produtos)</span>
                    </label>
                    <select
                      value={sourceCategoryId}
                      onChange={e => { setSourceCategoryId(e.target.value); setConfirmStep(false) }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">— Todos os produtos —</option>
                      {renderOptions(categoryTree)}
                    </select>
                  </div>

                  {/* Destino */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Categoria destino <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={targetCategoryId}
                      onChange={e => { setTargetCategoryId(e.target.value); setConfirmStep(false) }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Selecione a categoria destino</option>
                      {renderOptions(categoryTree)}
                    </select>
                  </div>

                  {/* Seta visual */}
                  {sourceCategoryId || targetCategoryId ? (
                    <div className="flex items-center gap-2 text-sm px-2">
                      <span className="px-2 py-1 bg-gray-100 rounded text-gray-700 font-medium truncate max-w-[160px]">
                        {sourceCategoryId ? sourceCategoryName : 'Todos'}
                      </span>
                      <FiArrowRight className="text-indigo-500 flex-shrink-0" size={18} />
                      <span className={`px-2 py-1 rounded font-medium truncate max-w-[160px] ${targetCategoryId ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>
                        {targetCategoryId ? targetCategoryName : '???'}
                      </span>
                    </div>
                  ) : null}

                  {/* Filtros extras */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Filtrar por fornecedor</label>
                      <select
                        value={supplierId}
                        onChange={e => { setSupplierId(e.target.value); setConfirmStep(false) }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Todos fornecedores</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col justify-end">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={onlyInactive}
                          onChange={e => { setOnlyInactive(e.target.checked); setConfirmStep(false) }}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-sm text-gray-700">Apenas inativos</span>
                      </label>
                    </div>
                  </div>

                  {/* Preview de quantidade */}
                  <div className={`rounded-lg p-3 flex items-center gap-3 text-sm ${
                    previewLoading ? 'bg-gray-50' :
                    previewCount === 0 ? 'bg-red-50 border border-red-200' :
                    previewCount && previewCount > 0 ? 'bg-indigo-50 border border-indigo-200' :
                    'bg-gray-50'
                  }`}>
                    {previewLoading ? (
                      <><FiLoader className="animate-spin text-gray-400 flex-shrink-0" /><span className="text-gray-500">Calculando...</span></>
                    ) : previewCount !== null ? (
                      <>
                        <span className={`text-2xl font-bold flex-shrink-0 ${previewCount === 0 ? 'text-red-500' : 'text-indigo-600'}`}>
                          {previewCount}
                        </span>
                        <span className={previewCount === 0 ? 'text-red-600' : 'text-indigo-700'}>
                          {previewCount === 0
                            ? 'Nenhum produto encontrado com esses filtros'
                            : `produto${previewCount !== 1 ? 's' : ''} ser${previewCount !== 1 ? 'ão' : 'á'} movido${previewCount !== 1 ? 's' : ''} para a nova categoria`}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-400">Selecione os filtros para ver a prévia</span>
                    )}
                  </div>

                  {/* Resultado */}
                  {result && (
                    <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                      result.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {result.success ? <FiCheck className="flex-shrink-0 mt-0.5" /> : <FiAlertCircle className="flex-shrink-0 mt-0.5" />}
                      {result.message}
                    </div>
                  )}

                  {/* Confirmação */}
                  {confirmStep && !result && (
                    <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-sm text-amber-800">
                      <strong>⚠️ Confirmar?</strong> Você está prestes a mover{' '}
                      <strong>{previewCount} produto(s)</strong> para{' '}
                      <strong>"{targetCategoryName}"</strong>. Esta ação não pode ser desfeita automaticamente.
                    </div>
                  )}
                </>
              )}

              {/* Botões */}
              {!loading && (
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={processing || !targetCategoryId || previewCount === 0}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                      confirmStep ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {processing ? (
                      <><FiLoader className="animate-spin" size={16} /> Processando...</>
                    ) : confirmStep ? (
                      <><FiCheck size={16} /> Confirmar e Mover</>
                    ) : (
                      <><FiArrowRight size={16} /> Mover Produtos</>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  )
}
