'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  FiArrowLeft, FiDollarSign, FiUser, FiCreditCard, FiCheckCircle, 
  FiXCircle, FiClock, FiPlus, FiMinus, FiShield, FiExternalLink
} from 'react-icons/fi';
import TransactionList from '@/components/ui/TransactionList';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  status: string;
  createdAt: string;
}

interface AccountDetails {
  id: string;
  accountNumber: string;
  status: string;
  kycStatus: string;
  balance: number;
  blockedBalance: number;
  totalReceived: number;
  totalWithdrawn: number;
  pixKeyType: string | null;
  pixKey: string | null;
  bankCode: string | null;
  bankName: string | null;
  agencia: string | null;
  conta: string | null;
  contaTipo: string | null;
  autoWithdrawal: boolean;
  autoWithdrawalDay: number | null;
  minWithdrawalAmount: number;
  verifiedAt: string | null;
  kycDocuments: any;
  seller: {
    id: string;
    storeName: string;
    storeSlug: string;
    sellerType: string;
    cpf: string | null;
    cnpj: string | null;
    razaoSocial: string | null;
    cidade: string | null;
    estado: string | null;
    user: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
    };
  };
  transactions: Transaction[];
  createdAt: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  ACTIVE: { label: 'Ativa', color: 'bg-green-100 text-green-800' },
  BLOCKED: { label: 'Bloqueada', color: 'bg-red-100 text-red-800' },
  SUSPENDED: { label: 'Suspensa', color: 'bg-orange-100 text-orange-800' },
  CLOSED: { label: 'Encerrada', color: 'bg-gray-100 text-gray-800' }
};

const kycLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Aguardando Documentos', color: 'bg-gray-100 text-gray-800' },
  SUBMITTED: { label: 'Documentos Enviados', color: 'bg-blue-100 text-blue-800' },
  REVIEWING: { label: 'Em Análise', color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Aprovado', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rejeitado', color: 'bg-red-100 text-red-800' },
  NEEDS_UPDATE: { label: 'Precisa Atualizar', color: 'bg-orange-100 text-orange-800' }
};

// Removido: transactionTypeLabels - agora usa o componente TransactionList

