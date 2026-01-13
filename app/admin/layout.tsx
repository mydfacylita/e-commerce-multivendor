'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import LoadingSpinner from '@/components/LoadingSpinner'
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
  FiZap,
  FiCreditCard,
  FiTag,
  FiFileText,
  FiDollarSign,
  FiActivity,
  FiSend,
  FiSettings,
  FiMail,
  FiSmartphone
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
    return <LoadingSpinner message="Carregando painel..." />
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
            href="/admin/fretes"
            className="flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-gray-900"
          >
            <FiSend className="text-lg" />
            <span>Fretes</span>
          </Link>
          <Link
            href="/admin/tipos-produtos"
            className="flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-gray-900"
          >
            <FiTag className="text-lg" />
            <span>Tipos de Produtos</span>
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
            href="/admin/pedidos/dropshipping"
            className="flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-gray-900 ml-4"
          >
            <FiTruck className="text-lg" />
            <span>Dropshipping</span>
          </Link>
          <Link
            href="/admin/financeiro"
            className="flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-gray-900"
          >
            <FiDollarSign className="text-lg" />
            <span>Financeiro</span>
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
          <Link
            href="/admin/planos"
            className="flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-gray-900"
          >
            <FiCreditCard className="text-lg" />
            <span>Planos</span>
          </Link>
          <Link
            href="/admin/assinaturas"
            className="flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-gray-900"
          >
            <FiFileText className="text-lg" />
            <span>Assinaturas</span>
          </Link>
          <Link
            href="/admin/logs"
            className="flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-gray-900"
          >
            <FiActivity className="text-lg" />
            <span>Logs de API</span>
          </Link>
          <Link
            href="/admin/email"
            className="flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-gray-900"
          >
            <FiMail className="text-lg" />
            <span>E-mail</span>
          </Link>
          
          {/* Separador */}
          <div className="border-t border-gray-200 my-4"></div>
          
          <Link
            href="/admin/configuracoes"
            className="flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-gray-900"
          >
            <FiSettings className="text-lg" />
            <span>Configurações</span>
          </Link>
          <Link
            href="/admin/configuracoes/aparencia-app"
            className="flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-gray-900 ml-4"
          >
            <FiSmartphone className="text-lg" />
            <span>Aparência App</span>
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
