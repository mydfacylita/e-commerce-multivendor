'use client'

import { useState, useEffect } from 'react'
import { 

// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

  FiImage, FiPlus, FiTrash2, FiEdit2, FiSave, FiX,
  FiArrowUp, FiArrowDown, FiEye, FiEyeOff, FiUpload
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import Image from 'next/image'

interface Banner {
  id: string
  type: 'hero' | 'image'  // hero = texto sobre gradiente, image = banner de imagem puro
  title?: string
  subtitle?: string
  discount?: string
  badge?: string
  buttonText?: string
  buttonLink?: string
  bgType: 'gradient' | 'image'
  bgGradient?: string
  bgImage?: string
  bannerImage?: string  // Para banners de imagem pura (tipo image)
  active: boolean
  order: number
}

const DEFAULT_GRADIENTS = [
  { name: 'Laranja', value: 'from-orange-500 to-orange-600' },
  { name: 'Azul', value: 'from-primary-500 to-primary-700' },
  { name: 'Roxo', value: 'from-purple-500 to-pink-600' },
  { name: 'Verde', value: 'from-green-500 to-emerald-600' },
  { name: 'Vermelho', value: 'from-red-500 to-rose-600' },
  { name: 'Azul Escuro', value: 'from-blue-800 to-indigo-900' },
]

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadBanners()
  }, [])

  const loadBanners = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/banners')
      const data = await response.json()
      
      if (data.banners && data.banners.length > 0) {
        setBanners(data.banners)
      } else {
        // Banners padrão se não existirem
        setBanners([
          {
            id: '1',
            type: 'hero',
            title: 'MEGA PROMOÇÃO',
            subtitle: 'toda quarta é + mercado',
            discount: '10%',
            badge: 'descontão de até',
            buttonText: 'COMPRAR AGORA',
            buttonLink: '/produtos',
            bgType: 'gradient',
            bgGradient: 'from-orange-500 to-orange-600',
            active: true,
            order: 1
          },
          {
            id: '2',
            type: 'hero',
            title: 'FRETE GRÁTIS',
            subtitle: 'em compras acima de R$ 99',
            discount: 'FREE',
            badge: 'economize agora',
            buttonText: 'APROVEITAR',
            buttonLink: '/produtos',
            bgType: 'gradient',
            bgGradient: 'from-primary-500 to-primary-700',
            active: true,
            order: 2
          },
          {
            id: '3',
            type: 'hero',
            title: 'NOVIDADES',
            subtitle: 'produtos importados',
            discount: '25%',
            badge: 'até',
            buttonText: 'VER NOVIDADES',
            buttonLink: '/categorias/importados',
            bgType: 'gradient',
            bgGradient: 'from-purple-500 to-pink-600',
            active: true,
            order: 3
          }
        ])
      }
    } catch (error) {
      console.error('Erro ao carregar banners:', error)
      toast.error('Erro ao carregar banners')
    } finally {
      setLoading(false)
    }
  }

  const saveBanners = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banners })
      })
      
      if (response.ok) {
        toast.success('Banners salvos com sucesso!')
      } else {
        toast.error('Erro ao salvar banners')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar banners')
    } finally {
      setSaving(false)
    }
  }

  const addNewBanner = (type: 'hero' | 'image') => {
    const newBanner: Banner = {
      id: Date.now().toString(),
      type,
      title: type === 'hero' ? 'NOVO BANNER' : undefined,
      subtitle: type === 'hero' ? 'Subtítulo do banner' : undefined,
      discount: type === 'hero' ? '10%' : undefined,
      badge: type === 'hero' ? 'até' : undefined,
      buttonText: 'VER MAIS',
      buttonLink: '/produtos',
      bgType: type === 'hero' ? 'gradient' : 'image',
      bgGradient: 'from-primary-500 to-primary-700',
      active: true,
      order: banners.length + 1
    }
    setEditingBanner(newBanner)
    setShowModal(true)
  }

  const editBanner = (banner: Banner) => {
    setEditingBanner({ ...banner })
    setShowModal(true)
  }

  const saveBannerEdit = () => {
    if (!editingBanner) return
    
    const existingIndex = banners.findIndex(b => b.id === editingBanner.id)
    if (existingIndex >= 0) {
      const updated = [...banners]
      updated[existingIndex] = editingBanner
      setBanners(updated)
    } else {
      setBanners([...banners, editingBanner])
    }
    
    setShowModal(false)
    setEditingBanner(null)
    toast.success('Banner atualizado!')
  }

  const deleteBanner = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este banner?')) {
      setBanners(banners.filter(b => b.id !== id))
      toast.success('Banner excluído!')
    }
  }

  const toggleActive = (id: string) => {
    setBanners(banners.map(b => 
      b.id === id ? { ...b, active: !b.active } : b
    ))
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const updated = [...banners]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    updated.forEach((b, i) => b.order = i + 1)
    setBanners(updated)
  }

  const moveDown = (index: number) => {
    if (index === banners.length - 1) return
    const updated = [...banners]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    updated.forEach((b, i) => b.order = i + 1)
    setBanners(updated)
  }

  const handleImageUpload = async (file: File, field: 'bgImage' | 'bannerImage') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'banners')

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      
      if (data.url) {
        setEditingBanner(prev => prev ? { ...prev, [field]: data.url } : null)
        toast.success('Imagem enviada!')
      }
    } catch (error) {
      toast.error('Erro ao enviar imagem')
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiImage className="text-primary-600" />
            Gerenciador de Banners
          </h1>
          <p className="text-gray-600 mt-1">
            Configure os banners do carrossel da página inicial
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => addNewBanner('hero')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <FiPlus /> Banner Hero (Texto)
          </button>
          <button
            onClick={() => addNewBanner('image')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <FiPlus /> Banner Imagem
          </button>
          <button
            onClick={saveBanners}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <FiSave /> {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-blue-800 mb-2">💡 Tipos de Banner</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <strong>Banner Hero (Texto):</strong> Banner com texto editável, desconto, badge e botão 
            sobre um fundo gradiente ou imagem. Ideal para promoções e campanhas.
          </div>
          <div>
            <strong>Banner Imagem:</strong> Banner de imagem pura que você cria em Photoshop/Canva. 
            Você faz o upload da imagem pronta com link de destino.
          </div>
        </div>
      </div>

      {/* Lista de Banners */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {banners.sort((a, b) => a.order - b.order).map((banner, index) => (
            <div 
              key={banner.id}
              className={`bg-white rounded-lg shadow border-2 ${
                banner.active ? 'border-green-500' : 'border-gray-300'
              }`}
            >
              <div className="flex items-center gap-4 p-4">
                {/* Preview */}
                <div className="w-48 h-24 rounded-lg overflow-hidden flex-shrink-0">
                  {banner.type === 'image' && banner.bannerImage ? (
                    <img 
                      src={banner.bannerImage} 
                      alt="Banner" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-r ${banner.bgGradient || 'from-primary-500 to-primary-700'} flex items-center justify-center text-white p-2`}>
                      {banner.bgType === 'image' && banner.bgImage ? (
                        <img src={banner.bgImage} alt="" className="w-full h-full object-cover absolute inset-0" />
                      ) : null}
                      <div className="text-center relative z-10">
                        <p className="font-bold text-sm">{banner.title}</p>
                        <p className="text-xs opacity-80">{banner.subtitle}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      banner.type === 'hero' 
                        ? 'bg-orange-100 text-orange-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {banner.type === 'hero' ? 'HERO' : 'IMAGEM'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      banner.active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {banner.active ? 'ATIVO' : 'INATIVO'}
                    </span>
                    <span className="text-xs text-gray-500">
                      Posição: {index + 1}
                    </span>
                  </div>
                  {banner.type === 'hero' ? (
                    <>
                      <p className="font-bold text-gray-900">{banner.title}</p>
                      <p className="text-sm text-gray-600">{banner.subtitle}</p>
                      <p className="text-xs text-gray-500">
                        Desconto: {banner.discount} | Link: {banner.buttonLink}
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-600">Link: {banner.buttonLink || 'Sem link'}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-2 hover:bg-gray-100 rounded disabled:opacity-30"
                    title="Mover para cima"
                  >
                    <FiArrowUp />
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === banners.length - 1}
                    className="p-2 hover:bg-gray-100 rounded disabled:opacity-30"
                    title="Mover para baixo"
                  >
                    <FiArrowDown />
                  </button>
                  <button
                    onClick={() => toggleActive(banner.id)}
                    className={`p-2 rounded ${banner.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                    title={banner.active ? 'Desativar' : 'Ativar'}
                  >
                    {banner.active ? <FiEye /> : <FiEyeOff />}
                  </button>
                  <button
                    onClick={() => editBanner(banner)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="Editar"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    onClick={() => deleteBanner(banner.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Excluir"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {banners.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <FiImage className="mx-auto text-4xl text-gray-400 mb-3" />
              <p className="text-gray-600">Nenhum banner cadastrado</p>
              <p className="text-sm text-gray-500">Clique em "Banner Hero" ou "Banner Imagem" para criar</p>
            </div>
          )}
        </div>
      )}

      {/* Modal de Edição */}
      {showModal && editingBanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {editingBanner.type === 'hero' ? 'Editar Banner Hero' : 'Editar Banner Imagem'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded">
                <FiX />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {editingBanner.type === 'hero' ? (
                <>
                  {/* Título */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                    <input
                      type="text"
                      value={editingBanner.title || ''}
                      onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2"
                      placeholder="MEGA PROMOÇÃO"
                    />
                  </div>

                  {/* Subtítulo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
                    <input
                      type="text"
                      value={editingBanner.subtitle || ''}
                      onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2"
                      placeholder="toda quarta é + mercado"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Badge */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Badge</label>
                      <input
                        type="text"
                        value={editingBanner.badge || ''}
                        onChange={(e) => setEditingBanner({ ...editingBanner, badge: e.target.value })}
                        className="w-full border rounded-lg px-4 py-2"
                        placeholder="até"
                      />
                    </div>

                    {/* Desconto */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Desconto</label>
                      <input
                        type="text"
                        value={editingBanner.discount || ''}
                        onChange={(e) => setEditingBanner({ ...editingBanner, discount: e.target.value })}
                        className="w-full border rounded-lg px-4 py-2"
                        placeholder="10%"
                      />
                    </div>
                  </div>

                  {/* Tipo de Fundo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Fundo</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={editingBanner.bgType === 'gradient'}
                          onChange={() => setEditingBanner({ ...editingBanner, bgType: 'gradient' })}
                        />
                        Gradiente
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={editingBanner.bgType === 'image'}
                          onChange={() => setEditingBanner({ ...editingBanner, bgType: 'image' })}
                        />
                        Imagem de Fundo
                      </label>
                    </div>
                  </div>

                  {editingBanner.bgType === 'gradient' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cor do Gradiente</label>
                      <div className="grid grid-cols-3 gap-2">
                        {DEFAULT_GRADIENTS.map(g => (
                          <button
                            key={g.value}
                            onClick={() => setEditingBanner({ ...editingBanner, bgGradient: g.value })}
                            className={`p-3 rounded-lg bg-gradient-to-r ${g.value} text-white text-sm font-bold ${
                              editingBanner.bgGradient === g.value ? 'ring-4 ring-offset-2 ring-primary-500' : ''
                            }`}
                          >
                            {g.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Imagem de Fundo</label>
                      <div className="flex gap-4 items-center">
                        <input
                          type="text"
                          value={editingBanner.bgImage || ''}
                          onChange={(e) => setEditingBanner({ ...editingBanner, bgImage: e.target.value })}
                          className="flex-1 border rounded-lg px-4 py-2"
                          placeholder="URL da imagem ou upload"
                        />
                        <label className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer flex items-center gap-2">
                          <FiUpload />
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'bgImage')}
                          />
                        </label>
                      </div>
                      {editingBanner.bgImage && (
                        <img src={editingBanner.bgImage} alt="Preview" className="mt-2 h-24 rounded-lg object-cover" />
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Banner de Imagem Pura */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Imagem do Banner (Recomendado: 1920x500px)
                    </label>
                    <div className="flex gap-4 items-center">
                      <input
                        type="text"
                        value={editingBanner.bannerImage || ''}
                        onChange={(e) => setEditingBanner({ ...editingBanner, bannerImage: e.target.value })}
                        className="flex-1 border rounded-lg px-4 py-2"
                        placeholder="URL da imagem ou upload"
                      />
                      <label className="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg cursor-pointer flex items-center gap-2">
                        <FiUpload />
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'bannerImage')}
                        />
                      </label>
                    </div>
                    {editingBanner.bannerImage && (
                      <img src={editingBanner.bannerImage} alt="Preview" className="mt-4 w-full rounded-lg object-cover" />
                    )}
                  </div>
                </>
              )}

              {/* Botão e Link (comum aos dois tipos) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Texto do Botão</label>
                  <input
                    type="text"
                    value={editingBanner.buttonText || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, buttonText: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="COMPRAR AGORA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link do Botão</label>
                  <input
                    type="text"
                    value={editingBanner.buttonLink || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, buttonLink: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="/produtos"
                  />
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                <div className="rounded-lg overflow-hidden h-40">
                  {editingBanner.type === 'image' && editingBanner.bannerImage ? (
                    <img 
                      src={editingBanner.bannerImage} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div 
                      className={`w-full h-full bg-gradient-to-r ${editingBanner.bgGradient || 'from-primary-500 to-primary-700'} flex items-center justify-center text-white p-6 relative`}
                      style={editingBanner.bgType === 'image' && editingBanner.bgImage ? {
                        backgroundImage: `url(${editingBanner.bgImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      } : {}}
                    >
                      {editingBanner.bgType === 'image' && (
                        <div className="absolute inset-0 bg-black/30"></div>
                      )}
                      <div className="text-center relative z-10">
                        <p className="text-xs bg-white/20 inline-block px-3 py-1 rounded-full mb-2">{editingBanner.badge}</p>
                        <h2 className="text-2xl font-bold">{editingBanner.title}</h2>
                        <p className="text-lg text-yellow-300">{editingBanner.subtitle}</p>
                        <p className="text-3xl font-black text-yellow-300 mt-2">{editingBanner.discount}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={saveBannerEdit}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <FiSave /> Salvar Banner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
