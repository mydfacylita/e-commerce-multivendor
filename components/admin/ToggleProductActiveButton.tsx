'use client'

import { useState } from 'react'
import { FiEye, FiEyeOff } from 'react-icons/fi'

interface ToggleProductActiveButtonProps {
  productId: string
  currentStatus: boolean
}

export default function ToggleProductActiveButton({ 
  productId, 
  currentStatus 
}: ToggleProductActiveButtonProps) {
  const [isActive, setIsActive] = useState(currentStatus)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    if (loading) return

    try {
      setLoading(true)
      const response = await fetch(`/api/admin/products/${productId}/toggle-active`, {
        method: 'PATCH',
      })

      if (!response.ok) throw new Error('Erro ao atualizar status')

      const data = await response.json()
      setIsActive(data.active)
      window.location.reload() // Recarrega para atualizar a lista
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao atualizar status do produto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`p-2 rounded-md ${
        isActive
          ? 'text-green-600 hover:bg-green-50'
          : 'text-gray-400 hover:bg-gray-50'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={isActive ? 'Produto Ativo - Clique para inativar' : 'Produto Inativo - Clique para ativar'}
    >
      {isActive ? <FiEye size={18} /> : <FiEyeOff size={18} />}
    </button>
  )
}
