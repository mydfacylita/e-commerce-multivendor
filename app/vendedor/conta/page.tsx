'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FiArrowLeft, FiDollarSign, FiCreditCard, FiClock, FiCheckCircle, 
  FiAlertTriangle, FiTrendingUp, FiDownload, FiPlus, FiShield,
  FiSend, FiSearch
} from 'react-icons/fi';
import NotificationModal from '@/components/ui/NotificationModal';
import TransactionReceipt from '@/components/ui/TransactionReceipt';
import TransactionList from '@/components/ui/TransactionList';
import { useNotification } from '@/hooks/useNotification';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
}

interface AccountData {
  hasAccount: boolean;
  account?: {
    id: string;
    accountNumber: string;
    status: string;
    balance: number;
    blockedBalance: number;
    totalReceived: number;
    totalWithdrawn: number;
    kycStatus: string;
    pixKeyType: string | null;
    pixKey: string | null;
    bankName: string | null;
    autoWithdrawal: boolean;
    autoWithdrawalDay: number | null;
    minWithdrawalAmount: number;
    createdAt: string;
    transactions: Transaction[];
  };
  bankData?: {
    sellerType: 'PF' | 'PJ';
    cpf: string | null;
    cnpj: string | null;
    razaoSocial: string | null;
    nomeFantasia: string | null;
    nomeCompleto: string | null;
    banco: string | null;
    agencia: string | null;
    conta: string | null;
    tipoConta: string | null;
    chavePix: string | null;
  };
}

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: FiClock },
  ACTIVE: { label: 'Ativa', color: 'bg-green-100 text-green-800', icon: FiCheckCircle },
  BLOCKED: { label: 'Bloqueada', color: 'bg-red-100 text-red-800', icon: FiAlertTriangle },
  SUSPENDED: { label: 'Suspensa', color: 'bg-orange-100 text-orange-800', icon: FiAlertTriangle },
  CLOSED: { label: 'Encerrada', color: 'bg-gray-100 text-gray-600', icon: FiAlertTriangle }
};

const kycLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Aguardando documentos', color: 'text-gray-600' },
  SUBMITTED: { label: 'Documentos enviados', color: 'text-blue-600' },
  REVIEWING: { label: 'Em análise', color: 'text-yellow-600' },
  APPROVED: { label: 'Verificado', color: 'text-green-600' },
  REJECTED: { label: 'Rejeitado', color: 'text-red-600' },
  NEEDS_UPDATE: { label: 'Precisa atualizar', color: 'text-orange-600' }
};

// Removido: transactionLabels - agora usa o componente TransactionList

