'use client'

import { useState, useRef, useEffect } from 'react'
import { FiUpload, FiX, FiCheck, FiLoader, FiImage, FiEdit2 } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface ImageBackgroundRemoverProps {
  onImageProcessed: (imageUrl: string) => void
  onClose: () => void
  initialImage?: string
}

export default function ImageBackgroundRemover({ 
  onImageProcessed, 
  onClose,
  initialImage 
}: ImageBackgroundRemoverProps) {
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [processedImage, setProcessedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Carregar imagem inicial
  useEffect(() => {
    if (initialImage) {
      loadImage(initialImage)
    }
  }, [initialImage])

  const loadImage = async (url: string) => {
    try {
      setIsProcessing(true)
      setStatus('Carregando imagem...')
      
      if (url.startsWith('data:')) {
        setOriginalImage(url)
        return
      }

      // Carregar via proxy para CORS
      const response = await fetch(`/api/image/proxy?url=${encodeURIComponent(url)}`)
      if (response.ok) {
        const blob = await response.blob()
        const reader = new FileReader()
        reader.onload = (event) => {
          setOriginalImage(event.target?.result as string)
        }
        reader.readAsDataURL(blob)
      } else {
        setOriginalImage(url)
      }
    } catch (error) {
      console.error('Erro ao carregar imagem:', error)
      setOriginalImage(url)
    } finally {
      setIsProcessing(false)
      setStatus('')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem')
        return
      }
      
      const reader = new FileReader()
      reader.onload = (event) => {
        setOriginalImage(event.target?.result as string)
        setProcessedImage(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const processWithAI = async () => {
    if (!originalImage) return

    setIsProcessing(true)
    setProgress(0)
    setStatus('Preparando imagem...')

    try {
      setProgress(20)
      
      // Converter base64 para blob
      const response = await fetch(originalImage)
      const blob = await response.blob()
      
      setStatus('Enviando para processamento...')
      setProgress(40)

      // Enviar para nossa API que processa com remove.bg
      const formData = new FormData()
      formData.append('image', blob, 'image.png')
      
      const apiResponse = await fetch('/api/image/remove-background', {
        method: 'POST',
        body: formData
      })

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json()
        throw new Error(errorData.error || 'Erro ao processar imagem')
      }

      setProgress(80)
      setStatus('Adicionando fundo branco...')

      // Receber a imagem processada
      const resultBlob = await apiResponse.blob()
      
      // Converter para imagem com fundo branco
      const img = new Image()
      const resultUrl = URL.createObjectURL(resultBlob)
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = (e) => {
          console.error('Erro ao carregar resultado:', e)
          reject(new Error('Erro ao carregar resultado'))
        }
        img.src = resultUrl
      })

      // Criar canvas com fundo branco
      const canvas = canvasRef.current!
      const ctx = canvas.getContext('2d')!
      
      canvas.width = img.width
      canvas.height = img.height
      
      // Fundo branco
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Desenhar imagem sem fundo
      ctx.drawImage(img, 0, 0)
      
      // Converter para URL
      const finalUrl = canvas.toDataURL('image/jpeg', 0.95)
      setProcessedImage(finalUrl)
      
      URL.revokeObjectURL(resultUrl)
      setProgress(100)
      setStatus('Concluído!')
      
      toast.success('Fundo removido com sucesso!')

    } catch (error: any) {
      console.error('Erro detalhado ao processar:', error)
      toast.error(error?.message || 'Erro ao processar imagem')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirm = async () => {
    if (!processedImage) {
      toast.error('Processe uma imagem primeiro')
      return
    }

    try {
      setIsProcessing(true)
      setStatus('Salvando...')
      
      const blob = await fetch(processedImage).then(r => r.blob())
      const formData = new FormData()
      formData.append('file', blob, `produto-${Date.now()}.jpg`)
      formData.append('folder', 'products')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Erro ao fazer upload')
      }

      const data = await response.json()
      onImageProcessed(data.url)
      toast.success('Imagem salva com sucesso!')
      onClose()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar imagem')
    } finally {
      setIsProcessing(false)
      setStatus('')
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FiEdit2 className="text-white text-xl" />
            <h2 className="text-xl font-bold text-white">Remover Fundo com IA</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Upload Area */}
          {!originalImage && (
            <div 
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-500 transition cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <FiUpload size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Arraste uma imagem ou clique para selecionar
              </p>
              <p className="text-sm text-gray-500">
                A IA irá remover o fundo automaticamente
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Image Preview */}
          {originalImage && (
            <div className="space-y-6">
              {/* Info Box */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🤖</div>
                  <div>
                    <h3 className="font-semibold text-purple-800">Remoção de Fundo com Inteligência Artificial</h3>
                    <p className="text-sm text-purple-700 mt-1">
                      Clique em "Processar com IA" para remover automaticamente o fundo da imagem, 
                      incluindo textos e marcas d'água. O produto será mantido com fundo branco puro.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setOriginalImage(null)
                    setProcessedImage(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                >
                  Trocar Imagem
                </button>
                <button
                  type="button"
                  onClick={processWithAI}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <FiLoader className="animate-spin" />
                      {status}
                    </>
                  ) : (
                    <>
                      🤖 Processar com IA
                    </>
                  )}
                </button>
              </div>

              {/* Progress Bar */}
              {isProcessing && (
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {/* Image Comparison */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Original */}
                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 font-medium text-sm text-gray-600">
                    📷 Original
                  </div>
                  <div className="p-4 bg-[#f0f0f0] flex items-center justify-center min-h-[300px]">
                    <img
                      src={originalImage}
                      alt="Original"
                      className="max-w-full max-h-80 object-contain"
                    />
                  </div>
                </div>

                {/* Processed */}
                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 font-medium text-sm text-gray-600">
                    ✨ Processada (Fundo Branco)
                  </div>
                  <div className="p-4 bg-white flex items-center justify-center min-h-[300px]">
                    {processedImage ? (
                      <img
                        src={processedImage}
                        alt="Processada"
                        className="max-w-full max-h-80 object-contain"
                      />
                    ) : (
                      <div className="text-center text-gray-400">
                        {isProcessing ? (
                          <div>
                            <FiLoader className="animate-spin text-4xl mx-auto mb-2 text-purple-600" />
                            <p className="text-purple-600">{status}</p>
                          </div>
                        ) : (
                          <div>
                            <FiImage className="text-4xl mx-auto mb-2" />
                            <p>Clique em "Processar com IA"</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Hidden Canvas */}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-between items-center bg-gray-50">
          <p className="text-sm text-gray-500">
            🤖 IA remove fundo, textos e marcas d'água automaticamente
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!processedImage || isProcessing}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <FiLoader className="animate-spin" />
              ) : (
                <FiCheck />
              )}
              Usar Esta Imagem
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
