'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'

interface ProductImageGalleryProps {
  images: string[]
  productName: string
  selectedColor?: string | null
  variants?: any[] | null  // Para pegar o imageIndex da cor selecionada
}

export default function ProductImageGallery({ images, productName, selectedColor, variants }: ProductImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0)
  const [isZooming, setIsZooming] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  
  // Configurações do zoom
  const ZOOM_LEVEL = 2.5 // Nível de ampliação
  const LENS_SIZE = 150 // Tamanho da lupa em pixels

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

  // Fechar modal com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false)
      }
      // Navegação com setas no modal
      if (isModalOpen) {
        if (e.key === 'ArrowLeft') {
          setSelectedImage(prev => prev > 0 ? prev - 1 : images.length - 1)
        } else if (e.key === 'ArrowRight') {
          setSelectedImage(prev => prev < images.length - 1 ? prev + 1 : 0)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen, images.length])

  // Bloquear scroll quando modal aberto
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isModalOpen])

  // Handler do movimento do mouse para zoom
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return
    
    const rect = imageContainerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    
    setZoomPosition({ x, y })
  }, [])

  const handleMouseEnter = () => setIsZooming(true)
  const handleMouseLeave = () => setIsZooming(false)

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
      {/* Imagem principal com zoom */}
      <div className="relative flex gap-4">
        {/* Container da imagem */}
        <div 
          ref={imageContainerRef}
          className="relative h-96 flex-1 bg-gray-100 rounded-lg overflow-hidden mb-4 cursor-zoom-in group"
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => setIsModalOpen(true)}
        >
          <Image
            src={images[selectedImage]}
            alt={`${productName} - Imagem ${selectedImage + 1}`}
            fill
            className="object-contain"
            unoptimized
            priority={selectedImage === 0}
          />
          
          {/* Indicador de lupa no hover */}
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            Clique para ampliar
          </div>

          {/* Indicador da lupa (círculo que segue o mouse) */}
          {isZooming && (
            <div 
              className="absolute border-2 border-primary-500 rounded-full pointer-events-none bg-white/20"
              style={{
                width: LENS_SIZE,
                height: LENS_SIZE,
                left: `calc(${zoomPosition.x}% - ${LENS_SIZE/2}px)`,
                top: `calc(${zoomPosition.y}% - ${LENS_SIZE/2}px)`,
              }}
            />
          )}
        </div>

        {/* Preview de zoom ao lado */}
        {isZooming && (
          <div 
            className="hidden lg:block absolute left-full ml-4 w-80 h-80 bg-white border-2 border-gray-200 rounded-lg shadow-xl overflow-hidden z-50"
            style={{
              top: 0,
            }}
          >
            <div 
              className="absolute w-full h-full"
              style={{
                backgroundImage: `url(${images[selectedImage]})`,
                backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                backgroundSize: `${ZOOM_LEVEL * 100}%`,
                backgroundRepeat: 'no-repeat',
              }}
            />
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              🔍 {ZOOM_LEVEL}x
            </div>
          </div>
        )}
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

      {/* Modal Fullscreen */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setIsModalOpen(false)}
        >
          {/* Botão fechar */}
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 p-2"
            onClick={() => setIsModalOpen(false)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Contador de imagens */}
          <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {selectedImage + 1} / {images.length}
          </div>

          {/* Seta esquerda */}
          {images.length > 1 && (
            <button 
              className="absolute left-4 text-white hover:text-gray-300 p-2 bg-black/30 rounded-full hover:bg-black/50 transition"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedImage(prev => prev > 0 ? prev - 1 : images.length - 1)
              }}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Imagem central */}
          <div 
            className="relative max-w-[90vw] max-h-[90vh] w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[selectedImage]}
              alt={`${productName} - Imagem ${selectedImage + 1}`}
              fill
              className="object-contain"
              unoptimized
              priority
            />
          </div>

          {/* Seta direita */}
          {images.length > 1 && (
            <button 
              className="absolute right-4 text-white hover:text-gray-300 p-2 bg-black/30 rounded-full hover:bg-black/50 transition"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedImage(prev => prev < images.length - 1 ? prev + 1 : 0)
              }}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Miniaturas no modal */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-black/50 p-2 rounded-lg max-w-[90vw] overflow-x-auto">
              {images.map((image: string, index: number) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImage(index)
                  }}
                  className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition ${
                    selectedImage === index
                      ? 'border-white'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image 
                    src={image} 
                    alt={`${productName} ${index + 1}`} 
                    fill 
                    className="object-contain bg-white"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}

          {/* Instruções */}
          <div className="absolute bottom-4 right-4 text-white/60 text-xs">
            ESC para fechar • ← → para navegar
          </div>
        </div>
      )}
    </div>
  )
}
