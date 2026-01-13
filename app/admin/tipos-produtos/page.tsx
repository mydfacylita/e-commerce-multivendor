'use client'

import { useState, useEffect } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX } from 'react-icons/fi'
import { toast } from 'react-hot-toast'

interface ProductType {
  id: string
  name: string
  slug: string
  description?: string
  icon?: string
  active: boolean
}

export default function ProductTypesPage() {
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
  })

  useEffect(() => {
    fetchProductTypes()
  }, [])

  const fetchProductTypes = async () => {
    try {
      const response = await fetch('/api/admin/product-types')
      const data = await response.json()
      setProductTypes(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error('Erro ao carregar tipos de produtos')
      setProductTypes([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const slug = formData.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    try {
      const url = editingId 
        ? `/api/admin/product-types/${editingId}`
        : '/api/admin/product-types'
      
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, slug }),
      })

      if (!response.ok) throw new Error('Erro ao salvar')

      toast.success(editingId ? 'Tipo atualizado!' : 'Tipo criado!')
      setFormData({ name: '', description: '', icon: '' })
      setEditingId(null)
      fetchProductTypes()
    } catch (error) {
      toast.error('Erro ao salvar tipo de produto')
    }
  }

  const handleEdit = (type: ProductType) => {
    setEditingId(type.id)
    setFormData({
      name: type.name,
      description: type.description || '',
      icon: type.icon || '',
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este tipo de produto?')) return

    try {
      const response = await fetch(`/api/admin/product-types/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Erro ao excluir')

      toast.success('Tipo excluído!')
      fetchProductTypes()
    } catch (error) {
      toast.error('Erro ao excluir tipo de produto')
    }
  }

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const response = await fetch(`/api/admin/product-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      })

      if (!response.ok) throw new Error('Erro ao atualizar')

      toast.success('Status atualizado!')
      fetchProductTypes()
    } catch (error) {
      toast.error('Erro ao atualizar status')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tipos de Produtos</h1>
        <p className="text-gray-600">Gerencie os tipos de produtos disponíveis no cadastro</p>
      </div>

      {/* Formulário */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">
          {editingId ? 'Editar Tipo' : 'Novo Tipo'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Nome do Tipo *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="Ex: Livro, Eletrônico, Vestuário..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Ícone (Emoji)
              </label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="📚 📱 👕 🏠 ⚽"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Descrição
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="Descrição curta..."
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700"
            >
              <FiSave />
              {editingId ? 'Atualizar' : 'Criar'}
            </button>
            
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null)
                  setFormData({ name: '', description: '', icon: '' })
                }}
                className="flex items-center gap-2 bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
              >
                <FiX />
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Descrição
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Array.isArray(productTypes) && productTypes.map((type) => (
                <tr key={type.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {type.icon && <span className="text-2xl">{type.icon}</span>}
                      <span className="font-medium">{type.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {type.slug}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {type.description || '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleToggleActive(type.id, type.active)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        type.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {type.active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(type)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(type.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {productTypes.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>Nenhum tipo de produto cadastrado</p>
            <p className="text-sm mt-1">Crie o primeiro tipo acima</p>
          </div>
        )}
      </div>
    </div>
  )
}
