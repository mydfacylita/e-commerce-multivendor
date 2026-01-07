'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  FiPackage, FiDollarSign, FiHome, FiExternalLink
} from 'react-icons/fi';

export default function SellerSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [seller, setSeller] = useState<any>(null);

  // Verifica se é vendedor e está em rota de vendedor
  const isSellerRoute = pathname?.startsWith('/vendedor');
  const isSeller = session?.user?.role === 'SELLER';
  
  // NÃO renderiza se for ADMIN (admin tem seu próprio layout)
  const isAdmin = session?.user?.role === 'ADMIN';
  
  const shouldShow = isSeller && isSellerRoute && !isAdmin;

  // Rotas que não devem mostrar sidebar (página de cadastro)
  const noSidebarRoutes = ['/vendedor/cadastro'];
  const shouldHideSidebar = noSidebarRoutes.some(route => pathname?.startsWith(route));

  useEffect(() => {
    if (shouldShow && !shouldHideSidebar) {
      fetchSellerData();
    }
  }, [shouldShow, shouldHideSidebar]);

  const fetchSellerData = async () => {
    try {
      const response = await fetch('/api/seller/register');
      if (response.ok) {
        const data = await response.json();
        setSeller(data.seller);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do vendedor:', error);
    }
  };

  // Não renderiza nada se não deve mostrar
  if (!shouldShow || shouldHideSidebar || !seller) {
    return null;
  }

  const menuItems = [
    { label: 'Dashboard', href: '/vendedor/dashboard', icon: FiHome },
    { label: 'Produtos', href: '/vendedor/produtos', icon: FiPackage },
    { label: 'Financeiro', href: '/vendedor/financeiro', icon: FiDollarSign },
    { 
      label: 'Ver Minha Loja', 
      href: `/loja/${seller.storeName?.toLowerCase().replace(/\s+/g, '-')}`,
      icon: FiExternalLink,
      external: true 
    },
  ];

  const getStatusBadge = () => {
    const statusConfig = {
      PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      APPROVED: { label: 'Aprovado', color: 'bg-green-100 text-green-800' },
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
    <aside 
      className="w-64 bg-white shadow-lg fixed left-0 bottom-0 overflow-y-auto z-30"
      style={{ top: '140px' }}
    >
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
        {menuItems.map((item) => {
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
  );
}
