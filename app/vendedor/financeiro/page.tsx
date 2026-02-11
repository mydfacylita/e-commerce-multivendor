'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FiArrowLeft, FiDollarSign, FiPackage, FiTrendingUp, FiDownload, FiCalendar, FiTrendingDown } from 'react-icons/fi';
import { formatOrderNumber } from '@/lib/order';

type PeriodType = '7days' | '30days' | '90days' | 'all';

export default function SellerFinancialPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [financialData, setFinancialData] = useState<any>(null);
  const [permissions, setPermissions] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('30days');
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

  // Form state para saque
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('CPF');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');
  const [contaTipo, setContaTipo] = useState('CORRENTE');
  const [sellerNote, setSellerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState('');
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      checkPermissions();
    }
  }, [status]);

  const checkPermissions = async () => {
    try {
      const response = await fetch('/api/seller/permissions');
      if (response.ok) {
        const perms = await response.json();
        setPermissions(perms);
        
        if (perms.canViewFinancial || perms.isOwner) {
          setHasAccess(true);
          fetchFinancialData();
        } else {
          setHasAccess(false);
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      setIsLoading(false);
    }
  };

  const fetchFinancialData = async () => {
    try {
      const response = await fetch(`/api/seller/financial?period=${selectedPeriod}`);
      if (response.ok) {
        const data = await response.json();
        setFinancialData(data);
      } else if (response.status === 404) {
        router.push('/vendedor/cadastro');
      }
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWithdrawals = async () => {
    try {
      const response = await fetch('/api/vendedor/saques');
      if (response.ok) {
        const data = await response.json();
        console.log('Saques carregados:', data);
        setWithdrawals(data);
      } else {
        console.error('Erro ao carregar saques:', response.status);
      }
    } catch (error) {
      console.error('Erro ao carregar saques:', error);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      fetchFinancialData();
      loadWithdrawals();
    }
  }, [hasAccess, selectedPeriod]);

  if (isLoading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-red-800 mb-2">🚫 Acesso Negado</h2>
          <p className="text-red-600">
            Você não tem permissão para visualizar o financeiro.
          </p>
          <p className="text-sm text-red-500 mt-2">
            Entre em contato com o proprietário da loja para solicitar acesso.
          </p>
        </div>
      </div>
    );
  }

  if (!financialData) return null;

  const { summary, recentSales, seller, dropshipping, topProducts, comparison } = financialData;

  const periodLabels = {
    '7days': 'Últimos 7 dias',
    '30days': 'Últimos 30 dias',
    '90days': 'Últimos 90 dias',
    'all': 'Todo período'
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/vendedor/dashboard"
        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
      >
        <FiArrowLeft size={20} />
        Voltar para Dashboard
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Financeiro</h1>
          <p className="text-gray-600">Acompanhe suas vendas e comissões</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Filtro de Período */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2 border">
            <FiCalendar className="text-gray-600" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as PeriodType)}
              className="border-none outline-none bg-transparent text-sm font-medium cursor-pointer"
            >
              <option value="7days">Últimos 7 dias</option>
              <option value="30days">Últimos 30 dias</option>
              <option value="90days">Últimos 90 dias</option>
              <option value="all">Todo período</option>
            </select>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white shadow">
            <FiDownload size={20} />
            <span className="hidden md:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* Comparação com Período Anterior */}
      {comparison && comparison.hasPreviousData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {comparison.growth >= 0 ? (
                <FiTrendingUp className="text-green-600 text-2xl" />
              ) : (
                <FiTrendingDown className="text-red-600 text-2xl" />
              )}
              <div>
                <p className="text-sm text-gray-600">Comparado ao período anterior</p>
                <p className={`text-xl font-bold ${comparison.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {comparison.growth >= 0 ? '+' : ''}{comparison.growth.toFixed(1)}% de crescimento
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Período anterior</p>
              <p className="text-lg font-semibold text-gray-900">R$ {comparison.previousRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <FiDollarSign size={32} />
            <span className="text-sm opacity-90">Total</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            R$ {summary.totalRevenue.toFixed(2)}
          </div>
          <p className="text-sm opacity-90">Receita total</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <FiTrendingUp size={32} className="text-blue-600" />
            <span className="text-sm text-gray-600">Comissão</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {seller.commission}%
          </div>
          <p className="text-sm text-gray-600">Taxa da plataforma</p>
          {financialData.plan && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs text-blue-600 font-medium">📋 {financialData.plan.name}</p>
              <p className="text-xs text-gray-500">{financialData.plan.status === 'ACTIVE' ? 'Ativo' : financialData.plan.status}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <FiPackage size={32} className="text-purple-600" />
            <span className="text-sm text-gray-600">Vendas</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {summary.totalSales}
          </div>
          <p className="text-sm text-gray-600">Pedidos completos</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <FiDollarSign size={32} className="text-orange-600" />
            <span className="text-sm text-gray-600">Ticket Médio</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            R$ {summary.averageTicket.toFixed(2)}
          </div>
          <p className="text-sm text-gray-600">Por pedido</p>
        </div>
      </div>

      {/* Resumo Detalhado */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Resumo de Comissões</h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Valor Total de Vendas:</span>
              <span className="font-semibold">R$ {summary.totalGross.toFixed(2)}</span>
            </div>
            {dropshipping && dropshipping.sales > 0 && (
              <div className="flex justify-between py-2 border-b bg-purple-50 px-2 rounded">
                <span className="text-gray-600">Custo Dropshipping:</span>
                <span className="font-semibold text-orange-600">
                  - R$ {dropshipping.cost.toFixed(2)}
                </span>
              </div>
            )}
            {summary.ownProductsCommission > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Comissão Plataforma ({seller.commission}%):</span>
                <span className="font-semibold text-red-600">
                  - R$ {summary.ownProductsCommission.toFixed(2)}
                </span>
              </div>
            )}
            {summary.dropshippingCommission > 0 && (
              <div className="flex justify-between py-2 border-b bg-blue-50 px-2 rounded">
                <span className="text-gray-600">Bônus Dropshipping:</span>
                <span className="font-semibold text-blue-600">
                  + R$ {summary.dropshippingCommission.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t-2">
              <span className="text-gray-900 font-semibold">Você Recebe:</span>
              <span className="font-bold text-green-600 text-xl">
                R$ {summary.totalRevenue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Link para Conta Digital */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Sua Conta Digital</h2>
          <p className="text-gray-600 mb-4">
            Gerencie seus saques, transferências e veja o extrato completo na sua conta digital.
          </p>
          <Link 
            href="/vendedor/conta"
            className="w-full block text-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Acessar Minha Conta
          </Link>
        </div>
      </div>

      {/* Dropshipping Analytics */}
      {dropshipping && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-600 text-white p-3 rounded-lg">
              <FiPackage size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Análise de Dropshipping</h2>
              <p className="text-sm text-gray-600">Resultados dos seus produtos de dropshipping</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Vendas Drop</p>
              <p className="text-2xl font-bold text-purple-600">{dropshipping.sales || 0}</p>
              <p className="text-xs text-gray-500">unidades vendidas</p>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Receita Drop</p>
              <p className="text-2xl font-bold text-blue-600">
                R$ {(dropshipping.revenue || 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">valor total de vendas</p>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Custo Base</p>
              <p className="text-2xl font-bold text-orange-600">
                R$ {(dropshipping.cost || 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">custo dos fornecedores</p>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Lucro Líquido</p>
              <p className="text-2xl font-bold text-green-600">
                R$ {(dropshipping.profit || 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">margem: {(dropshipping.margin || 0).toFixed(1)}%</p>
            </div>
          </div>
          
          {dropshipping.sales > 0 ? (
            <div className="mt-4 p-4 bg-purple-100 rounded-lg border border-purple-300">
              <p className="text-sm text-purple-900">
                <strong>💡 Dica:</strong> Seus produtos de dropshipping estão gerando{' '}
                <strong>R$ {dropshipping.profit.toFixed(2)}</strong> de lucro líquido 
                (após descontar custo base e comissão da plataforma).
              </p>
            </div>
          ) : (
            <div className="mt-4 p-4 bg-blue-100 rounded-lg border border-blue-300">
              <p className="text-sm text-blue-900">
                <strong>📦 Começe agora:</strong> Você ainda não tem vendas de dropshipping. 
                Acesse a aba <strong>Dropshipping</strong> para adicionar produtos ao seu catálogo!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Top Produtos Mais Vendidos */}
      {topProducts && topProducts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FiPackage className="text-blue-600" />
            Top 5 Produtos Mais Vendidos
          </h2>
          <div className="space-y-3">
            {topProducts.map((product: any, index: number) => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{product.name}</p>
                    <p className="text-sm text-gray-600">{product.quantity} unidades vendidas</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-green-600">R$ {product.revenue.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">receita</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensagem quando não há vendas */}
      {summary.totalSales === 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-8 mb-8 text-center">
          <FiPackage className="text-yellow-600 text-5xl mx-auto mb-4" />
          <h3 className="text-xl font-bold text-yellow-900 mb-2">Nenhuma venda registrada</h3>
          <p className="text-yellow-800 mb-4">
            Você ainda não tem vendas no período selecionado ({periodLabels[selectedPeriod]}).
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/vendedor/produtos"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Ver Meus Produtos
            </Link>
            <Link
              href="/vendedor/dropshipping"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Adicionar Produtos Drop
            </Link>
          </div>
        </div>
      )}

      {/* Histórico de Saques */}
      {withdrawals && withdrawals.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg mb-8">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Histórico de Saques</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Data</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Valor</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Método</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {withdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        {new Date(withdrawal.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(withdrawal.createdAt).toLocaleTimeString('pt-BR')}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      R$ {withdrawal.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">{withdrawal.paymentMethod}</div>
                      {withdrawal.paymentMethod === 'PIX' && withdrawal.pixKey && (
                        <div className="text-xs text-gray-500">
                          {withdrawal.pixKeyType}: {withdrawal.pixKey.substring(0, 10)}...
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        withdrawal.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        withdrawal.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                        withdrawal.status === 'PROCESSING' ? 'bg-purple-100 text-purple-800' :
                        withdrawal.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        withdrawal.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {withdrawal.status === 'PENDING' ? 'Pendente' :
                         withdrawal.status === 'APPROVED' ? 'Aprovado' :
                         withdrawal.status === 'PROCESSING' ? 'Processando' :
                         withdrawal.status === 'COMPLETED' ? 'Concluído' :
                         withdrawal.status === 'REJECTED' ? 'Rejeitado' :
                         'Cancelado'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {withdrawal.processedAt && (
                        <div>Processado: {new Date(withdrawal.processedAt).toLocaleDateString('pt-BR')}</div>
                      )}
                      {withdrawal.rejectionReason && (
                        <div className="text-red-600">Motivo: {withdrawal.rejectionReason}</div>
                      )}
                      {withdrawal.transactionId && (
                        <div className="text-xs">ID: {withdrawal.transactionId}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vendas Recentes */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Vendas Recentes</h2>
        </div>
        <div className="overflow-x-auto">
          {recentSales.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FiPackage className="text-4xl mx-auto mb-3 text-gray-400" />
              <p>Nenhuma venda registrada no período selecionado</p>
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Pedido</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Data</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Origem</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Produtos</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Valor Bruto</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Custo</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Tipo/Comissão</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Você Recebe</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale: any) => (
                  <tr key={sale.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-sm font-semibold text-blue-600">
                      {formatOrderNumber(sale.id)}
                    </td>
                    <td className="py-3 px-4">
                      {new Date(sale.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        sale.origin === 'dropshipping' ? 'bg-purple-100 text-purple-800' :
                        sale.origin === 'own' ? 'bg-blue-100 text-blue-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {sale.origin === 'dropshipping' ? '📦 Drop' :
                         sale.origin === 'own' ? '🏪 Próprio' :
                         '🔀 Misto'}
                      </span>
                    </td>
                    <td className="py-3 px-4">{sale.itemCount} itens</td>
                    <td className="py-3 px-4 font-semibold">
                      R$ {sale.total.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {sale.hasDropshipping 
                        ? `R$ ${(sale.cost || 0).toFixed(2)}`
                        : '-'
                      }
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className={`text-xs font-medium mb-1 ${
                          sale.transactionType === 'received' ? 'text-green-700' :
                          sale.transactionType === 'paid' ? 'text-red-700' :
                          'text-orange-700'
                        }`}>
                          {sale.transactionType === 'received' ? '↓ Comissão Recebida' :
                           sale.transactionType === 'paid' ? '↑ Comissão Paga' :
                           '↕ Misto'}
                        </span>
                        <span className={`font-semibold ${
                          sale.transactionType === 'received' ? 'text-green-600' :
                          sale.transactionType === 'paid' ? 'text-red-600' :
                          'text-orange-600'
                        }`}>
                          {sale.transactionType === 'received' ? '+' : 
                           sale.transactionType === 'paid' ? '-' : '±'} R$ {Math.abs(sale.commissionAmount || 0).toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-green-600">
                      R$ {(sale.sellerRevenue || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        sale.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                        sale.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                        sale.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
                        sale.status === 'PENDING' ? 'bg-gray-100 text-gray-800' :
                        sale.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {sale.status === 'DELIVERED' ? 'Entregue' :
                         sale.status === 'SHIPPED' ? 'Enviado' :
                         sale.status === 'PROCESSING' ? 'Processando' :
                         sale.status === 'PENDING' ? 'Pendente' :
                         sale.status === 'CANCELLED' ? 'Cancelado' :
                         sale.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Saque */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Solicitar Saque</h2>

              {withdrawalError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  {withdrawalError}
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-600">Saldo Disponível</div>
                <div className="text-2xl font-bold text-green-600">
                  R$ {summary.availableForWithdrawal.toFixed(2)}
                </div>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                setWithdrawalError('');
                setSubmitting(true);

                try {
                  const data: any = {
                    amount: parseFloat(amount),
                    paymentMethod,
                    sellerNote
                  };

                  if (paymentMethod === 'PIX') {
                    data.pixKey = pixKey;
                    data.pixKeyType = pixKeyType;
                  } else {
                    data.bankName = bankName;
                    data.bankCode = bankCode;
                    data.agencia = agencia;
                    data.conta = conta;
                    data.contaTipo = contaTipo;
                  }

                  const res = await fetch('/api/vendedor/saques', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                  });

                  const result = await res.json();

                  if (res.ok) {
                    alert('Saque solicitado com sucesso!');
                    setShowWithdrawalModal(false);
                    // Reset form
                    setAmount('');
                    setPaymentMethod('PIX');
                    setPixKey('');
                    setPixKeyType('CPF');
                    setBankName('');
                    setBankCode('');
                    setAgencia('');
                    setConta('');
                    setContaTipo('CORRENTE');
                    setSellerNote('');
                    // Reload data
                    fetchFinancialData();
                    loadWithdrawals();
                  } else {
                    setWithdrawalError(result.error || 'Erro ao solicitar saque');
                  }
                } catch (error) {
                  console.error('Erro:', error);
                  setWithdrawalError('Erro ao processar solicitação');
                } finally {
                  setSubmitting(false);
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Valor do Saque *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={summary?.availableForWithdrawal || 0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Método de Pagamento *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="PIX">PIX</option>
                    <option value="TED">TED</option>
                    <option value="BANK_TRANSFER">Transferência Bancária</option>
                  </select>
                </div>

                {paymentMethod === 'PIX' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Tipo de Chave PIX *</label>
                      <select
                        value={pixKeyType}
                        onChange={(e) => setPixKeyType(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      >
                        <option value="CPF">CPF</option>
                        <option value="CNPJ">CNPJ</option>
                        <option value="EMAIL">E-mail</option>
                        <option value="PHONE">Telefone</option>
                        <option value="RANDOM">Chave Aleatória</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Chave PIX *</label>
                      <input
                        type="text"
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Banco *</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Agência *</label>
                        <input
                          type="text"
                          value={agencia}
                          onChange={(e) => setAgencia(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Conta *</label>
                        <input
                          type="text"
                          value={conta}
                          onChange={(e) => setConta(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Tipo de Conta *</label>
                      <select
                        value={contaTipo}
                        onChange={(e) => setContaTipo(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                      >
                        <option value="CORRENTE">Corrente</option>
                        <option value="POUPANCA">Poupança</option>
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Observações (opcional)</label>
                  <textarea
                    value={sellerNote}
                    onChange={(e) => setSellerNote(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {submitting ? 'Processando...' : 'Solicitar Saque'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowWithdrawalModal(false);
                      setWithdrawalError('');
                    }}
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
