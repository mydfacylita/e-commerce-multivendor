'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiRefreshCw } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface ResetSupplierStatusButtonProps {
  orderId: string
}

export default function ResetSupplierStatusButton({ orderId }: ResetSupplierStatusButtonProps) {
  const router = useRouter()
  const [resetting, setResetting] = useState(false)

  const handleReset = async () => {
    if (!confirm('Resetar status de envio ao fornecedor? Isso permitirá reenviar o pedido.')) return

    setResetting(true)
    try {
      const res = await fetch('/api/admin/orders/reset-supplier-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Erro ao resetar status')
      }

      toast.success('✅ Status resetado! Você pode reenviar o pedido agora.')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setResetting(false)
    }
  }

  return (
    <button
      onClick={handleReset}
      disabled={resetting}
      className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
      title="Resetar status de envio"
    >
      <FiRefreshCw className={resetting ? 'animate-spin' : ''} size={16} />
      <span>Resetar</span>
    </button>
  )
}
