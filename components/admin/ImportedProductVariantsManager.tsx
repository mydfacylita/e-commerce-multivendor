'use client'

import { useState, useEffect } from 'react'
import { FiCheck, FiX, FiPackage, FiRefreshCw } from 'react-icons/fi'
import { parseVariantsJson, type ProductVariants, type ProductSku } from '@/lib/product-variants'

interface ImportedProductVariantsManagerProps {
  productId: string
  variantsJson: string | null
  supplierName?: string
  onVariantsChange: (selectedSkus: SelectedSku[]) => void
  selectedSkus?: SelectedSku[]
}

export interface SelectedSku {
  skuId: string
  enabled: boolean
  customStock?: number  // Estoque personalizado (opcional)
  customPrice?: number  // Preço de venda personalizado (calculado com margem)
  margin?: number       // Margem de lucro em % (opcional)
  costPrice?: number    // Preço de custo do fornecedor
}

interface PropertySelection {
  [propertyId: string]: {
    [optionId: string]: boolean
  }
}

export default function ImportedProductVariantsManager({
  productId,
  variantsJson,
  supplierName,
  onVariantsChange,
  selectedSkus = []
}: ImportedProductVariantsManagerProps) {
  const [variants, setVariants] = useState<ProductVariants | null>(null)
  const [propertySelections, setPropertySelections] = useState<PropertySelection>({})
  const [skuSelections, setSkuSelections] = useState<Map<string, SelectedSku>>(new Map())
  const [showAllSkus, setShowAllSkus] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Parse variants ao carregar
  useEffect(() => {
    if (variantsJson) {
      const parsed = parseVariantsJson(variantsJson)
      setVariants(parsed)
      
      if (parsed) {
        // Primeiro inicializar SKUs selecionados
        const initialSkus = new Map<string, SelectedSku>()
        parsed.skus.forEach(sku => {
          // Verificar se já existe seleção salva
          const existing = selectedSkus.find(s => s.skuId === sku.skuId)
          // Margem padrão de 50% se não definida
          const defaultMargin = 50
          const margin = existing?.margin ?? defaultMargin
          const costPrice = sku.price
          // Calcular preço de venda: custo / (1 - margem/100)
          const calculatedPrice = costPrice / (1 - margin / 100)
          initialSkus.set(sku.skuId, {
            skuId: sku.skuId,
            enabled: existing?.enabled ?? true,
            customStock: existing?.customStock,
            customPrice: existing?.customPrice ?? calculatedPrice,
            margin: margin,
            costPrice: costPrice
          })
        })
        setSkuSelections(initialSkus)
        
        // Agora inicializar seleções de propriedades baseado nos SKUs salvos
        // Se todos os SKUs de uma opção estão desabilitados, desmarcar a opção
        const initialSelections: PropertySelection = {}
        parsed.properties.forEach(prop => {
          initialSelections[prop.id] = {}
          prop.options.forEach(opt => {
            // Verificar se existe pelo menos um SKU habilitado com esta opção
            const hasEnabledSku = parsed.skus.some(sku => {
              const skuHasOption = sku.properties.some(p => 
                p.propertyId === prop.id && p.optionId === opt.id
              )
              const skuSelection = initialSkus.get(sku.skuId)
              return skuHasOption && skuSelection?.enabled
            })
            // Se não tem SKUs salvos, marca como true por padrão
            const hasAnySavedSelection = selectedSkus.length > 0
            initialSelections[prop.id][opt.id] = hasAnySavedSelection ? hasEnabledSku : true
          })
        })
        setPropertySelections(initialSelections)
        
        // Marcar como inicializado após carregar
        setTimeout(() => setIsInitialized(true), 100)
      }
    }
  }, [variantsJson])

  // Atualizar SKUs quando propriedades mudam (somente após inicialização)
  useEffect(() => {
    if (!variants || !isInitialized) return
    
    const newSkuSelections = new Map(skuSelections)
    
    variants.skus.forEach(sku => {
      // Verificar se todas as propriedades do SKU estão selecionadas
      const allPropsSelected = sku.properties.every(prop => 
        propertySelections[prop.propertyId]?.[prop.optionId] === true
      )
      
      const current = newSkuSelections.get(sku.skuId)
      if (current) {
        // Se todas as propriedades estão selecionadas, habilita o SKU
        // Se alguma propriedade foi desmarcada, desabilita o SKU
        newSkuSelections.set(sku.skuId, {
          ...current,
          enabled: allPropsSelected
        })
      }
    })
    
    setSkuSelections(newSkuSelections)
  }, [propertySelections, isInitialized])

  // Notificar mudanças - ENVIAR TODOS os SKUs (enabled e disabled)
  useEffect(() => {
    const allSkus = Array.from(skuSelections.values())
    onVariantsChange(allSkus)
  }, [skuSelections])

  const togglePropertyOption = (propertyId: string, optionId: string) => {
    setPropertySelections(prev => ({
      ...prev,
      [propertyId]: {
        ...prev[propertyId],
        [optionId]: !prev[propertyId]?.[optionId]
      }
    }))
  }

  const toggleAllOptions = (propertyId: string, enable: boolean) => {
    const prop = variants?.properties.find(p => p.id === propertyId)
    if (!prop) return
    
    setPropertySelections(prev => ({
      ...prev,
      [propertyId]: prop.options.reduce((acc, opt) => {
        acc[opt.id] = enable
        return acc
      }, {} as Record<string, boolean>)
    }))
  }

  const toggleSku = (skuId: string) => {
    setSkuSelections(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(skuId)
      if (current) {
        newMap.set(skuId, { ...current, enabled: !current.enabled })
      }
      return newMap
    })
  }

  const updateSkuStock = (skuId: string, stock: number) => {
    setSkuSelections(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(skuId)
      if (current) {
        newMap.set(skuId, { ...current, customStock: stock })
      }
      return newMap
    })
  }

  const updateSkuPrice = (skuId: string, price: number) => {
    setSkuSelections(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(skuId)
      if (current) {
        // Recalcular margem baseado no novo preço
        const costPrice = current.costPrice || 0
        const newMargin = costPrice > 0 ? ((price - costPrice) / price) * 100 : 0
        newMap.set(skuId, { ...current, customPrice: price, margin: newMargin })
      }
      return newMap
    })
  }

  const updateSkuMargin = (skuId: string, margin: number, costPrice: number) => {
    setSkuSelections(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(skuId)
      if (current) {
        // Calcular preço baseado na margem: custo / (1 - margem/100)
        const newPrice = margin >= 100 ? costPrice * 10 : costPrice / (1 - margin / 100)
        newMap.set(skuId, { ...current, margin, customPrice: newPrice })
      }
      return newMap
    })
  }

  // Calcular estatísticas
  const enabledSkus = Array.from(skuSelections.values()).filter(s => s.enabled)
  const totalStock = variants?.skus
    .filter(sku => skuSelections.get(sku.skuId)?.enabled)
    .reduce((sum, sku) => {
      const selection = skuSelections.get(sku.skuId)
      return sum + (selection?.customStock ?? sku.stock)
    }, 0) ?? 0

  if (!variants) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 text-gray-500">
          <FiPackage size={20} />
          <span>Nenhuma variação importada disponível para este produto.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-6 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FiPackage className="text-gray-600" size={24} />
          <h3 className="text-lg font-semibold text-gray-800">
            Variações Importadas
          </h3>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
            {enabledSkus.length} de {variants.skus.length} SKUs ativos
          </span>
          <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full font-medium">
            {totalStock} unidades
          </span>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-6">
        Selecione quais cores e modelos você deseja disponibilizar para seus clientes.
        Você pode desmarcar as opções que não quer vender.
      </p>

      {/* Seleção por Propriedades */}
      <div className="space-y-6">
        {variants.properties.map(property => (
          <div key={property.id} className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-800">
                {property.name}
                <span className="text-sm text-gray-500 ml-2">
                  ({property.options.filter(o => propertySelections[property.id]?.[o.id]).length} de {property.options.length} selecionados)
                </span>
              </h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleAllOptions(property.id, true)}
                  className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
                >
                  Selecionar Todos
                </button>
                <button
                  type="button"
                  onClick={() => toggleAllOptions(property.id, false)}
                  className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                >
                  Desmarcar Todos
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {property.options.map(option => {
                const isSelected = propertySelections[property.id]?.[option.id] ?? true
                const isColor = property.type === 'color'
                
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => togglePropertyOption(property.id, option.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-gray-300 bg-gray-100 text-gray-500 opacity-60'
                    }`}
                  >
                    {isColor && (
                      <div 
                        className="w-5 h-5 rounded-full border border-gray-300"
                        style={{ backgroundColor: guessColorHex(option.value || option.label) }}
                      />
                    )}
                    <span className="font-medium">{option.value || option.label}</span>
                    {isSelected ? (
                      <FiCheck className="text-green-600" size={16} />
                    ) : (
                      <FiX className="text-red-500" size={16} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Lista de SKUs Resultantes */}
      <div className="mt-6 bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-800">
            Combinações (SKUs) Disponíveis
          </h4>
          <div className="flex items-center gap-4">
            {/* Aplicar Margem em Massa */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Aplicar margem:</span>
              <input
                type="number"
                id="bulkMargin"
                defaultValue={50}
                className="w-16 px-2 py-1 text-right border rounded text-sm"
                min="0"
                max="99"
              />
              <span className="text-gray-500">%</span>
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('bulkMargin') as HTMLInputElement
                  const margin = parseFloat(input.value) || 50
                  if (!variants) return
                  
                  setSkuSelections(prev => {
                    const newMap = new Map(prev)
                    variants.skus.forEach(sku => {
                      const current = newMap.get(sku.skuId)
                      if (current && current.enabled) {
                        const costPrice = sku.price
                        const newPrice = margin >= 100 ? costPrice * 10 : costPrice / (1 - margin / 100)
                        newMap.set(sku.skuId, { ...current, margin, customPrice: newPrice, costPrice })
                      }
                    })
                    return newMap
                  })
                }}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition"
              >
                Aplicar a Todos
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowAllSkus(!showAllSkus)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showAllSkus ? 'Mostrar Menos' : 'Mostrar Todos'}
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Ativo</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Variação</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Estoque</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Custo</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Margem %</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Preço Venda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {variants.skus
                .filter(sku => {
                  // Filtrar por propriedades selecionadas
                  return sku.properties.every(prop => 
                    propertySelections[prop.propertyId]?.[prop.optionId]
                  )
                })
                .slice(0, showAllSkus ? undefined : 10)
                .map(sku => {
                  const selection = skuSelections.get(sku.skuId)
                  const isEnabled = selection?.enabled ?? true
                  const displayStock = selection?.customStock ?? sku.stock
                  const costPrice = sku.price
                  const displayMargin = selection?.margin ?? 50
                  const displayPrice = selection?.customPrice ?? (costPrice / (1 - displayMargin / 100))
                  
                  return (
                    <tr 
                      key={sku.skuId}
                      className={`${isEnabled ? 'bg-white' : 'bg-gray-50 opacity-60'} hover:bg-gray-50 transition`}
                    >
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => toggleSku(sku.skuId)}
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition ${
                            isEnabled 
                              ? 'border-green-500 bg-green-500 text-white' 
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isEnabled && <FiCheck size={14} />}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {sku.image && (
                            <img 
                              src={sku.image} 
                              alt="" 
                              className="w-8 h-8 object-cover rounded"
                            />
                          )}
                          <span className="font-medium text-sm">
                            {sku.properties.map(p => p.optionValue || p.optionLabel).join(' / ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={displayStock}
                          onChange={(e) => updateSkuStock(sku.skuId, parseInt(e.target.value) || 0)}
                          disabled={!isEnabled}
                          className="w-16 px-2 py-1 text-right border rounded text-sm disabled:bg-gray-100"
                          min="0"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-sm text-gray-600 font-medium">
                          R$ {costPrice.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={displayMargin.toFixed(0)}
                            onChange={(e) => updateSkuMargin(sku.skuId, parseFloat(e.target.value) || 0, costPrice)}
                            disabled={!isEnabled}
                            className={`w-16 px-2 py-1 text-right border rounded text-sm disabled:bg-gray-100 ${
                              displayMargin >= 50 ? 'text-green-600 font-medium' : 
                              displayMargin >= 30 ? 'text-yellow-600' : 'text-red-600'
                            }`}
                            min="0"
                            max="99"
                          />
                          <span className="text-gray-500">%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-gray-500">R$</span>
                          <input
                            type="number"
                            value={displayPrice.toFixed(2)}
                            onChange={(e) => updateSkuPrice(sku.skuId, parseFloat(e.target.value) || 0)}
                            disabled={!isEnabled}
                            className="w-20 px-2 py-1 text-right border rounded text-sm disabled:bg-gray-100 font-medium"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
        
        {!showAllSkus && variants.skus.length > 10 && (
          <div className="text-center mt-3 text-sm text-gray-500">
            Mostrando 10 de {variants.skus.filter(sku => 
              sku.properties.every(prop => propertySelections[prop.propertyId]?.[prop.optionId])
            ).length} SKUs
          </div>
        )}
      </div>
    </div>
  )
}

// Função auxiliar para adivinhar cor hex
function guessColorHex(colorName: string): string {
  const colorMap: Record<string, string> = {
    'preto': '#000000', 'branco': '#FFFFFF', 'vermelho': '#FF0000',
    'azul': '#0000FF', 'verde': '#00FF00', 'amarelo': '#FFFF00',
    'laranja': '#FFA500', 'rosa': '#FFC0CB', 'roxo': '#800080',
    'marrom': '#8B4513', 'cinza': '#808080', 'dourado': '#FFD700',
    'black': '#000000', 'white': '#FFFFFF', 'red': '#FF0000',
    'blue': '#0000FF', 'green': '#00FF00', 'yellow': '#FFFF00',
    'orange': '#FFA500', 'pink': '#FFC0CB', 'purple': '#800080',
    'brown': '#8B4513', 'gray': '#808080', 'grey': '#808080',
    'gold': '#FFD700', 'silver': '#C0C0C0'
  }
  
  const lowerName = colorName.toLowerCase()
  for (const [key, hex] of Object.entries(colorMap)) {
    if (lowerName.includes(key)) return hex
  }
  return '#808080'
}
