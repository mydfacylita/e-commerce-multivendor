'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { FiPlus, FiEdit2, FiTrash2, FiCopy, FiCheck, FiX, FiSearch, FiFilter, FiImage, FiMonitor } from 'react-icons/fi'

interface Coupon {
  id: string
  code: string
  description: string | null
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: number
  minOrderValue: number | null
  maxDiscountValue: number | null
  maxUses: number | null
  maxUsesPerUser: number | null
  usageCount: number
  validFrom: string
  validUntil: string | null
  isActive: boolean
  firstPurchaseOnly: boolean
  showInModal: boolean
  promoImage: string | null
  allowedStates: string | null
  createdAt: string
  _count: {
    usages: number
  }
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    discountValue: '',
    minOrderValue: '',
    maxDiscountValue: '',
    maxUses: '',
    maxUsesPerUser: '1',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    firstPurchaseOnly: false,
    showInModal: false,
    promoImage: '',
    allowedStates: [] as string[],
    isActive: true
  })

  useEffect(() => {
    loadCoupons()
  }, [search, statusFilter])

  const loadCoupons = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      
      const res = await fetch(`/api/admin/coupons?${params}`)
      const data = await res.json()
      setCoupons(data.coupons || [])
    } catch (error) {
      console.error('Erro ao carregar cupons:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingCoupon 
        ? `/api/admin/coupons/${editingCoupon.id}`
        : '/api/admin/coupons'
      
      const res = await fetch(url, {
        method: editingCoupon ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          allowedStates: formData.allowedStates.length > 0 ? formData.allowedStates : null
        })
      })

      const data = await res.json()
      if (data.error) {
        alert(data.error)
        return
      }

      setShowModal(false)
      resetForm()
      loadCoupons()
    } catch (error) {
      console.error('Erro ao salvar cupom:', error)
      alert('Erro ao salvar cupom')
    }
  }

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Deseja excluir o cupom ${coupon.code}?`)) return

    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.error) {
        alert(data.error)
        return
      }
      loadCoupons()
    } catch (error) {
      console.error('Erro ao excluir cupom:', error)
    }
  }

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      minOrderValue: coupon.minOrderValue?.toString() || '',
      maxDiscountValue: coupon.maxDiscountValue?.toString() || '',
      maxUses: coupon.maxUses?.toString() || '',
      maxUsesPerUser: coupon.maxUsesPerUser?.toString() || '1',
      validFrom: coupon.validFrom.split('T')[0],
      validUntil: coupon.validUntil?.split('T')[0] || '',
      firstPurchaseOnly: coupon.firstPurchaseOnly,
      showInModal: coupon.showInModal,
      promoImage: coupon.promoImage || '',
      allowedStates: coupon.allowedStates ? JSON.parse(coupon.allowedStates) : [],
      isActive: coupon.isActive
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setEditingCoupon(null)
    setFormData({
      code: '',
      description: '',
      discountType: 'PERCENTAGE',
      discountValue: '',
      minOrderValue: '',
      maxDiscountValue: '',
      maxUses: '',
      maxUsesPerUser: '1',
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: '',
      firstPurchaseOnly: false,
      showInModal: false,
      promoImage: '',
      allowedStates: [],
      isActive: true
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) {
      alert('Imagem muito grande. Máximo: 3MB')
      return
    }
    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) {
        setFormData(prev => ({ ...prev, promoImage: data.url }))
      } else {
        alert('Erro ao fazer upload da imagem')
      }
    } catch {
      alert('Erro ao fazer upload da imagem')
    } finally {
      setUploadingImage(false)
    }
  }

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const toggleActive = async (coupon: Coupon) => {
    try {
      await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !coupon.isActive })
      })
      loadCoupons()
    } catch (error) {
      console.error('Erro ao atualizar cupom:', error)
    }
  }

  const getStatusBadge = (coupon: Coupon) => {
    const now = new Date()
    const validUntil = coupon.validUntil ? new Date(coupon.validUntil) : null

    if (!coupon.isActive) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">Inativo</span>
    }
    if (validUntil && validUntil < now) {
      return <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs">Expirado</span>
    }
    if (coupon.maxUses && coupon.usageCount >= coupon.maxUses) {
      return <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded-full text-xs">Esgotado</span>
    }
    return <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs">Ativo</span>
  }

  const estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎟️ Cupons de Desconto</h1>
          <p className="text-gray-600">Gerencie os cupons promocionais da loja</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          <FiPlus /> Novo Cupom
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="expired">Expirados</option>
          </select>
        </div>
      </div>

      {/* Lista de Cupons */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : coupons.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhum cupom encontrado
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Código</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Desconto</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Regras</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Usos</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary-600">{coupon.code}</span>
                      <button
                        onClick={() => copyCode(coupon.code)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Copiar código"
                      >
                        {copiedCode === coupon.code ? <FiCheck className="text-green-500" /> : <FiCopy size={14} />}
                      </button>
                      {coupon.showInModal && (
                        <span className="flex items-center gap-1 bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full" title="Exibido no modal da home">
                          <FiMonitor size={11} /> Modal
                        </span>
                      )}
                    </div>
                    {coupon.description && (
                      <p className="text-xs text-gray-500 mt-1">{coupon.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-lg">
                      {coupon.discountType === 'PERCENTAGE' 
                        ? `${coupon.discountValue}%`
                        : `R$ ${coupon.discountValue.toFixed(2)}`
                      }
                    </span>
                    {coupon.maxDiscountValue && (
                      <p className="text-xs text-gray-500">Máx: R$ {coupon.maxDiscountValue.toFixed(2)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div className="space-y-1">
                      {coupon.minOrderValue && (
                        <p>Mín: R$ {coupon.minOrderValue.toFixed(2)}</p>
                      )}
                      {coupon.validUntil && (
                        <p>Até: {new Date(coupon.validUntil).toLocaleDateString('pt-BR')}</p>
                      )}
                      {coupon.firstPurchaseOnly && (
                        <p className="text-purple-600">1ª compra</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold">{coupon.usageCount}</span>
                    {coupon.maxUses && (
                      <span className="text-gray-400">/{coupon.maxUses}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusBadge(coupon)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      {coupon.usageCount === 0 ? (
                        <>
                          <button
                            onClick={() => toggleActive(coupon)}
                            className={`p-2 rounded-lg transition ${
                              coupon.isActive 
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                            title={coupon.isActive ? 'Desativar' : 'Ativar'}
                          >
                            {coupon.isActive ? <FiCheck /> : <FiX />}
                          </button>
                          <button
                            onClick={() => handleEdit(coupon)}
                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                            title="Editar"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            onClick={() => handleDelete(coupon)}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                            title="Excluir"
                          >
                            <FiTrash2 />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Já utilizado</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Código e Descrição */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código do Cupom *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Ex: PRIMEIRACOMPRA"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 font-mono uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição (interna)
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ex: Campanha de Janeiro"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Tipo e Valor */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Desconto *
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'PERCENTAGE' | 'FIXED' })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="PERCENTAGE">Porcentagem (%)</option>
                    <option value="FIXED">Valor Fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor do Desconto *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    placeholder={formData.discountType === 'PERCENTAGE' ? 'Ex: 10' : 'Ex: 25.00'}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Desconto Máximo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.maxDiscountValue}
                    onChange={(e) => setFormData({ ...formData, maxDiscountValue: e.target.value })}
                    placeholder="Ex: 50.00"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    disabled={formData.discountType === 'FIXED'}
                  />
                  <p className="text-xs text-gray-500 mt-1">Limite para descontos %</p>
                </div>
              </div>

              {/* Valor Mínimo e Limites */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Mínimo do Pedido
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minOrderValue}
                    onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                    placeholder="Ex: 100.00"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Limite de Usos Total
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    placeholder="Ilimitado"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Limite por Usuário
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxUsesPerUser}
                    onChange={(e) => setFormData({ ...formData, maxUsesPerUser: e.target.value })}
                    placeholder="1"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Válido a partir de
                  </label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Válido até
                  </label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Deixe vazio para sem limite</p>
                </div>
              </div>

              {/* Restrições */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Restrições</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.firstPurchaseOnly}
                      onChange={(e) => setFormData({ ...formData, firstPurchaseOnly: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span>Apenas primeira compra</span>
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estados permitidos (deixe vazio para todos)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {estados.map((uf) => (
                        <label
                          key={uf}
                          className={`px-3 py-1 rounded-full cursor-pointer text-sm transition ${
                            formData.allowedStates.includes(uf)
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.allowedStates.includes(uf)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, allowedStates: [...formData.allowedStates, uf] })
                              } else {
                                setFormData({ ...formData, allowedStates: formData.allowedStates.filter(s => s !== uf) })
                              }
                            }}
                            className="hidden"
                          />
                          {uf}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Promocional */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2"><FiMonitor /> Modal Promocional (Home)</h3>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showInModal}
                    onChange={(e) => setFormData({ ...formData, showInModal: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="font-medium">Exibir este cupom no modal da página inicial</span>
                </label>

                {formData.showInModal && (
                  <div className="ml-6 space-y-3">
                    <p className="text-xs text-gray-500">
                      Imagem de fundo recomendada: <strong>960 × 480px</strong> (JPEG ou PNG, máx. 3MB).
                      O código do cupão fica sobreposto no centro da imagem.
                    </p>

                    {/* Preview */}
                    {formData.promoImage && (
                      <div className="relative w-full rounded-lg overflow-hidden border" style={{ height: 160 }}>
                        <img src={formData.promoImage} alt="Preview" className="w-full h-full object-cover" />
                        {/* Simula o overlay do modal */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
                          <span className="text-white text-xs uppercase tracking-widest mb-1">Seu cupão</span>
                          <span className="text-white text-2xl font-black tracking-widest drop-shadow">{formData.code || 'CÓDIGO'}</span>
                          <span className="text-white/90 text-base font-bold drop-shadow">
                            {formData.discountType === 'PERCENTAGE'
                              ? `${formData.discountValue || '0'}% OFF`
                              : `R$ ${parseFloat(formData.discountValue || '0').toFixed(2)} OFF`}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, promoImage: '' }))}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <FiX size={12} />
                        </button>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploadingImage}
                        className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-purple-400 hover:text-purple-600 transition disabled:opacity-50"
                      >
                        <FiImage />
                        {uploadingImage ? 'Enviando...' : formData.promoImage ? 'Trocar imagem' : 'Fazer upload da imagem'}
                      </button>
                      {formData.promoImage && (
                        <input
                          type="text"
                          value={formData.promoImage}
                          onChange={(e) => setFormData(prev => ({ ...prev, promoImage: e.target.value }))}
                          placeholder="Ou cole a URL da imagem"
                          className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-400"
                        />
                      )}
                    </div>
                    {!formData.promoImage && (
                      <input
                        type="text"
                        value={formData.promoImage}
                        onChange={(e) => setFormData(prev => ({ ...prev, promoImage: e.target.value }))}
                        placeholder="Ou cole a URL da imagem"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-400"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="border-t pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="font-medium">Cupom ativo</span>
                </label>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm() }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                  {editingCoupon ? 'Salvar' : 'Criar Cupom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
