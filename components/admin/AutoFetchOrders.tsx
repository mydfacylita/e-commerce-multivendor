'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { FiRefreshCw } from 'react-icons/fi'

export default function AutoFetchOrders() {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [newOrders, setNewOrders] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isCheckingRef = useRef(false)

  const checkNewOrders = useCallback(async () => {
    // Evitar múltiplas chamadas simultâneas
    if (isCheckingRef.current) return
    isCheckingRef.current = true
    setIsChecking(true)

    try {
      const response = await fetch('/api/admin/orders/auto-fetch', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setLastCheck(new Date())
        
        if (data.totalImported > 0) {
          setNewOrders(prev => prev + data.totalImported)
          
          // Tocar som de notificação
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBDGH0fPTgjMGHm7A7+OZSA0NVq3m76hVFApGn+DyvmwhBDGH0fPTgjMGHm7A7+OZSA0NVq3m76hVFApGn+DyvmwhBDGH0fPTgjMGHm7A7+OZSA0NVq3m76hVFApGn+DyvmwhBDGH0fPTgjMGHm7A7+OZSA0NVq3m76hVFApGn+DyvmwhBDGH0fPTgjMGHm7A7+OZSA0NVq3m76hVFApGn+DyvmwhBDGH0fPTgjMGHm7A7+OZSA0NVq3m76hVFApGn+DyvmwhBDGH0fPTgjMGHm7A7+OZSA0NVq3m76hVFApGn+DyvmwhBDGH0fPTgjMGHm7A7+OZSA0NVq3m76hVFApGn+DyvmwhBDGH0fPTgjMGHm7A7+OZSA0NVq3m76hVFApGn+DyvmwhBDGH0fPTgjMGHm7A7+OZSA0NVq3m76hVFA==')
            audio.play().catch(() => {})
          } catch (e) {}
          
          // Atualizar dados sem reload completo
          router.refresh()
        }
      }
    } catch (error) {
      console.error('Erro ao verificar novos pedidos:', error)
    } finally {
      isCheckingRef.current = false
      setIsChecking(false)
    }
  }, [router])

  useEffect(() => {
    // Só rodar na página de pedidos admin
    if (!pathname?.includes('/admin/pedidos')) {
      return
    }

    // Verificar após 2 segundos do carregamento inicial
    const initialTimeout = setTimeout(() => {
      checkNewOrders()
    }, 2000)

    // Configurar polling a cada 30 segundos
    intervalRef.current = setInterval(() => {
      checkNewOrders()
    }, 30000)

    return () => {
      clearTimeout(initialTimeout)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [pathname, checkNewOrders])

  // Só mostrar na página de pedidos
  if (!pathname?.includes('/admin/pedidos')) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 border border-gray-200 z-50">
      <div className="flex items-center gap-3">
        <div className={`${isChecking ? 'animate-spin' : ''}`}>
          <FiRefreshCw className="text-blue-600" size={18} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-700">
            Verificação Automática
          </p>
          {lastCheck && (
            <p className="text-xs text-gray-500">
              Última: {lastCheck.toLocaleTimeString('pt-BR')}
            </p>
          )}
        </div>
        {newOrders > 0 && (
          <div className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
            {newOrders}
          </div>
        )}
      </div>
    </div>
  )
}
