'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface ProductImageGalleryProps {
  images: string[]
  productName: string
  selectedColor?: string | null
  variants?: any[] | null  // Para pegar o imageIndex da cor selecionada
}

export default function ProductImageGallery({ images, productName, selectedColor, variants }: ProductImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0)

  // Quando a cor mudar, usar o imageIndex se disponível
  useEffect(() => {
    if (selectedColor && variants && variants.length > 0) {
      // Procurar variant da cor selecionada que tenha imageIndex
      const variant = variants.find(v => v.color === selectedColor && v.imageIndex !== undefined)
      
      if (variant && variant.imageIndex !== undefined && variant.imageIndex < images.length) {
        setSelectedImage(variant.imageIndex)
      } else {
        // Fallback: tentar encontrar por nome do arquivo
        const colorLower = selectedColor.toLowerCase()
        const colorImageIndex = images.findIndex(img => 
          img.toLowerCase().includes(colorLower) || 
          img.toLowerCase().includes(colorLower.replace(/\s+/g, '-')) ||
          img.toLowerCase().includes(colorLower.replace(/\s+/g, '_'))
        )
        
        if (colorImageIndex >= 0) {
          setSelectedImage(colorImageIndex)
        }
      }
    }
  }, [selectedColor, images, variants])

  if (!images || images.length === 0) {
    return (
      <div className="relative h-96 bg-gray-200 rounded-lg overflow-hidden mb-4">
        <div className="flex items-center justify-center h-full text-gray-400">
          Sem Imagem
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Imagem principal */}
      <div className="relative h-96 bg-gray-200 rounded-lg overflow-hidden mb-4">
        <Image
          src={images[selectedImage]}
          alt={`${productName} - Imagem ${selectedImage + 1}`}
          fill
          className="object-contain"
          unoptimized
          priority={selectedImage === 0}
        />
      </div>
      
      {/* Grid de miniaturas */}
      {images.length > 1 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">
            📸 {images.length} imagens disponíveis
          </p>
          <div className="grid grid-cols-5 gap-2">
            {images.map((image: string, index: number) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`relative h-20 bg-gray-200 rounded-lg overflow-hidden border-2 transition cursor-pointer ${
                  selectedImage === index
                    ? 'border-primary-600 ring-2 ring-primary-300'
                    : 'border-gray-300 hover:border-primary-400'
                }`}
              >
                <Image 
                  src={image} 
                  alt={`${productName} ${index + 1}`} 
                  fill 
                  className="object-contain p-1"
                  unoptimized
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
