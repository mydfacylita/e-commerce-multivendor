'use client';

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiHome, FiDollarSign, FiTrendingUp, FiSettings,
  FiLogOut, FiX, FiMapPin, FiGift, FiTarget, FiCamera, FiUser, FiMoreHorizontal
} from 'react-icons/fi';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const allMenuItems = [
  { href: '/afiliado/dashboard', icon: FiHome, label: 'Dashboard' },
  { href: '/afiliado/vendas', icon: FiTrendingUp, label: 'Vendas' },
  { href: '/afiliado/saques', icon: FiDollarSign, label: 'Saques' },
  { href: '/afiliado/kits', icon: FiGift, label: 'Kits' },
  { href: '/afiliado/metas', icon: FiTarget, label: 'Metas' },
  { href: '/afiliado/campanhas', icon: FiCamera, label: 'Campanhas' },
  { href: '/afiliado/endereco', icon: FiMapPin, label: 'Endereço' },
  { href: '/afiliado/configuracoes', icon: FiSettings, label: 'Configurações' },
];

// 4 itens principais na bottom nav
const bottomNavItems = [
  { href: '/afiliado/dashboard', icon: FiHome, label: 'Início' },
  { href: '/afiliado/vendas', icon: FiTrendingUp, label: 'Vendas' },
  { href: '/afiliado/saques', icon: FiDollarSign, label: 'Saques' },
  { href: '/afiliado/campanhas', icon: FiCamera, label: 'Campanhas' },
];

// Itens secundários no bottom sheet "Mais"
const moreItems = [
  { href: '/afiliado/kits', icon: FiGift, label: 'Kits' },
  { href: '/afiliado/metas', icon: FiTarget, label: 'Metas' },
  { href: '/afiliado/endereco', icon: FiMapPin, label: 'Endereço' },
  { href: '/afiliado/configuracoes', icon: FiSettings, label: 'Configurações' },
];

export default function AffiliateLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleLogout = () => {
    router.push('/api/auth/signout');
  };

  const pagesWithoutSidebar = ['/afiliado/cadastro', '/afiliado/cadastro/sucesso'];
  const shouldShowSidebar = !pagesWithoutSidebar.some(path => pathname?.startsWith(path));
  const isMoreActive = moreItems.some(item => pathname === item.href);

  // Bottom nav e bottom sheet via portal — renderiza direto no document.body
  // escapando qualquer stacking context de qualquer componente pai
  // isMobile controlado por JS para ignorar qualquer problema de breakpoint CSS
  const bottomNavContent = shouldShowSidebar ? (
    <nav
      className="bg-white border-t border-gray-200"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        boxShadow: '0 -2px 16px rgba(0,0,0,0.10)',
      }}
    >
      <div className="flex items-stretch">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 pt-2 pb-4 relative transition-colors ${
                isActive ? 'text-primary-600' : 'text-gray-400'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-4 right-4 h-[3px] bg-primary-500 rounded-b-full" />
              )}
              <item.icon size={26} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={`text-[11px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 pt-2 pb-4 relative transition-colors ${
            isMoreActive ? 'text-primary-600' : 'text-gray-400'
          }`}
        >
          {isMoreActive && (
            <span className="absolute top-0 left-4 right-4 h-[3px] bg-primary-500 rounded-b-full" />
          )}
          <FiMoreHorizontal size={26} strokeWidth={isMoreActive ? 2.5 : 1.8} />
          <span className={`text-[11px] ${isMoreActive ? 'font-semibold' : 'font-medium'}`}>Mais</span>
        </button>
      </div>
    </nav>
  ) : null;

  const bottomSheetContent = moreOpen && shouldShowSidebar ? (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      onClick={() => setMoreOpen(false)}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-t-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <FiUser size={18} className="text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Afiliado</p>
              <p className="font-semibold text-gray-900 text-sm">{session?.user?.name}</p>
            </div>
          </div>
          <button onClick={() => setMoreOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <FiX size={18} />
          </button>
        </div>
        <nav className="px-3 pt-2 pb-1">
          {moreItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl mb-1 transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-600 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <item.icon size={20} />
                <span className="flex-1">{item.label}</span>
                {isActive && <span className="w-2 h-2 bg-primary-500 rounded-full shrink-0" />}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pb-8 pt-1 border-t mx-3 mt-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
          >
            <FiLogOut size={20} />
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Portal: renderiza bottom nav e sheet direto no document.body */}
      {/* isMobile via JS garante que nunca depende de breakpoint CSS */}
      {mounted && isMobile && createPortal(bottomNavContent, document.body)}
      {mounted && isMobile && createPortal(bottomSheetContent, document.body)}
    <div className="min-h-screen bg-gray-50">

      {shouldShowSidebar ? (
        <div className="container mx-auto px-4 pb-6">

          {/* ── Mobile Top Bar ── */}
          <div className="lg:hidden sticky top-0 z-50 bg-white border-b shadow-sm flex items-center justify-between px-4 py-3 -mx-4 mb-4">
            <Link href="/afiliado/configuracoes" className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                <FiUser size={16} className="text-primary-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 leading-none">Afiliado</p>
                <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{session?.user?.name ?? '...'}</p>
              </div>
            </Link>
            <Link href="/afiliado/configuracoes" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 shrink-0">
              <FiSettings size={20} />
            </Link>
          </div>

          <div className="pt-0 lg:pt-6 flex gap-6">

            {/* ── Sidebar Desktop ── */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm border p-4 sticky top-6">
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
                  {allMenuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-primary-50 text-primary-600 font-semibold border-l-4 border-primary-500'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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

            {/* ── Main Content ── */}
            <main className="flex-1 min-w-0 pb-28 lg:pb-0">
              {children}
            </main>
          </div>

        </div>
      ) : (
        <div className="min-h-screen">
          {children}
        </div>
      )}
    </div>
    </>
  );
}



