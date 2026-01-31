'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiArrowLeft } from 'react-icons/fi'
import toast from 'react-hot-toast'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function EditCategoriaPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [categories, setCategories] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    parentId: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar categoria atual
        const categoryRes = await fetch(`/api/admin/categories/${params.id}`)
        const category = await categoryRes.json()
        
        setFormData({
          name: category.name || '',
          slug: category.slug || '',
          description: category.description || '',
          image: category.image || '',
          parentId: category.parentId || '',
        })

        // Buscar todas as categorias para o select
        const categoriesRes = await fetch('/api/admin/categories')
        const allCategories = await categoriesRes.json()
        
        // Filtrar para não mostrar a própria categoria nem suas filhas
        const availableCategories = allCategories.filter((cat: any) => 
          cat.id !== params.id && cat.parentId !== params.id
        )
        setCategories(availableCategories)
      } catch (error) {
        toast.error('Erro ao carregar categoria')
      } finally {
        setIsFetching(false)
      }
    }

    fetchData()
  }, [params.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`/api/admin/categories/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          parentId: formData.parentId || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar categoria')
      }

      toast.success('Categoria atualizada com sucesso!')
      router.push('/admin/categorias')
    } catch (error) {
      toast.error('Erro ao atualizar categoria')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-'),
    })
  }

  if (isFetching) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-500">Carregando...</div>
      </div>
    )
  }

  return (
    <div>
      <Link
        href="/admin/categorias"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
      >
        <FiArrowLeft className="mr-2" />
        Voltar
      </Link>

      <h1 className="text-3xl font-bold mb-8">Editar Categoria</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl bg-white rounded-lg shadow-md p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Nome da Categoria *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
            placeholder="Ex: Eletrônicos"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Slug *</label>
          <input
            type="text"
            required
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
            placeholder="eletronicos"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Categoria Pai (opcional)</label>
          <select
            value={formData.parentId}
            onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
          >
            <option value="">Nenhuma (Categoria Principal)</option>
            {categories
              .filter(cat => !cat.parentId) // Mostrar apenas categorias principais
              .map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))
            }
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Selecione uma categoria pai para tornar esta uma subcategoria
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Descrição</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
            rows={3}
            placeholder="Descrição da categoria..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">URL da Imagem</label>
          <input
            type="url"
            value={formData.image}
            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
            placeholder="https://exemplo.com/imagem.jpg"
          />
        </div>

        <div className="flex space-x-4 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-primary-600 text-white py-3 rounded-md hover:bg-primary-700 font-semibold disabled:bg-gray-400"
          >
            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
          <Link
            href="/admin/categorias"
            className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-md hover:bg-gray-50 text-center font-semibold"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
