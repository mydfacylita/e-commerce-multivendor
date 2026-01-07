'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FiPackage, FiDollarSign, FiHome, FiExternalLink, FiTruck, FiSettings, FiShoppingBag, FiUsers } from 'react-icons/fi';

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [seller, setSeller] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<any>(null);

  // Rotas que não requerem autenticação de vendedor (página de cadastro)
  const publicRoutes = ['/vendedor/cadastro'];
  const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route));

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated' && !isPublicRoute) {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && !isPublicRoute) {
      // Verifica se é vendedor
      if (session?.user?.role !== 'SELLER') {
        router.push('/');
        return;
      }
      fetchSellerData();
    } else {
      setIsLoading(false);
    }
  }, [status, isPublicRoute, session]);

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
      } else if (response.status === 404) {
        router.push('/vendedor/cadastro');
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Se for rota pública, renderiza direto
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Loading state
  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Sem seller, não renderiza
  if (!seller) {
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
    { label: 'Pedidos', href: '/vendedor/pedidos', icon: FiShoppingBag, requiresPermission: 'canManageOrders' },
    { label: 'Dropshipping', href: '/vendedor/dropshipping', icon: FiTruck, requiresPermission: 'canManageDropshipping' },
    { label: 'Integração', href: '/vendedor/integracao', icon: FiSettings, requiresPermission: 'canManageIntegrations' },
    { label: 'Financeiro', href: '/vendedor/financeiro', icon: FiDollarSign, requiresPermission: 'canViewFinancial' },
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
