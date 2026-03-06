'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import DashboardCharts from '@/components/admin/DashboardCharts'
import { FiShoppingCart, FiPackage, FiTruck, FiUsers, FiZap, FiBarChart2, FiSettings, FiHeadphones, FiMail } from 'react-icons/fi'

const MENU_SHORTCUTS = [
  { key: 'vendas.pedidos',      label: 'Pedidos',         icon: FiShoppingCart, href: '/admin/pedidos' },
  { key: 'catalogo.produtos',   label: 'Produtos',        icon: FiPackage,      href: '/admin/produtos' },
  { key: 'logistica.expedicao', label: 'Expedição',       icon: FiTruck,        href: '/admin/expedicao' },
  { key: 'gestao.usuarios',     label: 'Usuários',        icon: FiUsers,        href: '/admin/usuarios' },
  { key: 'integracoes.geral',   label: 'Integrações',     icon: FiZap,          href: '/admin/integracao' },
  { key: 'monitoramento.analytics', label: 'Analytics',   icon: FiBarChart2,    href: '/admin/analytics' },
  { key: 'sac',                 label: 'SAC',             icon: FiHeadphones,   href: '/admin/sac' },
  { key: 'email',               label: 'E-mail',          icon: FiMail,         href: '/admin/email' },
  { key: 'config.geral',        label: 'Configurações',   icon: FiSettings,     href: '/admin/configuracoes' },
]

export default function AdminPage() {
  const { data: session } = useSession()
  const [perms, setPerms] = useState<string[] | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/admin/equipe/me')
      .then(r => r.json())
      .then(d => {
        setPerms(d.isMaster ? null : (d.permissions || []))
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  if (!loaded) return null

  // Master admin ou funcionário com permissão de dashboard — mostra o dashboard normal
  const hasDashboard = perms === null || perms.includes('dashboard')
  if (hasDashboard) return <DashboardCharts />

  // Funcionário sem permissão de dashboard — tela de boas-vindas
  const name = session?.user?.name?.split(' ')[0] || 'Funcionário'
  const accessible = MENU_SHORTCUTS.filter(s => perms?.includes(s.key))

  return (
    <div className="min-h-full flex flex-col items-center justify-center py-16 px-4">

      {/* Banner central — 680px × auto */}
      <div className="w-full max-w-2xl">

        {/* Card de boas-vindas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Faixa azul topo */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-10 text-white text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-black text-2xl">M</span>
            </div>
            <h1 className="text-2xl font-bold">Olá, {name}!</h1>
            <p className="text-blue-100 text-sm mt-1">Bem-vindo ao painel MYDShop</p>
          </div>

          {/* Corpo */}
          <div className="px-8 py-8">
            {accessible.length > 0 ? (
              <>
                <p className="text-sm text-gray-500 text-center mb-6">
                  Selecione uma das suas áreas de acesso:
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {accessible.map(item => {
                    const Icon = item.icon
                    return (
                      <a
                        key={item.key}
                        href={item.href}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition">
                          <Icon className="text-blue-600 text-lg" />
                        </div>
                        <span className="text-xs font-medium text-gray-700 group-hover:text-blue-700 text-center">{item.label}</span>
                      </a>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm">Nenhuma área liberada ainda.</p>
                <p className="text-gray-400 text-xs mt-1">Solicite permissões ao administrador.</p>
              </div>
            )}
          </div>

          {/* Rodapé */}
          <div className="border-t border-gray-50 px-8 py-4 bg-gray-50/50 text-center">
            <p className="text-xs text-gray-400">MYDShop &copy; {new Date().getFullYear()} — Painel Administrativo</p>
          </div>

        </div>
      </div>
    </div>
  )
}
