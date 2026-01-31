'use client'

import { useState, useEffect } from 'react'
import { 

// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

  Package, Plus, Edit, Trash2, Save, X, 
  AlertCircle, CheckCircle, Box, Ruler 
} from 'lucide-react'

interface Embalagem {
  id: string
  code: string
  name: string
  type: string
  innerLength: number
  innerWidth: number
  innerHeight: number
  outerLength: number
  outerWidth: number
  outerHeight: number
  emptyWeight: number
  maxWeight: number
  cost: number
  isActive: boolean
  priority: number
  createdAt: string
}

const TIPOS_EMBALAGEM = [
  { value: 'BOX', label: '📦 Caixa' },
  { value: 'ENVELOPE', label: '✉️ Envelope' },
  { value: 'TUBE', label: '📜 Tubo' },
  { value: 'BAG', label: '🛍️ Sacola' },
  { value: 'CUSTOM', label: '⚙️ Personalizado' }
]

export default function EmbalagensPage() {
  const [embalagens, setEmbalagens] = useState<Embalagem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'BOX',
    innerLength: 0,
    innerWidth: 0,
    innerHeight: 0,
    outerLength: 0,
    outerWidth: 0,
    outerHeight: 0,
    emptyWeight: 0,
    maxWeight: 0,
    cost: 0,
    isActive: true,
    priority: 50
  })

  useEffect(() => {
    loadEmbalagens()
  }, [])

  const loadEmbalagens = async () => {
    try {
      const res = await fetch('/api/admin/embalagens')
      if (res.ok) {
        const data = await res.json()
        setEmbalagens(data)
      }
    } catch (error) {
      console.error('Erro ao carregar embalagens:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const url = editingId 
        ? `/api/admin/embalagens/${editingId}` 
        : '/api/admin/embalagens'
      
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setMessage({ type: 'success', text: editingId ? 'Embalagem atualizada!' : 'Embalagem criada!' })
        resetForm()
        loadEmbalagens()
      } else {
        const error = await res.json()
        setMessage({ type: 'error', text: error.message || 'Erro ao salvar' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar embalagem' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (embalagem: Embalagem) => {
    setFormData({
      code: embalagem.code,
      name: embalagem.name,
      type: embalagem.type,
      innerLength: embalagem.innerLength,
      innerWidth: embalagem.innerWidth,
      innerHeight: embalagem.innerHeight,
      outerLength: embalagem.outerLength,
      outerWidth: embalagem.outerWidth,
      outerHeight: embalagem.outerHeight,
      emptyWeight: embalagem.emptyWeight,
      maxWeight: embalagem.maxWeight,
      cost: embalagem.cost,
      isActive: embalagem.isActive,
      priority: embalagem.priority
    })
    setEditingId(embalagem.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta embalagem?')) return

    try {
      const res = await fetch(`/api/admin/embalagens/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Embalagem excluída!' })
        loadEmbalagens()
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao excluir' })
    }
  }

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      type: 'BOX',
      innerLength: 0,
      innerWidth: 0,
      innerHeight: 0,
      outerLength: 0,
      outerWidth: 0,
      outerHeight: 0,
      emptyWeight: 0,
      maxWeight: 0,
      cost: 0,
      isActive: true,
      priority: 50
    })
    setEditingId(null)
    setShowForm(false)
  }

  const calcularVolume = (c: number, l: number, a: number) => {
    return ((c * l * a) / 1000).toFixed(2)
  }

  const gerarCodigoSugerido = () => {
    const prefixos: Record<string, string> = {
      'BOX': 'B',
      'ENVELOPE': 'A',
      'TUBE': 'T',
      'BAG': 'S',
      'CUSTOM': 'X'
    }
    const prefixo = prefixos[formData.type] || 'X'
    const usados = embalagens.filter(e => e.code.startsWith(prefixo)).map(e => e.code)
    
    for (let num = 1; num <= 9; num++) {
      const codigo = `${prefixo}${num}`
      if (!usados.includes(codigo)) {
        return codigo
      }
    }
    return `${prefixo}${embalagens.length + 1}`
  }

  const getTipoIcon = (type: string) => {
    const icons: Record<string, string> = {
      'BOX': '📦',
      'ENVELOPE': '✉️',
      'TUBE': '📜',
      'BAG': '🛍️',
      'CUSTOM': '⚙️'
    }
    return icons[type] || '📦'
  }

  const copiarDimensoes = () => {
    setFormData({
      ...formData,
      outerLength: formData.innerLength + 2,
      outerWidth: formData.innerWidth + 2,
      outerHeight: formData.innerHeight + 2
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Embalagens</h1>
            <p className="text-gray-500">Gerencie as embalagens disponíveis para envio</p>
          </div>
        </div>
        <button
          onClick={() => {
            const codigo = gerarCodigoSugerido()
            setFormData({ ...formData, code: codigo })
            setShowForm(true)
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Nova Embalagem
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {editingId ? 'Editar Embalagem' : 'Nova Embalagem'}
            </h2>
            <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Ex: A1, B2"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Caixa Pequena"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  {TIPOS_EMBALAGEM.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-blue-800">📐 Dimensões Internas (espaço útil)</h3>
                <button type="button" onClick={copiarDimensoes} className="text-sm text-blue-600 hover:underline">
                  Copiar para externas (+2cm)
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Comprimento (cm)</label>
                  <input type="number" step="0.1" min="0" value={formData.innerLength}
                    onChange={(e) => setFormData({ ...formData, innerLength: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Largura (cm)</label>
                  <input type="number" step="0.1" min="0" value={formData.innerWidth}
                    onChange={(e) => setFormData({ ...formData, innerWidth: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Altura (cm)</label>
                  <input type="number" step="0.1" min="0" value={formData.innerHeight}
                    onChange={(e) => setFormData({ ...formData, innerHeight: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2" required />
                </div>
              </div>
              <div className="mt-2 text-sm text-blue-600">
                Volume: <strong>{calcularVolume(formData.innerLength, formData.innerWidth, formData.innerHeight)} L</strong>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-700 mb-3">📏 Dimensões Externas (para frete)</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Comprimento (cm)</label>
                  <input type="number" step="0.1" min="0" value={formData.outerLength}
                    onChange={(e) => setFormData({ ...formData, outerLength: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Largura (cm)</label>
                  <input type="number" step="0.1" min="0" value={formData.outerWidth}
                    onChange={(e) => setFormData({ ...formData, outerWidth: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Altura (cm)</label>
                  <input type="number" step="0.1" min="0" value={formData.outerHeight}
                    onChange={(e) => setFormData({ ...formData, outerHeight: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2" required />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Peso Vazio (kg)</label>
                <input type="number" step="0.01" min="0" value={formData.emptyWeight}
                  onChange={(e) => setFormData({ ...formData, emptyWeight: parseFloat(e.target.value) || 0 })}
                  className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Peso Máximo (kg) *</label>
                <input type="number" step="0.01" min="0" value={formData.maxWeight}
                  onChange={(e) => setFormData({ ...formData, maxWeight: parseFloat(e.target.value) || 0 })}
                  className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custo (R$)</label>
                <input type="number" step="0.01" min="0" value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                  className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                <input type="number" min="0" max="100" value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="isActive" checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300" />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Ativa</label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={resetForm} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Código</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Nome</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Tipo</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Interna</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Externa</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Peso Máx</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Custo</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {embalagens.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhuma embalagem cadastrada</p>
                </td>
              </tr>
            ) : (
              embalagens.map((emb) => (
                <tr key={emb.id} className={`hover:bg-gray-50 ${!emb.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-700 font-bold rounded-lg text-lg">
                      {emb.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{emb.name}</td>
                  <td className="px-4 py-3 text-center text-2xl">{getTipoIcon(emb.type)}</td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    {emb.innerLength}×{emb.innerWidth}×{emb.innerHeight}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    {emb.outerLength}×{emb.outerWidth}×{emb.outerHeight}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-medium">{emb.maxWeight}kg</td>
                  <td className="px-4 py-3 text-center text-sm">R$ {emb.cost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      emb.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {emb.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleEdit(emb)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(emb.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-700 mb-2">💡 Como funciona:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• O sistema analisa dimensões e peso dos produtos do pedido</li>
          <li>• Seleciona a menor embalagem que comporta todos os itens</li>
          <li>• Na separação, o funcionário vê o código (ex: <strong>B2</strong>) para saber qual caixa usar</li>
        </ul>
      </div>
    </div>
  )
}
