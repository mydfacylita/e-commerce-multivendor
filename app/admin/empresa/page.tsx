'use client'

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { FiSave, FiPackage, FiUsers, FiDollarSign } from "react-icons/fi"


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function EmpresaPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    totalProdutos: 0,
    produtosDropshipping: 0,
    totalVendedores: 0,
    pedidosDropshipping: 0
  })
  
  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    address: "",
    defaultCommission: "10",
    processingDays: "2",
    showRealTimeStock: true,
    autoApproveSellers: false,
    notifyNewDropshippingProducts: true
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/login')
    }
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      redirect('/')
    }
    
    loadSettings()
    loadStats()
  }, [status, session])

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/company-settings')
      if (res.ok) {
        const data = await res.json()
        setFormData({
          name: data.name || "",
          cnpj: data.cnpj || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          defaultCommission: data.defaultCommission?.toString() || "10",
          processingDays: data.processingDays?.toString() || "2",
          showRealTimeStock: data.showRealTimeStock ?? true,
          autoApproveSellers: data.autoApproveSellers ?? false,
          notifyNewDropshippingProducts: data.notifyNewDropshippingProducts ?? true
        })
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    }
  }

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/company-stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/admin/company-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        alert('Configurações salvas com sucesso!')
      } else {
        alert('Erro ao salvar configurações')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao salvar configurações')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Configurações da Empresa</h1>
          <p className="text-gray-600 mt-2">Gerencie as configurações da sua empresa e do programa de dropshipping</p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Produtos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProdutos}</p>
              </div>
              <FiPackage className="text-3xl text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Produtos Dropshipping</p>
                <p className="text-2xl font-bold text-green-600">{stats.produtosDropshipping}</p>
              </div>
              <FiPackage className="text-3xl text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Vendedores Ativos</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalVendedores}</p>
              </div>
              <FiUsers className="text-3xl text-purple-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Vendas Dropshipping</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pedidosDropshipping}</p>
              </div>
              <FiDollarSign className="text-3xl text-orange-500" />
            </div>
          </div>
        </div>

        {/* Configurações da Empresa */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Informações da Empresa</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Empresa
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="MYD Facilyta Tecnology"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="mydfacilyta@gmail.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="98991269315"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Endereço
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="AV DOS HOLANDESES Nº 15"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <FiSave />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        </div>

        {/* Configurações de Dropshipping */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Configurações de Dropshipping</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comissão Padrão (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.defaultCommission}
                  onChange={(e) => setFormData({...formData, defaultCommission: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="10.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Comissão padrão para novos produtos de dropshipping
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prazo de Processamento (dias)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.processingDays}
                  onChange={(e) => setFormData({...formData, processingDays: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tempo estimado para processar pedidos
                </p>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={formData.showRealTimeStock}
                  onChange={(e) => setFormData({...formData, showRealTimeStock: e.target.checked})}
                  className="w-4 h-4 text-blue-600" 
                />
                <span className="text-sm text-gray-700">
                  Permitir que vendedores vejam estoque em tempo real
                </span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={formData.autoApproveSellers}
                  onChange={(e) => setFormData({...formData, autoApproveSellers: e.target.checked})}
                  className="w-4 h-4 text-blue-600" 
                />
                <span className="text-sm text-gray-700">
                  Aprovar vendedores automaticamente
                </span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={formData.notifyNewDropshippingProducts}
                  onChange={(e) => setFormData({...formData, notifyNewDropshippingProducts: e.target.checked})}
                  className="w-4 h-4 text-blue-600" 
                />
                <span className="text-sm text-gray-700">
                  Notificar vendedores sobre novos produtos de dropshipping
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <FiSave />
              {loading ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
