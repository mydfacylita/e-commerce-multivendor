'use client'

import { useState } from 'react'
import { FiPrinter } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface PrintShippingLabelButtonProps {
  orderId: string
  marketplace?: string
}

export default function PrintShippingLabelButton({ 
  orderId,
  marketplace 
}: PrintShippingLabelButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false)

  const handlePrint = async () => {
    setIsPrinting(true)

    try {
      if (marketplace === 'mercadolivre') {
        // Busca a etiqueta do Mercado Livre
        const response = await fetch(`/api/admin/orders/${orderId}/shipping-label`, {
          method: 'GET',
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Erro ao buscar etiqueta')
        }

        if (data.labelUrl) {
          // Abre a etiqueta em nova aba
          window.open(data.labelUrl, '_blank')
          toast.success('Etiqueta aberta para impressão!')
        } else {
          toast.error('Etiqueta não disponível ainda')
        }
      } else {
        // Para outros marketplaces ou pedidos locais
        toast('Funcionalidade em desenvolvimento')
      }
    } catch (error: any) {
      console.error('Erro ao imprimir etiqueta:', error)
      toast.error(error.message || 'Erro ao imprimir etiqueta')
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <button
      onClick={handlePrint}
      disabled={isPrinting}
      className="p-2 text-purple-600 hover:bg-purple-50 rounded-md disabled:opacity-50"
      title="Imprimir etiqueta"
    >
      {isPrinting ? (
        <div className="animate-spin">
          <FiPrinter size={18} />
        </div>
      ) : (
        <FiPrinter size={18} />
      )}
    </button>
  )
}
