'use client'

import { useState } from 'react'

interface Variant {
  sku_id?: string
  sku_available_stock?: number
  sku_stock?: number
  sku_price?: string
  aeop_s_k_u_propertys?: {
    aeop_sku_property?: Array<{
      sku_property_id?: string
      sku_property_name?: string
      sku_property_value?: string
      property_value_id?: string
      property_value_definition_name?: string
    }>
  }
}

interface ProductVariantSelectorProps {
  variants: any
  supplierName?: string
}

export default function ProductVariantSelector({ variants, supplierName }: ProductVariantSelectorProps) {
  console.log('🚀 ProductVariantSelector CARREGADO!')
  
  const [selectedVariant, setSelectedVariant] = useState<Record<string, string>>({})
  
  console.log('📦 Variants recebidos:', variants)
  console.log('🏪 Supplier:', supplierName)
  
  if (!variants) {
    console.log('❌ Variants é null/undefined')
    return null
  }

  // Processar variantes do AliExpress
  if (supplierName?.toLowerCase().includes('aliexpress')) {
    const skuList = variants.aeop_ae_product_s_k_us?.aeop_ae_product_sku || variants.aeop_ae_product_sku || []
    
    console.log('📋 SKU List:', skuList)
    console.log('📋 É array?', Array.isArray(skuList))
    console.log('📋 Tamanho:', skuList.length)
    
    if (!Array.isArray(skuList) || skuList.length === 0) {
      console.log('❌ SKU List vazio ou não é array')
      return null
    }

    // Extrair todas as propriedades únicas (cor, tamanho, etc)
    const propertyGroups: Record<string, Set<string>> = {}
    const propertyValueMap: Record<string, Record<string, string>> = {}

    skuList.forEach((sku: Variant) => {
      const properties = sku.aeop_s_k_u_propertys?.aeop_sku_property || []
      
      properties.forEach((prop: any) => {
        const propertyName = prop.sku_property_name || 'Opção'
        const propertyValue = prop.property_value_definition_name || prop.sku_property_value || ''
        const propertyId = prop.sku_property_id || ''
        const valueId = prop.property_value_id || ''

        if (!propertyGroups[propertyName]) {
          propertyGroups[propertyName] = new Set()
          propertyValueMap[propertyName] = {}
        }

        propertyGroups[propertyName].add(propertyValue)
        propertyValueMap[propertyName][propertyValue] = valueId
      })
    })

    // Encontrar SKU selecionado
    const selectedSku = skuList.find((sku: Variant) => {
      const properties = sku.aeop_s_k_u_propertys?.aeop_sku_property || []
      return properties.every((prop: any) => {
        const propertyName = prop.sku_property_name || 'Opção'
        const propertyValue = prop.property_value_definition_name || prop.sku_property_value || ''
        return selectedVariant[propertyName] === propertyValue
      })
    })

    const selectedPrice = selectedSku?.sku_price
    const selectedStock = selectedSku?.sku_available_stock || selectedSku?.sku_stock

    return (
      <div className="mb-6 border-t pt-6">
        <h3 className="font-semibold text-lg mb-4">🎨 Selecione as Opções</h3>
        
        <div className="space-y-4">
          {Object.entries(propertyGroups).map(([propertyName, values]) => (
            <div key={propertyName}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {propertyName}
                {selectedVariant[propertyName] && (
                  <span className="ml-2 text-primary-600">: {selectedVariant[propertyName]}</span>
                )}
              </label>
              
              <div className="flex flex-wrap gap-2">
                {Array.from(values).map((value) => {
                  const isSelected = selectedVariant[propertyName] === value
                  
                  return (
                    <button
                      key={value}
                      onClick={() => setSelectedVariant(prev => ({
                        ...prev,
                        [propertyName]: value
                      }))}
                      className={`px-4 py-2 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-primary-600 bg-primary-50 text-primary-700 font-semibold'
                          : 'border-gray-300 hover:border-primary-400 bg-white'
                      }`}
                    >
                      {value}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {selectedPrice && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Preço desta variante:</span>
              <span className="text-2xl font-bold text-primary-600">
                R$ {parseFloat(selectedPrice).toFixed(2)}
              </span>
            </div>
            {selectedStock !== undefined && (
              <div className="mt-2 text-sm text-gray-600">
                Estoque disponível: <span className="font-semibold">{selectedStock}</span>
              </div>
            )}
          </div>
        )}

        {Object.keys(selectedVariant).length > 0 && Object.keys(selectedVariant).length < Object.keys(propertyGroups).length && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Por favor, selecione todas as opções
            </p>
          </div>
        )}
      </div>
    )
  }

  // Tratamento genérico para outros fornecedores
  return null
}
