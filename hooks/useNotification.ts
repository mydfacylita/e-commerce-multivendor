'use client';

import { useState, useCallback } from 'react';
import { NotificationType } from '@/components/ui/NotificationModal';

interface NotificationState {
  isOpen: boolean;
  type: NotificationType;
  title: string;
  message: string;
  details?: string;
}

export function useNotification() {
  const [notification, setNotification] = useState<NotificationState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    details: undefined
  });

  const showNotification = useCallback((
    type: NotificationType,
    title: string,
    message: string,
    details?: string
  ) => {
    setNotification({
      isOpen: true,
      type,
      title,
      message,
      details
    });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Helpers rápidos
  const success = useCallback((title: string, message: string, details?: string) => {
    showNotification('success', title, message, details);
  }, [showNotification]);

  const error = useCallback((title: string, message: string, details?: string) => {
    showNotification('error', title, message, details);
  }, [showNotification]);

  const warning = useCallback((title: string, message: string, details?: string) => {
    showNotification('warning', title, message, details);
  }, [showNotification]);

  const info = useCallback((title: string, message: string, details?: string) => {
    showNotification('info', title, message, details);
  }, [showNotification]);

  return {
    notification,
    showNotification,
    hideNotification,
    success,
    error,
    warning,
    info
  };
}
