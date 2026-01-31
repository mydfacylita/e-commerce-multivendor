'use client'

import { useState, useEffect } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiTruck, FiToggleLeft, FiToggleRight } from 'react-icons/fi'
import Link from 'next/link'
import toast from 'react-hot-toast'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface ShippingRule {
  id: string
  name: string
  description: string | null
  regionType: string
  regions: string
  minWeight: number | null
  maxWeight: number | null
  minCartValue: number | null
  maxCartValue: number | null
  shippingCost: number
  costPerKg: number | null
  freeShippingMin: number | null
  deliveryDays: number
  isActive: boolean
  priority: number
}

export default function FretesAdminPage() {
  const [rules, setRules] = useState<ShippingRule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    try {
      const response = await fetch('/api/admin/shipping-rules')
      if (response.ok) {
        const data = await response.json()
        setRules(data.rules)
      }
    } catch (error) {
      toast.error('Erro ao carregar regras de frete')
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/shipping-rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (response.ok) {
        toast.success('Status atualizado!')
        loadRules()
      }
    } catch (error) {
      toast.error('Erro ao atualizar status')
    }
  }

  const deleteRule = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta regra?')) return

    try {
      const response = await fetch(`/api/admin/shipping-rules/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Regra excluída!')
        loadRules()
      }
    } catch (error) {
      toast.error('Erro ao excluir regra')
    }
  }

  const parseRegions = (regionsJson: string) => {
    try {
      const regions = JSON.parse(regionsJson)
      if (Array.isArray(regions)) {
        return regions.join(', ')
      }
      return regionsJson
    } catch {
      return regionsJson
    }
  }

  const getRegionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'NATIONWIDE': 'Todo Brasil',
      'STATE': 'Por Estado',
      'CITY': 'Por Cidade',
      'ZIPCODE_RANGE': 'Faixa de CEP'
    }
    return labels[type] || type
  }

  if (loading) {
    return <div className="p-8">Carregando...</div>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FiTruck className="text-primary-600" />
            Gestão de Fretes
          </h1>
          <p className="text-gray-600 mt-2">Configure as regras de frete para toda a plataforma</p>
        </div>
        <Link
          href="/admin/fretes/nova"
          className="bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 flex items-center gap-2 font-semibold"
        >
          <FiPlus /> Nova Regra
        </Link>
      </div>

      {rules.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FiTruck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Nenhuma regra cadastrada</h3>
          <p className="text-gray-600 mb-6">Crie sua primeira regra de frete</p>
          <Link
            href="/admin/fretes/nova"
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700"
          >
            <FiPlus /> Criar Primeira Regra
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">{rule.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {rule.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                      Prioridade: {rule.priority}
                    </span>
                  </div>
                  
                  {rule.description && (
                    <p className="text-gray-600 mb-3">{rule.description}</p>
                  )}

                  <div className="grid md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-gray-500">Tipo de Região</p>
                      <p className="font-semibold">{getRegionTypeLabel(rule.regionType)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Regiões</p>
                      <p className="font-semibold">{parseRegions(rule.regions)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Custo do Frete</p>
                      <p className="font-semibold text-primary-600">R$ {rule.shippingCost.toFixed(2)}</p>
                      {rule.costPerKg && <p className="text-xs text-gray-500">+ R$ {rule.costPerKg.toFixed(2)}/kg</p>}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Prazo de Entrega</p>
                      <p className="font-semibold">{rule.deliveryDays} dias úteis</p>
                    </div>
                  </div>

                  {rule.freeShippingMin && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                      <p className="text-sm text-green-800">
                        🚚 Frete grátis para compras acima de <strong>R$ {rule.freeShippingMin.toFixed(2)}</strong>
                      </p>
                    </div>
                  )}

                  {(rule.minCartValue || rule.maxCartValue || rule.minWeight || rule.maxWeight) && (
                    <div className="flex flex-wrap gap-4 text-sm">
                      {rule.minCartValue && (
                        <span className="text-gray-600">Valor mín: R$ {rule.minCartValue.toFixed(2)}</span>
                      )}
                      {rule.maxCartValue && (
                        <span className="text-gray-600">Valor máx: R$ {rule.maxCartValue.toFixed(2)}</span>
                      )}
                      {rule.minWeight && (
                        <span className="text-gray-600">Peso mín: {rule.minWeight}kg</span>
                      )}
                      {rule.maxWeight && (
                        <span className="text-gray-600">Peso máx: {rule.maxWeight}kg</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => toggleActive(rule.id, rule.isActive)}
                    className="p-2 hover:bg-gray-100 rounded-md transition"
                    title={rule.isActive ? 'Desativar' : 'Ativar'}
                  >
                    {rule.isActive ? (
                      <FiToggleRight className="w-6 h-6 text-green-600" />
                    ) : (
                      <FiToggleLeft className="w-6 h-6 text-gray-400" />
                    )}
                  </button>
                  <Link
                    href={`/admin/fretes/${rule.id}`}
                    className="p-2 hover:bg-blue-50 text-blue-600 rounded-md transition"
                  >
                    <FiEdit2 className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-2 hover:bg-red-50 text-red-600 rounded-md transition"
                  >
                    <FiTrash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
