'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiSend, FiLoader } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface SendToSupplierButtonProps {
  orderId: string
  sentToSupplier: boolean
}

export default function SendToSupplierButton({ orderId, sentToSupplier }: SendToSupplierButtonProps) {
  const router = useRouter()
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!confirm('Deseja enviar este pedido ao fornecedor?')) return

    setSending(true)
    try {
      const res = await fetch('/api/admin/orders/send-to-supplier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Erro ao enviar pedido')
      }

      console.log('Resultados do envio:', data.results)

      // Exibir resultados
      const successResults = data.results.filter((r: any) => r.status === 'sent')
      const manualResults = data.results.filter((r: any) => r.status === 'manual')
      const errorResults = data.results.filter((r: any) => r.status === 'error')

      if (successResults.length > 0) {
        toast.success(`✅ Enviado para ${successResults.length} fornecedor(es)`)
      }

      if (manualResults.length > 0) {
        toast(`⚠️ ${manualResults.length} fornecedor(es) requer envio manual`, {
          icon: '⚠️',
          style: {
            background: '#FEF3C7',
            color: '#92400E',
          },
        })
      }

      if (errorResults.length > 0) {
        console.error('Erros:', errorResults)
        errorResults.forEach((r: any) => {
          toast.error(`❌ ${r.supplierName}: ${r.error}`)
        })
      }

      router.refresh()
    } catch (error: any) {
      console.error('Erro ao enviar:', error)
      toast.error(error.message)
    } finally {
      setSending(false)
    }
  }

  if (sentToSupplier) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        Enviado ao fornecedor
      </div>
    )
  }

  return (
    <button
      onClick={handleSend}
      disabled={sending}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
    >
      {sending ? (
        <>
          <FiLoader className="animate-spin" size={18} />
          <span>Enviando...</span>
        </>
      ) : (
        <>
          <FiSend size={18} />
          <span>Enviar ao Fornecedor</span>
        </>
      )}
    </button>
  )
}
