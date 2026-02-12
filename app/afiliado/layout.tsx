'use client';

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FiHome, FiDollarSign, FiTrendingUp, FiSettings, 
  FiLogOut, FiMenu, FiX 
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
        <div className="container mx-auto px-4 py-6">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden fixed bottom-4 right-4 z-50 p-4 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700"
          >
            {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
          <div className="flex gap-6">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm border p-4 sticky top-6">
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
