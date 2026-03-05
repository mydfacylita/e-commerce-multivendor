'use client'

import { useState } from 'react'
import { FiStar, FiThumbsUp, FiMessageCircle, FiChevronDown, FiChevronUp, FiCheck, FiImage, FiVideo, FiX, FiUpload } from 'react-icons/fi'
import Image from 'next/image'
import AIReviewSummary from '@/components/AIReviewSummary'

interface MediaItem {
  type: 'image' | 'video'
  url: string
}

interface Review {
  id: string
  rating: number
  title?: string
  comment?: string
  pros?: string
  cons?: string
  media: MediaItem[]
  isVerified: boolean
  helpfulCount: number
  sellerReply?: string
  sellerReplyAt?: string
  createdAt: string
  user: {
    name: string
    image?: string
  }
}

interface ReviewStats {
  averageRating: number
  totalReviews: number
  distribution: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
}

interface ProductReviewsProps {
  productId: string
  initialReviews?: Review[]
  initialStats?: ReviewStats
}

// Componente de Estrelas
export function RatingStars({ 
  rating, 
  size = 'md',
  interactive = false,
  onChange
}: { 
  rating: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onChange?: (rating: number) => void
}) {
  const [hoverRating, setHoverRating] = useState(0)
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
        >
          <FiStar
            className={`${sizeClasses[size]} ${
              star <= (hoverRating || rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

// Barra de progresso da distribuição
function RatingBar({ stars, count, total }: { stars: number; count: number; total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-12 text-gray-600">{stars} ★</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-yellow-400 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-8 text-gray-500 text-right">{count}</span>
    </div>
  )
}

// Card de Avaliação Individual
function ReviewCard({ review, onHelpful }: { review: Review; onHelpful: (id: string) => void }) {
  const [showMedia, setShowMedia] = useState(false)
  
  return (
    <div className="border-b pb-6 last:border-0">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {review.user.image ? (
              <Image src={review.user.image} alt="" width={40} height={40} className="object-cover" />
            ) : (
              <span className="text-gray-500 font-medium">
                {review.user.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <div className="font-medium text-gray-800">{review.user.name}</div>
            <div className="flex items-center gap-2">
              <RatingStars rating={review.rating} size="sm" />
              {review.isVerified && (
                <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  <FiCheck className="w-3 h-3" />
                  Compra verificada
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="text-sm text-gray-400">
          {new Date(review.createdAt).toLocaleDateString('pt-BR')}
        </span>
      </div>

      {/* Título e Comentário */}
      {review.title && (
        <h4 className="font-semibold text-gray-800 mb-2">{review.title}</h4>
      )}
      {review.comment && (
        <p className="text-gray-600 mb-3">{review.comment}</p>
      )}

      {/* Prós e Contras */}
      {(review.pros || review.cons) && (
        <div className="flex flex-wrap gap-4 mb-3 text-sm">
          {review.pros && (
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">👍</span>
              <span className="text-gray-600">{review.pros}</span>
            </div>
          )}
          {review.cons && (
            <div className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">👎</span>
              <span className="text-gray-600">{review.cons}</span>
            </div>
          )}
        </div>
      )}

      {/* Mídias (fotos e vídeos) */}
      {review.media && review.media.length > 0 && (
        <div className="mb-3">
          {(() => {
            const imgs = review.media.filter(m => m.type === 'image')
            const vids = review.media.filter(m => m.type === 'video')
            const parts = []
            if (imgs.length) parts.push(`${imgs.length} foto${imgs.length > 1 ? 's' : ''}`)
            if (vids.length) parts.push(`${vids.length} vídeo${vids.length > 1 ? 's' : ''}`)
            return (
              <button
                onClick={() => setShowMedia(!showMedia)}
                className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
              >
                {imgs.length > 0 && <FiImage className="w-4 h-4" />}
                {vids.length > 0 && <FiVideo className="w-4 h-4" />}
                {parts.join(' + ')}
                {showMedia ? <FiChevronUp /> : <FiChevronDown />}
              </button>
            )
          })()}
          {showMedia && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {review.media.map((item, i) => (
                <div key={i} className="rounded-lg overflow-hidden bg-gray-100">
                  {item.type === 'video' ? (
                    <video
                      src={item.url}
                      controls
                      className="h-40 max-w-xs rounded-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg overflow-hidden">
                      <img src={item.url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resposta do Vendedor */}
      {review.sellerReply && (
        <div className="bg-blue-50 rounded-lg p-3 mt-3">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-700 mb-1">
            <FiMessageCircle className="w-4 h-4" />
            Resposta do vendedor
          </div>
          <p className="text-sm text-gray-700">{review.sellerReply}</p>
        </div>
      )}

      {/* Útil */}
      <div className="flex items-center gap-4 mt-4">
        <button
          onClick={() => onHelpful(review.id)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600"
        >
          <FiThumbsUp className="w-4 h-4" />
          Útil ({review.helpfulCount})
        </button>
      </div>
    </div>
  )
}

// Componente Principal
export default function ProductReviews({ productId, initialReviews = [], initialStats }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [stats, setStats] = useState<ReviewStats | undefined>(initialStats)
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState('recent')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    rating: 0,
    title: '',
    comment: '',
    pros: '',
    cons: ''
  })
  const [mediaItems, setMediaItems] = useState<(MediaItem & { preview?: string })[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Carregar avaliações
  const loadReviews = async (sort = sortBy) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/products/${productId}/reviews?sortBy=${sort}`)
      if (res.ok) {
        const data = await res.json()
        setReviews(data.reviews)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error)
    } finally {
      setLoading(false)
    }
  }

  // Upload de mídia
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const currentImages = mediaItems.filter(m => m.type === 'image').length
    const currentVideos = mediaItems.filter(m => m.type === 'video').length

    for (const file of files) {
      const isVideo = file.type.startsWith('video/')
      if (isVideo && currentVideos >= 2) {
        alert('Máximo de 2 vídeos por avaliação')
        continue
      }
      if (!isVideo && currentImages >= 5) {
        alert('Máximo de 5 fotos por avaliação')
        continue
      }

      setUploading(true)
      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/reviews/upload', { method: 'POST', body: form })
        const data = await res.json()
        if (res.ok && data.url) {
          setMediaItems(prev => [...prev, {
            type: data.type as 'image' | 'video',
            url: data.url,
            preview: isVideo ? undefined : data.url
          }])
        } else {
          alert(data.message || 'Erro no upload')
        }
      } catch {
        alert('Erro ao fazer upload. Tente novamente.')
      } finally {
        setUploading(false)
      }
    }
    // Reset file input
    e.target.value = ''
  }

  const removeMedia = (index: number) => {
    setMediaItems(prev => prev.filter((_, i) => i !== index))
  }

  // Enviar avaliação
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.rating === 0) {
      alert('Selecione uma nota')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          media: mediaItems.map(({ type, url }) => ({ type, url }))
        })
      })

      const data = await res.json()
      
      if (res.ok) {
        alert(data.message || 'Avaliação enviada com sucesso!')
        setShowForm(false)
        setFormData({ rating: 0, title: '', comment: '', pros: '', cons: '' })
        setMediaItems([])
        loadReviews()
      } else {
        alert(data.message || data.error || 'Erro ao enviar avaliação')
      }
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error)
      alert('Erro ao enviar avaliação. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // Marcar como útil
  const handleHelpful = async (reviewId: string) => {
    // TODO: Implementar endpoint de votar útil
    console.log('Marcar como útil:', reviewId)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        ⭐ Avaliações
        {stats && (
          <span className="text-lg font-normal text-gray-500">
            ({stats.totalReviews} {stats.totalReviews === 1 ? 'avaliação' : 'avaliações'})
          </span>
        )}
      </h2>

      {/* Estatísticas */}
      {stats && stats.totalReviews > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pb-6 border-b">
          {/* Nota média */}
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-gray-800">
              {stats.averageRating.toFixed(1)}
            </div>
            <div>
              <RatingStars rating={Math.round(stats.averageRating)} size="lg" />
              <p className="text-gray-500 mt-1">
                Baseado em {stats.totalReviews} avaliações
              </p>
            </div>
          </div>

          {/* Distribuição */}
          <div className="space-y-1">
            {[5, 4, 3, 2, 1].map((stars) => (
              <RatingBar
                key={stars}
                stars={stars}
                count={stats.distribution[stars as keyof typeof stats.distribution]}
                total={stats.totalReviews}
              />
            ))}
          </div>
        </div>
      )}

      {/* Resumo IA das Avaliações */}
      {stats && stats.totalReviews >= 3 && (
        <div className="mb-6">
          <AIReviewSummary productId={productId} />
        </div>
      )}

      {/* Botão de Avaliar + Ordenação */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          ✍️ Escrever Avaliação
        </button>

        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value)
            loadReviews(e.target.value)
          }}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="recent">Mais recentes</option>
          <option value="helpful">Mais úteis</option>
          <option value="rating-high">Maior nota</option>
          <option value="rating-low">Menor nota</option>
        </select>
      </div>

      {/* Formulário de Avaliação */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-4">Sua Avaliação</h3>
          
          {/* Rating */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Nota *</label>
            <RatingStars
              rating={formData.rating}
              size="lg"
              interactive
              onChange={(rating) => setFormData({ ...formData, rating })}
            />
          </div>

          {/* Título */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Título (opcional)</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Resuma sua experiência"
              maxLength={200}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {/* Comentário */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Comentário</label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Conte sua experiência com o produto..."
              maxLength={2000}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg resize-none"
            />
          </div>

          {/* Prós e Contras */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">👍 Pontos positivos</label>
              <input
                type="text"
                value={formData.pros}
                onChange={(e) => setFormData({ ...formData, pros: e.target.value })}
                placeholder="O que você gostou?"
                maxLength={500}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">👎 Pontos negativos</label>
              <input
                type="text"
                value={formData.cons}
                onChange={(e) => setFormData({ ...formData, cons: e.target.value })}
                placeholder="O que pode melhorar?"
                maxLength={500}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          {/* Upload de Fotos e Vídeos */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">📎 Fotos e Vídeos (opcional)</label>
            <p className="text-xs text-gray-500 mb-2">Até 5 fotos e 2 vídeos pequenos do produto recebido</p>

            {/* Previews */}
            {mediaItems.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-3">
                {mediaItems.map((item, i) => (
                  <div key={i} className="relative group">
                    {item.type === 'video' ? (
                      <div className="w-20 h-20 bg-gray-800 rounded-lg flex items-center justify-center">
                        <FiVideo className="w-6 h-6 text-white" />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-lg overflow-hidden">
                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className={`flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer w-fit text-sm transition ${
              uploading ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-blue-300 text-blue-600 hover:border-blue-500 hover:bg-blue-50'
            }`}>
              <FiUpload className="w-4 h-4" />
              {uploading ? 'Enviando...' : 'Adicionar foto ou vídeo'}
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                disabled={uploading}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting || uploading || formData.rating === 0}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Enviando...' : 'Enviar Avaliação'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setMediaItems([]) }}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de Avaliações */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} onHelpful={handleHelpful} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <div className="text-5xl mb-4">📝</div>
          <p className="text-lg">Nenhuma avaliação ainda</p>
          <p className="text-sm">Seja o primeiro a avaliar este produto!</p>
        </div>
      )}
    </div>
  )
}