export default function SellerContaPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { notification, success, error, hideNotification } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  // Transfer state
  const [transferData, setTransferData] = useState({
    accountNumber: '',
    amount: '',
    description: ''
  });
  const [destinationAccount, setDestinationAccount] = useState<any>(null);
  const [searchingAccount, setSearchingAccount] = useState(false);
  const [transferring, setTransferring] = useState(false);
  
  // Receipt state
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  
  // Withdrawal state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'pix' | 'bank'>('pix');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (sessionStatus === 'authenticated') {
      if (session?.user?.role !== 'SELLER') {
        router.push('/');
        return;
      }
      fetchAccount();
    }
  }, [sessionStatus, session]);

  const fetchAccount = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/seller/account');
      if (response.ok) {
        const data = await response.json();
        setAccountData(data);
      }
    } catch (error) {
      console.error('Erro ao buscar conta:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/seller/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (response.ok) {
        fetchAccount();
        success('Conta Criada!', 'Sua conta digital foi ativada com sucesso.');
      } else {
        const data = await response.json();
        error('Erro', data.error || 'Não foi possível criar a conta.');
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleSearchAccount = async () => {
    if (!transferData.accountNumber || transferData.accountNumber.length < 10) {
      error('Conta Inválida', 'Digite um número de conta válido com pelo menos 10 caracteres.');
      return;
    }
    
    setSearchingAccount(true);
    setDestinationAccount(null);
    
    try {
      const response = await fetch(`/api/seller/account/transfer?account=${transferData.accountNumber}`);
      const data = await response.json();
      
      if (response.ok) {
        setDestinationAccount(data.account);
      } else {
        error('Não Encontrada', data.error || 'Conta não encontrada. Verifique o número.');
      }
    } catch (err) {
      error('Erro', 'Não foi possível buscar a conta. Tente novamente.');
    } finally {
      setSearchingAccount(false);
    }
  };

  const [showConfirmTransfer, setShowConfirmTransfer] = useState(false);
  
  const handleTransfer = async () => {
    if (!destinationAccount) {
      error('Conta Não Selecionada', 'Busque uma conta de destino primeiro.');
      return;
    }
    
    const amount = parseFloat(transferData.amount);
    if (!amount || amount <= 0) {
      error('Valor Inválido', 'Digite um valor válido para transferência.');
      return;
    }
    
    if (amount > (accountData?.account?.balance || 0)) {
      error('Saldo Insuficiente', 'Você não possui saldo suficiente para esta transferência.');
      return;
    }
    
    // Mostrar modal de confirmação
    setShowConfirmTransfer(true);
  };
  
  const executeTransfer = async () => {
    setShowConfirmTransfer(false);
    const amount = parseFloat(transferData.amount);
    
    setTransferring(true);
    
    try {
      const response = await fetch('/api/seller/account/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationAccountNumber: transferData.accountNumber,
          amount,
          description: transferData.description
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Preparar dados do comprovante
        setReceiptData({
          type: 'transfer',
          transactionId: data.transfer.transactionId || data.transfer.id,
          date: new Date().toISOString(),
          amount: amount,
          status: 'success',
          fromAccount: accountData?.account?.accountNumber,
          fromName: session?.user?.name || 'Minha Conta',
          toAccount: transferData.accountNumber,
          toName: destinationAccount?.storeName,
          description: transferData.description || 'Transferência entre contas',
          newBalance: data.transfer.newBalance
        });
        
        setShowTransferModal(false);
        setTransferData({ accountNumber: '', amount: '', description: '' });
        setDestinationAccount(null);
        fetchAccount();
        
        // Mostrar comprovante
        setShowReceipt(true);
      } else {
        error('Erro na Transferência', data.error || 'Não foi possível realizar a transferência.');
      }
    } catch (err) {
      error('Erro', 'Ocorreu um erro ao realizar a transferência. Tente novamente.');
    } finally {
      setTransferring(false);
    }
  };

  // Função de saque
  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    const bankData = accountData?.bankData;
    
    if (!amount || amount <= 0) {
      error('Valor Inválido', 'Digite um valor válido para saque.');
      return;
    }
    
    const minAmount = accountData?.account?.minWithdrawalAmount || 50;
    if (amount < minAmount) {
      error('Valor Mínimo', `O valor mínimo para saque é ${formatCurrency(minAmount)}.`);
      return;
    }
    
    if (amount > (accountData?.account?.balance || 0)) {
      error('Saldo Insuficiente', 'Você não possui saldo suficiente para este saque.');
      return;
    }
    
    // Validar se tem dados bancários cadastrados
    if (withdrawMethod === 'pix' && !bankData?.chavePix) {
      error('Chave PIX', 'Você não possui chave PIX cadastrada. Abra um chamado para atualizar seus dados bancários.');
      return;
    }
    
    if (withdrawMethod === 'bank' && (!bankData?.banco || !bankData?.agencia || !bankData?.conta)) {
      error('Conta Bancária', 'Você não possui conta bancária cadastrada. Abra um chamado para atualizar seus dados bancários.');
      return;
    }
    
    setWithdrawing(true);
    
    try {
      const body: any = {
        amount,
        paymentMethod: withdrawMethod === 'pix' ? 'PIX' : 'TED'
      };
      
      if (withdrawMethod === 'pix') {
        body.pixKey = bankData?.chavePix;
        body.pixKeyType = bankData?.sellerType === 'PJ' ? 'CNPJ' : 'CPF';
      } else {
        body.bankName = bankData?.banco;
        body.agencia = bankData?.agencia;
        body.conta = bankData?.conta;
        body.contaTipo = bankData?.tipoConta || 'CORRENTE';
      }
      
      const response = await fetch('/api/vendedor/saques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Preparar dados do comprovante
        setReceiptData({
          type: 'withdrawal',
          transactionId: data.withdrawal?.id || 'WD-' + Date.now(),
          date: new Date().toISOString(),
          amount: amount,
          status: 'pending',
          pixKey: withdrawMethod === 'pix' ? bankData?.chavePix : undefined,
          pixKeyType: withdrawMethod === 'pix' ? (bankData?.sellerType === 'PJ' ? 'CNPJ' : 'CPF') : undefined,
          bankName: withdrawMethod === 'bank' ? bankData?.banco : undefined,
          estimatedDate: 'Em até 3 dias úteis',
          newBalance: (accountData?.account?.balance || 0) - amount
        });
        
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        fetchAccount();
        
        // Mostrar comprovante
        setShowReceipt(true);
      } else {
        error('Erro no Saque', data.error || 'Não foi possível processar o saque.');
      }
    } catch (err) {
      error('Erro', 'Ocorreu um erro ao solicitar o saque. Tente novamente.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (sessionStatus === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando sua conta...</p>
        </div>
      </div>
    );
  }

  // Se não tem conta, mostrar tela de criação
  if (!accountData?.hasAccount) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCreditCard className="text-primary-600" size={40} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Sua Conta Digital MYDSHOP
            </h1>
            <p className="text-gray-600 mb-8">
              Ative sua conta digital para receber os pagamentos das suas vendas
              de forma rápida e segura.
            </p>
            
            <div className="grid md:grid-cols-3 gap-4 mb-8 text-left">
              <div className="bg-gray-50 rounded-lg p-4">
                <FiDollarSign className="text-green-600 mb-2" size={24} />
                <h3 className="font-medium">Receba suas vendas</h3>
                <p className="text-sm text-gray-600">
                  O valor das vendas é creditado automaticamente
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <FiTrendingUp className="text-blue-600 mb-2" size={24} />
                <h3 className="font-medium">Acompanhe em tempo real</h3>
                <p className="text-sm text-gray-600">
                  Veja seu saldo e transações a qualquer momento
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <FiDownload className="text-purple-600 mb-2" size={24} />
                <h3 className="font-medium">Saque fácil</h3>
                <p className="text-sm text-gray-600">
                  Transfira para sua conta bancária via PIX
                </p>
              </div>
            </div>

            <button
              onClick={handleCreateAccount}
              className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold transition-colors"
            >
              Ativar Minha Conta Digital
            </button>
          </div>
        </div>
      </div>
    );
  }

  const account = accountData.account!;
  const StatusIcon = statusLabels[account.status]?.icon || FiClock;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/vendedor/dashboard"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FiArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Minha Conta Digital</h1>
            <p className="text-gray-600 font-mono">{account.accountNumber}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTransferModal(true)}
            className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center gap-2"
          >
            <FiSend size={18} />
            Transferir
          </button>
          <button
            onClick={() => {
              setWithdrawMethod('pix');
              setShowWithdrawModal(true);
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <FiDownload size={18} />
            Solicitar Saque
          </button>
        </div>
      </div>

      {/* Status da Conta */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Status</span>
            <StatusIcon className={statusLabels[account.status]?.color.replace('bg-', 'text-').replace('-100', '-600')} size={18} />
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusLabels[account.status]?.color}`}>
            {statusLabels[account.status]?.label}
          </span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Verificação</span>
            <FiShield className={kycLabels[account.kycStatus]?.color} size={18} />
          </div>
          <span className={`text-sm font-medium ${kycLabels[account.kycStatus]?.color}`}>
            {kycLabels[account.kycStatus]?.label}
          </span>
        </div>

        <div className="col-span-2 bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <span className="text-green-100 text-sm">Saldo Disponível</span>
          <p className="text-3xl font-bold">{formatCurrency(account.balance)}</p>
          {account.blockedBalance > 0 && (
            <p className="text-green-200 text-sm mt-1">
              + {formatCurrency(account.blockedBalance)} em liberação
            </p>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-2">
            <FiTrendingUp className="text-green-600" size={24} />
            <span className="text-gray-600">Total Recebido</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(account.totalReceived)}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-2">
            <FiDownload className="text-blue-600" size={24} />
            <span className="text-gray-600">Total Sacado</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(account.totalWithdrawn)}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-2">
            <FiCreditCard className="text-purple-600" size={24} />
            <span className="text-gray-600">Saque Mínimo</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(account.minWithdrawalAmount)}
          </p>
        </div>
      </div>

      {/* Transações Recentes */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Transações Recentes</h2>
          <Link
            href="/vendedor/financeiro"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Ver todas
          </Link>
        </div>

        <TransactionList transactions={account.transactions} />
      </div>

      {/* Modal de Transferência */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <FiSend className="text-blue-600" />
              Transferir para Vendedor
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Transfira recursos para outro vendedor da plataforma
            </p>
            
            <div className="space-y-4">
              {/* Buscar conta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número da Conta de Destino
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={transferData.accountNumber}
                    onChange={(e) => {
                      setTransferData({ ...transferData, accountNumber: e.target.value.toUpperCase() });
                      setDestinationAccount(null);
                    }}
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: MYD1234567890"
                  />
                  <button
                    onClick={handleSearchAccount}
                    disabled={searchingAccount}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {searchingAccount ? '...' : <FiSearch size={18} />}
                  </button>
                </div>
              </div>

              {/* Conta encontrada */}
              {destinationAccount && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <span className="font-medium">Conta encontrada:</span>
                  </p>
                  <p className="font-semibold text-green-900">{destinationAccount.storeName}</p>
                  <p className="text-sm text-green-700">{destinationAccount.ownerName}</p>
                </div>
              )}

              {/* Valor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor da Transferência
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="number"
                    value={transferData.amount}
                    onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0,00"
                    step="0.01"
                    min="0"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Saldo disponível: {formatCurrency(accountData?.account?.balance || 0)}
                </p>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  value={transferData.description}
                  onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Pagamento de comissão"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferData({ accountNumber: '', amount: '', description: '' });
                  setDestinationAccount(null);
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleTransfer}
                disabled={transferring || !destinationAccount || !transferData.amount}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {transferring ? 'Transferindo...' : 'Confirmar Transferência'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Transferência */}
      {showConfirmTransfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiSend className="text-blue-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Confirmar Transferência</h3>
              <p className="text-gray-600">
                Você está transferindo
              </p>
              <p className="text-3xl font-bold text-blue-600 my-2">
                {formatCurrency(parseFloat(transferData.amount) || 0)}
              </p>
              <p className="text-gray-600">
                para <span className="font-semibold">{destinationAccount?.storeName}</span>
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmTransfer(false)}
                className="flex-1 px-4 py-3 border rounded-xl hover:bg-gray-50 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={executeTransfer}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Saque */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Solicitar Saque</h3>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Valor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor do Saque
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="0,00"
                    step="0.01"
                    min={accountData?.account?.minWithdrawalAmount || 50}
                  />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-gray-500">
                    Mínimo: {formatCurrency(accountData?.account?.minWithdrawalAmount || 50)}
                  </span>
                  <span className="text-green-600 font-medium">
                    Disponível: {formatCurrency(accountData?.account?.balance || 0)}
                  </span>
                </div>
              </div>

              {/* Método de Recebimento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Receber via
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('pix')}
                    disabled={!accountData?.bankData?.chavePix}
                    className={`p-3 border-2 rounded-lg text-center transition-colors ${
                      withdrawMethod === 'pix'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${!accountData?.bankData?.chavePix ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-medium">PIX</div>
                    <div className="text-xs text-gray-500 mt-1">Instantâneo</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('bank')}
                    disabled={!accountData?.bankData?.banco}
                    className={`p-3 border-2 rounded-lg text-center transition-colors ${
                      withdrawMethod === 'bank'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${!accountData?.bankData?.banco ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-medium">TED</div>
                    <div className="text-xs text-gray-500 mt-1">Conta Bancária</div>
                  </button>
                </div>
              </div>

              {/* Dados de destino (somente leitura) */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Dados de Destino</span>
                  <span className="text-xs px-2 py-0.5 bg-gray-200 rounded text-gray-600">
                    {accountData?.bankData?.sellerType === 'PJ' ? 'PJ' : 'PF'}
                  </span>
                </div>
                
                {withdrawMethod === 'pix' ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Chave PIX:</span>
                      <span className="text-sm font-medium">
                        {accountData?.bankData?.chavePix || 'Não cadastrada'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Titular:</span>
                      <span className="text-sm font-medium">
                        {accountData?.bankData?.sellerType === 'PJ' 
                          ? accountData?.bankData?.razaoSocial || accountData?.bankData?.nomeFantasia
                          : accountData?.bankData?.nomeCompleto}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Banco:</span>
                      <span className="text-sm font-medium">{accountData?.bankData?.banco || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Agência:</span>
                      <span className="text-sm font-medium">{accountData?.bankData?.agencia || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Conta:</span>
                      <span className="text-sm font-medium">
                        {accountData?.bankData?.conta || '-'} 
                        {accountData?.bankData?.tipoConta && ` (${accountData.bankData.tipoConta})`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Titular:</span>
                      <span className="text-sm font-medium">
                        {accountData?.bankData?.sellerType === 'PJ' 
                          ? accountData?.bankData?.razaoSocial || accountData?.bankData?.nomeFantasia
                          : accountData?.bankData?.nomeCompleto}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawAmount('');
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawing || !withdrawAmount || 
                  (withdrawMethod === 'pix' && !accountData?.bankData?.chavePix) ||
                  (withdrawMethod === 'bank' && !accountData?.bankData?.banco)
                }
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {withdrawing ? 'Processando...' : 'Solicitar Saque'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Notificação */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={hideNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        details={notification.details}
      />

      {/* Comprovante de Transferência */}
      <TransactionReceipt
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        data={receiptData}
      />
    </div>
  );
}
