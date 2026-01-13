'use client'

import { useState } from 'react'

interface ProductInfoTabsProps {
  product: any
  processedSpecs: Record<string, string>
  processedAttrs: Record<string, string>
}

export default function ProductInfoTabs({ product, processedSpecs, processedAttrs }: ProductInfoTabsProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'specs'>('info')

  return (
    <div className="mt-6 bg-gray-50 rounded-lg overflow-hidden">
      {/* Abas */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'info'
              ? 'bg-white text-primary-600 border-b-2 border-primary-600'
              : 'bg-gray-100 text-gray-600 hover:text-gray-800'
          }`}
        >
          📝 Informações do Produto
        </button>
        <button
          onClick={() => setActiveTab('specs')}
          className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'specs'
              ? 'bg-white text-primary-600 border-b-2 border-primary-600'
              : 'bg-gray-100 text-gray-600 hover:text-gray-800'
          }`}
        >
          ⚙️ Características
        </button>
      </div>

      {/* Conteúdo das abas */}
      <div className="p-4 bg-white">
        {activeTab === 'info' && (
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-sm text-gray-500">Categoria</dt>
              <dd className="text-sm font-semibold text-primary-600">{product.category.name}</dd>
            </div>
            {product.brand && (
              <div>
                <dt className="text-sm text-gray-500">Marca</dt>
                <dd className="text-sm font-semibold">{product.brand}</dd>
              </div>
            )}
            {product.model && (
              <div>
                <dt className="text-sm text-gray-500">Modelo</dt>
                <dd className="text-sm font-semibold">{product.model}</dd>
              </div>
            )}
            {product.color && (
              <div>
                <dt className="text-sm text-gray-500">Cor</dt>
                <dd className="text-sm font-semibold">{product.color}</dd>
              </div>
            )}
            {product.gtin && (
              <div>
                <dt className="text-sm text-gray-500">GTIN/EAN</dt>
                <dd className="text-sm font-semibold font-mono">{product.gtin}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-gray-500">Disponibilidade</dt>
              <dd className="text-sm font-semibold">
                {product.stock > 0 ? `${product.stock} unidades` : 'Sob consulta'}
              </dd>
            </div>
          </dl>
        )}

        {activeTab === 'specs' && (
          <div className="space-y-4">
            {/* Especificações Técnicas */}
            {Object.keys(processedSpecs).length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 text-gray-700">Especificações Técnicas</h4>
                <dl className="space-y-2">
                  {Object.entries(processedSpecs).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex items-start border-b border-gray-100 pb-2">
                      <dt className="text-sm text-gray-600 min-w-[140px] font-medium">{key}</dt>
                      <dd className="text-sm text-gray-800">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Informações Adicionais */}
            {Object.keys(processedAttrs).length > 0 && (
              <div className={Object.keys(processedSpecs).length > 0 ? 'pt-4 border-t border-gray-200' : ''}>
                <h4 className="font-semibold text-sm mb-2 text-gray-700">Informações Adicionais</h4>
                <dl className="space-y-2">
                  {Object.entries(processedAttrs).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex items-start border-b border-gray-100 pb-2">
                      <dt className="text-sm text-gray-600 min-w-[140px] font-medium">{key}</dt>
                      <dd className="text-sm text-gray-800">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Mensagem se não houver características */}
            {Object.keys(processedSpecs).length === 0 && Object.keys(processedAttrs).length === 0 && (
              <p className="text-sm text-gray-500 italic text-center py-4">
                Nenhuma característica técnica disponível para este produto.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
