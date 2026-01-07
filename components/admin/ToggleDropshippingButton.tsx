'use client'

import { useState } from 'react'
import { FiPackage, FiDollarSign } from 'react-icons/fi'

interface ToggleDropshippingButtonProps {
  productId: string
  isDropshipping: boolean
  commission: number | null
}

export default function ToggleDropshippingButton({ 
  productId, 
  isDropshipping: initialDropshipping,
  commission: initialCommission 
}: ToggleDropshippingButtonProps) {
  const [isDropshipping, setIsDropshipping] = useState(initialDropshipping)
  const [commission, setCommission] = useState(initialCommission?.toString() || '10')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    if (!isDropshipping) {
      // Se está desativado, abrir modal para definir comissão
      setShowModal(true)
    } else {
      // Se está ativado, desativar diretamente
      await updateDropshipping(false, null)
    }
  }

  const updateDropshipping = async (active: boolean, comm: number | null) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/products/${productId}/dropshipping`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isDropshipping: active,
          dropshippingCommission: comm 
        })
      })

      if (res.ok) {
        setIsDropshipping(active)
        setShowModal(false)
        window.location.reload()
      } else {
        alert('Erro ao atualizar produto')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao atualizar produto')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    const comm = parseFloat(commission)
    if (isNaN(comm) || comm < 0 || comm > 100) {
      alert('Comissão inválida (0-100%)')
      return
    }
    updateDropshipping(true, comm)
  }

  return (
    <>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
          isDropshipping
            ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        } disabled:opacity-50`}
      >
        <FiPackage className="text-xs" />
        {isDropshipping ? `Drop ${commission}%` : 'Ativar Drop'}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-2 mb-4">
              <FiPackage className="text-purple-600 text-2xl" />
              <h3 className="text-xl font-bold">Ativar Dropshipping</h3>
            </div>

            <p className="text-gray-600 mb-4">
              Este produto ficará disponível para os vendedores revenderem.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comissão do Vendedor (%)
              </label>
              <div className="relative">
                <FiDollarSign className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="10.00"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                O vendedor receberá esta porcentagem do valor de venda
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Ativar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
