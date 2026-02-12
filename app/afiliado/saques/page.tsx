'use client';

import { useState, useEffect } from 'react';
import { FiDollarSign, FiAlertCircle, FiCheckCircle, FiClock, FiXCircle } from 'react-icons/fi';

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  method: string;
  pixKey: string | null;
  bankInfo: string | null;
  notes: string | null;
  proofUrl: string | null;
  requestedAt: string;
  processedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

interface AccountInfo {
  balance: number;
  totalReceived: number;
  totalWithdrawn: number;
  minWithdrawalAmount: number;
}

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Aguardando', color: 'bg-yellow-100 text-yellow-800', icon: FiClock },
  APPROVED: { label: 'Aprovado', color: 'bg-blue-100 text-blue-800', icon: FiCheckCircle },
  PROCESSING: { label: 'Processando', color: 'bg-purple-100 text-purple-800', icon: FiClock },
  COMPLETED: { label: 'Concluído', color: 'bg-green-100 text-green-800', icon: FiCheckCircle },
  REJECTED: { label: 'Rejeitado', color: 'bg-red-100 text-red-800', icon: FiXCircle },
};

export default function AffiliateSaquesPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [withdrawalsRes, accountRes] = await Promise.all([
        fetch('/api/affiliate/withdrawals'),
        fetch('/api/affiliate/account')
      ]);

      if (withdrawalsRes.ok) {
        const data = await withdrawalsRes.json();
        setWithdrawals(data.withdrawals);
      }

      if (accountRes.ok) {
        const data = await accountRes.json();
        setAccountInfo(data.account);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestWithdrawal = async () => {
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount <= 0) {
      setError('Digite um valor válido');
      return;
    }

    if (!accountInfo) {
      setError('Informações da conta não encontradas');
      return;
    }

    if (numAmount < accountInfo.minWithdrawalAmount) {
      setError(`Valor mínimo para saque: ${formatCurrency(accountInfo.minWithdrawalAmount)}`);
      return;
    }

    if (numAmount > accountInfo.balance) {
      setError('Saldo insuficiente');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const response = await fetch('/api/affiliate/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numAmount })
      });

      const data = await response.json();

      if (response.ok) {
        setShowRequestModal(false);
        setAmount('');
        fetchData();
        alert('Solicitação de saque enviada com sucesso!');
      } else {
        setError(data.error || 'Erro ao solicitar saque');
      }
    } catch (error) {
      setError('Erro ao processar solicitação');
    } finally {
      setIsSubmitting(false);
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Saques</h1>
        <p className="text-gray-600">Solicite saques e acompanhe seu histórico</p>
      </div>

      {/* Account Info Cards */}
      {accountInfo && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <p className="text-sm text-gray-600 mb-1">Saldo Disponível</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(accountInfo.balance)}</p>
            <p className="text-xs text-gray-500 mt-1">
              Mínimo para saque: {formatCurrency(accountInfo.minWithdrawalAmount)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <p className="text-sm text-gray-600 mb-1">Total Recebido</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(accountInfo.totalReceived)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <p className="text-sm text-gray-600 mb-1">Total Sacado</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(accountInfo.totalWithdrawn)}</p>
          </div>
        </div>
      )}

      {/* Request Withdrawal Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowRequestModal(true)}
          disabled={!accountInfo || accountInfo.balance < (accountInfo.minWithdrawalAmount || 50)}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <FiDollarSign size={20} />
          Solicitar Saque
        </button>
        {accountInfo && accountInfo.balance < (accountInfo.minWithdrawalAmount || 50) && (
          <p className="text-sm text-orange-600 mt-2 flex items-center gap-1">
            <FiAlertCircle size={14} />
            Saldo insuficiente para saque (mínimo: {formatCurrency(accountInfo.minWithdrawalAmount || 50)})
          </p>
        )}
      </div>

      {/* Withdrawals History */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Histórico de Saques</h2>
        </div>

        {withdrawals.length === 0 ? (
          <div className="text-center py-12">
            <FiDollarSign className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">Nenhum saque solicitado ainda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Data
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Método
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Observações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {withdrawals.map((withdrawal) => {
                  const StatusIcon = statusLabels[withdrawal.status]?.icon || FiClock;
                  return (
                    <tr key={withdrawal.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(withdrawal.requestedAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {formatCurrency(withdrawal.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {withdrawal.method === 'PIX' ? 'PIX' : 'Transferência'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusLabels[withdrawal.status]?.color}`}>
                          <StatusIcon size={12} />
                          {statusLabels[withdrawal.status]?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {withdrawal.status === 'REJECTED' && withdrawal.rejectionReason ? (
                          <span className="text-red-600">{withdrawal.rejectionReason}</span>
                        ) : withdrawal.notes ? (
                          withdrawal.notes
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Request Withdrawal Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Solicitar Saque</h3>

            {accountInfo && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-600">Saldo disponível</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(accountInfo.balance)}</p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor do Saque
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min={accountInfo?.minWithdrawalAmount || 50}
                max={accountInfo?.balance || 0}
                placeholder={`Mínimo: ${formatCurrency(accountInfo?.minWithdrawalAmount || 50)}`}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <FiAlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-xs text-blue-800">
                <strong>Importante:</strong> O saque será processado via PIX para a chave cadastrada. 
                O prazo de processamento é de até 2 dias úteis.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setAmount('');
                  setError('');
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRequestWithdrawal}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
