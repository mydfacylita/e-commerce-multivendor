'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

export default function DebugPermissionsPage() {
  const { data: session } = useSession()
  const [permissions, setPermissions] = useState<any>(null)
  const [sellerData, setSellerData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Buscar permissões
      const permRes = await fetch('/api/seller/permissions')
      if (permRes.ok) {
        const permData = await permRes.json()
        setPermissions(permData)
      } else {
        const error = await permRes.json()
        console.error('Erro ao buscar permissões:', error)
        setPermissions({ error: error.error || 'Erro desconhecido' })
      }

      // Buscar dados do vendedor
      const sellerRes = await fetch('/api/seller/register')
      if (sellerRes.ok) {
        const sellerInfo = await sellerRes.json()
        setSellerData(sellerInfo)
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8">Carregando...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">🔍 Debug de Permissões</h1>

      {/* Sessão */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">📋 Sessão Atual</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>

      {/* Permissões */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🔐 Permissões</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(permissions, null, 2)}
        </pre>

        {permissions && !permissions.error && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Status das Permissões:</h3>
            <ul className="space-y-2">
              <li className={permissions.isOwner ? 'text-green-600' : 'text-red-600'}>
                {permissions.isOwner ? '✅' : '❌'} É Proprietário
              </li>
              <li className={permissions.canManageProducts ? 'text-green-600' : 'text-red-600'}>
                {permissions.canManageProducts ? '✅' : '❌'} Gerenciar Produtos
              </li>
              <li className={permissions.canManageOrders ? 'text-green-600' : 'text-red-600'}>
                {permissions.canManageOrders ? '✅' : '❌'} Gerenciar Pedidos
              </li>
              <li className={permissions.canViewFinancial ? 'text-green-600' : 'text-red-600'}>
                {permissions.canViewFinancial ? '✅' : '❌'} Ver Financeiro
              </li>
              <li className={permissions.canManageEmployees ? 'text-green-600' : 'text-red-600'}>
                {permissions.canManageEmployees ? '✅' : '❌'} Gerenciar Funcionários (PERMISSÃO NECESSÁRIA)
              </li>
              <li className={permissions.canManageIntegrations ? 'text-green-600' : 'text-red-600'}>
                {permissions.canManageIntegrations ? '✅' : '❌'} Gerenciar Integrações
              </li>
              <li className={permissions.canManageDropshipping ? 'text-green-600' : 'text-red-600'}>
                {permissions.canManageDropshipping ? '✅' : '❌'} Gerenciar Dropshipping
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Dados do Vendedor */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">🏪 Dados do Vendedor</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(sellerData, null, 2)}
        </pre>
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">💡 Diagnóstico</h2>
        {permissions?.error ? (
          <div className="text-red-600">
            <p className="font-semibold">❌ Erro ao carregar permissões:</p>
            <p>{permissions.error}</p>
          </div>
        ) : permissions?.canManageEmployees ? (
          <p className="text-green-600">
            ✅ Você tem permissão para ver e gerenciar funcionários. O menu "Funcionários" deve estar visível.
          </p>
        ) : (
          <div className="text-orange-600">
            <p className="font-semibold">⚠️ Você NÃO tem permissão para gerenciar funcionários.</p>
            <p className="mt-2">Possíveis causas:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Você é um funcionário (não proprietário) da loja</li>
              <li>Seu nível de acesso é MANAGER, OPERATOR ou VIEWER</li>
              <li>Apenas proprietários (owners) podem gerenciar funcionários</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
