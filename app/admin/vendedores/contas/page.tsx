'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiDollarSign, FiUsers, FiCheckCircle, FiXCircle, 
  FiClock, FiSearch, FiEye, FiFilter, FiAlertTriangle, FiShield
} from 'react-icons/fi';
interface SellerAccount {
  id: string;
  accountNumber: string;
  status: string;
  kycStatus: string;
  balance: number;
  blockedBalance: number;
  totalReceived: number;
  totalWithdrawn: number;
  seller: {
    id: string;
    storeName: string;
    userName: string;
    userEmail: string;
  };
  transactionsCount: number;
  createdAt: string;
}

interface Stats {
  totalBalance: number;
  totalBlocked: number;
  totalReceived: number;
  totalWithdrawn: number;
  totalAccounts: number;
  byStatus: Record<string, number>;
  byKyc: Record<string, number>;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  ACTIVE: { label: 'Ativa', color: 'bg-green-100 text-green-800' },
  BLOCKED: { label: 'Bloqueada', color: 'bg-red-100 text-red-800' },
  SUSPENDED: { label: 'Suspensa', color: 'bg-orange-100 text-orange-800' },
  CLOSED: { label: 'Encerrada', color: 'bg-gray-100 text-gray-800' }
};

const kycLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Aguardando', color: 'bg-gray-100 text-gray-800' },
  SUBMITTED: { label: 'Enviado', color: 'bg-blue-100 text-blue-800' },
  REVIEWING: { label: 'Em Análise', color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Aprovado', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rejeitado', color: 'bg-red-100 text-red-800' },
  NEEDS_UPDATE: { label: 'Pendências', color: 'bg-orange-100 text-orange-800' }
};

export default function AdminSellerAccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<SellerAccount[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchAccounts();
  }, [page, statusFilter, kycFilter]);

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter && { status: statusFilter }),
        ...(kycFilter && { kycStatus: kycFilter }),
        ...(search && { search })
      });

      const response = await fetch(`/api/admin/seller-accounts?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts);
        setStats(data.stats);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAccounts();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FiArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contas de Vendedores</h1>
            <p className="text-gray-600">Gestão das contas digitais dos vendedores</p>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Saldo Total</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalBalance)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <FiDollarSign className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Bloqueado</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totalBlocked)}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <FiAlertTriangle className="text-orange-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Contas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAccounts}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <FiUsers className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">KYC Pendente</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {(stats.byKyc.PENDING || 0) + (stats.byKyc.SUBMITTED || 0)}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-xl">
                <FiShield className="text-yellow-600" size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, e-mail ou número da conta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os Status</option>
            <option value="PENDING">Pendente</option>
            <option value="ACTIVE">Ativa</option>
            <option value="BLOCKED">Bloqueada</option>
            <option value="SUSPENDED">Suspensa</option>
            <option value="CLOSED">Encerrada</option>
          </select>

          <select
            value={kycFilter}
            onChange={(e) => { setKycFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os KYC</option>
            <option value="PENDING">Aguardando</option>
            <option value="SUBMITTED">Enviado</option>
            <option value="REVIEWING">Em Análise</option>
            <option value="APPROVED">Aprovado</option>
            <option value="REJECTED">Rejeitado</option>
          </select>

          <button
            type="submit"
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Lista de Contas */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12">
            <FiUsers className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">Nenhuma conta encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Conta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    KYC
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Saldo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Total Recebido
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-mono font-medium text-gray-900">
                          {account.accountNumber}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(account.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {account.seller.storeName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {account.seller.userName} • {account.seller.userEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusLabels[account.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[account.status]?.label || account.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${kycLabels[account.kycStatus]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {kycLabels[account.kycStatus]?.label || account.kycStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(account.balance)}
                      </div>
                      {account.blockedBalance > 0 && (
                        <div className="text-xs text-orange-600">
                          + {formatCurrency(account.blockedBalance)} bloqueado
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(account.totalReceived)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {account.transactionsCount} transações
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Link
                        href={`/admin/vendedores/contas/${account.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors"
                      >
                        <FiEye size={14} />
                        Detalhes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-600">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
