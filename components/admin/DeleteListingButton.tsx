'use client'

import { useState } from 'react'
import { FiTrash2 } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface DeleteListingButtonProps {
  productId: string
  marketplace: string
  listingId: string
  onDeleted?: () => void
}

export default function DeleteListingButton({
  productId,
  marketplace,
  listingId,
  onDeleted
}: DeleteListingButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/admin/products/${productId}/delete-listing`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ marketplace })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao excluir anúncio')
      }

      toast.success('Anúncio excluído com sucesso!')
      
      if (onDeleted) {
        onDeleted()
      } else {
        // Recarrega a página se não tiver callback
        window.location.reload()
      }
    } catch (error: any) {
      console.error('Erro ao excluir anúncio:', error)
      toast.error(error.message || 'Erro ao excluir anúncio')
    } finally {
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
        >
          {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
          className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
      title="Excluir anúncio do Mercado Livre"
    >
      <FiTrash2 className="w-4 h-4" />
      Excluir Anúncio
    </button>
  )
}
