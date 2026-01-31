'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiArrowLeft, FiSave, FiAlertCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'

const defaultFormData = {
  name: '',
  description: '',
  price: '',
  billingCycle: 'MONTHLY',
  maxProducts: '',
  maxOrders: '',
  maxRevenue: '',
  hasMarketplaceIntegration: false,
  hasDropshipping: false,
  hasAdvancedAnalytics: false,
  hasCustomBranding: false,
  hasPrioritySupport: false,
  platformCommission: '10',
  isActive: true,
  isPopular: false,
  hasFreeTrial: true,
  trialDays: '30'
}

export default function NovoPlanoPage({ params }: { params?: { id?: string } }) {
  const router = useRouter()
  const isEditing = Boolean(params?.id)
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultFormData)
  const [previewMode, setPreviewMode] = useState(false)

  useEffect(() => {
    if (isEditing && params?.id) {
      fetchPlan(params.id)
    }
  }, [isEditing, params?.id])

  const fetchPlan = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/plans/${id}`)
      if (response.ok) {
        const plan = await response.json()
        setFormData({
          name: plan.name,
          description: plan.description || '',
          price: plan.price.toString(),
          billingCycle: plan.billingCycle,
          maxProducts: plan.maxProducts?.toString() || '',
          maxOrders: plan.maxOrders?.toString() || '',
          maxRevenue: plan.maxRevenue?.toString() || '',
          hasMarketplaceIntegration: plan.hasMarketplaceIntegration,
          hasDropshipping: plan.hasDropshipping,
          hasAdvancedAnalytics: plan.hasAdvancedAnalytics,
          hasCustomBranding: plan.hasCustomBranding,
          hasPrioritySupport: plan.hasPrioritySupport,
          platformCommission: plan.platformCommission.toString(),
          isActive: plan.isActive,
          isPopular: plan.isPopular,
          hasFreeTrial: plan.hasFreeTrial,
          trialDays: plan.trialDays?.toString() || ''
        })
      } else {
        toast.error('Plano não encontrado')
        router.push('/admin/planos')
      }
    } catch (error) {
      toast.error('Erro ao carregar plano')
      router.push('/admin/planos')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const url = isEditing 
        ? `/api/admin/plans/${params?.id}` 
        : '/api/admin/plans'
      
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          billingCycle: formData.billingCycle,
          maxProducts: formData.maxProducts ? parseInt(formData.maxProducts) : null,
          maxOrders: formData.maxOrders ? parseInt(formData.maxOrders) : null,
          maxRevenue: formData.maxRevenue ? parseFloat(formData.maxRevenue) : null,
          hasMarketplaceIntegration: formData.hasMarketplaceIntegration,
          hasDropshipping: formData.hasDropshipping,
          hasAdvancedAnalytics: formData.hasAdvancedAnalytics,
          hasCustomBranding: formData.hasCustomBranding,
          hasPrioritySupport: formData.hasPrioritySupport,
          platformCommission: parseFloat(formData.platformCommission),
          isActive: formData.isActive,
          isPopular: formData.isPopular,
          hasFreeTrial: formData.hasFreeTrial,
          trialDays: formData.hasFreeTrial && formData.trialDays ? parseInt(formData.trialDays) : null
        })
      })

      if (response.ok) {
        toast.success(`Plano ${isEditing ? 'atualizado' : 'criado'} com sucesso!`)
        router.push('/admin/planos')
      } else {
        const error = await response.text()
        toast.error(error || `Erro ao ${isEditing ? 'atualizar' : 'criar'} plano`)
      }
    } catch (error) {
      toast.error(`Erro ao ${isEditing ? 'atualizar' : 'criar'} plano`)
    } finally {
      setSaving(false)
    }
  }

  const getBillingCycleText = (cycle: string) => {
    const cycles = {
      'MONTHLY': 'Mensal',
      'QUARTERLY': 'Trimestral',
      'SEMIANNUAL': 'Semestral',
      'ANNUAL': 'Anual'
    }
    return cycles[cycle as keyof typeof cycles] || cycle
  }

  const calculateYearlyDiscount = () => {
    if (formData.billingCycle === 'ANNUAL' && formData.price) {
      const annualPrice = parseFloat(formData.price)
      const monthlyEquivalent = annualPrice / 12
      const regularMonthlyPrice = monthlyEquivalent * 1.2 // Assume 20% discount
      const savings = ((regularMonthlyPrice * 12 - annualPrice) / (regularMonthlyPrice * 12)) * 100
      return Math.round(savings)
    }
    return 0
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/admin/planos" className="text-gray-600 hover:text-gray-900">
          <FiArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Editar Plano' : 'Novo Plano'}
          </h1>
          <p className="text-gray-600">Configure os detalhes do plano de assinatura</p>
        </div>
      </div>

      {/* Preview Toggle */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Modo de Visualização</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPreviewMode(false)}
              className={`px-3 py-1 text-sm rounded ${!previewMode ? 'bg-primary-600 text-white' : 'text-gray-600'}`}
            >
              Edição
            </button>
            <button
              onClick={() => setPreviewMode(true)}
              className={`px-3 py-1 text-sm rounded ${previewMode ? 'bg-primary-600 text-white' : 'text-gray-600'}`}
            >
              Prévia do Card
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className={previewMode ? 'order-2' : ''}>
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Informações Básicas</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Nome do Plano *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="Ex: Básico, Premium, Empresarial"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="Descreva o que está incluído neste plano..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Preço (R$) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="99.90"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Ciclo de Cobrança *</label>
                  <select
                    required
                    value={formData.billingCycle}
                    onChange={(e) => setFormData({...formData, billingCycle: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  >
                    <option value="MONTHLY">Mensal</option>
                    <option value="QUARTERLY">Trimestral</option>
                    <option value="SEMIANNUAL">Semestral</option>
                    <option value="ANNUAL">Anual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Comissão da Plataforma (%) *</label>
                <input
                  type="number"
                  required
                  step="0.1"
                  min="0"
                  max="50"
                  value={formData.platformCommission}
                  onChange={(e) => setFormData({...formData, platformCommission: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="10"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Porcentagem que a plataforma cobra sobre as vendas
                </p>
              </div>
            </div>

            {/* Limites */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Limites do Plano</h3>
              <p className="text-sm text-gray-600">Deixe em branco para limites ilimitados</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Máx. Produtos</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxProducts}
                    onChange={(e) => setFormData({...formData, maxProducts: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="∞ (ilimitado)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Máx. Pedidos/Mês</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxOrders}
                    onChange={(e) => setFormData({...formData, maxOrders: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="∞ (ilimitado)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Máx. Receita/Mês (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.maxRevenue}
                    onChange={(e) => setFormData({...formData, maxRevenue: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="∞ (ilimitado)"
                  />
                </div>
              </div>
            </div>

            {/* Recursos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Recursos Inclusos</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.hasMarketplaceIntegration}
                      onChange={(e) => setFormData({...formData, hasMarketplaceIntegration: e.target.checked})}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="ml-2 text-sm">Integração com Marketplaces</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.hasDropshipping}
                      onChange={(e) => setFormData({...formData, hasDropshipping: e.target.checked})}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="ml-2 text-sm">Dropshipping</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.hasAdvancedAnalytics}
                      onChange={(e) => setFormData({...formData, hasAdvancedAnalytics: e.target.checked})}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="ml-2 text-sm">Relatórios Avançados</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.hasCustomBranding}
                      onChange={(e) => setFormData({...formData, hasCustomBranding: e.target.checked})}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="ml-2 text-sm">Marca Personalizada</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.hasPrioritySupport}
                      onChange={(e) => setFormData({...formData, hasPrioritySupport: e.target.checked})}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="ml-2 text-sm">Suporte Prioritário</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Trial */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Período de Teste</h3>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.hasFreeTrial}
                  onChange={(e) => setFormData({...formData, hasFreeTrial: e.target.checked})}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="ml-2 text-sm">Oferecer período de teste gratuito</span>
              </label>

              {formData.hasFreeTrial && (
                <div>
                  <label className="block text-sm font-medium mb-2">Duração do Trial (dias)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={formData.trialDays}
                    onChange={(e) => setFormData({...formData, trialDays: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                    placeholder="30"
                  />
                </div>
              )}
            </div>

            {/* Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Status do Plano</h3>
              
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <span className="ml-2 text-sm">Plano ativo (disponível para assinatura)</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isPopular}
                    onChange={(e) => setFormData({...formData, isPopular: e.target.checked})}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <span className="ml-2 text-sm">Destacar como "Mais Popular"</span>
                </label>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4 border-t">
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-primary-600 text-white py-3 px-4 rounded-md hover:bg-primary-700 disabled:bg-gray-400 flex items-center justify-center"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <FiSave className="mr-2" />
                      {isEditing ? 'Atualizar' : 'Criar'} Plano
                    </>
                  )}
                </button>
                <Link
                  href="/admin/planos"
                  className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-50 text-center"
                >
                  Cancelar
                </Link>
              </div>
            </div>
          </form>
        </div>

        {/* Preview Card */}
        <div className={previewMode ? 'order-1' : ''}>
          <div className="sticky top-6">
            <h3 className="text-lg font-semibold mb-4">Prévia do Plano</h3>
            <PlanPreviewCard formData={formData} />
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente de prévia do card do plano
function PlanPreviewCard({ formData }: { formData: any }) {
  const features = []
  if (formData.hasMarketplaceIntegration) features.push('Integração com Marketplaces')
  if (formData.hasDropshipping) features.push('Dropshipping')
  if (formData.hasAdvancedAnalytics) features.push('Relatórios Avançados')
  if (formData.hasCustomBranding) features.push('Marca Personalizada')
  if (formData.hasPrioritySupport) features.push('Suporte Prioritário')

  const getBillingCycleText = (cycle: string) => {
    const cycles = {
      'MONTHLY': '/mês',
      'QUARTERLY': '/trimestre',
      'SEMIANNUAL': '/semestre',
      'ANNUAL': '/ano'
    }
    return cycles[cycle as keyof typeof cycles] || cycle
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 border-2 ${formData.isPopular ? 'border-primary-600' : 'border-gray-200'} relative`}>
      {formData.isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">
            Mais Popular
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {formData.name || 'Nome do Plano'}
        </h3>
        <p className="text-gray-600 text-sm mb-4">
          {formData.description || 'Descrição do plano...'}
        </p>
        
        <div className="mb-4">
          <span className="text-3xl font-bold text-gray-900">
            R$ {parseFloat(formData.price || '0').toFixed(2)}
          </span>
          <span className="text-gray-600 ml-1">
            {getBillingCycleText(formData.billingCycle)}
          </span>
        </div>

        {formData.hasFreeTrial && formData.trialDays && (
          <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm mb-4">
            Trial de {formData.trialDays} dias grátis
          </div>
        )}

        <div className="text-sm text-gray-600 mb-4">
          Comissão da plataforma: {formData.platformCommission}%
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {/* Limites */}
        <div className="text-sm">
          <p className="font-medium text-gray-700 mb-2">Limites:</p>
          <ul className="space-y-1 text-gray-600">
            <li>• Produtos: {formData.maxProducts || '∞'}</li>
            <li>• Pedidos: {formData.maxOrders ? `${formData.maxOrders}/mês` : '∞'}</li>
            <li>• Receita: {formData.maxRevenue ? `R$ ${parseFloat(formData.maxRevenue).toLocaleString()}/mês` : '∞'}</li>
          </ul>
        </div>

        {/* Recursos */}
        {features.length > 0 && (
          <div className="text-sm">
            <p className="font-medium text-gray-700 mb-2">Recursos inclusos:</p>
            <ul className="space-y-1">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center text-gray-600">
                  <span className="text-green-500 mr-2">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button className="w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 transition-colors">
        Escolher Plano
      </button>
    </div>
  )
}