'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FiDollarSign, FiTrendingUp, FiUsers, FiLink, FiCopy, 
  FiCheck, FiEye, FiArrowUpRight, FiClock, FiShare2 
} from 'react-icons/fi';

interface AffiliateStats {
  totalSales: number;
  totalCommission: number;
  availableCommission: number;
  blockedCommission: number;
  availableSalesCount: number;
  blockedSalesCount: number;
  totalWithdrawn: number;
  totalClicks: number;
  conversionRate: number;
  pendingSales: number;
  confirmedSales: number;
  paidSales: number;
}

interface Sale {
  id: string;
  orderId: string;
  customerName: string;
  orderTotal: number;
  commissionAmount: number;
  commissionRate: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
}

interface AffiliateData {
  id: string;
  code: string;
  name: string;
  email: string;
  commissionRate: number;
  status: string;
  account: {
    accountNumber: string;
    balance: number;
    totalReceived: number;
    totalWithdrawn: number;
  } | null;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED: { label: 'Confirmada', color: 'bg-green-100 text-green-800' },
  APPROVED: { label: 'Aprovada', color: 'bg-green-100 text-green-800' },
  PAID: { label: 'Paga', color: 'bg-blue-100 text-blue-800' },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-800' },
};

export default function AffiliateDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchDashboardData();
    }
  }, [status]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [affiliateRes, salesRes] = await Promise.all([
        fetch('/api/affiliate/me'),
        fetch('/api/affiliate/sales')
      ]);

      if (affiliateRes.ok) {
        const data = await affiliateRes.json();
        setAffiliate(data.affiliate);
        setStats(data.stats);
      }

      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setSales(salesData.sales);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyAffiliateLink = () => {
    if (affiliate) {
      const link = `https://www.mydshop.com.br?ref=${affiliate.code}`;
      navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Afiliado não encontrado</h2>
          <p className="text-gray-600">Entre em contato com o suporte.</p>
        </div>
      </div>
    );
  }

  if (affiliate.status !== 'APPROVED') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiClock className="text-yellow-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cadastro em Análise</h2>
          <p className="text-gray-600 mb-6">
            Seu cadastro está sendo analisado pela nossa equipe. 
            Em breve você receberá um e-mail com a decisão.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Status:</strong> Aguardando aprovação
            </p>
          </div>
        </div>
      </div>
    );
  }

  const affiliateLink = `https://www.mydshop.com.br?ref=${affiliate.code}`;

  return (
    <div className="p-6">
        {/* Link de Afiliado */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-lg p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <FiLink size={24} />
                <h2 className="text-xl font-bold">Seu Link de Afiliado</h2>
              </div>
              <div className="mb-3">
                <span className="text-primary-100 text-sm">Código do Afiliado: </span>
                <span className="font-bold text-lg">{affiliate.code}</span>
              </div>
              <p className="text-primary-100 mb-4">
                Compartilhe este link para ganhar {affiliate.commissionRate}% de comissão em cada venda
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={affiliateLink}
                  readOnly
                  className="flex-1 px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white font-mono text-sm backdrop-blur-sm"
                />
                <button
                  onClick={copyAffiliateLink}
                  className="px-6 py-3 bg-white text-primary-600 rounded-lg hover:bg-primary-50 transition-colors flex items-center gap-2 font-medium"
                >
                  {linkCopied ? (
                    <>
                      <FiCheck size={18} />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <FiCopy size={18} />
                      Copiar
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="hidden lg:block ml-8">
              <FiShare2 size={100} className="opacity-20" />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Disponível para Saque</p>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FiDollarSign className="text-green-600" size={20} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats?.availableCommission || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.availableSalesCount || 0} vendas liberadas
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Em Período de Carência</p>
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <FiClock className="text-yellow-600" size={20} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats?.blockedCommission || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.blockedSalesCount || 0} vendas aguardando 7 dias
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Comissão Total</p>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiTrendingUp className="text-blue-600" size={20} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats?.totalCommission || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.confirmedSales || 0} vendas confirmadas
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total de Cliques</p>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <FiUsers className="text-purple-600" size={20} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats?.totalClicks || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Taxa de conversão: {stats?.conversionRate.toFixed(2) || 0}%
            </p>
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Vendas Recentes</h2>
              <Link
                href="/afiliado/vendas"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Ver todas
              </Link>
            </div>
          </div>

          {sales.length === 0 ? (
            <div className="p-12 text-center">
              <FiTrendingUp className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">Nenhuma venda registrada ainda</p>
              <p className="text-sm text-gray-500 mt-2">
                Compartilhe seu link para começar a ganhar comissões!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Comissão
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sales.slice(0, 10).map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(sale.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {sale.customerName}
                        </div>
                        <div className="text-xs text-gray-500">
                          Pedido #{sale.orderId}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {formatCurrency(sale.orderTotal)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-green-600">
                          {formatCurrency(sale.commissionAmount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {sale.commissionRate}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusLabels[sale.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                          {statusLabels[sale.status]?.label || sale.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </div>
  );
}
