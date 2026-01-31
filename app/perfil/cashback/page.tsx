'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FiArrowLeft, FiDollarSign, FiGift, FiClock, FiCheckCircle, 
  FiAlertTriangle, FiTrendingUp, FiCalendar
} from 'react-icons/fi';

interface CashbackData {
  balance: number;
  pendingBalance: number;
  totalEarned: number;
  totalUsed: number;
  nextToExpire: {
    amount: number;
    expiresAt: string;
  } | null;
  recentTransactions: Transaction[];
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  expiresAt: string | null;
  createdAt: string;
}

const transactionLabels: Record<string, { label: string; color: string; icon: any }> = {
  CREDIT: { label: 'Cashback recebido', color: 'text-green-600', icon: FiTrendingUp },
  DEBIT: { label: 'Cashback utilizado', color: 'text-blue-600', icon: FiGift },
  EXPIRED: { label: 'Expirado', color: 'text-gray-500', icon: FiClock },
  ADJUSTMENT_CREDIT: { label: 'Bônus', color: 'text-green-600', icon: FiGift },
  ADJUSTMENT_DEBIT: { label: 'Ajuste', color: 'text-orange-600', icon: FiAlertTriangle },
  REFUND: { label: 'Devolução', color: 'text-purple-600', icon: FiDollarSign }
};

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Aguardando liberação', color: 'bg-yellow-100 text-yellow-800' },
  AVAILABLE: { label: 'Disponível', color: 'bg-green-100 text-green-800' },
  USED: { label: 'Utilizado', color: 'bg-blue-100 text-blue-800' },
  EXPIRED: { label: 'Expirado', color: 'bg-gray-100 text-gray-600' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-800' }
};

export default function MeuCashbackPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [cashbackData, setCashbackData] = useState<CashbackData | null>(null);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login?callbackUrl=/perfil/cashback');
      return;
    }

    if (sessionStatus === 'authenticated') {
      fetchCashback();
    }
  }, [sessionStatus]);

  const fetchCashback = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/cashback');
      if (response.ok) {
        const data = await response.json();
        setCashbackData(data);
      }
    } catch (error) {
      console.error('Erro ao buscar cashback:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllTransactions = async () => {
    try {
      const response = await fetch('/api/cashback/transactions?limit=50');
      if (response.ok) {
        const data = await response.json();
        setAllTransactions(data.transactions);
        setShowAllTransactions(true);
      }
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const daysUntilExpiration = (expiresAt: string) => {
    const now = new Date();
    const expDate = new Date(expiresAt);
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (sessionStatus === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando seu cashback...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/perfil"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <FiArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meu Cashback</h1>
          <p className="text-gray-600">Acompanhe seu saldo e histórico de cashback</p>
        </div>
      </div>

      {/* Cards de Saldo */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <FiDollarSign size={24} />
            <span className="font-medium">Saldo Disponível</span>
          </div>
          <p className="text-3xl font-bold">
            {formatCurrency(cashbackData?.balance || 0)}
          </p>
          <p className="text-green-100 text-sm mt-2">
            Disponível para usar em compras
          </p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <FiClock size={24} />
            <span className="font-medium">Em Liberação</span>
          </div>
          <p className="text-3xl font-bold">
            {formatCurrency(cashbackData?.pendingBalance || 0)}
          </p>
          <p className="text-yellow-100 text-sm mt-2">
            Liberado após entrega do pedido
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <FiGift size={24} />
            <span className="font-medium">Total Recebido</span>
          </div>
          <p className="text-3xl font-bold">
            {formatCurrency(cashbackData?.totalEarned || 0)}
          </p>
          <p className="text-purple-100 text-sm mt-2">
            {formatCurrency(cashbackData?.totalUsed || 0)} já utilizado
          </p>
        </div>
      </div>

      {/* Alerta de Expiração */}
      {cashbackData?.nextToExpire && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
          <div className="flex items-start gap-3">
            <FiAlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-amber-800">
                Cashback prestes a expirar!
              </p>
              <p className="text-amber-700 text-sm">
                {formatCurrency(cashbackData.nextToExpire.amount)} expira em{' '}
                {daysUntilExpiration(cashbackData.nextToExpire.expiresAt)} dias
                ({formatDate(cashbackData.nextToExpire.expiresAt)}).
                Use seu cashback antes que expire!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Como funciona */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Como funciona o Cashback?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">
              1
            </div>
            <div>
              <p className="font-medium">Faça compras</p>
              <p className="text-sm text-gray-600">
                Em produtos elegíveis, você ganha uma porcentagem de volta
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">
              2
            </div>
            <div>
              <p className="font-medium">Receba seu pedido</p>
              <p className="text-sm text-gray-600">
                O cashback é liberado após a confirmação de entrega
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">
              3
            </div>
            <div>
              <p className="font-medium">Use na próxima compra</p>
              <p className="text-sm text-gray-600">
                Aplique seu saldo como desconto no checkout
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de Transações */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Histórico de Transações</h2>
          {!showAllTransactions && cashbackData?.recentTransactions && cashbackData.recentTransactions.length >= 10 && (
            <button
              onClick={loadAllTransactions}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Ver todas
            </button>
          )}
        </div>

        <div className="divide-y">
          {(showAllTransactions ? allTransactions : cashbackData?.recentTransactions)?.length === 0 ? (
            <div className="p-8 text-center">
              <FiGift className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 mb-2">Você ainda não tem transações de cashback</p>
              <p className="text-sm text-gray-500">
                Faça sua primeira compra e ganhe cashback!
              </p>
              <Link
                href="/"
                className="inline-block mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Ver produtos
              </Link>
            </div>
          ) : (
            (showAllTransactions ? allTransactions : cashbackData?.recentTransactions)?.map((transaction) => {
              const TypeIcon = transactionLabels[transaction.type]?.icon || FiDollarSign;
              const isPositive = transaction.amount > 0;
              
              return (
                <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${isPositive ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <TypeIcon 
                        className={isPositive ? 'text-green-600' : 'text-gray-600'} 
                        size={20} 
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.description}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{formatDate(transaction.createdAt)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusLabels[transaction.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                          {statusLabels[transaction.status]?.label || transaction.status}
                        </span>
                        {transaction.expiresAt && transaction.status === 'AVAILABLE' && (
                          <span className="text-xs text-amber-600">
                            Expira em {formatDate(transaction.expiresAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
