'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import { 
  FiPackage, FiDollarSign, FiHome, FiExternalLink, FiTruck, FiSettings, 
  FiShoppingBag, FiUsers, FiCreditCard, FiChevronDown, FiChevronRight,
  FiBox, FiGrid, FiStar, FiLayers, FiBarChart2, FiArrowUpCircle
} from 'react-icons/fi';

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [seller, setSeller] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<any>(null);

  // Rotas que NÃO usam o layout com sidebar (renderizam sem validação)
  const noLayoutRoutes = [
    '/vendedor/cadastro',
    '/vendedor/planos',
    '/vendedor/planos/pagamento'
  ];
  const isNoLayoutRoute = noLayoutRoutes.some(route => pathname?.startsWith(route));

  // Estado para controlar se o vendedor pode acessar
  const [canAccess, setCanAccess] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated' && !isNoLayoutRoute) {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && !isNoLayoutRoute) {
      // Verifica se é vendedor
      if (session?.user?.role !== 'SELLER') {
        router.push('/');
        return;
      }
      fetchSellerData();
    } else {
      setIsLoading(false);
    }
  }, [status, isNoLayoutRoute, session]);

  const fetchSellerData = async () => {
    try {
      const response = await fetch('/api/seller/register');
      if (response.ok) {
        const data = await response.json();
        setSeller(data.seller);
        
        // Buscar permissões do usuário
        const permissionsResponse = await fetch('/api/seller/permissions');
        if (permissionsResponse.ok) {
          const userPermissions = await permissionsResponse.json();
          console.log('Permissões carregadas:', userPermissions);
          setPermissions(userPermissions);
        }
        
        // ===== VERIFICAÇÃO DE REGRAS DE NEGÓCIO =====
        // Pegar assinatura ativa do array de subscriptions
        const activeSubscription = data.seller.subscriptions?.find(
          (s: any) => ['ACTIVE', 'TRIAL'].includes(s.status)
        ) || data.seller.subscriptions?.[0];
        
        console.log('🔍 Verificando regras de negócio:', {
          status: data.seller.status,
          hasSubscription: !!activeSubscription,
          subscriptionStatus: activeSubscription?.status
        });
        
        // 1. Verifica se o vendedor foi aprovado (status = ACTIVE)
        if (data.seller.status !== 'ACTIVE') {
          console.log('❌ Status não é ACTIVE:', data.seller.status, '- redirecionando');
          // Status PENDING, REJECTED, SUSPENDED -> vai para cadastro
          const queryParam = 
            data.seller.status === 'PENDING' ? 'pendente=true' :
            data.seller.status === 'REJECTED' ? 'rejeitado=true' :
            data.seller.status === 'SUSPENDED' ? 'suspenso=true' : '';
          
          router.push(`/vendedor/cadastro?${queryParam}`);
          // MANTÉM loading infinito - não libera acesso
          return;
        }
        
        // 2. Status é ACTIVE - Verifica se tem plano ativo
        console.log('✅ Status ACTIVE - verificando subscription...');
        if (!activeSubscription || 
            !['ACTIVE', 'TRIAL'].includes(activeSubscription.status)) {
          console.log('❌ SEM PLANO ATIVO - redirecionando para planos');
          router.push('/vendedor/planos?sem-plano=true');
          // MANTÉM loading infinito - não libera acesso
          return;
        }
        
        console.log('✅ Plano ativo encontrado:', activeSubscription.status);
        console.log('✅ LIBERANDO ACESSO TOTAL');
        
        // APENAS AQUI libera o acesso
        setCanAccess(true);
        setIsLoading(false);
        
      } else if (response.status === 404) {
        router.push('/vendedor/cadastro');
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  // Rotas sem layout (cadastro e planos) renderizam direto sem sidebar
  if (isNoLayoutRoute) {
    return <>{children}</>;
  }

  // Loading state
  if (status === 'loading' || isLoading) {
    return <LoadingSpinner message="Carregando painel..." />;
  }

  // Sem seller, não renderiza
  if (!seller) {
    return null;
  }

  // **CRÍTICO**: Se não tem permissão de acesso (canAccess=false), não renderiza NADA
  if (!canAccess) {
    return null;
  }

  // Se não tem permissões ainda, assume permissões padrão (owner)
  const effectivePermissions = permissions || {
    isOwner: true,
    canManageProducts: true,
    canManageOrders: true,
    canViewFinancial: true,
    canManageEmployees: true,
    canManageIntegrations: true,
    canManageDropshipping: true,
  };

  // Menu organizado por categorias
  const menuCategories = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: FiHome,
      href: '/vendedor/dashboard',
      requiresPermission: null,
    },
    {
      id: 'cadastro',
      label: 'Cadastro',
      icon: FiGrid,
      requiresPermission: 'canManageProducts',
      children: [
        { label: 'Produtos', href: '/vendedor/produtos', icon: FiPackage },
        { label: 'Códigos EAN', href: '/vendedor/ean', icon: FiBarChart2 },
        { label: 'Funcionários', href: '/vendedor/funcionarios', icon: FiUsers, requiresPermission: 'canManageEmployees' },
        { label: 'Dropshipping', href: '/vendedor/dropshipping', icon: FiTruck, requiresPermission: 'canManageDropshipping' },
        { label: 'Integrações', href: '/vendedor/integracao', icon: FiSettings, requiresPermission: 'canManageIntegrations' },
      ]
    },
    {
      id: 'vendas',
      label: 'Vendas',
      icon: FiShoppingBag,
      requiresPermission: 'canManageOrders',
      children: [
        { label: 'Pedidos', href: '/vendedor/pedidos', icon: FiShoppingBag },
        { label: 'Perguntas', href: '/vendedor/perguntas', icon: FiLayers },
      ]
    },
    {
      id: 'logistica',
      label: 'Logística',
      icon: FiTruck,
      requiresPermission: 'canManageOrders',
      children: [
        { label: 'Expedição', href: '/vendedor/expedicao', icon: FiBox },
        { label: 'Etiquetas', href: '/vendedor/expedicao/etiquetas', icon: FiPackage },
      ]
    },
    {
      id: 'financeiro',
      label: 'Financeiro',
      icon: FiDollarSign,
      requiresPermission: 'canViewFinancial',
      children: [
        { label: 'Comissões', href: '/vendedor/financeiro', icon: FiBarChart2 },
        { label: 'Conta', href: '/vendedor/saques', icon: FiDollarSign },
      ]
    },
    {
      id: 'assinaturas',
      label: 'Assinaturas',
      icon: FiCreditCard,
      requiresPermission: null,
      children: [
        { label: 'Meu Plano', href: '/vendedor/planos', icon: FiStar },
        { label: 'Upgrade', href: '/vendedor/planos/upgrade', icon: FiArrowUpCircle },
      ]
    },
    {
      id: 'loja',
      label: 'Ver Minha Loja',
      icon: FiExternalLink,
      href: `/loja/${seller.storeSlug || seller.storeName?.toLowerCase().replace(/\s+/g, '-')}`,
      external: true,
      requiresPermission: null,
    },
  ];

  const getStatusBadge = () => {
    const statusConfig = {
      PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      ACTIVE: { label: 'Ativo', color: 'bg-green-100 text-green-800' },
      REJECTED: { label: 'Rejeitado', color: 'bg-red-100 text-red-800' },
      SUSPENDED: { label: 'Suspenso', color: 'bg-gray-100 text-gray-800' },
    };

    const config = statusConfig[seller.status as keyof typeof statusConfig] || statusConfig.PENDING;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      {/* Sidebar Vendedor */}
      <aside className="w-64 bg-white shadow-lg min-h-screen sticky top-0 overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800 truncate">{seller.storeName}</h2>
          <p className="text-sm text-gray-600 mt-1">
            {seller.sellerType === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
          </p>
          <div className="mt-3">
            {getStatusBadge()}
          </div>
        </div>

        <nav className="p-4">
          <MenuWithSubmenus 
            categories={menuCategories} 
            pathname={pathname} 
            effectivePermissions={effectivePermissions}
          />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen bg-gray-50">
        {children}
      </main>
    </div>
  );
}

// Componente de Menu com Submenus
function MenuWithSubmenus({ categories, pathname, effectivePermissions }: { 
  categories: any[], 
  pathname: string | null,
  effectivePermissions: any 
}) {
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  // Auto-expandir menu quando uma rota filha está ativa
  useEffect(() => {
    categories.forEach(cat => {
      if (cat.children) {
        const hasActiveChild = cat.children.some((child: any) => pathname?.startsWith(child.href));
        if (hasActiveChild && !openMenus.includes(cat.id)) {
          setOpenMenus(prev => [...prev, cat.id]);
        }
      }
    });
  }, [pathname, categories]);

  const toggleMenu = (id: string) => {
    setOpenMenus(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-1">
      {categories
        .filter(cat => !cat.requiresPermission || effectivePermissions[cat.requiresPermission])
        .map((category) => {
          const Icon = category.icon;
          const isOpen = openMenus.includes(category.id);
          const hasChildren = category.children && category.children.length > 0;
          const isActive = pathname === category.href;
          const hasActiveChild = hasChildren && category.children.some((child: any) => pathname?.startsWith(child.href));

          // Link direto (sem filhos)
          if (!hasChildren) {
            if (category.external) {
              return (
                <a
                  key={category.id}
                  href={category.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                >
                  <Icon size={18} />
                  <span className="font-medium text-sm">{category.label}</span>
                </a>
              );
            }
            return (
              <Link
                key={category.id}
                href={category.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <Icon size={18} />
                <span className="font-medium text-sm">{category.label}</span>
              </Link>
            );
          }

          // Menu com submenus
          return (
            <div key={category.id}>
              <button
                onClick={() => toggleMenu(category.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors ${
                  hasActiveChild
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <span className="font-medium text-sm">{category.label}</span>
                </div>
                {isOpen ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
              </button>

              {isOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 pl-2">
                  {category.children
                    .filter((child: any) => !child.requiresPermission || effectivePermissions[child.requiresPermission])
                    .map((child: any) => {
                      const ChildIcon = child.icon;
                      const isChildActive = pathname === child.href || pathname?.startsWith(child.href + '/');
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                            isChildActive
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                        >
                          <ChildIcon size={16} />
                          <span className="text-sm">{child.label}</span>
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
