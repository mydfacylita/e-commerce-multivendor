'use client'

import { FiTrash2 } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useState } from 'react'

export default function DeleteCategoryButton({ categoryId }: { categoryId: string }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta categoria? Os produtos vinculados não serão excluídos.')) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Erro ao excluir categoria')
      }

      toast.success('Categoria excluída com sucesso!')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir categoria')
    } finally {
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
