'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useAutomationPolling } from '@/hooks/useAutomationPolling'
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
  FiCheckCircle,
  FiUserPlus,
  FiHelpCircle,
  FiHeadphones,
  FiUserCheck,
  FiRefreshCw,
  FiHeart,
} from 'react-icons/fi'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  
  // Sistema de automação ativo
  const { isRunning: automationRunning, activeJobsCount } = useAutomationPolling()
  
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

  // Controle de permissões por funcionário
  const [staffPerms, setStaffPerms] = useState<string[] | null>(null)
  const [staffCargo, setStaffCargo] = useState<string | null>(null)
  const [permsLoaded, setPermsLoaded] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && (session?.user?.role === 'ADMIN' || session?.user?.isAdminStaff)) {
      fetch('/api/admin/equipe/me')
        .then(r => r.json())
        .then(d => {
          setStaffPerms(d.isMaster ? null : (d.permissions || []))
          setStaffCargo(d.cargo || null)
          setPermsLoaded(true)
        })
        .catch(() => setPermsLoaded(true))
    }
  }, [status, session])

  // null = master admin (acesso total); string[] = funcionário com permissões restritas
  const can = (key: string) => staffPerms === null || staffPerms.includes(key)
  const canAny = (keys: string[]) => keys.some(k => can(k))

  // Páginas públicas que não precisam de autenticação
  const isPublicPage = pathname === '/admin/login'

  useEffect(() => {
    // Não redireciona em páginas públicas
    if (isPublicPage) return
    
    if (status === 'loading') return // Aguarda carregar antes de redirecionar
    
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    } else if (session?.user?.role !== 'ADMIN' && !session?.user?.isAdminStaff) {
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

  if (!session || (session.user.role !== 'ADMIN' && !session.user.isAdminStaff)) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-primary-600">Admin Panel</h2>
        </div>
        <nav className="px-4 pb-6 space-y-1">
          {can('dashboard') && (
            <Link
              href="/admin"
              className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 ${pathname === '/admin' ? 'bg-primary-50 text-primary-600' : 'text-gray-900'}`}
            >
              <FiHome className="text-lg" />
              <span>Dashboard</span>
            </Link>
          )}

          {can('sac') && (
            <Link
              href="/admin/sac"
              className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 ${pathname?.startsWith('/admin/sac') ? 'bg-primary-50 text-primary-600' : 'text-gray-900'}`}
            >
              <FiHeadphones className="text-lg" />
              <span>SAC</span>
            </Link>
          )}

          {/* Catálogo */}
          {canAny(['catalogo.produtos','catalogo.aprovacao','catalogo.categorias','catalogo.tipos','catalogo.ean','catalogo.fornecedores']) && (
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
                {can('catalogo.produtos') && (
                <Link
                  href="/admin/produtos"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/produtos' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiPackage className="text-base" />
                  <span>Produtos</span>
                </Link>
                )}
                {can('catalogo.aprovacao') && (
                <Link
                  href="/admin/produtos/aprovacao"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/produtos/aprovacao' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiCheckCircle className="text-base" />
                  <span>Aprovação de Produtos</span>
                </Link>
                )}
                {can('catalogo.categorias') && (
                <Link
                  href="/admin/categorias"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/categorias' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiGrid className="text-base" />
                  <span>Categorias</span>
                </Link>
                )}
                {can('catalogo.tipos') && (
                <Link
                  href="/admin/tipos-produtos"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/tipos-produtos' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiTag className="text-base" />
                  <span>Tipos</span>
                </Link>
                )}
                {can('catalogo.ean') && (
                <Link
                  href="/admin/ean"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/ean' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiBarChart2 className="text-base" />
                  <span>Solicitações EAN</span>
                </Link>
                )}
                {can('catalogo.ean') && (
                <Link
                  href="/admin/ean/codigos"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/ean/codigos' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiTag className="text-base" />
                  <span>Meus Códigos EAN</span>
                </Link>
                )}
                {can('catalogo.ean') && (
                <Link
                  href="/admin/ean/pacotes"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/ean/pacotes' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiPackage className="text-base" />
                  <span>Pacotes EAN</span>
                </Link>
                )}
                {can('catalogo.fornecedores') && (
                <Link
                  href="/admin/fornecedores"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/fornecedores' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiTruck className="text-base" />
                  <span>Fornecedores</span>
                </Link>
                )}
              </div>
            )}
          </div>
          )}

          {/* Vendas & Pedidos */}
          {canAny(['vendas.pedidos','vendas.dropshipping','vendas.entregas','vendas.devolucoes','vendas.cupons','vendas.marketing','vendas.perguntas','vendas.ia_conversas','vendas.carne','vendas.afiliados']) && (
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
                {can('vendas.pedidos') && (
                <Link
                  href="/admin/pedidos"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/pedidos' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiShoppingCart className="text-base" />
                  <span>Pedidos</span>
                </Link>
                )}
                <Link
                  href="/admin/wishlist"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/wishlist' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiHeart className="text-base" />
                  <span>Listas de Desejos</span>
                </Link>
                {can('vendas.dropshipping') && (
                <Link
                  href="/admin/pedidos/dropshipping/dsers"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname.includes('/admin/pedidos/dropshipping') ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiBox className="text-base" />
                  <span>Dropshipping</span>
                </Link>
                )}
                {can('vendas.entregas') && (
                <Link
                  href="/admin/pedidos/entregas"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/pedidos/entregas' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiTruck className="text-base" />
                  <span>Entregas</span>
                </Link>
                )}
                {can('vendas.devolucoes') && (
                <Link
                  href="/admin/devolucoes"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/devolucoes' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiFileText className="text-base" />
                  <span>Devoluções</span>
                </Link>
                )}
                {can('vendas.cupons') && (
                <Link
                  href="/admin/cupons"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/cupons' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiTag className="text-base" />
                  <span>Cupons</span>
                </Link>
                )}
                {can('vendas.marketing') && (
                <Link
                  href="/admin/marketing"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/marketing' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiZap className="text-base" />
                  <span>Marketing</span>
                </Link>
                )}
                {can('vendas.perguntas') && (
                <Link
                  href="/admin/perguntas"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/perguntas' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiMessageSquare className="text-base" />
                  <span>Perguntas</span>
                </Link>
                )}
                {can('vendas.ia_conversas') && (
                <Link
                  href="/admin/ia-conversas"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/ia-conversas' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiCpu className="text-base" />
                  <span>Mydi — Conversas IA</span>
                </Link>
                )}
                {can('vendas.carne') && (
                <Link
                  href="/admin/carne"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/carne' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiDollarSign className="text-base" />
                  <span>Carnê / Parcelado</span>
                </Link>
                )}
                {can('vendas.carne') && (
                <Link
                  href="/admin/carne/simulador"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/carne/simulador' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiDollarSign className="text-base" />
                  <span>Simulador de Financiamento</span>
                </Link>
                )}
                {can('vendas.afiliados') && (
                <Link
                  href="/admin/afiliados"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname.startsWith('/admin/afiliados') ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiUserPlus className="text-base" />
                  <span>Afiliados</span>
                </Link>
                )}
              </div>
            )}
          </div>
          )}

          {/* Logística */}
          {canAny(['logistica.expedicao','logistica.fretes','logistica.embalagens','logistica.etiquetas']) && (
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
                {can('logistica.expedicao') && (
                <Link
                  href="/admin/expedicao"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/expedicao' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiTruck className="text-base" />
                  <span>Expedição</span>
                </Link>
                )}
                {can('logistica.fretes') && (
                <Link
                  href="/admin/fretes"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/fretes' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiSend className="text-base" />
                  <span>Fretes</span>
                </Link>
                )}
                {can('logistica.embalagens') && (
                <Link
                  href="/admin/embalagens"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/embalagens' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiBox className="text-base" />
                  <span>Embalagens</span>
                </Link>
                )}
                {can('logistica.etiquetas') && (
                <Link
                  href="/admin/etiquetas-produtos"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/etiquetas-produtos' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiTag className="text-base" />
                  <span>Etiquetas Produtos</span>
                </Link>
                )}
              </div>
            )}
          </div>
          )}

          {/* Gestão */}
          {canAny(['gestao.usuarios','gestao.vendedores','gestao.contas_digitais','gestao.cashback','gestao.empresa','gestao.financeiro','gestao.saques','gestao.contabilidade','gestao.notas_fiscais','gestao.planos','gestao.assinaturas','gestao.equipe']) && (
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
                {can('gestao.usuarios') && (
                <Link
                  href="/admin/usuarios"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/usuarios' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiUsers className="text-base" />
                  <span>Usuários</span>
                </Link>
                )}
                {can('gestao.vendedores') && (
                <Link
                  href="/admin/vendedores"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/vendedores' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiShoppingBag className="text-base" />
                  <span>Vendedores</span>
                </Link>
                )}
                {can('gestao.contas_digitais') && (
                <Link
                  href="/admin/vendedores/contas"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname?.startsWith('/admin/vendedores/contas') ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiCreditCard className="text-base" />
                  <span>Contas Digitais (Vendedores/Afiliados)</span>
                </Link>
                )}
                {can('gestao.cashback') && (
                <Link
                  href="/admin/cashback"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname?.startsWith('/admin/cashback') ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiGift className="text-base" />
                  <span>Cashback</span>
                </Link>
                )}
                {can('gestao.empresa') && (
                <Link
                  href="/admin/empresa"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/empresa' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiBriefcase className="text-base" />
                  <span>Empresa</span>
                </Link>
                )}
                {can('gestao.empresa') && (
                <Link
                  href="/admin/empresa/filiais"
                  className={`flex items-center space-x-3 pl-8 pr-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname?.startsWith('/admin/empresa/filiais') ? 'bg-primary-50 text-primary-600' : 'text-gray-600'}`}
                >
                  <FiMapPin className="text-base" />
                  <span>Filiais / Galpões</span>
                </Link>
                )}
                {can('gestao.financeiro') && (
                <Link
                  href="/admin/financeiro"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/financeiro' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiDollarSign className="text-base" />
                  <span>Financeiro</span>
                </Link>
                )}
                {can('gestao.contabilidade') && (
                <Link
                  href="/admin/contabilidade"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname?.startsWith('/admin/contabilidade') ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiFileText className="text-base" />
                  <span>Contabilidade</span>
                </Link>
                )}
                {can('gestao.notas_fiscais') && (
                <Link
                  href="/admin/invoices"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname?.startsWith('/admin/invoices') ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiFileText className="text-base" />
                  <span>Notas Fiscais</span>
                </Link>
                )}
                {can('gestao.planos') && (
                <Link
                  href="/admin/planos"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/planos' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiCreditCard className="text-base" />
                  <span>Planos</span>
                </Link>
                )}
                {can('gestao.assinaturas') && (
                <Link
                  href="/admin/assinaturas"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/assinaturas' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiFileText className="text-base" />
                  <span>Assinaturas</span>
                </Link>
                )}
                {can('gestao.equipe') && (
                  <Link
                    href="/admin/equipe"
                    className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname?.startsWith('/admin/equipe') ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                  >
                    <FiUserCheck className="text-base" />
                    <span>Equipe</span>
                  </Link>
                )}
              </div>
            )}
          </div>
          )}

          {/* Monitoramento */}
          {canAny(['monitoramento.vendas','monitoramento.analytics','monitoramento.ips','monitoramento.bots','monitoramento.mapa','monitoramento.antifraude','monitoramento.consistencia','monitoramento.performance','monitoramento.logs']) && (
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
                {can('monitoramento.vendas') && (
                <Link
                  href="/admin/analytics/vendas"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/analytics/vendas' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiDollarSign className="text-base" />
                  <span>Vendas</span>
                </Link>
                )}
                {can('monitoramento.analytics') && (
                <Link
                  href="/admin/analytics"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/analytics' && !pathname.includes('/vendas') && !pathname.includes('/ip-investigacao') ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiPieChart className="text-base" />
                  <span>Analytics</span>
                </Link>
                )}
                {can('monitoramento.ips') && (
                <Link
                  href="/admin/analytics/ip-investigacao"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname.includes('/ip-investigacao') ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiShield className="text-base" />
                  <span>IPs Suspeitos</span>
                </Link>
                )}
                {can('monitoramento.bots') && (
                <Link
                  href="/admin/analytics/bots"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname.includes('/analytics/bots') ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiActivity className="text-base" />
                  <span>Bots Aliados</span>
                </Link>
                )}
                {can('monitoramento.mapa') && (
                <Link
                  href="/admin/pedidos/mapa"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/pedidos/mapa' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiMapPin className="text-base" />
                  <span>Mapa de Pedidos</span>
                </Link>
                )}
                {can('monitoramento.antifraude') && (
                <Link
                  href="/admin/antifraude"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname.includes('/admin/antifraude') ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiShield className="text-base" />
                  <span>Antifraude</span>
                </Link>
                )}
                {can('monitoramento.consistencia') && (
                <Link
                  href="/admin/consistency"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/consistency' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiActivity className="text-base" />
                  <span>Consistência</span>
                </Link>
                )}
                {can('monitoramento.performance') && (
                <Link
                  href="/admin/performance"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/performance' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiTrendingUp className="text-base" />
                  <span>Performance</span>
                </Link>
                )}
                {can('monitoramento.logs') && (
                <Link
                  href="/admin/logs"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/logs' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiActivity className="text-base" />
                  <span>Logs API</span>
                </Link>
                )}
              </div>
            )}
          </div>
          )}

          {/* Integrações */}
          {canAny(['integracoes.geral','integracoes.correios','integracoes.mercadopago','integracoes.whatsapp','integracoes.dropshipping','integracoes.shopify','integracoes.shopee','integracoes.developer_apps']) && (
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
                {can('integracoes.geral') && (
                <Link
                  href="/admin/integracao"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/integracao' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiZap className="text-base" />
                  <span>Todas Integrações</span>
                </Link>
                )}
                {can('integracoes.correios') && (
                <Link
                  href="/admin/integracao/envios"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/integracao/envios' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiTruck className="text-base" />
                  <span>Correios</span>
                </Link>
                )}
                {can('integracoes.mercadopago') && (
                <Link
                  href="/admin/integracao/mercadopago"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/integracao/mercadopago' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiCreditCard className="text-base" />
                  <span>Mercado Pago</span>
                </Link>
                )}
                {can('integracoes.whatsapp') && (
                <Link
                  href="/admin/integracao/whatsapp"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/integracao/whatsapp' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiSmartphone className="text-base" />
                  <span>WhatsApp</span>
                </Link>
                )}
                {can('integracoes.dropshipping') && (
                <Link
                  href="/admin/integracao/aliexpress"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/integracao/aliexpress' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiShoppingCart className="text-base" />
                  <span>Dropshipping</span>
                </Link>
                )}
                {can('integracoes.aliexpress_nichos') && (
                <Link
                  href="/admin/integracao/aliexpress/nichos"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/integracao/aliexpress/nichos' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiShoppingCart className="text-base" />
                  <span>Nichos AliExpress</span>
                </Link>
                )}
                {can('integracoes.aliexpress_sync') && (
                <Link
                  href="/admin/integracao/aliexpress/sync-estoque"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/integracao/aliexpress/sync-estoque' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiRefreshCw className="text-base" />
                  <span>Sync Estoque</span>
                </Link>
                )}
                {can('integracoes.shopify') && (
                <Link
                  href="/admin/integracao/shopify"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname?.startsWith('/admin/integracao/shopify') ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiShoppingBag className="text-base" />
                  <span>Shopify</span>
                </Link>
                )}
                {can('integracoes.shopee') && (
                <Link
                  href="/admin/integracao/shopee"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname?.startsWith('/admin/integracao/shopee') ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiShoppingBag className="text-base" />
                  <span>Shopee</span>
                </Link>
                )}
                {can('integracoes.developer_apps') && (
                <Link
                  href="/admin/integracao/developer-apps"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname?.startsWith('/admin/integracao/developer-apps') ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiCpu className="text-base" />
                  <span>Apps de Devs</span>
                </Link>
                )}
              </div>
            )}
          </div>
          )}

          {can('email') && (
            <Link
              href="/admin/email"
              className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 ${pathname === '/admin/email' ? 'bg-primary-50 text-primary-600' : 'text-gray-900'}`}
            >
              <FiMail className="text-lg" />
              <span>E-mail</span>
            </Link>
          )}

          {can('ajuda') && (
            <Link
              href="/admin/ajuda"
              className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 ${pathname?.startsWith('/admin/ajuda') ? 'bg-primary-50 text-primary-600' : 'text-gray-900'}`}
            >
              <FiHelpCircle className="text-lg" />
              <span>Central de Ajuda</span>
            </Link>
          )}

          {/* Configurações */}
          {canAny(['config.geral','config.nfe','config.aparencia','config.email_config','config.impressoras','config.ia','config.automacoes']) && (
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
                {can('config.geral') && (
                <Link
                  href="/admin/configuracoes"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/configuracoes' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiSettings className="text-base" />
                  <span>Geral</span>
                </Link>
                )}
                {can('config.nfe') && (
                <Link
                  href="/admin/configuracoes/nota-fiscal"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/configuracoes/nota-fiscal' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiFileText className="text-base" />
                  <span>Nota Fiscal (NF-e)</span>
                </Link>
                )}
                {can('config.aparencia') && (
                <Link
                  href="/admin/configuracoes/aparencia-app"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/configuracoes/aparencia-app' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiSmartphone className="text-base" />
                  <span>Aparência App</span>
                </Link>
                )}
                {can('config.email_config') && (
                <Link
                  href="/admin/configuracoes/email"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/configuracoes/email' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiMail className="text-base" />
                  <span>Contas de E-mail</span>
                </Link>
                )}
                {can('config.impressoras') && (
                <Link
                  href="/admin/configuracoes/impressoras"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/configuracoes/impressoras' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiPrinter className="text-base" />
                  <span>Impressoras</span>
                </Link>
                )}
                {can('config.ia') && (
                <Link
                  href="/admin/configuracoes/ia"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/configuracoes/ia' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiCpu className="text-base" />
                  <span>Inteligência Artificial</span>
                </Link>
                )}
                {can('config.automacoes') && (
                <Link
                  href="/admin/automation"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-primary-50 hover:text-primary-600 text-sm ${pathname === '/admin/automation' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'}`}
                >
                  <FiZap className="text-base" />
                  <span className="flex items-center gap-2">
                    Automações 
                    {activeJobsCount > 0 && (
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                        {activeJobsCount} ativo{activeJobsCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                </Link>
                )}
              </div>
            )}
          </div>
          )}

          {/* Botão de Sair */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={async () => { await signOut({ redirect: false }); window.location.href = 'https://gerencial-sys.mydshop.com.br/admin/login' }}
              className="w-full flex items-center space-x-3 px-4 py-2 rounded-md hover:bg-red-50 hover:text-red-600 text-gray-700"
            >
              <FiLogOut className="text-lg" />
              <span>Sair</span>
            </button>
          </div>
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-h-0">
        {/* Barra superior */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <img src="/logo-animated.svg" alt="Logo" className="w-7 h-7 object-contain" />
            <span className="font-bold text-gray-800 text-sm tracking-wide">MYDShop</span>
          </div>
          <div className="relative flex items-center gap-3">
            <button
              onClick={() => setOpenSections(prev => ({ ...prev, _userMenu: !prev._userMenu }))}
              className="flex items-center gap-3 hover:opacity-80 transition"
            >
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800 leading-tight">
                  {session?.user?.name || session?.user?.email || 'Administrador'}
                </p>
                <p className="text-xs text-gray-400 leading-tight">{session?.user?.isAdminStaff ? (staffCargo || 'Funcionário') : 'Admin'}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {(session?.user?.name || session?.user?.email || 'A').charAt(0).toUpperCase()}
              </div>
            </button>

            {openSections._userMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpenSections(prev => ({ ...prev, _userMenu: false }))} />
                <div className="absolute right-0 top-12 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[140px]">
                  <button
                    onClick={async () => { await signOut({ redirect: false }); window.location.href = 'https://gerencial-sys.mydshop.com.br/admin/login' }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <FiLogOut size={15} />
                    Sair
                  </button>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