export default function AccountDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.id as string;

  const [account, setAccount] = useState<AccountDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustTransactionType, setAdjustTransactionType] = useState('ADJUSTMENT_CREDIT');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDescription, setAdjustDescription] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [newKycStatus, setNewKycStatus] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAccount();
  }, [accountId]);

  const fetchAccount = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/seller-accounts/${accountId}`);
      if (response.ok) {
        const data = await response.json();
        setAccount(data.account);
        setNewStatus(data.account.status);
        setNewKycStatus(data.account.kycStatus);
      } else {
        router.push('/admin/vendedores/contas');
      }
    } catch (error) {
      console.error('Erro ao buscar conta:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustment = async () => {
    if (!adjustAmount || !adjustDescription) {
      alert('Preencha todos os campos');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/admin/seller-accounts/${accountId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: adjustTransactionType,
          amount: parseFloat(adjustAmount),
          description: adjustDescription,
          reason: adjustReason
        })
      });

      if (response.ok) {
        setShowAdjustModal(false);
        setAdjustAmount('');
        setAdjustDescription('');
        setAdjustReason('');
        setAdjustTransactionType('ADJUSTMENT_CREDIT');
        fetchAccount();
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao fazer ajuste');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao processar ajuste');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async () => {
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/admin/seller-accounts/${accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus !== account?.status ? newStatus : undefined,
          kycStatus: newKycStatus !== account?.kycStatus ? newKycStatus : undefined,
          adminNote
        })
      });

      if (response.ok) {
        setShowStatusModal(false);
        setAdminNote('');
        fetchAccount();
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao atualizar status');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao atualizar');
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!account) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/vendedores/contas"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FiArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Conta {account.accountNumber}
            </h1>
            <p className="text-gray-600">{account.seller.storeName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowStatusModal(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <FiShield size={18} />
            Alterar Status
          </button>
          <button
            onClick={() => { setAdjustType('credit'); setAdjustTransactionType('ADJUSTMENT_CREDIT'); setShowAdjustModal(true); }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <FiPlus size={18} />
            Crédito
          </button>
          <button
            onClick={() => { setAdjustType('debit'); setAdjustTransactionType('ADJUSTMENT_DEBIT'); setShowAdjustModal(true); }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <FiMinus size={18} />
            Débito
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Saldos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <p className="text-sm text-gray-600">Saldo Disponível</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(account.balance)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <p className="text-sm text-gray-600">Saldo Bloqueado</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(account.blockedBalance)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <p className="text-sm text-gray-600">Total Recebido</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(account.totalReceived)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <p className="text-sm text-gray-600">Total Sacado</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(account.totalWithdrawn)}</p>
            </div>
          </div>

          {/* Transações */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Últimas Transações</h2>
            </div>
            <TransactionList transactions={account.transactions} showBalance={true} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Status da Conta</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusLabels[account.status]?.color}`}>
                  {statusLabels[account.status]?.label}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Verificação KYC</p>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${kycLabels[account.kycStatus]?.color}`}>
                  {kycLabels[account.kycStatus]?.label}
                </span>
              </div>
              {account.verifiedAt && (
                <div>
                  <p className="text-sm text-gray-600">Verificado em</p>
                  <p className="text-sm font-medium">
                    {new Date(account.verifiedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Dados do Vendedor */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Vendedor</h3>
              <Link
                href={`/admin/vendedores/${account.seller.id}`}
                className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1"
              >
                Ver perfil <FiExternalLink size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Loja</p>
                <p className="font-medium">{account.seller.storeName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Responsável</p>
                <p className="font-medium">{account.seller.user.name}</p>
                <p className="text-sm text-gray-500">{account.seller.user.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tipo</p>
                <p className="font-medium">
                  {account.seller.sellerType === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                </p>
              </div>
              {account.seller.sellerType === 'PF' ? (
                <div>
                  <p className="text-sm text-gray-600">CPF</p>
                  <p className="font-medium">{account.seller.cpf || '-'}</p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-gray-600">CNPJ</p>
                    <p className="font-medium">{account.seller.cnpj || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Razão Social</p>
                    <p className="font-medium">{account.seller.razaoSocial || '-'}</p>
                  </div>
                </>
              )}
              <div>
                <p className="text-sm text-gray-600">Localização</p>
                <p className="font-medium">
                  {account.seller.cidade}, {account.seller.estado}
                </p>
              </div>
            </div>
          </div>

          {/* Dados Bancários */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Dados Bancários</h3>
            <div className="space-y-3">
              {account.pixKey ? (
                <>
                  <div>
                    <p className="text-sm text-gray-600">Chave PIX ({account.pixKeyType})</p>
                    <p className="font-medium font-mono">{account.pixKey}</p>
                  </div>
                </>
              ) : account.bankName ? (
                <>
                  <div>
                    <p className="text-sm text-gray-600">Banco</p>
                    <p className="font-medium">{account.bankName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Agência / Conta</p>
                    <p className="font-medium">
                      {account.agencia} / {account.conta} ({account.contaTipo})
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-sm">Nenhum dado bancário cadastrado</p>
              )}
              <div className="pt-2 border-t">
                <p className="text-sm text-gray-600">Saque mínimo</p>
                <p className="font-medium">{formatCurrency(account.minWithdrawalAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Saque automático</p>
                <p className="font-medium">
                  {account.autoWithdrawal 
                    ? `Sim, dia ${account.autoWithdrawalDay}` 
                    : 'Não'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Ajuste */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">
              {adjustType === 'credit' ? 'Adicionar Crédito' : 'Realizar Débito'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Transação
                </label>
                <select
                  value={adjustTransactionType}
                  onChange={(e) => setAdjustTransactionType(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {adjustType === 'credit' ? (
                    <>
                      <option value="ADJUSTMENT_CREDIT">Ajuste de Crédito</option>
                      <option value="MIGRATION">Migração de Saldo Anterior</option>
                      <option value="BONUS">Bônus</option>
                    </>
                  ) : (
                    <>
                      <option value="ADJUSTMENT_DEBIT">Ajuste de Débito</option>
                      <option value="FEE">Taxa</option>
                      <option value="CHARGEBACK">Estorno/Chargeback</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição (visível para o vendedor)
                </label>
                <input
                  type="text"
                  value={adjustDescription}
                  onChange={(e) => setAdjustDescription(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder={adjustTransactionType === 'MIGRATION' 
                    ? 'Ex: Migração de saldo do sistema anterior'
                    : 'Ex: Bônus de indicação'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo interno (opcional)
                </label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  rows={2}
                  placeholder="Motivo interno para registro..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAdjustModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdjustment}
                disabled={isSubmitting}
                className={`flex-1 px-4 py-2 text-white rounded-lg ${
                  adjustType === 'credit' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {isSubmitting ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Status */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Alterar Status</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status da Conta
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="PENDING">Pendente</option>
                  <option value="ACTIVE">Ativa</option>
                  <option value="BLOCKED">Bloqueada</option>
                  <option value="SUSPENDED">Suspensa</option>
                  <option value="CLOSED">Encerrada</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status KYC
                </label>
                <select
                  value={newKycStatus}
                  onChange={(e) => setNewKycStatus(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="PENDING">Aguardando Documentos</option>
                  <option value="SUBMITTED">Documentos Enviados</option>
                  <option value="REVIEWING">Em Análise</option>
                  <option value="APPROVED">Aprovado</option>
                  <option value="REJECTED">Rejeitado</option>
                  <option value="NEEDS_UPDATE">Precisa Atualizar</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observação (opcional)
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  rows={2}
                  placeholder="Motivo da alteração..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
