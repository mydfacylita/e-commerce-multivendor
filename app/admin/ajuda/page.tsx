'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FiPlus, FiSave, FiTrash2, FiEye, FiEyeOff, FiChevronUp, FiChevronDown,
  FiType, FiVideo, FiImage, FiAlertCircle, FiExternalLink, FiLoader,
  FiBookOpen, FiEdit3, FiCheck, FiX, FiMove, FiUploadCloud, FiLink,
} from 'react-icons/fi'
import { RenderBlocks } from '@/components/help/RenderBlocks'
import type { Block } from '@/components/help/RenderBlocks'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type BlockType = 'text' | 'video' | 'image' | 'tip'
type TipVariant = 'info' | 'warning' | 'success' | 'danger'

interface Article {
  id: string
  title: string
  slug: string
  category: string
  description?: string | null
  blocks: string
  published: boolean
  position: number
  icon?: string | null
}

const CATEGORIES = [
  { value: 'primeiros-passos', label: '🚀 Primeiros Passos', icon: '🚀' },
  { value: 'clientes', label: '👥 Clientes', icon: '👥' },
  { value: 'vendedores', label: '🏪 Vendedores', icon: '🏪' },
  { value: 'integracoes', label: '🔌 Integrações', icon: '🔌' },
  { value: 'financeiro', label: '💰 Financeiro', icon: '💰' },
  { value: 'logistica', label: '📦 Logística', icon: '📦' },
  { value: 'produtos', label: '🛍️ Produtos', icon: '🛍️' },
  { value: 'geral', label: '📋 Geral', icon: '📋' },
]

function newBlock(type: BlockType): Block {
  return { id: Math.random().toString(36).slice(2), type }
}

// ──────────────────────────────────────────────────────────────────────────────
// YouTube embed helper
// ──────────────────────────────────────────────────────────────────────────────

function getYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

// ──────────────────────────────────────────────────────────────────────────────
// Video Block Editor (URL ou Upload Local)
// ──────────────────────────────────────────────────────────────────────────────

