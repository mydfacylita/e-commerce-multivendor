'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { 
  ProductVariants, 
  ProductSku, 
  VariantProperty,
  findSkuBySelections,
  parseVariantsJson 
} from '@/lib/product-variants'

interface VariantSelectorProps {
  variantsJson: string | null
  onSkuSelect?: (sku: ProductSku | null) => void
  initialSkuId?: string
  showStock?: boolean
  showPrice?: boolean
  disabled?: boolean
}

export default function VariantSelector({
  variantsJson,
  onSkuSelect,
  initialSkuId,
  showStock = true,
  showPrice = true,
  disabled = false
}: VariantSelectorProps) {
  const variants = useMemo(() => parseVariantsJson(variantsJson), [variantsJson])
  
  // Estado das seleções do usuário { propertyId: optionId }
  const [selections, setSelections] = useState<Record<string, string>>({})
  
  // SKU selecionado atualmente
  const [selectedSku, setSelectedSku] = useState<ProductSku | null>(null)

  // Inicializar com SKU inicial ou primeiro disponível
  useEffect(() => {
    if (!variants || variants.skus.length === 0) return
    
    let targetSku: ProductSku | undefined
    
    if (initialSkuId) {
      targetSku = variants.skus.find(s => s.skuId === initialSkuId)
    }
    
    if (!targetSku) {
      // Selecionar primeiro SKU disponível
      targetSku = variants.skus.find(s => s.available) || variants.skus[0]
    }
    
    if (targetSku) {
      const initialSelections: Record<string, string> = {}
      targetSku.properties.forEach(p => {
        initialSelections[p.propertyId] = p.optionId
      })
      setSelections(initialSelections)
      setSelectedSku(targetSku)
      onSkuSelect?.(targetSku)
    }
  }, [variants, initialSkuId])

  // Atualizar SKU quando seleções mudam
  useEffect(() => {
    if (!variants) return
    
    const selectionArray = Object.entries(selections).map(([propertyId, optionId]) => ({
      propertyId,
      optionId
    }))
    
    if (selectionArray.length === variants.properties.length) {
      const sku = findSkuBySelections(variants, selectionArray)
      setSelectedSku(sku)
      onSkuSelect?.(sku)
    }
  }, [selections, variants, onSkuSelect])

  // Verificar se uma opção está disponível (tem SKU com estoque)
  const isOptionAvailable = (propertyId: string, optionId: string): boolean => {
    if (!variants) return false
    
    // Criar seleções hipotéticas com esta opção
    const hypotheticalSelections = { ...selections, [propertyId]: optionId }
    
    // Verificar se existe algum SKU disponível com essas seleções
    return variants.skus.some(sku => {
      const matchesSelections = Object.entries(hypotheticalSelections).every(([propId, optId]) =>
        sku.properties.some(p => p.propertyId === propId && p.optionId === optId)
      )
      return matchesSelections && sku.available && sku.stock > 0
    })
  }

  // Handler para seleção de opção
  const handleOptionSelect = (propertyId: string, optionId: string) => {
    if (disabled) return
    setSelections(prev => ({ ...prev, [propertyId]: optionId }))
  }

  if (!variants || variants.properties.length === 0) {
    return null // Produto sem variações
  }

  return (
    <div className="space-y-4">
      {variants.properties.map(property => (
        <div key={property.id}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {property.name}
            {selections[property.id] && (
              <span className="ml-2 text-gray-500 font-normal">
                : {property.options.find(o => o.id === selections[property.id])?.label}
              </span>
            )}
          </label>
          
          <div className="flex flex-wrap gap-2">
            {property.options.map(option => {
              const isSelected = selections[property.id] === option.id
              const isAvailable = isOptionAvailable(property.id, option.id)
              
              // Renderização baseada no tipo de propriedade
              if (property.type === 'color' && option.image) {
                // Opção com imagem (cor/estilo)
                return (
                  <button
                    key={option.id}
                    onClick={() => handleOptionSelect(property.id, option.id)}
                    disabled={disabled || !isAvailable}
                    className={`
                      relative w-12 h-12 rounded-lg border-2 overflow-hidden transition-all
                      ${isSelected 
                        ? 'border-blue-500 ring-2 ring-blue-200' 
                        : 'border-gray-200 hover:border-gray-300'
                      }
                      ${!isAvailable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                      ${disabled ? 'cursor-not-allowed' : ''}
                    `}
                    title={option.label}
                  >
                    <Image
                      src={option.image}
                      alt={option.label}
                      fill
                      className="object-cover"
                    />
                    {!isAvailable && (
                      <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-red-500 rotate-45 transform origin-center" />
                      </div>
                    )}
                  </button>
                )
              }
              
              // Opção padrão (texto)
              return (
                <button
                  key={option.id}
                  onClick={() => handleOptionSelect(property.id, option.id)}
                  disabled={disabled || !isAvailable}
                  className={`
                    px-4 py-2 rounded-lg border text-sm font-medium transition-all
                    ${isSelected 
                      ? 'bg-blue-500 text-white border-blue-500' 
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }
                    ${!isAvailable 
                      ? 'opacity-40 cursor-not-allowed line-through' 
                      : 'cursor-pointer'
                    }
                    ${disabled ? 'cursor-not-allowed' : ''}
                  `}
                >
                  {option.label || option.value}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Info do SKU selecionado */}
      {selectedSku && (showPrice || showStock) && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            {showPrice && (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-green-600">
                  R$ {selectedSku.price.toFixed(2)}
                </span>
                {selectedSku.originalPrice && selectedSku.originalPrice > selectedSku.price && (
                  <span className="text-sm text-gray-400 line-through">
                    R$ {selectedSku.originalPrice.toFixed(2)}
                  </span>
                )}
              </div>
            )}
            
            {showStock && (
              <div className={`text-sm ${selectedSku.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {selectedSku.stock > 0 ? (
                  <>
                    <span className="font-medium">{selectedSku.stock}</span> em estoque
                  </>
                ) : (
                  'Sem estoque'
                )}
              </div>
            )}
          </div>
          
          {/* Imagem do SKU se houver */}
          {selectedSku.image && (
            <div className="mt-2 w-16 h-16 relative rounded overflow-hidden">
              <Image
                src={selectedSku.image}
                alt="Variação selecionada"
                fill
                className="object-cover"
              />
            </div>
          )}
        </div>
      )}

      {/* Aviso se SKU não encontrado */}
      {!selectedSku && Object.keys(selections).length === variants.properties.length && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          ⚠️ Combinação não disponível. Selecione outras opções.
        </div>
      )}
    </div>
  )
}

// ============================================
// COMPONENTE SIMPLES PARA EXIBIÇÃO APENAS
// ============================================

interface VariantBadgesProps {
  variantsJson: string | null
  skuAttr?: string  // Se fornecido, mostra apenas esta variação
  maxShow?: number  // Máximo de badges a mostrar
}

export function VariantBadges({ variantsJson, skuAttr, maxShow = 5 }: VariantBadgesProps) {
  const variants = useMemo(() => parseVariantsJson(variantsJson), [variantsJson])
  
  if (!variants) return null

  // Se skuAttr fornecido, mostrar apenas essa variação
  if (skuAttr) {
    const sku = variants.skus.find(s => s.skuAttr === skuAttr)
    if (!sku) return null
    
    return (
      <div className="flex flex-wrap gap-1">
        {sku.properties.map(prop => (
          <span 
            key={prop.propertyId}
            className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
          >
            {prop.propertyName}: {prop.optionLabel}
          </span>
        ))}
      </div>
    )
  }

  // Mostrar todas as opções disponíveis
  return (
    <div className="space-y-1">
      {variants.properties.map(prop => (
        <div key={prop.id} className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-gray-500">{prop.name}:</span>
          {prop.options.slice(0, maxShow).map(opt => (
            <span 
              key={opt.id}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
            >
              {opt.label}
            </span>
          ))}
          {prop.options.length > maxShow && (
            <span className="text-xs text-gray-400">
              +{prop.options.length - maxShow}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ============================================
// RESUMO COMPACTO
// ============================================

interface VariantSummaryProps {
  variantsJson: string | null
}

export function VariantSummary({ variantsJson }: VariantSummaryProps) {
  const variants = useMemo(() => parseVariantsJson(variantsJson), [variantsJson])
  
  if (!variants) return null
  
  const availableSkus = variants.skus.filter(s => s.available).length
  
  return (
    <div className="text-sm text-gray-600">
      <span className="font-medium">{variants.skus.length}</span> variações
      {availableSkus < variants.skus.length && (
        <span className="text-yellow-600 ml-1">
          ({availableSkus} disponíveis)
        </span>
      )}
      {variants.metadata && (
        <span className="ml-2">
          R$ {variants.metadata.minPrice?.toFixed(2)} - R$ {variants.metadata.maxPrice?.toFixed(2)}
        </span>
      )}
    </div>
  )
}
