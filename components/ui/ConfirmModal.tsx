'use client';

import { useEffect } from 'react';
import { FiAlertTriangle, FiTrash2, FiX, FiAlertCircle } from 'react-icons/fi';

export type ConfirmType = 'danger' | 'warning' | 'info';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type?: ConfirmType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

const typeConfig = {
  danger: {
    icon: FiTrash2,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconBgColor: 'bg-red-100',
    iconColor: 'text-red-600',
    titleColor: 'text-red-800',
    confirmButtonColor: 'bg-red-600 hover:bg-red-700'
  },
  warning: {
    icon: FiAlertTriangle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconBgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    titleColor: 'text-yellow-800',
    confirmButtonColor: 'bg-yellow-600 hover:bg-yellow-700'
  },
  info: {
    icon: FiAlertCircle,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconBgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-800',
    confirmButtonColor: 'bg-blue-600 hover:bg-blue-700'
  }
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  type = 'danger',
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  loading = false
}: ConfirmModalProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  // Fechar com ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-md mx-4 rounded-2xl shadow-2xl border-2 bg-white ${config.borderColor} overflow-hidden animate-in zoom-in-95 duration-200`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <FiX className="text-gray-500" size={20} />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-full ${config.iconBgColor}`}>
              <Icon className={config.iconColor} size={32} />
            </div>
          </div>

          {/* Title */}
          <h3 className={`text-xl font-bold text-center mb-2 ${config.titleColor}`}>
            {title}
          </h3>

          {/* Message */}
          <p className="text-gray-600 text-center mb-6">
            {message}
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 text-gray-700 font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 px-4 py-3 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 ${config.confirmButtonColor}`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processando...
                </span>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
