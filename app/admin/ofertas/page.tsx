'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import Image from 'next/image'

interface PromoProduct {
  id: string
  productId: string
  position: number
  customPrice?: number | null
  badgeText?: string | null
  product: {
    id: string
    name: string
    price: number
    images: string
    active: boolean
  }
}

interface PromoPage {
  id: string
  title: string
  slug: string
  description?: string
  bannerEnabled: boolean
  bannerText?: string
  bannerBgColor: string
  bannerTextColor: string
  bannerLink?: string
  bannerImageUrl?: string
  isActive: boolean
  startsAt?: string
  endsAt?: string
  couponCode?: string
  discountBadge?: string
  products: PromoProduct[]
}

const EMPTY_FORM: Partial<PromoPage> = {
  title: '',
  slug: '',
  description: '',
  bannerEnabled: true,
  bannerText: '',
  bannerBgColor: '#dc2626',
  bannerTextColor: '#ffffff',
  bannerLink: '',
  bannerImageUrl: '',
  isActive: false,
  couponCode: '',
  discountBadge: '',
}

function getFirstImage(images: string): string {
  try {
    const parsed = typeof images === 'string' ? JSON.parse(images) : images
    return Array.isArray(parsed) && parsed[0] ? parsed[0] : '/placeholder.jpg'
  } catch {
    return '/placeholder.jpg'
  }
}

