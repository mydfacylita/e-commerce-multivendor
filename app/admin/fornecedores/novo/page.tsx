'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiArrowLeft } from 'react-icons/fi'
import toast from 'react-hot-toast'

export default function NovoFornecedorPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    apiUrl: '',
    apiKey: '',
    commission: '0',
    active: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          commission: parseFloat(formData.commission),
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao criar fornecedor')
      }

      toast.success('Fornecedor criado com sucesso!')
      router.push('/admin/fornecedores')
    } catch (error) {
      toast.error('Erro ao criar fornecedor')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <Link
        href="/admin/fornecedores"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
      >
        <FiArrowLeft className="mr-2" />
        Voltar
      </Link>

      <h1 className="text-3xl font-bold mb-8">Novo Fornecedor</h1>

      <form onSubmit={handleSubmit} className="max-w-3xl bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Nome do Fornecedor *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
              placeholder="Ex: Fornecedor ABC"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
              placeholder="contato@fornecedor.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Telefone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
              placeholder="(00) 0000-0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Website</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
              placeholder="https://fornecedor.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Comissão (%)</label>
            <input
              type="number"
              step="0.01"
              value={formData.commission}
              onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold text-lg mb-4">Integração API (Opcional)</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">URL da API</label>
              <input
                type="url"
                value={formData.apiUrl}
                onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="https://api.fornecedor.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">API Key</label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-500 mt-1">
                Para sincronização automática de produtos e estoque
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="active"
            checked={formData.active}
            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="active" className="ml-2 text-sm font-medium">
            Fornecedor ativo
          </label>
        </div>

        <div className="flex space-x-4 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-primary-600 text-white py-3 rounded-md hover:bg-primary-700 font-semibold disabled:bg-gray-400"
          >
            {isLoading ? 'Criando...' : 'Criar Fornecedor'}
          </button>
          <Link
            href="/admin/fornecedores"
            className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-md hover:bg-gray-50 text-center font-semibold"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
