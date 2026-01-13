'use client'

import { useState, useRef } from 'react'
import { FiUpload, FiX, FiImage } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface ImageUploaderProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  maxImages?: number
}

export default function ImageUploader({ images, onImagesChange, maxImages = 10 }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    )

    if (files.length === 0) {
      toast.error('Por favor, selecione apenas arquivos de imagem')
      return
    }

    if (images.length + files.length > maxImages) {
      toast.error(`Máximo de ${maxImages} imagens permitidas`)
      return
    }

    await uploadFiles(files)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(file =>
      file.type.startsWith('image/')
    )

    if (files.length === 0) {
      toast.error('Por favor, selecione apenas arquivos de imagem')
      return
    }

    if (images.length + files.length > maxImages) {
      toast.error(`Máximo de ${maxImages} imagens permitidas`)
      return
    }

    await uploadFiles(files)
  }

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true)

    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Erro ao fazer upload')
        }

        const data = await response.json()
        return data.url
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      onImagesChange([...images, ...uploadedUrls])
      toast.success(`${uploadedUrls.length} imagem(ns) enviada(s) com sucesso!`)
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      toast.error('Erro ao fazer upload das imagens')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    onImagesChange(newImages)
    toast.success('Imagem removida')
  }

  const handleAddUrl = () => {
    const url = prompt('Cole a URL da imagem:')
    if (url && url.trim()) {
      if (images.length >= maxImages) {
        toast.error(`Máximo de ${maxImages} imagens permitidas`)
        return
      }
      onImagesChange([...images, url.trim()])
      toast.success('Imagem adicionada')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">Imagens do Produto *</label>
        <span className="text-xs text-gray-500">
          {images.length}/{maxImages} imagens
        </span>
      </div>

      {/* Área de Upload */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        <FiUpload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        
        {isUploading ? (
          <div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Enviando imagens...</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Arraste e solte imagens aqui ou <span className="text-primary-600 font-medium">clique para selecionar</span>
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPG, JPEG, WEBP até 5MB por arquivo
            </p>
          </div>
        )}
      </div>

      {/* Botão para adicionar URL */}
      <button
        type="button"
        onClick={handleAddUrl}
        disabled={isUploading || images.length >= maxImages}
        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FiImage className="inline mr-2" />
        Adicionar URL de imagem
      </button>

      {/* Preview das Imagens */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                <img
                  src={image}
                  alt={`Produto ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-image.svg'
                  }}
                />
              </div>
              
              {/* Badge de imagem principal */}
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-primary-600 text-white text-xs px-2 py-1 rounded">
                  Principal
                </div>
              )}

              {/* Botão de remover */}
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <FiX className="w-4 h-4" />
              </button>

              {/* Número da ordem */}
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                #{index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500">
        💡 A primeira imagem será usada como capa do produto. Arraste para reordenar.
      </p>
    </div>
  )
}
