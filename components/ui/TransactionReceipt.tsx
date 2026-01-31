'use client';

import { useRef } from 'react';
import { FiX, FiDownload, FiPrinter, FiCheckCircle, FiSend, FiClock } from 'react-icons/fi';
import html2canvas from 'html2canvas';

interface ReceiptData {
  type: 'transfer' | 'withdrawal';
  transactionId: string;
  date: string;
  amount: number;
  status: 'success' | 'pending';
  // Transfer fields
  fromAccount?: string;
  fromName?: string;
  toAccount?: string;
  toName?: string;
  description?: string;
  // Withdrawal fields
  pixKey?: string;
  pixKeyType?: string;
  bankName?: string;
  estimatedDate?: string;
  // Common
  newBalance?: number;
}

interface TransactionReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReceiptData | null;
}

export default function TransactionReceipt({ isOpen, onClose, data }: TransactionReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !data) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleDownload = async () => {
    if (!receiptRef.current) return;
    
    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true
      });
      
      const link = document.createElement('a');
      link.download = `comprovante-${data.type}-${data.transactionId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      // Fallback: print
      handlePrint();
    }
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comprovante - ${data.transactionId}</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 20px;
              background: white;
            }
            .receipt { max-width: 400px; margin: 0 auto; }
            .header { text-align: center; padding-bottom: 20px; border-bottom: 2px dashed #e5e7eb; }
            .logo { font-size: 24px; font-weight: bold; color: #7c3aed; }
            .title { margin-top: 10px; font-size: 18px; color: #374151; }
            .status { 
              display: inline-flex; align-items: center; gap: 8px;
              padding: 8px 16px; border-radius: 20px; margin-top: 15px;
            }
            .status.success { background: #dcfce7; color: #16a34a; }
            .status.pending { background: #fef3c7; color: #d97706; }
            .body { padding: 20px 0; }
            .amount-section { text-align: center; padding: 20px 0; background: #f9fafb; border-radius: 12px; margin-bottom: 20px; }
            .amount-label { color: #6b7280; font-size: 14px; }
            .amount { font-size: 32px; font-weight: bold; color: #111827; }
            .details { padding: 0; }
            .detail-row { 
              display: flex; justify-content: space-between; 
              padding: 12px 0; border-bottom: 1px solid #f3f4f6;
            }
            .detail-label { color: #6b7280; font-size: 14px; }
            .detail-value { color: #111827; font-weight: 500; text-align: right; max-width: 60%; }
            .footer { 
              text-align: center; padding-top: 20px; margin-top: 20px;
              border-top: 2px dashed #e5e7eb; color: #9ca3af; font-size: 12px;
            }
            @media print {
              body { padding: 0; }
              button { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const isTransfer = data.type === 'transfer';
  const isSuccess = data.status === 'success';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-auto">
        {/* Action Bar */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <FiDownload size={16} />
              Baixar
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <FiPrinter size={16} />
              Imprimir
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Receipt Content */}
        <div ref={receiptRef} className="p-6">
          {/* Header */}
          <div className="text-center pb-6 border-b-2 border-dashed border-gray-200">
            <div className="text-2xl font-bold text-purple-600">MYDSHOP</div>
            <div className="text-gray-600 mt-1">
              {isTransfer ? 'Comprovante de Transferência' : 'Comprovante de Saque'}
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mt-4 ${
              isSuccess ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {isSuccess ? <FiCheckCircle size={18} /> : <FiClock size={18} />}
              <span className="font-medium">
                {isSuccess ? 'Concluído' : 'Em Processamento'}
              </span>
            </div>
          </div>

          {/* Amount Section */}
          <div className="py-6">
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <div className="text-gray-500 text-sm mb-1">
                {isTransfer ? 'Valor Transferido' : 'Valor do Saque'}
              </div>
              <div className="text-4xl font-bold text-gray-900">
                {formatCurrency(data.amount)}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-0">
            {/* Transaction ID */}
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-500 text-sm">ID da Transação</span>
              <span className="font-mono text-sm text-gray-900">{data.transactionId}</span>
            </div>

            {/* Date */}
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-500 text-sm">Data e Hora</span>
              <span className="text-gray-900 text-sm">{formatDate(data.date)}</span>
            </div>

            {/* Transfer specific fields */}
            {isTransfer && (
              <>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">De</span>
                  <div className="text-right">
                    <div className="text-gray-900 font-medium text-sm">{data.fromName}</div>
                    <div className="text-gray-500 text-xs font-mono">{data.fromAccount}</div>
                  </div>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Para</span>
                  <div className="text-right">
                    <div className="text-gray-900 font-medium text-sm">{data.toName}</div>
                    <div className="text-gray-500 text-xs font-mono">{data.toAccount}</div>
                  </div>
                </div>
                {data.description && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-500 text-sm">Descrição</span>
                    <span className="text-gray-900 text-sm text-right max-w-[60%]">{data.description}</span>
                  </div>
                )}
              </>
            )}

            {/* Withdrawal specific fields */}
            {!isTransfer && (
              <>
                {data.pixKeyType && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-500 text-sm">Tipo de Chave PIX</span>
                    <span className="text-gray-900 text-sm">
                      {data.pixKeyType === 'CPF' ? 'CPF' : 
                       data.pixKeyType === 'CNPJ' ? 'CNPJ' :
                       data.pixKeyType === 'EMAIL' ? 'E-mail' :
                       data.pixKeyType === 'PHONE' ? 'Telefone' : 'Chave Aleatória'}
                    </span>
                  </div>
                )}
                {data.pixKey && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-500 text-sm">Chave PIX</span>
                    <span className="text-gray-900 text-sm font-mono">{data.pixKey}</span>
                  </div>
                )}
                {data.bankName && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-500 text-sm">Banco</span>
                    <span className="text-gray-900 text-sm">{data.bankName}</span>
                  </div>
                )}
                {data.estimatedDate && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-500 text-sm">Previsão de Depósito</span>
                    <span className="text-gray-900 text-sm">{data.estimatedDate}</span>
                  </div>
                )}
              </>
            )}

            {/* New Balance */}
            {data.newBalance !== undefined && (
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500 text-sm">Saldo Atual</span>
                <span className="text-gray-900 font-semibold">{formatCurrency(data.newBalance)}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center pt-6 mt-6 border-t-2 border-dashed border-gray-200">
            <p className="text-gray-400 text-xs">
              Este é um comprovante eletrônico de transação.
            </p>
            <p className="text-gray-400 text-xs mt-1">
              MYDSHOP - Plataforma de E-commerce
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
