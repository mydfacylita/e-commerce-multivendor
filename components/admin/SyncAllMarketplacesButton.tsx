'use client'

import { useState } from 'react'
import { FiRefreshCw } from 'react-icons/fi'

export default function SyncAllMarketplacesButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSync = async () => {
    if (loading) return

    try {
      setLoading(true)
      setResult(null)

      const response = await fetch('/api/admin/marketplaces/sync-all', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.message || 'Erro ao sincronizar')
        return
      }

      setResult(data)
      
      if (data.errors === 0) {
        alert(`✅ Sincronização concluída!\n${data.synced} produtos atualizados`)
      } else {
        alert(`⚠️ Sincronização concluída com erros:\n${data.synced} sincronizados\n${data.errors} com erro`)
      }

      // Recarrega a página após 2 segundos
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao sincronizar marketplaces')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={loading}
      className={`flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed`}
      title="Sincronizar todos os produtos publicados"
    >
      <FiRefreshCw 
        size={18} 
        className={loading ? 'animate-spin' : ''}
      />
      <span>{loading ? 'Sincronizando...' : 'Sincronizar Todos'}</span>
    </button>
  )
}
