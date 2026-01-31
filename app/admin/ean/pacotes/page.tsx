'use client'

import { useState, useEffect } from 'react'
import { FiPackage, FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiStar } from 'react-icons/fi'
import { toast } from 'react-hot-toast'

interface EANPackage {
  id: string
  name: string
  description?: string
  quantity: number
  price: number
  type: 'OFFICIAL' | 'INTERNAL'
  planId?: string
  planName?: string
  active: boolean
  displayOrder: number
  popular: boolean
}

interface Plan {
  id: string
  name: string
}

export default function AdminEANPackagesPage() {
  const [packages, setPackages] = useState<EANPackage[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState<EANPackage | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    quantity: 10,
    price: 0,
    type: 'INTERNAL' as 'OFFICIAL' | 'INTERNAL',
    planId: '',
    active: true,
    displayOrder: 0,
    popular: false
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [pkgsRes, plansRes] = await Promise.all([
        fetch('/api/admin/ean/packages'),
        fetch('/api/admin/planos')
      ])

      if (pkgsRes.ok) {
        const data = await pkgsRes.json()
        setPackages(data.packages || [])
      }

      if (plansRes.ok) {
        const data = await plansRes.json()
        setPlans(data.plans || [])
      }
    } catch (error) {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingPackage 
        ? `/api/admin/ean/packages/${editingPackage.id}`
        : '/api/admin/ean/packages'
      
      const res = await fetch(url, {
        method: editingPackage ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        toast.success(editingPackage ? 'Pacote atualizado!' : 'Pacote criado!')
        setShowModal(false)
        resetForm()
        loadData()
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao salvar')
      }
    } catch (error) {
      toast.error('Erro ao salvar pacote')
    }
  }

  const handleEdit = (pkg: EANPackage) => {
    setEditingPackage(pkg)
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      quantity: pkg.quantity,
      price: pkg.price,
      type: pkg.type,
      planId: pkg.planId || '',
      active: pkg.active,
      displayOrder: pkg.displayOrder,
      popular: pkg.popular
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deletar este pacote?')) return

    try {
      const res = await fetch(`/api/admin/ean/packages/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success('Pacote deletado!')
        loadData()
      } else {
        toast.error('Erro ao deletar')
      }
    } catch (error) {
      toast.error('Erro ao deletar pacote')
    }
  }

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/admin/ean/packages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active })
      })

      if (res.ok) {
        toast.success('Status atualizado!')
        loadData()
      }
    } catch (error) {
      toast.error('Erro ao atualizar')
    }
  }

  const resetForm = () => {
    setEditingPackage(null)
    setFormData({
      name: '',
      description: '',
      quantity: 10,
      price: 0,
      type: 'INTERNAL',
      planId: '',
      active: true,
      displayOrder: 0,
      popular: false
    })
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Pacotes de Códigos EAN</h1>
          <p className="text-gray-600 mt-1">Gerenciar pacotes disponíveis para vendedores</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <FiPlus />
          Novo Pacote
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`bg-white rounded-xl border-2 p-6 relative ${
                pkg.active ? 'border-gray-200' : 'border-gray-300 opacity-60'
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <FiStar className="w-3 h-3" /> POPULAR
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{pkg.name}</h3>
                  <p className="text-sm text-gray-600">{pkg.description}</p>
                </div>
                <button
                  onClick={() => toggleActive(pkg.id, pkg.active)}
                  className={`${pkg.active ? 'text-green-600' : 'text-gray-400'}`}
                >
                  {pkg.active ? <FiToggleRight className="w-6 h-6" /> : <FiToggleLeft className="w-6 h-6" />}
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Quantidade:</span>
                  <span className="font-medium">{pkg.quantity} códigos</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Preço:</span>
                  <span className="font-medium text-green-600">
                    {Number(pkg.price) === 0 ? 'GRÁTIS' : `R$ ${Number(pkg.price).toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tipo:</span>
                  <span className={`font-medium ${pkg.type === 'OFFICIAL' ? 'text-purple-600' : 'text-blue-600'}`}>
                    {pkg.type === 'OFFICIAL' ? '🏆 Oficial GS1' : '🏪 Interno'}
                  </span>
                </div>
                {pkg.planName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Plano:</span>
                    <span className="font-medium">{pkg.planName}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(pkg)}
                  className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2"
                >
                  <FiEdit2 className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(pkg.id)}
                  className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2"
                >
                  <FiTrash2 className="w-4 h-4" />
                  Deletar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-6">
              {editingPackage ? 'Editar Pacote' : 'Novo Pacote'}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Ex: Oficial Business"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Quantidade *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Preço (R$) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tipo *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'OFFICIAL' | 'INTERNAL' })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="INTERNAL">Interno (200-xxx)</option>
                    <option value="OFFICIAL">Oficial GS1 (789-xxx)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Vincular ao Plano</label>
                  <select
                    value={formData.planId}
                    onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="">Todos os planos</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>{plan.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Ordem de Exibição</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Descrição do pacote..."
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Ativo</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.popular}
                    onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Marcar como popular</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm() }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingPackage ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
