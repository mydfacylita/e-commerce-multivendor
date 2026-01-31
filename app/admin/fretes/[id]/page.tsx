'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiSave, FiArrowLeft, FiPlus, FiX } from 'react-icons/fi'
import Link from 'next/link'

const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]

export default function EditarRegraFrete({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState('')

  // Form fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [regionType, setRegionType] = useState<'NATIONWIDE' | 'STATE' | 'CITY' | 'ZIPCODE_RANGE'>('NATIONWIDE')
  const [regions, setRegions] = useState<string[]>([])
  const [minWeight, setMinWeight] = useState('')
  const [maxWeight, setMaxWeight] = useState('')
  const [minCartValue, setMinCartValue] = useState('')
  const [maxCartValue, setMaxCartValue] = useState('')
  const [shippingCost, setShippingCost] = useState('')
  const [costPerKg, setCostPerKg] = useState('')
  const [freeShippingMin, setFreeShippingMin] = useState('')
  const [deliveryDays, setDeliveryDays] = useState('')
  const [priority, setPriority] = useState('1')
  const [isActive, setIsActive] = useState(true)

  // For ZIPCODE_RANGE
  const [zipStart, setZipStart] = useState('')
  const [zipEnd, setZipEnd] = useState('')

  // For STATE selection
  const [selectedStates, setSelectedStates] = useState<string[]>([])

  // For CITY
  const [cityInput, setCityInput] = useState('')

  useEffect(() => {
    loadRule()
  }, [params.id])

  const loadRule = async () => {
    try {
      setLoadingData(true)
      const response = await fetch('/api/admin/shipping-rules')
      const data = await response.json()
      
      const rule = data.rules?.find((r: any) => r.id === params.id)
      
      if (!rule) {
        setError('Regra não encontrada')
        return
      }

      // Parse regions
      let parsedRegions: string[] = []
      try {
        parsedRegions = JSON.parse(rule.regions)
      } catch {
        parsedRegions = []
      }

      // Set form data
      setName(rule.name)
      setDescription(rule.description || '')
      setRegionType(rule.regionType)
      setRegions(parsedRegions)
      
      if (rule.regionType === 'STATE') {
        setSelectedStates(parsedRegions)
      }
      
      setMinWeight(rule.minWeight?.toString() || '')
      setMaxWeight(rule.maxWeight?.toString() || '')
      setMinCartValue(rule.minCartValue?.toString() || '')
      setMaxCartValue(rule.maxCartValue?.toString() || '')
      setShippingCost(rule.shippingCost.toString())
      setCostPerKg(rule.costPerKg?.toString() || '')
      setFreeShippingMin(rule.freeShippingMin?.toString() || '')
      setDeliveryDays(rule.deliveryDays.toString())
      setPriority(rule.priority.toString())
      setIsActive(rule.isActive)
      
    } catch (err: any) {
      setError('Erro ao carregar regra: ' + err.message)
    } finally {
      setLoadingData(false)
    }
  }

  const handleAddRegion = () => {
    if (regionType === 'ZIPCODE_RANGE' && zipStart && zipEnd) {
      setRegions([...regions, `${zipStart}-${zipEnd}`])
      setZipStart('')
      setZipEnd('')
    } else if (regionType === 'CITY' && cityInput.trim()) {
      setRegions([...regions, cityInput.trim()])
      setCityInput('')
    }
  }

  const handleRemoveRegion = (index: number) => {
    setRegions(regions.filter((_, i) => i !== index))
  }

  const handleToggleState = (state: string) => {
    if (selectedStates.includes(state)) {
      setSelectedStates(selectedStates.filter(s => s !== state))
    } else {
      setSelectedStates([...selectedStates, state])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Prepare regions based on type
      let finalRegions: string[] = []
      if (regionType === 'STATE') {
        finalRegions = selectedStates
      } else if (regionType === 'ZIPCODE_RANGE' || regionType === 'CITY') {
        finalRegions = regions
      } else {
        finalRegions = ['BR'] // NATIONWIDE
      }

      const data = {
        name,
        description,
        regionType,
        regions: finalRegions,
        minWeight: minWeight ? parseFloat(minWeight) : null,
        maxWeight: maxWeight ? parseFloat(maxWeight) : null,
        minCartValue: minCartValue ? parseFloat(minCartValue) : null,
        maxCartValue: maxCartValue ? parseFloat(maxCartValue) : null,
        shippingCost: parseFloat(shippingCost),
        costPerKg: costPerKg ? parseFloat(costPerKg) : 0,
        freeShippingMin: freeShippingMin ? parseFloat(freeShippingMin) : null,
        deliveryDays: parseInt(deliveryDays),
        priority: parseInt(priority),
        isActive
      }

      const response = await fetch(`/api/admin/shipping-rules/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.details || errorData.error || errorData.message || 'Erro ao atualizar regra'
        throw new Error(errorMessage)
      }

      router.push('/admin/fretes')
    } catch (err: any) {
      console.error('Erro completo:', err)
      setError(err.message || 'Erro desconhecido ao atualizar regra')
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Editar Regra de Frete</h1>
          <p className="text-gray-600 mt-2">Atualize os dados da regra de cálculo de frete</p>
        </div>
        <Link
          href="/admin/fretes"
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <FiArrowLeft /> Voltar
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Regra *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Ex: Frete São Paulo Capital"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Descreva quando esta regra será aplicada..."
            />
          </div>
        </div>

        {/* Region Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Região *
          </label>
          <select
            value={regionType}
            onChange={(e) => {
              setRegionType(e.target.value as any)
              setRegions([])
              setSelectedStates([])
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="NATIONWIDE">Nacional (Todo Brasil)</option>
            <option value="STATE">Por Estado</option>
            <option value="CITY">Por Cidade</option>
            <option value="ZIPCODE_RANGE">Faixa de CEP</option>
          </select>
        </div>

        {/* Region Selection based on type */}
        {regionType === 'STATE' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione os Estados *
            </label>
            <div className="grid grid-cols-6 gap-2">
              {ESTADOS_BRASIL.map(estado => (
                <button
                  key={estado}
                  type="button"
                  onClick={() => handleToggleState(estado)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    selectedStates.includes(estado)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {estado}
                </button>
              ))}
            </div>
            {selectedStates.length > 0 && (
              <p className="mt-2 text-sm text-gray-600">
                {selectedStates.length} estado(s) selecionado(s): {selectedStates.join(', ')}
              </p>
            )}
          </div>
        )}

        {regionType === 'CITY' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cidades *
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRegion())}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Ex: São Paulo - SP"
              />
              <button
                type="button"
                onClick={handleAddRegion}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <FiPlus /> Adicionar
              </button>
            </div>
            {regions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {regions.map((city, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {city}
                    <button
                      type="button"
                      onClick={() => handleRemoveRegion(index)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <FiX size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {regionType === 'ZIPCODE_RANGE' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Faixas de CEP *
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={zipStart}
                onChange={(e) => setZipStart(e.target.value.replace(/\D/g, ''))}
                maxLength={8}
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="CEP Inicial"
              />
              <span className="flex items-center text-gray-500">até</span>
              <input
                type="text"
                value={zipEnd}
                onChange={(e) => setZipEnd(e.target.value.replace(/\D/g, ''))}
                maxLength={8}
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="CEP Final"
              />
              <button
                type="button"
                onClick={handleAddRegion}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <FiPlus /> Adicionar
              </button>
            </div>
            {regions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {regions.map((range, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {range}
                    <button
                      type="button"
                      onClick={() => handleRemoveRegion(index)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <FiX size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Weight Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Peso Mínimo (kg)
            </label>
            <input
              type="number"
              step="0.01"
              value={minWeight}
              onChange={(e) => setMinWeight(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Peso Máximo (kg)
            </label>
            <input
              type="number"
              step="0.01"
              value={maxWeight}
              onChange={(e) => setMaxWeight(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="999.99"
            />
          </div>
        </div>

        {/* Cart Value Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor Mínimo do Carrinho (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={minCartValue}
              onChange={(e) => setMinCartValue(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor Máximo do Carrinho (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={maxCartValue}
              onChange={(e) => setMaxCartValue(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="9999.99"
            />
          </div>
        </div>

        {/* Shipping Costs */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custo Base do Frete (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="10.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custo por Kg Adicional (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={costPerKg}
              onChange={(e) => setCostPerKg(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="2.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Frete Grátis Acima de (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={freeShippingMin}
              onChange={(e) => setFreeShippingMin(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="199.00"
            />
          </div>
        </div>

        {/* Delivery and Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prazo de Entrega (dias) *
            </label>
            <input
              type="number"
              value={deliveryDays}
              onChange={(e) => setDeliveryDays(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="7"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prioridade (maior = mais prioritário) *
            </label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="1"
            />
          </div>
        </div>

        {/* Active Status */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
            Regra ativa
          </label>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4 pt-6 border-t">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? (
              'Salvando...'
            ) : (
              <>
                <FiSave /> Salvar Alterações
              </>
            )}
          </button>
          <Link
            href="/admin/fretes"
            className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
