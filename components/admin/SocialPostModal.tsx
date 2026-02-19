'use client'

import { useState, useEffect, useRef } from 'react'
import { FiX, FiUpload, FiInstagram, FiFacebook, FiCheck, FiLoader, FiShare2 } from 'react-icons/fi'
import Image from 'next/image'
import { toast } from 'react-hot-toast'

interface SocialConnection {
  id: string
  platform: 'FACEBOOK' | 'INSTAGRAM'
  name: string
  isActive: boolean
  metadata?: any
}

interface SocialPostModalProps {
  product: {
    id: string
    name: string
    price: number
    slug: string
    images: string
  }
  onClose: () => void
  onSuccess: () => void
}

export default function SocialPostModal({ product, onClose, onSuccess }: SocialPostModalProps) {
  const [connections, setConnections] = useState<SocialConnection[]>([])
  const [selectedConnections, setSelectedConnections] = useState<string[]>([])
  const [customImages, setCustomImages] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadConnections()
    generateDefaultCaption()
    loadProductImages()
  }, [])

  const loadConnections = async () => {
    try {
      const response = await fetch('/api/social/connections')
      const data = await response.json()
      setConnections(data.filter((c: SocialConnection) => c.isActive))
    } catch (error) {
      console.error('Erro ao carregar conexões:', error)
    }
  }

  const loadProductImages = () => {
    try {
      const images = typeof product.images === 'string' 
        ? JSON.parse(product.images)
        : product.images
      if (Array.isArray(images)) {
        setCustomImages(images)
      }
    } catch (err) {
      console.error('Erro ao carregar imagens:', err)
    }
  }

  const generateDefaultCaption = () => {
    const text = `🔥 ${product.name}

💰 ${formatPrice(product.price)}

🛒 Compre agora: ${window.location.origin}/produto/${product.slug}

#ecommerce #loja #produto #compras #ofertas`
    
    setCaption(text)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const newImages: string[] = []

    try {
      for (const file of Array.from(files)) {
        // Converter para base64 ou fazer upload para um serviço
        // Por simplicidade, vamos usar URLs de objeto temporárias
        const reader = new FileReader()
        await new Promise((resolve) => {
          reader.onload = (e) => {
            if (e.target?.result) {
              newImages.push(e.target.result as string)
            }
            resolve(null)
          }
          reader.readAsDataURL(file)
        })
      }
      
      setCustomImages([...customImages, ...newImages])
      toast.success(`${newImages.length} imagem(ns) adicionada(s)`)
    } catch (error) {
      console.error('Erro ao carregar imagens:', error)
      toast.error('Erro ao carregar imagens')
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (index: number) => {
    setCustomImages(customImages.filter((_, i) => i !== index))
  }

  const toggleConnection = (connectionId: string) => {
    setSelectedConnections(prev => 
      prev.includes(connectionId)
        ? prev.filter(id => id !== connectionId)
        : [...prev, connectionId]
    )
  }

  const handlePublish = async () => {
    if (selectedConnections.length === 0) {
      toast.error('Selecione pelo menos uma rede social')
      return
    }

    if (customImages.length === 0) {
      toast.error('Adicione pelo menos uma imagem')
      return
    }

    if (!caption.trim()) {
      toast.error('Adicione uma legenda')
      return
    }

    setPublishing(true)

    try {
      // Para cada conexão selecionada, criar e publicar um post
      const publishPromises = selectedConnections.map(async (connectionId) => {
        // 1. Criar post (draft)
        const createResponse = await fetch('/api/social/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectionId,
            productId: product.id,
            platform: connections.find(c => c.id === connectionId)?.platform,
            caption,
            images: customImages
          })
        })

        if (!createResponse.ok) {
          throw new Error('Erro ao criar post')
        }

        const post = await createResponse.json()

        // 2. Publicar post
        const publishResponse = await fetch(`/api/social/posts/${post.id}/publish`, {
          method: 'POST'
        })

        if (!publishResponse.ok) {
          const error = await publishResponse.json()
          throw new Error(error.error || 'Erro ao publicar')
        }

        return await publishResponse.json()
      })

      const results = await Promise.allSettled(publishPromises)
      
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      if (successful > 0) {
        toast.success(`✅ ${successful} publicação(ões) realizada(s)!`)
      }
      
      if (failed > 0) {
        toast.error(`❌ ${failed} publicação(ões) falharam`)
      }

      if (successful > 0) {
        onSuccess()
        setTimeout(() => onClose(), 1500)
      }
    } catch (error: any) {
      console.error('Erro ao publicar:', error)
      toast.error(error.message || 'Erro ao publicar posts')
    } finally {
      setPublishing(false)
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'FACEBOOK':
        return <FiFacebook className="text-blue-600" />
      case 'INSTAGRAM':
        return <FiInstagram className="text-pink-600" />
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Postar nas Redes Sociais</h2>
            <p className="text-sm text-gray-600 mt-1">{product.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
            disabled={publishing}
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imagens do Post
              </label>
              
              {/* Image Grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {customImages.map((img, index) => (
                  <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <Image
                      src={img}
                      alt={`Imagem ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-primary-600"
              >
                {uploading ? (
                  <>
                    <FiLoader className="animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <FiUpload />
                    Adicionar Imagens
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-2">
                Arraste ou clique para adicionar imagens personalizadas
              </p>
            </div>

            {/* Right: Caption & Platforms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Legenda / Texto
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                placeholder="Escreva a legenda do post..."
              />
              <p className="text-xs text-gray-500 mt-1">
                {caption.length} caracteres
              </p>

              {/* Platforms Selection */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Onde publicar?
                </label>
                
                {connections.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Nenhuma rede social conectada.{' '}
                      <a
                        href="/api/social/meta/auth"
                        className="font-medium underline hover:text-yellow-900"
                      >
                        Conectar agora
                      </a>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {connections.map(connection => (
                      <label
                        key={connection.id}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedConnections.includes(connection.id)
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedConnections.includes(connection.id)}
                          onChange={() => toggleConnection(connection.id)}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                        {getPlatformIcon(connection.platform)}
                        <span className="flex-1 font-medium text-gray-900">
                          {connection.name}
                        </span>
                        {selectedConnections.includes(connection.id) && (
                          <FiCheck className="text-primary-600" />
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={publishing}
            className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          
          <button
            onClick={handlePublish}
            disabled={publishing || selectedConnections.length === 0 || customImages.length === 0}
            className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-lg hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {publishing ? (
              <>
                <FiLoader className="animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <FiShare2 />
                Publicar em {selectedConnections.length || ''}
                {selectedConnections.length > 0 && ` rede${selectedConnections.length > 1 ? 's' : ''}`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
