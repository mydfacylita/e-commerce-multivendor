'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { 
  FiHome, 
  FiPackage, 
  FiGrid, 
  FiTruck, 
  FiBriefcase, 
  FiBox, 
  FiShoppingCart, 
  FiUsers, 
  FiShoppingBag,
  FiZap
} from 'react-icons/fi'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Aguarda carregar antes de redirecionar
    
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.role !== 'ADMIN') {
      router.push('/')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-primary-600">Admin Panel</h2>
        </div>
        <nav className="px-4 space-y-2">
          <Link
            href="/admin"
            className="flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-gray-900"
          >
            <FiHome className="text-lg" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/admin/produtos"
            className="flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-gray-900"
          >
            <FiPackage className="text-lg" />
            <span>Produtos</span>
          </Link>
          <Link
            href="/admin/categorias"
            className="flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-gray-900"
          >
            <FiGrid className="text-lg" />
            <span>Categorias</span>
          </Link>
          <Link
            href="/admin/fornecedores"
            className="flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-gray-900"
          >
            <FiTruck className="text-lg" />
            <span>Fornecedores</span>
          </Link>
          <Link
            href="/admin/empresa"
            className="flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-gray-900"
          >
            <FiBriefcase className="text-lg" />
            <span>Empresa</span>
          </Link>
          <Link
            href="/dropshipping"
            className="flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-gray-900"
          >
            <FiBox className="text-lg" />
            <span>Dropshipping</span>
          </Link>
          <Link
            href="/admin/integracao"
            className="flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-gray-900"
          >
            <FiZap className="text-lg" />
            <span>Integração</span>
          </Link>
          <Link
            href="/admin/pedidos"
            className="flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-gray-900"
          >
            <FiShoppingCart className="text-lg" />
            <span>Pedidos</span>
          </Link>
          <Link
            href="/admin/usuarios"
            className="flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-gray-900"
          >
            <FiUsers className="text-lg" />
            <span>Usuários</span>
          </Link>
          <Link
            href="/admin/vendedores"
            className="flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-gray-900"
          >
            <FiShoppingBag className="text-lg" />
            <span>Vendedores</span>
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
