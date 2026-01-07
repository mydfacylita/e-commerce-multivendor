import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { FiEdit, FiTrash2 } from 'react-icons/fi'

export default async function AdminUsuariosPage() {
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: { orders: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Gerenciar Usuários</h1>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-4 px-6 font-semibold">Nome</th>
                <th className="text-left py-4 px-6 font-semibold">Email</th>
                <th className="text-left py-4 px-6 font-semibold">Função</th>
                <th className="text-left py-4 px-6 font-semibold">Pedidos</th>
                <th className="text-left py-4 px-6 font-semibold">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <p className="font-semibold">{user.name}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm">{user.email}</p>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        user.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {user.role === 'ADMIN' ? 'Administrador' : 'Usuário'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm">{user._count.orders} pedidos</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm">
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhum usuário encontrado</p>
          </div>
        )}
      </div>
    </div>
  )
}
