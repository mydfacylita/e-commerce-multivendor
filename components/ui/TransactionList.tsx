'use client';

import { FiArrowUpRight, FiArrowDownLeft, FiRefreshCw, FiGift, FiDollarSign, FiSend, FiDownload, FiPercent, FiCreditCard } from 'react-icons/fi';

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  description: string;
  status: string;
  createdAt: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  showBalance?: boolean;
  emptyMessage?: string;
}

// Configuração de cada tipo de transação
const transactionConfig: Record<string, {
  label: string;
  icon: any;
  isDebit: boolean;
  bgColor: string;
  iconColor: string;
  textColor: string;
}> = {
  SALE: {
    label: 'Venda',
    icon: FiDollarSign,
    isDebit: false,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600',
    textColor: 'text-green-600'
  },
  WITHDRAWAL: {
    label: 'Saque',
    icon: FiDownload,
    isDebit: true,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    textColor: 'text-blue-600'
  },
  REFUND: {
    label: 'Reembolso',
    icon: FiRefreshCw,
    isDebit: true,
    bgColor: 'bg-orange-100',
    iconColor: 'text-orange-600',
    textColor: 'text-orange-600'
  },
  COMMISSION: {
    label: 'Comissão',
    icon: FiPercent,
    isDebit: true,
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600',
    textColor: 'text-purple-600'
  },
  BONUS: {
    label: 'Bônus',
    icon: FiGift,
    isDebit: false,
    bgColor: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    textColor: 'text-emerald-600'
  },
  ADJUSTMENT_CREDIT: {
    label: 'Crédito',
    icon: FiArrowDownLeft,
    isDebit: false,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600',
    textColor: 'text-green-600'
  },
  ADJUSTMENT_DEBIT: {
    label: 'Débito',
    icon: FiArrowUpRight,
    isDebit: true,
    bgColor: 'bg-red-100',
    iconColor: 'text-red-600',
    textColor: 'text-red-600'
  },
  CHARGEBACK: {
    label: 'Estorno',
    icon: FiRefreshCw,
    isDebit: true,
    bgColor: 'bg-red-100',
    iconColor: 'text-red-600',
    textColor: 'text-red-600'
  },
  FEE: {
    label: 'Taxa',
    icon: FiCreditCard,
    isDebit: true,
    bgColor: 'bg-gray-100',
    iconColor: 'text-gray-600',
    textColor: 'text-gray-600'
  },
  TRANSFER_IN: {
    label: 'Transferência Recebida',
    icon: FiArrowDownLeft,
    isDebit: false,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600',
    textColor: 'text-green-600'
  },
  TRANSFER_OUT: {
    label: 'Transferência Enviada',
    icon: FiSend,
    isDebit: true,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    textColor: 'text-blue-600'
  },
  MIGRATION: {
    label: 'Migração de Saldo',
    icon: FiRefreshCw,
    isDebit: false,
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600',
    textColor: 'text-purple-600'
  }
};

// Configuração padrão para tipos desconhecidos
const defaultConfig = {
  label: 'Transação',
  icon: FiDollarSign,
  isDebit: false,
  bgColor: 'bg-gray-100',
  iconColor: 'text-gray-600',
  textColor: 'text-gray-600'
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function TransactionList({ 
  transactions, 
  showBalance = false,
  emptyMessage = 'Nenhuma transação encontrada'
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="divide-y">
      {transactions.map((t) => {
        const config = transactionConfig[t.type] || defaultConfig;
        const Icon = config.icon;
        
        return (
          <div key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              {/* Ícone */}
              <div className={`p-2.5 rounded-xl ${config.bgColor}`}>
                <Icon className={config.iconColor} size={20} />
              </div>
              
              {/* Descrição e detalhes */}
              <div>
                <p className="font-medium text-gray-900">{t.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs font-medium ${config.textColor}`}>
                    {config.label}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-500">
                    {formatDate(t.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Valor e saldo */}
            <div className="text-right">
              <p className={`font-semibold ${config.isDebit ? 'text-red-600' : 'text-green-600'}`}>
                {config.isDebit ? '-' : '+'}{formatCurrency(Math.abs(t.amount))}
              </p>
              {showBalance && t.balanceAfter !== undefined && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Saldo: {formatCurrency(t.balanceAfter)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
