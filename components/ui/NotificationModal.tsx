'use client';

import { useEffect } from 'react';
import { FiCheckCircle, FiXCircle, FiAlertTriangle, FiInfo, FiX } from 'react-icons/fi';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: NotificationType;
  title: string;
  message: string;
  details?: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const typeConfig = {
  success: {
    icon: FiCheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-500',
    titleColor: 'text-green-800',
    buttonColor: 'bg-green-600 hover:bg-green-700'
  },
  error: {
    icon: FiXCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
    titleColor: 'text-red-800',
    buttonColor: 'bg-red-600 hover:bg-red-700'
  },
  warning: {
    icon: FiAlertTriangle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-500',
    titleColor: 'text-yellow-800',
    buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
  },
  info: {
    icon: FiInfo,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-800',
    buttonColor: 'bg-blue-600 hover:bg-blue-700'
  }
};

export default function NotificationModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  details,
  autoClose = false,
  autoCloseDelay = 3000
}: NotificationModalProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  // Fechar com ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-md mx-4 rounded-2xl shadow-2xl border-2 ${config.bgColor} ${config.borderColor} overflow-hidden animate-in zoom-in-95 duration-200`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/10 transition-colors"
        >
          <FiX className="text-gray-500" size={20} />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`p-3 rounded-full ${config.bgColor} border-4 ${config.borderColor}`}>
              <Icon className={config.iconColor} size={40} />
            </div>
          </div>

          {/* Title */}
          <h3 className={`text-xl font-bold text-center mb-2 ${config.titleColor}`}>
            {title}
          </h3>

          {/* Message */}
          <p className="text-gray-600 text-center mb-2">
            {message}
          </p>

          {/* Details */}
          {details && (
            <p className="text-sm text-gray-500 text-center bg-white/50 rounded-lg p-2 mt-2">
              {details}
            </p>
          )}

          {/* Button */}
          <button
            onClick={onClose}
            className={`w-full mt-6 px-6 py-3 text-white font-semibold rounded-xl transition-colors ${config.buttonColor}`}
          >
            OK
          </button>
        </div>

        {/* Progress bar for auto-close */}
        {autoClose && (
          <div className="h-1 bg-white/30">
            <div 
              className={`h-full ${config.buttonColor.split(' ')[0]} animate-shrink`}
              style={{ 
                animation: `shrink ${autoCloseDelay}ms linear forwards` 
              }}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
