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
          <div className="space-y-4">
            {/* Informações Básicas */}
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-sm text-gray-500">Categoria</dt>
                <dd className="text-sm font-semibold text-primary-600">{product.category?.name || 'Não definida'}</dd>
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

            {/* Dimensões e Peso */}
            {(product.weight || product.length || product.width || product.height) && (
              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-sm mb-3 text-gray-700 flex items-center gap-2">
                  📦 Dimensões e Peso
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Dimensões do Produto */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Produto</h5>
                    <dl className="space-y-1">
                      {product.weight && (
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">Peso</dt>
                          <dd className="text-sm font-semibold">{(product.weight * 1000).toFixed(0)}g</dd>
                        </div>
                      )}
                      {(product.length || product.width || product.height) && (
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">Dimensões</dt>
                          <dd className="text-sm font-semibold">
                            {product.length || '—'} × {product.width || '—'} × {product.height || '—'} cm
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Dimensões com Embalagem */}
                  {(product.weightWithPackage || product.lengthWithPackage || product.widthWithPackage || product.heightWithPackage) && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-blue-600 uppercase mb-2">📦 Com Embalagem</h5>
                      <dl className="space-y-1">
                        {product.weightWithPackage && (
                          <div className="flex justify-between">
                            <dt className="text-sm text-gray-600">Peso</dt>
                            <dd className="text-sm font-semibold">{(product.weightWithPackage * 1000).toFixed(0)}g</dd>
                          </div>
                        )}
                        {(product.lengthWithPackage || product.widthWithPackage || product.heightWithPackage) && (
                          <div className="flex justify-between">
                            <dt className="text-sm text-gray-600">Dimensões</dt>
                            <dd className="text-sm font-semibold">
                              {product.lengthWithPackage || '—'} × {product.widthWithPackage || '—'} × {product.heightWithPackage || '—'} cm
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
