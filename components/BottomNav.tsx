'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FiHome, FiSearch, FiShoppingCart, FiHeart, FiUser } from 'react-icons/fi'
import { useCartStore } from '@/lib/store'

const tabs = [
  { href: '/',        icon: FiHome,         label: 'Início'   },
  { href: '/produtos', icon: FiSearch,       label: 'Buscar'   },
  { href: '/carrinho', icon: FiShoppingCart, label: 'Carrinho', hasCart: true },
  { href: '/desejos',  icon: FiHeart,        label: 'Desejos'  },
  { href: '/perfil',   icon: FiUser,         label: 'Conta'    },
]

export default function BottomNav() {
  const pathname = usePathname()
  const items = useCartStore((state) => state.items)
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch h-14">
        {tabs.map(({ href, icon: Icon, label, hasCart }) => {
          const isActive =
            pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-primary-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {hasCart && cartCount > 0 && (
                  <span className="absolute -top-2 -right-2.5 bg-accent-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </div>
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
