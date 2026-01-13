'use client'

import { useState } from 'react'
import ProductImageGallery from './ProductImageGallery'
import ProductSelectionWrapper from './ProductSelectionWrapper'
import ProductInfoTabs from './ProductInfoTabs'

interface ProductDetailClientProps {
  product: any
  variants: any
  processedSpecs: any
  processedAttrs: any
}

export default function ProductDetailClient({ 
  product, 
  variants,
  processedSpecs,
  processedAttrs
}: ProductDetailClientProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null)

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <ProductImageGallery 
          images={product.images} 
          productName={product.name}
          selectedColor={selectedColor}
          variants={variants}
        />
        
        {/* Abas de Informações e Características */}
        <ProductInfoTabs 
          product={product}
          processedSpecs={processedSpecs}
          processedAttrs={processedAttrs}
        />
      </div>

      <div>
        <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
        <div className="flex items-center space-x-4 mb-6">
          <span className="text-4xl font-bold text-primary-600">
            R$ {product.price.toFixed(2)}
          </span>
          {product.comparePrice && (
            <span className="text-2xl text-gray-400 line-through">
              R$ {product.comparePrice.toFixed(2)}
            </span>
          )}
        </div>
        <div className="mb-6">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
            product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {product.stock > 0 ? `${product.stock} em estoque` : 'Esgotado'}
          </span>
        </div>
        <p className="text-gray-600 mb-6">{product.description}</p>
        
        {/* Componente wrapper com seleção de cor/tamanho e botão */}
        <ProductSelectionWrapper
          product={product}
          variants={variants}
          sizes={product.sizes}
          sizeType={product.sizeType || 'adult'}
          sizeCategory={product.sizeCategory || 'shoes'}
          onColorChange={setSelectedColor}
        />
      </div>
    </div>
  )
}
