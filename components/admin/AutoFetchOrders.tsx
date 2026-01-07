'use client'

import { useEffect, useState } from 'react'
import { FiRefreshCw } from 'react-icons/fi'

export default function AutoFetchOrders() {
  const [isChecking, setIsChecking] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [newOrders, setNewOrders] = useState(0)

  useEffect(() => {
    // Verificar imediatamente ao carregar
    checkNewOrders()

    // Configurar polling a cada 30 segundos
    const interval = setInterval(() => {
      checkNewOrders()
    }, 30000) // 30 segundos

    return () => clearInterval(interval)
  }, [])

  const checkNewOrders = async () => {
    if (isChecking) return

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
          
          // Recarregar após 2 segundos para mostrar novos pedidos
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        }
      }
    } catch (error) {
      console.error('Erro ao verificar pedidos:', error)
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200">
      <div className="flex items-center gap-3">
        <div className={`${isChecking ? 'animate-spin' : ''}`}>
          <FiRefreshCw className="text-blue-600" size={20} />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700">
            Verificação Automática
          </p>
          {lastCheck && (
            <p className="text-xs text-gray-500">
              Última: {lastCheck.toLocaleTimeString('pt-BR')}
            </p>
          )}
        </div>
        {newOrders > 0 && (
          <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
            {newOrders}
          </div>
        )}
      </div>
    </div>
  )
}
