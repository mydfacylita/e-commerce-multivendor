'use client'

import { FiTrash2 } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useState } from 'react'

export default function DeleteProductButton({ productId }: { productId: string }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir produto')
      }

      toast.success('Produto excluído com sucesso!')
      router.refresh()
    } catch (error) {
      toast.error('Erro ao excluir produto')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
      title="Excluir"
    >
      <FiTrash2 size={18} />
    </button>
  )
}
