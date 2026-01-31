'use client';

import { useState, useCallback } from 'react';
import { ConfirmType } from '@/components/ui/ConfirmModal';

interface ConfirmState {
  isOpen: boolean;
  type: ConfirmType;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
}

export function useConfirm() {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    type: 'danger',
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    onConfirm: () => {}
  });
  const [loading, setLoading] = useState(false);

  const showConfirm = useCallback((options: {
    type?: ConfirmType;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void | Promise<void>;
  }) => {
    setConfirmState({
      isOpen: true,
      type: options.type || 'danger',
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || 'Confirmar',
      cancelText: options.cancelText || 'Cancelar',
      onConfirm: async () => {
        setLoading(true);
        try {
          await options.onConfirm();
        } finally {
          setLoading(false);
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  }, []);

  const hideConfirm = useCallback(() => {
    if (!loading) {
      setConfirmState(prev => ({ ...prev, isOpen: false }));
    }
  }, [loading]);

  // Helper para deleção
  const confirmDelete = useCallback((message: string, onConfirm: () => void | Promise<void>) => {
    showConfirm({
      type: 'danger',
      title: 'Confirmar Exclusão',
      message,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      onConfirm
    });
  }, [showConfirm]);

  // Helper para ação genérica
  const confirmAction = useCallback((title: string, message: string, onConfirm: () => void | Promise<void>) => {
    showConfirm({
      type: 'warning',
      title,
      message,
      onConfirm
    });
  }, [showConfirm]);

  return {
    confirmState,
    loading,
    showConfirm,
    hideConfirm,
    confirmDelete,
    confirmAction
  };
}
