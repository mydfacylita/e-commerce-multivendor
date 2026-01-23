'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import { FiPackage, FiDollarSign, FiHome, FiExternalLink, FiTruck, FiSettings, FiShoppingBag, FiUsers, FiCreditCard } from 'react-icons/fi';

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
        console.log('🔍 Verificando regras de negócio:', {
          status: data.seller.status,
          hasSubscription: !!data.seller.subscription,
          subscriptionStatus: data.seller.subscription?.status
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
        if (!data.seller.subscription || 
            !['ACTIVE', 'TRIAL'].includes(data.seller.subscription.status)) {
          console.log('❌ SEM PLANO ATIVO - redirecionando para planos');
          router.push('/vendedor/planos?sem-plano=true');
          // MANTÉM loading infinito - não libera acesso
          return;
        }
        
        console.log('✅ Plano ativo encontrado:', data.seller.subscription.status);
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

  const menuItems = [
    { label: 'Dashboard', href: '/vendedor/dashboard', icon: FiHome, requiresPermission: null },
    { label: 'Produtos', href: '/vendedor/produtos', icon: FiPackage, requiresPermission: 'canManageProducts' },
    { label: 'Códigos EAN', href: '/vendedor/ean', icon: FiPackage, requiresPermission: 'canManageProducts' },
    { label: 'Pedidos', href: '/vendedor/pedidos', icon: FiShoppingBag, requiresPermission: 'canManageOrders' },
    { label: 'Dropshipping', href: '/vendedor/dropshipping', icon: FiTruck, requiresPermission: 'canManageDropshipping' },
    { label: 'Integração', href: '/vendedor/integracao', icon: FiSettings, requiresPermission: 'canManageIntegrations' },
    { label: 'Planos', href: '/vendedor/planos', icon: FiCreditCard, requiresPermission: null },
    { label: 'Financeiro', href: '/vendedor/financeiro', icon: FiDollarSign, requiresPermission: 'canViewFinancial' },
    { label: 'Extrato', href: '/vendedor/saques', icon: FiDollarSign, requiresPermission: 'canViewFinancial' },
    { label: 'Funcionários', href: '/vendedor/funcionarios', icon: FiUsers, requiresPermission: 'canManageEmployees' },
    { 
      label: 'Ver Minha Loja', 
      href: `/loja/${seller.storeName?.toLowerCase().replace(/\s+/g, '-')}`,
      icon: FiExternalLink,
      external: true,
      requiresPermission: null
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
    <div className="flex bg-gray-50">
      {/* Sidebar Vendedor */}
      <aside className="w-64 bg-white shadow-lg h-[calc(100vh-140px)] sticky overflow-y-auto" style={{ top: '140px' }}>
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
          {menuItems
            .filter(item => !item.requiresPermission || effectivePermissions[item.requiresPermission])
            .map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            if (item.external) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors mb-1"
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </a>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mb-1 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen bg-gray-50">
        {children}
      </main>
    </div>
  );
}
