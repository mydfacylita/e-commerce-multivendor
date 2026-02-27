'use client'

import { FiExternalLink } from 'react-icons/fi'

type BlockType = 'text' | 'video' | 'image' | 'tip'
type TipVariant = 'info' | 'warning' | 'success' | 'danger'

export interface Block {
  id: string
  type: BlockType
  content?: string
  url?: string
  videoTitle?: string
  videoSource?: 'url' | 'local'  // 'url' = YouTube/Vimeo/link, 'local' = /uploads/videos/...
  imageUrl?: string
  caption?: string
  tipText?: string
  variant?: TipVariant
}

function getYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

const TIP_COLORS: Record<TipVariant, string> = {
  info: 'bg-blue-50 border-l-4 border-blue-400 text-blue-800',
  warning: 'bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800',
  success: 'bg-green-50 border-l-4 border-green-400 text-green-800',
  danger: 'bg-red-50 border-l-4 border-red-400 text-red-800',
}

export function RenderBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-5">
      {blocks.map(b => (
        <div key={b.id}>
          {b.type === 'text' && b.content && (
            <div
              className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: b.content.replace(/\n/g, '<br/>') }}
            />
          )}
          {b.type === 'video' && b.url && (
            <div className="space-y-2">
              {b.videoTitle && <p className="font-semibold text-gray-700">{b.videoTitle}</p>}
              {b.videoSource === 'local' ? (
                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-black">
                  <video
                    src={b.url}
                    controls
                    className="w-full"
                    style={{ maxHeight: '360px' }}
                    preload="metadata"
                  />
                </div>
              ) : getYoutubeId(b.url) ? (
                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  <iframe
                    src={`https://www.youtube.com/embed/${getYoutubeId(b.url)}`}
                    className="w-full"
                    style={{ height: '360px' }}
                    allowFullScreen
                    title={b.videoTitle || 'Vídeo'}
                  />
                </div>
              ) : b.url.includes('vimeo.com') ? (
                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  <iframe
                    src={`https://player.vimeo.com/video/${b.url.split('/').pop()}`}
                    className="w-full"
                    style={{ height: '360px' }}
                    allowFullScreen
                    title={b.videoTitle || 'Vídeo'}
                  />
                </div>
              ) : (
                <a href={b.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline">
                  <FiExternalLink size={14} /> {b.url}
                </a>
              )}
            </div>
          )}
          {b.type === 'image' && b.imageUrl && (
            <figure className="space-y-2">
              <img src={b.imageUrl} alt={b.caption || ''} className="rounded-xl border border-gray-200 max-w-full shadow-sm" />
              {b.caption && <figcaption className="text-xs text-gray-500 text-center">{b.caption}</figcaption>}
            </figure>
          )}
          {b.type === 'tip' && b.tipText && (
            <div className={`p-4 rounded-lg ${TIP_COLORS[b.variant || 'info']}`}
              dangerouslySetInnerHTML={{ __html: b.tipText }} />
          )}
        </div>
      ))}
    </div>
  )
}