export default function OfertasAdminPage() {
  const [promos, setPromos] = useState<PromoPage[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PromoPage | null>(null)
  const [form, setForm] = useState<Partial<PromoPage>>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  // Buscar produto para adicionar
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/promo-page')
      const data = await res.json()
      setPromos(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Erro ao carregar promoções')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(p: PromoPage) {
    setEditing(p)
    setForm({
      title: p.title,
      slug: p.slug,
      description: p.description || '',
      bannerEnabled: p.bannerEnabled,
      bannerText: p.bannerText || '',
      bannerBgColor: p.bannerBgColor,
      bannerTextColor: p.bannerTextColor,
      bannerLink: p.bannerLink || '',
      bannerImageUrl: p.bannerImageUrl || '',
      isActive: p.isActive,
      startsAt: p.startsAt ? p.startsAt.slice(0, 16) : '',
      endsAt: p.endsAt ? p.endsAt.slice(0, 16) : '',
      couponCode: p.couponCode || '',
      discountBadge: p.discountBadge || '',
    })
    setShowForm(true)
  }

  async function saveForm() {
    if (!form.title || !form.slug) return toast.error('Título e slug são obrigatórios')
    setSaving(true)
    try {
      const payload = {
        ...form,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      }
      const url = editing ? `/api/admin/promo-page/${editing.id}` : '/api/admin/promo-page'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error || 'Erro ao salvar')
      toast.success(editing ? 'Promoção atualizada!' : 'Promoção criada!')
      setShowForm(false)
      load()
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function uploadBannerImage(file: File) {
    setUploadingBanner(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'banners')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error || 'Erro no upload')
      setForm(f => ({ ...f, bannerImageUrl: data.url }))
      toast.success('Imagem enviada!')
    } catch {
      toast.error('Erro no upload')
    } finally {
      setUploadingBanner(false)
    }
  }

  async function deletePromo(id: string) {
    if (!confirm('Excluir esta promoção?')) return
    const res = await fetch(`/api/admin/promo-page/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Excluído'); load() }
    else toast.error('Erro ao excluir')
  }

  async function toggleActive(promo: PromoPage) {
    const res = await fetch(`/api/admin/promo-page/${promo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...promo, isActive: !promo.isActive })
    })
    if (res.ok) { toast.success(!promo.isActive ? 'Promoção ativada!' : 'Promoção desativada'); load() }
    else toast.error('Erro')
  }

  async function searchProducts(q: string) {
    if (!q.trim()) return setSearchResults([])
    setSearching(true)
    try {
      const res = await fetch(`/api/admin/products?search=${encodeURIComponent(q)}&limit=10`)
      const data = await res.json()
      setSearchResults(data.products || data || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  async function addProduct(promoId: string, productId: string) {
    const res = await fetch(`/api/admin/promo-page/${promoId}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId })
    })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error || 'Erro ao adicionar')
    toast.success('Produto adicionado!')
    setSearchQuery('')
    setSearchResults([])
    load()
  }

  async function removeProduct(promoId: string, productId: string) {
    const res = await fetch(`/api/admin/promo-page/${promoId}/products?productId=${productId}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Produto removido'); load() }
    else toast.error('Erro ao remover')
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎯 Ofertas Exclusivas</h1>
          <p className="text-gray-500 text-sm mt-1">Crie páginas promocionais com banner faixa para datas comemorativas</p>
        </div>
        <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700">
          + Nova Promoção
        </button>
      </div>

      {/* Modal formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-bold mb-4">{editing ? 'Editar Promoção' : 'Nova Promoção'}</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Título *</label>
                    <input className="w-full border rounded-lg px-3 py-2" placeholder="Ex: Black Friday"
                      value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value,
                        slug: f.slug || e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Slug (URL) *</label>
                    <input className="w-full border rounded-lg px-3 py-2" placeholder="black-friday"
                      value={form.slug || ''} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }))} />
                    <p className="text-xs text-gray-400 mt-1">mydshop.com.br/ofertas/{form.slug}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Descrição</label>
                  <textarea className="w-full border rounded-lg px-3 py-2" rows={2}
                    value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>

                {/* Banner */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-2 mb-3">
                    <input type="checkbox" id="bannerEnabled" checked={form.bannerEnabled ?? true}
                      onChange={e => setForm(f => ({ ...f, bannerEnabled: e.target.checked }))} />
                    <label htmlFor="bannerEnabled" className="font-medium text-sm">🎀 Banner Faixa (topo da loja)</label>
                  </div>
                  {form.bannerEnabled && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">Texto do Banner</label>
                        <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="🔥 Black Friday - até 70% OFF! Use o cupom BLACKFRIDAY"
                          value={form.bannerText || ''} onChange={e => setForm(f => ({ ...f, bannerText: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1">Cor de fundo</label>
                          <div className="flex items-center gap-2">
                            <input type="color" className="w-8 h-8 rounded cursor-pointer"
                              value={form.bannerBgColor || '#dc2626'} onChange={e => setForm(f => ({ ...f, bannerBgColor: e.target.value }))} />
                            <input className="flex-1 border rounded px-2 py-1 text-xs" value={form.bannerBgColor || '#dc2626'}
                              onChange={e => setForm(f => ({ ...f, bannerBgColor: e.target.value }))} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Cor do texto</label>
                          <div className="flex items-center gap-2">
                            <input type="color" className="w-8 h-8 rounded cursor-pointer"
                              value={form.bannerTextColor || '#ffffff'} onChange={e => setForm(f => ({ ...f, bannerTextColor: e.target.value }))} />
                            <input className="flex-1 border rounded px-2 py-1 text-xs" value={form.bannerTextColor || '#ffffff'}
                              onChange={e => setForm(f => ({ ...f, bannerTextColor: e.target.value }))} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Link (opcional)</label>
                          <input className="w-full border rounded px-2 py-1 text-xs" placeholder="/ofertas/black-friday"
                            value={form.bannerLink || ''} onChange={e => setForm(f => ({ ...f, bannerLink: e.target.value }))} />
                        </div>
                      </div>

                      {/* Imagem do banner */}
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          🖼️ Imagem do Banner <span className="text-gray-400 font-normal">(substitui cor+texto se preenchida)</span>
                        </label>
                        <div className="flex gap-2 items-center">
                          <input
                            className="flex-1 border rounded px-2 py-1 text-xs"
                            placeholder="https://... ou faça upload ao lado"
                            value={form.bannerImageUrl || ''}
                            onChange={e => setForm(f => ({ ...f, bannerImageUrl: e.target.value }))}
                          />
                          <label className={`cursor-pointer bg-gray-100 border rounded px-3 py-1 text-xs font-medium hover:bg-gray-200 whitespace-nowrap ${uploadingBanner ? 'opacity-50 pointer-events-none' : ''}`}>
                            {uploadingBanner ? 'Enviando...' : '📁 Upload'}
                            <input type="file" accept="image/*" className="hidden"
                              onChange={e => { const f = e.target.files?.[0]; if (f) uploadBannerImage(f) }} />
                          </label>
                          {form.bannerImageUrl && (
                            <button onClick={() => setForm(f => ({ ...f, bannerImageUrl: '' }))}
                              className="text-red-500 text-xs hover:text-red-700" title="Remover imagem">✕</button>
                          )}
                        </div>
                        {form.bannerImageUrl && (
                          <div className="mt-2 rounded overflow-hidden border">
                            <img src={form.bannerImageUrl} alt="Preview banner" className="w-full max-h-24 object-cover" />
                          </div>
                        )}
                      </div>

                      {/* Preview banner texto (só se não tiver imagem) */}
                      {!form.bannerImageUrl && form.bannerText && (
                        <div className="rounded overflow-hidden">
                          <div style={{ backgroundColor: form.bannerBgColor, color: form.bannerTextColor }}
                            className="text-center py-2 px-4 text-sm font-semibold">
                            {form.bannerText}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Datas e cupom */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Início</label>
                    <input type="datetime-local" className="w-full border rounded-lg px-3 py-2"
                      value={form.startsAt || ''} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fim</label>
                    <input type="datetime-local" className="w-full border rounded-lg px-3 py-2"
                      value={form.endsAt || ''} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Cupom vinculado</label>
                    <input className="w-full border rounded-lg px-3 py-2" placeholder="BLACKFRIDAY"
                      value={form.couponCode || ''} onChange={e => setForm(f => ({ ...f, couponCode: e.target.value.toUpperCase() }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Badge de desconto</label>
                    <input className="w-full border rounded-lg px-3 py-2" placeholder="até 70% OFF"
                      value={form.discountBadge || ''} onChange={e => setForm(f => ({ ...f, discountBadge: e.target.value }))} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isActive" checked={form.isActive ?? false}
                    onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                  <label htmlFor="isActive" className="text-sm font-medium">Ativar imediatamente</label>
                  {form.isActive && <span className="text-xs text-orange-600">(desativa outras promoções ativas)</span>}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={saveForm} disabled={saving} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de promoções */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : promos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-lg font-medium">Nenhuma promoção criada ainda</p>
          <p className="text-sm mt-1">Crie sua primeira promoção para datas comemorativas</p>
        </div>
      ) : (
        <div className="space-y-6">
          {promos.map(promo => (
            <div key={promo.id} className={`border-2 rounded-xl overflow-hidden ${promo.isActive ? 'border-green-500' : 'border-gray-200'}`}>
              {/* Cabeçalho da promo */}
              <div className="p-4 bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg">{promo.title}</h3>
                      {promo.isActive && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">● ATIVA</span>}
                      {promo.discountBadge && <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-semibold">{promo.discountBadge}</span>}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">/{promo.slug} · {promo.products.length} produto(s)</p>
                    {promo.couponCode && <p className="text-xs text-blue-600 mt-1">Cupom: <strong>{promo.couponCode}</strong></p>}
                    {promo.endsAt && <p className="text-xs text-orange-600 mt-1">Encerra: {new Date(promo.endsAt).toLocaleString('pt-BR')}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => toggleActive(promo)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${promo.isActive ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                      {promo.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onClick={() => openEdit(promo)} className="px-3 py-1.5 rounded-lg text-sm bg-blue-50 text-blue-600 hover:bg-blue-100">Editar</button>
                    <button onClick={() => deletePromo(promo.id)} className="px-3 py-1.5 rounded-lg text-sm bg-red-50 text-red-600 hover:bg-red-100">Excluir</button>
                  </div>
                </div>

                {/* Preview banner */}
                {promo.bannerEnabled && promo.bannerText && (
                  <div style={{ backgroundColor: promo.bannerBgColor, color: promo.bannerTextColor }}
                    className="mt-3 rounded-lg text-center py-2 px-4 text-sm font-semibold">
                    {promo.bannerText}
                  </div>
                )}
              </div>

              {/* Produtos da promo */}
              <div className="border-t bg-gray-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm text-gray-700">Produtos da Promoção</h4>
                  <button onClick={() => setSelectedPromoId(selectedPromoId === promo.id ? null : promo.id)}
                    className="text-sm text-blue-600 hover:underline">
                    {selectedPromoId === promo.id ? 'Fechar busca' : '+ Adicionar produto'}
                  </button>
                </div>

                {/* Busca de produto */}
                {selectedPromoId === promo.id && (
                  <div className="mb-4 bg-white border rounded-lg p-3">
                    <div className="flex gap-2">
                      <input className="flex-1 border rounded-lg px-3 py-2 text-sm"
                        placeholder="Buscar produto pelo nome..."
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); searchProducts(e.target.value) }} />
                      {searching && <span className="text-gray-400 text-sm self-center">Buscando...</span>}
                    </div>
                    {searchResults.length > 0 && (
                      <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                        {searchResults.map((p: any) => {
                          const img = getFirstImage(p.images)
                          return (
                            <div key={p.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                              onClick={() => addProduct(promo.id, p.id)}>
                              <div className="relative w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                                <Image src={img} alt={p.name} fill className="object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{p.name}</p>
                                <p className="text-xs text-gray-500">R$ {Number(p.price).toFixed(2)}</p>
                              </div>
                              <span className="text-blue-600 text-sm">+ Adicionar</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Lista de produtos na promo */}
                {promo.products.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Nenhum produto adicionado</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {promo.products.map(pp => {
                      const img = getFirstImage(pp.product.images)
                      return (
                        <div key={pp.id} className="bg-white border rounded-lg overflow-hidden relative group">
                          <div className="relative aspect-square bg-gray-100">
                            <Image src={img} alt={pp.product.name} fill className="object-cover" />
                            {pp.badgeText && (
                              <span className="absolute top-1 left-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                                {pp.badgeText}
                              </span>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-medium truncate">{pp.product.name}</p>
                            <p className="text-xs text-blue-700 font-bold">
                              R$ {Number(pp.customPrice || pp.product.price).toFixed(2)}
                            </p>
                          </div>
                          <button onClick={() => removeProduct(promo.id, pp.productId)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            ×
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
