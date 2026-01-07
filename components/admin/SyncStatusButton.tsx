'use client'

import { useState } from 'react'
import { FiRefreshCw } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface SyncStatusButtonProps {
  orderId: string
}

export default function SyncStatusButton({ orderId }: SyncStatusButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    setIsSyncing(true)

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/sync-status`, {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Status sincronizado com sucesso!')
        
        if (data.hasMessages) {
          toast.success('Mensagens do comprador encontradas!', { duration: 4000 })
        }
        
        // Recarregar página após 1 segundo
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        toast.error(data.message || 'Erro ao sincronizar')
      }
    } catch (error) {
      toast.error('Erro ao sincronizar status')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <FiRefreshCw className={isSyncing ? 'animate-spin' : ''} size={18} />
      {isSyncing ? 'Sincronizando...' : 'Sincronizar Status ML'}
    </button>
  )
}
