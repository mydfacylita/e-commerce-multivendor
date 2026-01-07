'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pendente', color: 'bg-gray-100 text-gray-800' },
  { value: 'PROCESSING', label: 'Processando', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'SHIPPED', label: 'Enviado', color: 'bg-blue-100 text-blue-800' },
  { value: 'DELIVERED', label: 'Entregue', color: 'bg-green-100 text-green-800' },
  { value: 'CANCELLED', label: 'Cancelado', color: 'bg-red-100 text-red-800' },
]

export default function UpdateOrderStatusButton({
  orderId,
  currentStatus,
}: {
  orderId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return

    setIsUpdating(true)

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar status')
      }

      toast.success('Status atualizado com sucesso!')
      router.refresh()
    } catch (error) {
      toast.error('Erro ao atualizar status')
    } finally {
      setIsUpdating(false)
    }
  }

  const currentOption = STATUS_OPTIONS.find((opt) => opt.value === currentStatus)

  return (
    <select
      value={currentStatus}
      onChange={(e) => handleStatusChange(e.target.value)}
      disabled={isUpdating}
      className={`px-3 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${
        currentOption?.color || 'bg-gray-100 text-gray-800'
      } disabled:opacity-50`}
    >
      {STATUS_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
