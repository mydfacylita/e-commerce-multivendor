'use client'

import { FiTrash2 } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useState } from 'react'

export default function DeleteSupplierButton({ supplierId }: { supplierId: string }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este fornecedor?')) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/admin/suppliers/${supplierId}`, {
        method: 'DELETE',
        cache: 'no-store',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Erro ao excluir fornecedor')
      }

      toast.success('Fornecedor excluído com sucesso!')
      
      // Força recarregamento completo da página para limpar cache
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir fornecedor')
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
      title="Excluir"
    >
      <FiTrash2 size={16} />
    </button>
  )
}
