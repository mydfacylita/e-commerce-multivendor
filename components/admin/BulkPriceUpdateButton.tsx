'use client'

import { useState, useEffect } from 'react'
import { FiPercent, FiDollarSign, FiX, FiCheck, FiAlertCircle } from 'react-icons/fi'

interface Category {
  id: string
  name: string
  parentId: string | null
  children?: Category[]
}

export default function BulkPriceUpdateButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; updated?: number } | null>(null)

  // Form
  const [selectedCategory, setSelectedCategory] = useState('')
  const [updateType, setUpdateType] = useState<'percentage' | 'fixed' | 'margin'>('margin')
  const [marginMode, setMarginMode] = useState<'adjust' | 'set'>('adjust')
  const [value, setValue] = useState('')
  const [operation, setOperation] = useState<'increase' | 'decrease'>('decrease')
  const [includeVariants, setIncludeVariants] = useState(true)
  const [onlyWithStock, setOnlyWithStock] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen])

  const loadCategories = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    } finally {
      setLoading(false)
    }
  }

  // Função para renderizar categorias com hierarquia
  const renderCategoryOptions = (cats: Category[], level = 0): JSX.Element[] => {
    const options: JSX.Element[] = []
    
    cats.forEach(cat => {
      const prefix = '—'.repeat(level)
      options.push(
        <option key={cat.id} value={cat.id}>
          {prefix} {cat.name}
        </option>
      )
      if (cat.children && cat.children.length > 0) {
        options.push(...renderCategoryOptions(cat.children, level + 1))
      }
    })
    
    return options
  }

  // Organizar categorias em árvore
  const buildCategoryTree = (cats: Category[]): Category[] => {
    const map = new Map<string, Category>()
    const roots: Category[] = []

    cats.forEach(cat => {
      map.set(cat.id, { ...cat, children: [] })
    })

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!value || parseFloat(value) <= 0) {
      setResult({ success: false, message: 'Informe um valor válido' })
      return
    }

    setProcessing(true)
    setResult(null)

    try {
      const res = await fetch('/api/admin/products/bulk-price-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedCategory || null, // null = todas
          updateType,
          value: parseFloat(value),
          operation,
          marginMode,
          includeVariants,
          onlyWithStock
        })
      })

      const data = await res.json()

      if (res.ok) {
        setResult({ 
          success: true, 
          message: `${data.updated} produto(s) atualizado(s) com sucesso!`,
          updated: data.updated
        })
        // Recarregar página após 2 segundos
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setResult({ success: false, message: data.error || 'Erro ao atualizar' })
      }
    } catch (error) {
      setResult({ success: false, message: 'Erro de conexão' })
    } finally {
      setProcessing(false)
    }
  }

  const categoryTree = buildCategoryTree(categories)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 flex items-center space-x-2"
      >
        <FiPercent />
        <span>Atualizar Preços</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">Atualização em Massa de Preços</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <FiX />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium mb-1">Categoria</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border rounded-md p-2"
                  disabled={loading}
                >
                  <option value="">Todas as categorias</option>
                  {renderCategoryOptions(categoryTree)}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Deixe vazio para aplicar em todos os produtos
                </p>
              </div>

              {/* Tipo de atualização */}
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Atualização</label>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="updateType"
                      value="margin"
                      checked={updateType === 'margin'}
                      onChange={() => setUpdateType('margin')}
                      className="text-primary-600"
                    />
                    <span>📊 Margem</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="updateType"
                      value="percentage"
                      checked={updateType === 'percentage'}
                      onChange={() => setUpdateType('percentage')}
                      className="text-primary-600"
                    />
                    <FiPercent />
                    <span>Percentual (%)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="updateType"
                      value="fixed"
                      checked={updateType === 'fixed'}
                      onChange={() => setUpdateType('fixed')}
                      className="text-primary-600"
                    />
                    <FiDollarSign />
                    <span>Valor Fixo (R$)</span>
                  </label>
                </div>
              </div>

              {/* Modo de margem (só aparece se updateType === 'margin') */}
              {updateType === 'margin' && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium mb-2">Como ajustar a margem?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="marginMode"
                        value="adjust"
                        checked={marginMode === 'adjust'}
                        onChange={() => setMarginMode('adjust')}
                        className="text-primary-600"
                      />
                      <span className="text-sm">Ajustar margem existente</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="marginMode"
                        value="set"
                        checked={marginMode === 'set'}
                        onChange={() => setMarginMode('set')}
                        className="text-primary-600"
                      />
                      <span className="text-sm">Definir margem fixa</span>
                    </label>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    {marginMode === 'adjust' 
                      ? '💡 Ex: Se margem atual é 50% e você diminuir 20, nova margem será 30%'
                      : '💡 Ex: Todos os produtos terão margem de 30% sobre o custo'
                    }
                  </p>
                </div>
              )}

              {/* Operação (só aparece se não for margem fixa) */}
              {!(updateType === 'margin' && marginMode === 'set') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Operação</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="operation"
                        value="increase"
                        checked={operation === 'increase'}
                        onChange={() => setOperation('increase')}
                        className="text-green-600"
                      />
                      <span className="text-green-600">➕ Aumentar</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="operation"
                        value="decrease"
                        checked={operation === 'decrease'}
                        onChange={() => setOperation('decrease')}
                        className="text-red-600"
                      />
                      <span className="text-red-600">➖ Diminuir</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Valor */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {updateType === 'margin' 
                    ? (marginMode === 'set' ? 'Nova Margem (%)' : 'Pontos Percentuais')
                    : updateType === 'percentage' ? 'Percentual (%)' : 'Valor (R$)'
                  }
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">
                    {updateType === 'fixed' ? 'R$' : '%'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full border rounded-md p-2 pl-10"
                    placeholder={updateType === 'margin' ? 'Ex: 20' : updateType === 'percentage' ? 'Ex: 10' : 'Ex: 5.00'}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {updateType === 'margin' 
                    ? (marginMode === 'set' 
                        ? `Exemplo: Todos terão margem de ${value || '30'}% sobre o custo`
                        : `Exemplo: Margem de 50% ${operation === 'decrease' ? '- ' + (value || '20') + ' = ' + (50 - parseFloat(value || '20')) : '+ ' + (value || '20') + ' = ' + (50 + parseFloat(value || '20'))}%`
                      )
                    : updateType === 'percentage' 
                      ? `Exemplo: 10% de ${operation === 'increase' ? 'aumento' : 'desconto'}`
                      : `Exemplo: R$ ${value || '5,00'} ${operation === 'increase' ? 'a mais' : 'a menos'}`
                  }
                </p>
              </div>

              {/* Opções */}
              <div className="space-y-2 bg-gray-50 p-3 rounded-md">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeVariants}
                    onChange={(e) => setIncludeVariants(e.target.checked)}
                    className="text-primary-600 rounded"
                  />
                  <span className="text-sm">Incluir variantes (SKUs)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyWithStock}
                    onChange={(e) => setOnlyWithStock(e.target.checked)}
                    className="text-primary-600 rounded"
                  />
                  <span className="text-sm">Apenas produtos com estoque &gt; 0</span>
                </label>
              </div>

              {/* Preview */}
              <div className="bg-blue-50 p-3 rounded-md text-sm">
                <p className="font-medium text-blue-800">
                  📋 Será aplicado: {updateType === 'margin' 
                    ? (marginMode === 'set' 
                        ? `Margem fixa de ${value || '0'}%`
                        : `${operation === 'increase' ? '+' : '-'}${value || '0'} pontos na margem`)
                    : `${operation === 'increase' ? '+' : '-'}${updateType === 'percentage' ? `${value || '0'}%` : `R$ ${value || '0,00'}`}`
                  }
                </p>
                <p className="text-blue-600 text-xs mt-1">
                  {selectedCategory ? 'Na categoria selecionada e subcategorias' : 'Em todos os produtos'}
                  {onlyWithStock ? ' com estoque > 0' : ''}
                  {includeVariants ? ', incluindo variantes' : ''}
                </p>
              </div>

              {/* Resultado */}
              {result && (
                <div className={`p-3 rounded-md flex items-center gap-2 ${
                  result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {result.success ? <FiCheck /> : <FiAlertCircle />}
                  <span>{result.message}</span>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
                  disabled={processing}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processing || !value}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Processando...
                    </>
                  ) : (
                    <>
                      <FiCheck />
                      Aplicar Atualização
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