function VideoBlockEditor({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const [tab, setTab] = useState<'url' | 'local'>(block.videoSource === 'local' ? 'local' : 'url')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    setUploadProgress(`Enviando ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)...`)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload/video', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar')
      onChange({ ...block, url: data.url, videoSource: 'local', videoTitle: block.videoTitle || file.name.replace(/\.[^.]+$/, '') })
      setUploadProgress(`✅ ${file.name} enviado com sucesso!`)
    } catch (err: any) {
      setUploadError(err.message)
      setUploadProgress(null)
    } finally {
      setUploading(false)
    }
  }

  function switchTab(t: 'url' | 'local') {
    setTab(t)
    setUploadError(null)
    setUploadProgress(null)
    // clear the url/source when switching so user starts fresh
    onChange({ ...block, url: '', videoSource: t })
  }

  return (
    <div className="space-y-3">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => switchTab('url')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
            tab === 'url' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FiLink size={12} /> URL (YouTube / Vimeo)
        </button>
        <button
          type="button"
          onClick={() => switchTab('local')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
            tab === 'local' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FiUploadCloud size={12} /> Upload Local
        </button>
      </div>

      {/* Título comum */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Título do vídeo (opcional)</label>
        <input
          type="text"
          value={block.videoTitle || ''}
          onChange={e => onChange({ ...block, videoTitle: e.target.value })}
          placeholder="Ex: Como publicar um produto no Mercado Livre"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
      </div>

      {/* ── Aba URL ── */}
      {tab === 'url' && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600">URL do vídeo</label>
          <input
            type="url"
            value={block.videoSource === 'local' ? '' : (block.url || '')}
            onChange={e => onChange({ ...block, url: e.target.value, videoSource: 'url' })}
            placeholder="https://www.youtube.com/watch?v=... ou https://vimeo.com/..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          {/* Preview YouTube */}
          {block.videoSource !== 'local' && block.url && getYoutubeId(block.url) && (
            <div className="rounded-lg overflow-hidden border border-gray-200">
              <iframe
                src={`https://www.youtube.com/embed/${getYoutubeId(block.url)}`}
                className="w-full"
                style={{ height: '220px' }}
                allowFullScreen
              />
            </div>
          )}
        </div>
      )}

      {/* ── Aba Upload Local ── */}
      {tab === 'local' && (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-gray-600">Arquivo de vídeo (MP4, WebM, MOV, AVI, MKV — até 500 MB)</label>
          <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-8 cursor-pointer transition ${
            uploading ? 'border-gray-200 bg-gray-50 opacity-60 pointer-events-none' : 'border-blue-300 bg-blue-50 hover:bg-blue-100'
          }`}>
            {uploading ? (
              <FiLoader size={28} className="text-blue-500 animate-spin" />
            ) : (
              <FiUploadCloud size={28} className="text-blue-500" />
            )}
            <span className="text-sm font-medium text-blue-700">
              {uploading ? 'Enviando...' : 'Clique para escolher ou arraste um vídeo aqui'}
            </span>
            <input
              type="file"
              accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.webm,.mov,.avi,.mkv"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>

          {uploadProgress && (
            <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              {uploadProgress}
            </p>
          )}
          {uploadError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              ❌ {uploadError}
            </p>
          )}

          {/* Preview do vídeo local já enviado */}
          {block.videoSource === 'local' && block.url && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium">Preview:</p>
              <video
                src={block.url}
                controls
                className="w-full rounded-lg border border-gray-200 bg-black"
                style={{ maxHeight: '240px' }}
                preload="metadata"
              />
              <p className="text-xs text-gray-400 font-mono break-all">{block.url}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Block Editor
// ──────────────────────────────────────────────────────────────────────────────

function BlockEditor({
  block, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast,
}: {
  block: Block
  onChange: (b: Block) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}) {
  const TIP_COLORS: Record<TipVariant, string> = {
    info: 'bg-blue-50 border-blue-300 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
    success: 'bg-green-50 border-green-300 text-green-800',
    danger: 'bg-red-50 border-red-300 text-red-800',
  }

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Block header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
          {block.type === 'text' && <><FiType size={12} /> Texto</>}
          {block.type === 'video' && <><FiVideo size={12} /> Vídeo</>}
          {block.type === 'image' && <><FiImage size={12} /> Imagem</>}
          {block.type === 'tip' && <><FiAlertCircle size={12} /> Dica/Aviso</>}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={onMoveUp} disabled={isFirst} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 transition">
            <FiChevronUp size={14} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 transition">
            <FiChevronDown size={14} />
          </button>
          <button onClick={onDelete} className="p-1 hover:bg-red-100 text-red-500 rounded transition ml-1">
            <FiTrash2 size={14} />
          </button>
        </div>
      </div>

      {/* Block content */}
      <div className="p-4">
        {block.type === 'text' && (
          <textarea
            value={block.content || ''}
            onChange={e => onChange({ ...block, content: e.target.value })}
            rows={6}
            placeholder="Digite o conteúdo do texto aqui. Você pode usar HTML básico: <b>negrito</b>, <i>itálico</i>, <a href='...'>link</a>, <br> para quebra de linha, <ul><li>lista</li></ul>"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 font-mono resize-y"
          />
        )}

        {block.type === 'video' && (
          <VideoBlockEditor block={block} onChange={onChange} />
        )}

        {block.type === 'image' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">URL da Imagem</label>
              <input
                type="url"
                value={block.imageUrl || ''}
                onChange={e => onChange({ ...block, imageUrl: e.target.value })}
                placeholder="https://... ou /uploads/..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Legenda (opcional)</label>
              <input
                type="text"
                value={block.caption || ''}
                onChange={e => onChange({ ...block, caption: e.target.value })}
                placeholder="Descrição da imagem"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            {block.imageUrl && (
              <img
                src={block.imageUrl}
                alt={block.caption || 'preview'}
                className="max-h-48 rounded-lg border border-gray-200 object-contain"
              />
            )}
          </div>
        )}

        {block.type === 'tip' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              {(['info', 'success', 'warning', 'danger'] as TipVariant[]).map(v => (
                <button
                  key={v}
                  onClick={() => onChange({ ...block, variant: v })}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                    (block.variant || 'info') === v
                      ? TIP_COLORS[v] + ' ring-2 ring-offset-1 ring-gray-400'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {v === 'info' ? 'ℹ️ Info' : v === 'success' ? '✅ Sucesso' : v === 'warning' ? '⚠️ Aviso' : '❌ Perigo'}
                </button>
              ))}
            </div>
            <textarea
              value={block.tipText || ''}
              onChange={e => onChange({ ...block, tipText: e.target.value })}
              rows={3}
              placeholder="Texto da dica ou aviso. Aceita HTML básico."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            {block.tipText && (
              <div className={`p-3 rounded-lg border ${TIP_COLORS[block.variant || 'info']} text-sm`}
                dangerouslySetInnerHTML={{ __html: block.tipText }} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Article Form Panel
// ──────────────────────────────────────────────────────────────────────────────

function ArticleForm({
  article,
  onSaved,
  onCancel,
}: {
  article: Partial<Article> | null
  onSaved: (a: Article) => void
  onCancel: () => void
}) {
  const isNew = !article?.id
  const [title, setTitle] = useState(article?.title || '')
  const [category, setCategory] = useState(article?.category || 'geral')
  const [description, setDescription] = useState(article?.description || '')
  const [icon, setIcon] = useState(article?.icon || '')
  const [published, setPublished] = useState(article?.published ?? false)
  const [blocks, setBlocks] = useState<Block[]>(() => {
    try { return JSON.parse(article?.blocks || '[]') } catch { return [] }
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)

  const addBlock = (type: BlockType) => setBlocks(prev => [...prev, newBlock(type)])

  const updateBlock = (idx: number, b: Block) =>
    setBlocks(prev => prev.map((x, i) => (i === idx ? b : x)))

  const deleteBlock = (idx: number) =>
    setBlocks(prev => prev.filter((_, i) => i !== idx))

  const moveBlock = (idx: number, dir: -1 | 1) =>
    setBlocks(prev => {
      const arr = [...prev]
      const target = idx + dir
      if (target < 0 || target >= arr.length) return arr
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return arr
    })

  async function save() {
    if (!title.trim()) { setError('Título é obrigatório'); return }
    setSaving(true)
    setError(null)
    try {
      const url = isNew
        ? '/api/admin/help-articles'
        : `/api/admin/help-articles/${article!.id}`
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, description, blocks, published, icon }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Erro ao salvar')
      onSaved(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Form header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <FiEdit3 /> {isNew ? 'Novo Artigo' : 'Editar Artigo'}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreview(!preview)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition ${
              preview ? 'bg-primary-100 text-primary-700 border-primary-300' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {preview ? <FiEyeOff size={14} /> : <FiEye size={14} />}
            {preview ? 'Editar' : 'Pré-visualizar'}
          </button>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-500">
            <FiX size={16} />
          </button>
        </div>
      </div>

      {preview ? (
        <ArticlePreview
          title={title}
          description={description}
          blocks={blocks}
          category={category}
          icon={icon}
        />
      ) : (
        <div className="space-y-5 flex-1 overflow-y-auto pb-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Meta fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Como publicar no Mercado Livre"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição curta</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Resumo do artigo (aparece na listagem)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ícone (emoji)</label>
              <input
                type="text"
                value={icon}
                onChange={e => setIcon(e.target.value)}
                placeholder="📖"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <button
                type="button"
                onClick={() => setPublished(!published)}
                className={`relative w-10 h-6 rounded-full transition-colors ${published ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${published ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
              <span className={`text-sm font-medium ${published ? 'text-green-700' : 'text-gray-600'}`}>
                {published ? '✅ Publicado (visível ao público)' : '🔒 Rascunho (somente admin)'}
              </span>
            </label>
          </div>

          {/* Blocks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700">Blocos de Conteúdo</h3>
              <span className="text-xs text-gray-400">{blocks.length} bloco{blocks.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-3 mb-4">
              {blocks.map((block, idx) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  onChange={b => updateBlock(idx, b)}
                  onDelete={() => deleteBlock(idx)}
                  onMoveUp={() => moveBlock(idx, -1)}
                  onMoveDown={() => moveBlock(idx, 1)}
                  isFirst={idx === 0}
                  isLast={idx === blocks.length - 1}
                />
              ))}
              {blocks.length === 0 && (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                  Nenhum bloco ainda. Adicione conteúdo abaixo.
                </div>
              )}
            </div>

            {/* Add block buttons */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => addBlock('text')}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                <FiType size={14} /> Texto
              </button>
              <button onClick={() => addBlock('video')}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition">
                <FiVideo size={14} /> Vídeo
              </button>
              <button onClick={() => addBlock('image')}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition">
                <FiImage size={14} /> Imagem
              </button>
              <button onClick={() => addBlock('tip')}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg transition">
                <FiAlertCircle size={14} /> Dica/Aviso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save footer */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t mt-4">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">
          Cancelar
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-60"
        >
          {saving ? <FiLoader size={14} className="animate-spin" /> : <FiSave size={14} />}
          {saving ? 'Salvando...' : 'Salvar Artigo'}
        </button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Preview
// ──────────────────────────────────────────────────────────────────────────────

function ArticlePreview({
  title, description, blocks, category, icon,
}: {
  title: string, description: string, blocks: Block[], category: string, icon: string
}) {
  const cat = CATEGORIES.find(c => c.value === category)
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <span className="text-3xl">{icon || cat?.icon || '📖'}</span>
        <div>
          <p className="text-xs font-semibold text-primary-500 uppercase">{cat?.label}</p>
          <h1 className="text-2xl font-bold text-gray-900">{title || 'Sem título'}</h1>
          {description && <p className="text-gray-500 mt-1">{description}</p>}
        </div>
      </div>
      <hr />
      <RenderBlocks blocks={blocks} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Main admin page
// ──────────────────────────────────────────────────────────────────────────────

export default function AjudaAdminPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Article> | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/help-articles')
    const data = await res.json()
    setArticles(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function togglePublish(a: Article) {
    await fetch(`/api/admin/help-articles/${a.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...a, blocks: JSON.parse(a.blocks), published: !a.published }),
    })
    setArticles(prev => prev.map(x => x.id === a.id ? { ...x, published: !x.published } : x))
  }

  async function deleteArticle(id: string) {
    if (!confirm('Excluir este artigo?')) return
    setDeleting(id)
    await fetch(`/api/admin/help-articles/${id}`, { method: 'DELETE' })
    setArticles(prev => prev.filter(x => x.id !== id))
    if (editing?.id === id) setEditing(null)
    setDeleting(null)
  }

  const filtered = articles.filter(a => {
    const matchCat = filterCat === 'all' || a.category === filterCat
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  // Group by category
  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: filtered.filter(a => a.category === cat.value),
  })).filter(g => g.items.length > 0)

  return (
    <div className="flex gap-6 h-[calc(100vh-4rem)] -m-8 p-0">
      {/* ── Left panel: article list ── */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FiBookOpen /> Central de Ajuda
            </h1>
            <a
              href="/ajuda"
              target="_blank"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <FiExternalLink size={12} /> Ver público
            </a>
          </div>
          <button
            onClick={() => setEditing({})}
            className="w-full flex items-center justify-center gap-2 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition"
          >
            <FiPlus size={14} /> Novo Artigo
          </button>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar artigos..."
            className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="all">Todas categorias</option>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Article list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {loading && (
            <div className="flex justify-center py-8 text-gray-400">
              <FiLoader className="animate-spin" size={24} />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              Nenhum artigo encontrado.
            </div>
          )}

          {grouped.map(group => (
            <div key={group.value}>
              <p className="text-xs font-bold text-gray-500 uppercase px-2 mb-1">
                {group.icon} {group.label.replace(/^.+\s/, '')}
              </p>
              <div className="space-y-1">
                {group.items.map(a => (
                  <div
                    key={a.id}
                    onClick={() => setEditing(a)}
                    className={`flex items-start justify-between p-2.5 rounded-lg cursor-pointer group transition ${
                      editing?.id === a.id
                        ? 'bg-primary-50 border border-primary-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="text-base mt-0.5">{a.icon || '📄'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {a.published ? (
                            <span className="text-xs text-green-600">● Publicado</span>
                          ) : (
                            <span className="text-xs text-gray-400">○ Rascunho</span>
                          )}
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">
                            {JSON.parse(a.blocks).length} bloco{JSON.parse(a.blocks).length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0 ml-1">
                      <button
                        onClick={e => { e.stopPropagation(); togglePublish(a) }}
                        title={a.published ? 'Despublicar' : 'Publicar'}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        {a.published ? <FiEyeOff size={12} /> : <FiEye size={12} />}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteArticle(a.id) }}
                        disabled={deleting === a.id}
                        className="p-1 hover:bg-red-100 text-red-500 rounded"
                      >
                        {deleting === a.id ? <FiLoader size={12} className="animate-spin" /> : <FiTrash2 size={12} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Stats footer */}
        <div className="p-3 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span>{articles.length} artigo{articles.length !== 1 ? 's' : ''} total</span>
          <span>{articles.filter(a => a.published).length} publicado{articles.filter(a => a.published).length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── Right panel: editor ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {editing ? (
          <ArticleForm
            article={editing}
            onSaved={saved => {
              setArticles(prev => {
                const exists = prev.find(x => x.id === saved.id)
                return exists
                  ? prev.map(x => x.id === saved.id ? saved : x)
                  : [saved, ...prev]
              })
              setEditing(saved)
            }}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
            <FiBookOpen size={64} className="opacity-20" />
            <div className="text-center">
              <p className="text-xl font-semibold">Central de Ajuda</p>
              <p className="text-sm mt-1">Selecione um artigo para editar ou crie um novo.</p>
            </div>
            <button
              onClick={() => setEditing({})}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm"
            >
              <FiPlus size={16} /> Criar primeiro artigo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
