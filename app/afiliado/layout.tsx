'use client';

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FiHome, FiDollarSign, FiTrendingUp, FiSettings, 
  FiLogOut, FiMenu, FiX, FiMapPin, FiGift, FiTarget, FiCamera, FiUser
} from 'react-icons/fi';
import { useState } from 'react';

export default function AffiliateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { href: '/afiliado/dashboard', icon: FiHome, label: 'Dashboard' },
    { href: '/afiliado/vendas', icon: FiTrendingUp, label: 'Vendas' },
    { href: '/afiliado/saques', icon: FiDollarSign, label: 'Saques' },
    { href: '/afiliado/kits', icon: FiGift, label: 'Kits' },
    { href: '/afiliado/metas', icon: FiTarget, label: 'Metas' },
    { href: '/afiliado/campanhas', icon: FiCamera, label: 'Campanhas' },
    { href: '/afiliado/endereco', icon: FiMapPin, label: 'Endereço' },
    { href: '/afiliado/configuracoes', icon: FiSettings, label: 'Configurações' },
  ];

  const handleLogout = () => {
    router.push('/api/auth/signout');
  };

  // Páginas que não devem mostrar o menu lateral
  const pagesWithoutSidebar = ['/afiliado/cadastro', '/afiliado/cadastro/sucesso'];
  const shouldShowSidebar = !pagesWithoutSidebar.some(path => pathname?.startsWith(path));

  return (
    <div className="min-h-screen bg-gray-50">
      {shouldShowSidebar ? (
        // Layout com sidebar para usuários logados
        <div className="container mx-auto px-4 pb-6">
          {/* Mobile Top Bar */}
          <div className="lg:hidden sticky top-0 z-50 bg-white border-b shadow-sm flex items-center justify-between px-4 py-3 -mx-4 mb-4">
            <Link
              href="/afiliado/configuracoes"
              className="flex items-center gap-2 min-w-0"
            >
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                <FiUser size={16} className="text-primary-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 leading-none">Afiliado</p>
                <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{session?.user?.name ?? '...'}</p>
              </div>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 shrink-0"
            >
              {mobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>

          <div className="pt-0 lg:pt-6 flex gap-6">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm border p-4 sticky top-6">
                {/* User info on desktop sidebar */}
                <div className="mb-4 pb-4 border-b">
                  <Link href="/afiliado/configuracoes" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                      <FiUser size={18} className="text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 leading-none">Afiliado</p>
                      <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{session?.user?.name ?? '...'}</p>
                    </div>
                  </Link>
                </div>
                <nav className="space-y-1">
                  {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-primary-50 text-primary-600 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <item.icon size={20} />
                        {item.label}
                      </Link>
                    );
                  })}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-red-600 hover:bg-red-50 mt-4"
                  >
                    <FiLogOut size={20} />
                    Sair
                  </button>
                </nav>
              </div>
            </aside>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
                <div className="bg-white w-64 h-full p-4" onClick={(e) => e.stopPropagation()}>
                  <div className="mb-4 pb-4 border-b">
                    <p className="text-sm text-gray-600">Bem-vindo,</p>
                    <p className="font-medium text-gray-900">{session?.user?.name}</p>
                  </div>
                  <nav className="space-y-1">
                    {menuItems.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                            isActive
                              ? 'bg-primary-50 text-primary-600 font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <item.icon size={20} />
                          {item.label}
                        </Link>
                      );
                    })}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-red-600 hover:bg-red-50 mt-4"
                    >
                      <FiLogOut size={20} />
                      Sair
                    </button>
                  </nav>
                </div>
              </div>
            )}

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              {children}
            </main>
          </div>
        </div>
      ) : (
        // Layout sem sidebar para cadastro
        <div className="min-h-screen">
          {children}
        </div>
      )}
    </div>
  );
}
