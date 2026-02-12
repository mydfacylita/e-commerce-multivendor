'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  FiSmartphone,
  FiBarChart2,
  FiTrendingUp,
  FiPieChart,
  FiChevronDown,
  FiChevronRight,
  FiMapPin,
  FiShield,
  FiLink,
  FiPrinter,
  FiLogOut,
  FiGift,
  FiCpu,
  FiMessageSquare,
  FiCheckCircle
} from 'react-icons/fi'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    catalogo: true,
    vendas: false,
    logistica: false,
    gestao: false,
    monitoramento: false,
    integracoes: false,
    configuracoes: false
  })

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Páginas públicas que não precisam de autenticação
  const isPublicPage = pathname === '/admin/login'

  useEffect(() => {
    // Não redireciona em páginas públicas
    if (isPublicPage) return
    
    if (status === 'loading') return // Aguarda carregar antes de redirecionar
    
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    } else if (session?.user?.role !== 'ADMIN') {
      router.push('/')
    }
  }, [session, status, router, isPublicPage])

  // Páginas públicas renderizam diretamente sem verificação
  if (isPublicPage) {
    return <>{children}</>
  }

  if (status === 'loading') {
    return <LoadingSpinner message="Carregando painel..." />
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-primary-600">Admin Panel</h2>
        </div>
        <nav className="px-4 pb-6 space-y-1">
          <Link
            href="/admin"
            className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 ${pathname === '/admin' ? 'bg-primary-50 text-primary-600' : 'text-gray-900'}`}
          >
            <FiHome className="text-lg" />
            <span>Dashboard</span>
          </Link>

          {/* Catálogo */}
          <div>
            <button
              onClick={() => toggleSection('catalogo')}
              className="w-full flex items-center justify-between px-4 py-2 rounded-md hover:bg-gray-100 text-gray-900 font-medium"
            >
              <div className="flex items-center space-x-3">
                <FiPackage className="text-lg" />
                <span>Catálogo</span>
              </div>
              {openSections.catalogo ? <FiChevronDown /> : <FiChevronRight />}
            </button>
            {openSections.catalogo && (
              <div className="ml-4 mt-1 space-y-1">
                <Link
                  href="/admin/produtos"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/produtos' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiPackage className="text-base" />
                  <span>Produtos</span>
                </Link>
                <Link
                  href="/admin/produtos/aprovacao"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/produtos/aprovacao' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiCheckCircle className="text-base" />
                  <span>Aprovação de Produtos</span>
                </Link>
                <Link
                  href="/admin/categorias"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/categorias' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiGrid className="text-base" />
                  <span>Categorias</span>
                </Link>
                <Link
                  href="/admin/tipos-produtos"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/tipos-produtos' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiTag className="text-base" />
                  <span>Tipos</span>
                </Link>
                <Link
                  href="/admin/ean"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/ean' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiBarChart2 className="text-base" />
                  <span>Solicitações EAN</span>
                </Link>
                <Link
                  href="/admin/ean/codigos"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/ean/codigos' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiTag className="text-base" />
                  <span>Meus Códigos EAN</span>
                </Link>
                <Link
                  href="/admin/ean/pacotes"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/ean/pacotes' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiPackage className="text-base" />
                  <span>Pacotes EAN</span>
                </Link>
                <Link
                  href="/admin/fornecedores"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/fornecedores' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiTruck className="text-base" />
                  <span>Fornecedores</span>
                </Link>
              </div>
            )}
          </div>

          {/* Vendas & Pedidos */}
          <div>
            <button
              onClick={() => toggleSection('vendas')}
              className="w-full flex items-center justify-between px-4 py-2 rounded-md hover:bg-gray-100 text-gray-900 font-medium"
            >
              <div className="flex items-center space-x-3">
                <FiShoppingCart className="text-lg" />
                <span>Vendas</span>
              </div>
              {openSections.vendas ? <FiChevronDown /> : <FiChevronRight />}
            </button>
            {openSections.vendas && (
              <div className="ml-4 mt-1 space-y-1">
                <Link
                  href="/admin/pedidos"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/pedidos' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiShoppingCart className="text-base" />
                  <span>Pedidos</span>
                </Link>
                <Link
                  href="/admin/pedidos/dropshipping/dsers"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname.includes('/admin/pedidos/dropshipping') ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiBox className="text-base" />
                  <span>Dropshipping</span>
                </Link>
                <Link
                  href="/admin/pedidos/entregas"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/pedidos/entregas' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiTruck className="text-base" />
                  <span>Entregas</span>
                </Link>
                <Link
                  href="/admin/devolucoes"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/devolucoes' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiFileText className="text-base" />
                  <span>Devoluções</span>
                </Link>
                <Link
                  href="/admin/cupons"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/cupons' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiTag className="text-base" />
                  <span>Cupons</span>
                </Link>
                <Link
                  href="/admin/marketing"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/marketing' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiZap className="text-base" />
                  <span>Marketing</span>
                </Link>
                <Link
                  href="/admin/perguntas"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/perguntas' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiMessageSquare className="text-base" />
                  <span>Perguntas</span>
                </Link>
              </div>
            )}
          </div>

          {/* Logística */}
          <div>
            <button
              onClick={() => toggleSection('logistica')}
              className="w-full flex items-center justify-between px-4 py-2 rounded-md hover:bg-gray-100 text-gray-900 font-medium"
            >
              <div className="flex items-center space-x-3">
                <FiTruck className="text-lg" />
                <span>Logística</span>
              </div>
              {openSections.logistica ? <FiChevronDown /> : <FiChevronRight />}
            </button>
            {openSections.logistica && (
              <div className="ml-4 mt-1 space-y-1">
                <Link
                  href="/admin/expedicao"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/expedicao' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiTruck className="text-base" />
                  <span>Expedição</span>
                </Link>
                <Link
                  href="/admin/fretes"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/fretes' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiSend className="text-base" />
                  <span>Fretes</span>
                </Link>
                <Link
                  href="/admin/embalagens"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/embalagens' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiBox className="text-base" />
                  <span>Embalagens</span>
                </Link>
                <Link
                  href="/admin/etiquetas-produtos"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/etiquetas-produtos' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiTag className="text-base" />
                  <span>Etiquetas Produtos</span>
                </Link>
              </div>
            )}
          </div>

          {/* Gestão */}
          <div>
            <button
              onClick={() => toggleSection('gestao')}
              className="w-full flex items-center justify-between px-4 py-2 rounded-md hover:bg-gray-100 text-gray-900 font-medium"
            >
              <div className="flex items-center space-x-3">
                <FiUsers className="text-lg" />
                <span>Gestão</span>
              </div>
              {openSections.gestao ? <FiChevronDown /> : <FiChevronRight />}
            </button>
            {openSections.gestao && (
              <div className="ml-4 mt-1 space-y-1">
                <Link
                  href="/admin/usuarios"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/usuarios' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiUsers className="text-base" />
                  <span>Usuários</span>
                </Link>
                <Link
                  href="/admin/vendedores"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/vendedores' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiShoppingBag className="text-base" />
                  <span>Vendedores</span>
                </Link>
                <Link
                  href="/admin/vendedores/contas"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname?.startsWith('/admin/vendedores/contas') ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiCreditCard className="text-base" />
                  <span>Contas Digitais</span>
                </Link>
                <Link
                  href="/admin/cashback"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname?.startsWith('/admin/cashback') ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiGift className="text-base" />
                  <span>Cashback</span>
                </Link>
                <Link
                  href="/admin/empresa"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/empresa' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiBriefcase className="text-base" />
                  <span>Empresa</span>
                </Link>
                <Link
                  href="/admin/financeiro"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/financeiro' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiDollarSign className="text-base" />
                  <span>Financeiro</span>
                </Link>
                <Link
                  href="/admin/contabilidade"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname?.startsWith('/admin/contabilidade') ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiFileText className="text-base" />
                  <span>Contabilidade</span>
                </Link>
                <Link
                  href="/admin/invoices"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname?.startsWith('/admin/invoices') ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiFileText className="text-base" />
                  <span>Notas Fiscais</span>
                </Link>
                <Link
                  href="/admin/planos"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/planos' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiCreditCard className="text-base" />
                  <span>Planos</span>
                </Link>
                <Link
                  href="/admin/assinaturas"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/assinaturas' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiFileText className="text-base" />
                  <span>Assinaturas</span>
                </Link>
              </div>
            )}
          </div>

          {/* Monitoramento */}
          <div>
            <button
              onClick={() => toggleSection('monitoramento')}
              className="w-full flex items-center justify-between px-4 py-2 rounded-md hover:bg-gray-100 text-gray-900 font-medium"
            >
              <div className="flex items-center space-x-3">
                <FiBarChart2 className="text-lg" />
                <span>Monitoramento</span>
              </div>
              {openSections.monitoramento ? <FiChevronDown /> : <FiChevronRight />}
            </button>
            {openSections.monitoramento && (
              <div className="ml-4 mt-1 space-y-1">
                <Link
                  href="/admin/analytics/vendas"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/analytics/vendas' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiDollarSign className="text-base" />
                  <span>Vendas</span>
                </Link>
                <Link
                  href="/admin/analytics"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/analytics' && !pathname.includes('/vendas') ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiPieChart className="text-base" />
                  <span>Analytics</span>
                </Link>
                <Link
                  href="/admin/pedidos/mapa"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/pedidos/mapa' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiMapPin className="text-base" />
                  <span>Mapa de Pedidos</span>
                </Link>
                <Link
                  href="/admin/antifraude"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname.includes('/admin/antifraude') ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiShield className="text-base" />
                  <span>Antifraude</span>
                </Link>
                <Link
                  href="/admin/consistency"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/consistency' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiActivity className="text-base" />
                  <span>Consistência</span>
                </Link>
                <Link
                  href="/admin/performance"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/performance' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiTrendingUp className="text-base" />
                  <span>Performance</span>
                </Link>
                <Link
                  href="/admin/logs"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/logs' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiActivity className="text-base" />
                  <span>Logs API</span>
                </Link>
              </div>
            )}
          </div>

          {/* Integrações */}
          <div>
            <button
              onClick={() => toggleSection('integracoes')}
              className="w-full flex items-center justify-between px-4 py-2 rounded-md hover:bg-gray-100 text-gray-900 font-medium"
            >
              <div className="flex items-center space-x-3">
                <FiZap className="text-lg" />
                <span>Integrações</span>
              </div>
              {openSections.integracoes ? <FiChevronDown /> : <FiChevronRight />}
            </button>
            {openSections.integracoes && (
              <div className="ml-4 mt-1 space-y-1">
                <Link
                  href="/admin/integracao"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/integracao' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiZap className="text-base" />
                  <span>Todas Integrações</span>
                </Link>
                <Link
                  href="/admin/integracao/envios"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/integracao/envios' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiTruck className="text-base" />
                  <span>Correios</span>
                </Link>
                <Link
                  href="/admin/integracao/mercadopago"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/integracao/mercadopago' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiCreditCard className="text-base" />
                  <span>Mercado Pago</span>
                </Link>
                <Link
                  href="/admin/integracao/whatsapp"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/integracao/whatsapp' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiSmartphone className="text-base" />
                  <span>WhatsApp</span>
                </Link>
                <Link
                  href="/admin/integracao/aliexpress"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname?.startsWith('/admin/integracao/aliexpress') ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiShoppingCart className="text-base" />
                  <span>Dropshipping</span>
                </Link>
              </div>
            )}
          </div>

          <Link
            href="/admin/email"
            className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 ${pathname === '/admin/email' ? 'bg-primary-50 text-primary-600' : 'text-gray-900'}`}
          >
            <FiMail className="text-lg" />
            <span>E-mail</span>
          </Link>

          {/* Configurações */}
          <div>
            <button
              onClick={() => toggleSection('configuracoes')}
              className="w-full flex items-center justify-between px-4 py-2 rounded-md hover:bg-gray-100 text-gray-900 font-medium"
            >
              <div className="flex items-center space-x-3">
                <FiSettings className="text-lg" />
                <span>Configurações</span>
              </div>
              {openSections.configuracoes ? <FiChevronDown /> : <FiChevronRight />}
            </button>
            {openSections.configuracoes && (
              <div className="ml-4 mt-1 space-y-1">
                <Link
                  href="/admin/configuracoes"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/configuracoes' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiSettings className="text-base" />
                  <span>Geral</span>
                </Link>
                <Link
                  href="/admin/configuracoes/nota-fiscal"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/configuracoes/nota-fiscal' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiFileText className="text-base" />
                  <span>Nota Fiscal (NF-e)</span>
                </Link>
                <Link
                  href="/admin/configuracoes/aparencia-app"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/configuracoes/aparencia-app' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiSmartphone className="text-base" />
                  <span>Aparência App</span>
                </Link>
                <Link
                  href="/admin/configuracoes/email"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/configuracoes/email' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiMail className="text-base" />
                  <span>Contas de E-mail</span>
                </Link>
                <Link
                  href="/admin/configuracoes/impressoras"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/configuracoes/impressoras' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiPrinter className="text-base" />
                  <span>Impressoras</span>
                </Link>
                <Link
                  href="/admin/configuracoes/ia"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/configuracoes/ia' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiCpu className="text-base" />
                  <span>Inteligência Artificial</span>
                </Link>
              </div>
            )}
          </div>

          {/* Botão de Sair */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => signOut({ redirect: true, callbackUrl: `${window.location.origin}/admin/login` })}
              className="w-full flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-red-50 hover:text-red-600 text-gray-700"
            >
              <FiLogOut className="text-lg" />
              <span>Sair</span>
            </button>
          </div>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
