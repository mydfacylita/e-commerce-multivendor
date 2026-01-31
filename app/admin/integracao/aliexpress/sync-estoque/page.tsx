'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { 
  FiArrowLeft, 
  FiRefreshCw, 
  FiPlay, 
  FiCheck, 
  FiX, 
  FiAlertTriangle,
  FiClock,
  FiPackage,
  FiTrendingDown,
  FiTrendingUp,
  FiDollarSign,
  FiPause,
  FiZap
} from 'react-icons/fi'
import toast from 'react-hot-toast'

// Intervalo de sincronização automática (1 hora em ms)
const AUTO_SYNC_INTERVAL = 60 * 60 * 1000 // 1 hora
const CHECK_INTERVAL = 60 * 1000 // Verifica a cada 1 minuto

interface SyncLog {
  id: string
  type: string
  totalItems: number
  synced: number
  errors: number
  details: {
    outOfStock?: number
    discontinued?: number
    priceChanges?: number
    results?: any[]
  }
  duration: number
  createdAt: string
}

interface ProductSyncStatus {
  id: string
  name: string
  supplierSku: string
  supplierStock: number
  stock: number
  lastSyncAt: string | null
  active: boolean
  costPrice: number
  price: number
}

export default function SyncEstoquePage() {
  const [mounted, setMounted] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [products, setProducts] = useState<ProductSyncStatus[]>([])
  const [stats, setStats] = useState({
    total: 0,
    synced: 0,
    pendingSync: 0,
    outOfStock: 0
  })
  
  // Auto-sync states
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [nextSyncTime, setNextSyncTime] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState<string>('')
  const autoSyncRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  // Carregar configuração de auto-sync do localStorage
  useEffect(() => {
    setMounted(true)
    const savedAutoSync = localStorage.getItem('aliexpress_auto_sync')
    if (savedAutoSync !== null) {
      setAutoSyncEnabled(savedAutoSync === 'true')
    }
    const savedLastSync = localStorage.getItem('aliexpress_last_sync')
    if (savedLastSync) {
      setLastSyncTime(new Date(savedLastSync))
    }
    loadData()
  }, [])

  // Calcular próxima sincronização
  useEffect(() => {
    if (lastSyncTime) {
      const next = new Date(lastSyncTime.getTime() + AUTO_SYNC_INTERVAL)
      setNextSyncTime(next)
    }
  }, [lastSyncTime])

  // Atualizar countdown a cada segundo
  useEffect(() => {
    if (!autoSyncEnabled || !nextSyncTime) {
      setCountdown('')
      return
    }

    const updateCountdown = () => {
      const now = new Date()
      const diff = nextSyncTime.getTime() - now.getTime()
      
      if (diff <= 0) {
        setCountdown('Sincronizando...')
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      
      if (minutes > 60) {
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        setCountdown(`${hours}h ${mins}min`)
      } else {
        setCountdown(`${minutes}min ${seconds}s`)
      }
    }

    updateCountdown()
    countdownRef.current = setInterval(updateCountdown, 1000)
    
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [autoSyncEnabled, nextSyncTime])

  // Auto-sync checker
  const checkAndSync = useCallback(async () => {
    if (!autoSyncEnabled || syncing) return

    const now = new Date()
    const lastSync = localStorage.getItem('aliexpress_last_sync')
    
    if (!lastSync) {
      // Nunca sincronizou, sincronizar agora
      console.log('[Auto-Sync] Primeira sincronização...')
      await handleSync(true)
      return
    }

    const lastSyncDate = new Date(lastSync)
    const timeSinceLastSync = now.getTime() - lastSyncDate.getTime()

    if (timeSinceLastSync >= AUTO_SYNC_INTERVAL) {
      console.log('[Auto-Sync] Intervalo atingido, sincronizando...')
      await handleSync(true)
    }
  }, [autoSyncEnabled, syncing])

  // Configurar auto-sync checker
  useEffect(() => {
    if (!mounted) return

    if (autoSyncEnabled) {
      // Verificar imediatamente
      checkAndSync()
      
      // Configurar verificação periódica
      autoSyncRef.current = setInterval(checkAndSync, CHECK_INTERVAL)
      console.log('[Auto-Sync] ✅ Ativado - verificando a cada 1 minuto')
    } else {
      console.log('[Auto-Sync] ⏸️ Desativado')
    }

    return () => {
      if (autoSyncRef.current) {
        clearInterval(autoSyncRef.current)
      }
    }
  }, [mounted, autoSyncEnabled, checkAndSync])

  // Toggle auto-sync
  const toggleAutoSync = () => {
    const newValue = !autoSyncEnabled
    setAutoSyncEnabled(newValue)
    localStorage.setItem('aliexpress_auto_sync', String(newValue))
    
    if (newValue) {
      toast.success('Sincronização automática ativada (a cada 1 hora)')
    } else {
      toast.success('Sincronização automática desativada')
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadLogs(),
        loadProducts()
      ])
    } finally {
      setLoading(false)
    }
  }

  const loadLogs = async () => {
    try {
      const response = await fetch('/api/admin/sync-logs?type=ALIEXPRESS_STOCK&limit=10')
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error)
    }
  }

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/admin/products/aliexpress-status')
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
        setStats(data.stats || stats)
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    }
  }

  const handleSync = async (isAuto = false) => {
    if (syncing) return

    setSyncing(true)
    const toastId = isAuto ? 'auto-sync' : 'sync'
    toast.loading(isAuto ? '🔄 Sincronização automática...' : 'Sincronizando estoque...', { id: toastId })

    try {
      const response = await fetch('/api/cron/sync-aliexpress-stock')
      const data = await response.json()

      if (data.success) {
        const now = new Date()
        setLastSyncTime(now)
        localStorage.setItem('aliexpress_last_sync', now.toISOString())
        
        toast.success(
          `${isAuto ? '🤖 Auto-sync: ' : ''}${data.summary.synced} produtos atualizados`,
          { id: toastId }
        )
        await loadData()
      } else {
        toast.error(data.error || 'Erro na sincronização', { id: toastId })
      }
    } catch (error: any) {
      toast.error('Erro ao sincronizar: ' + error.message, { id: toastId })
    } finally {
      setSyncing(false)
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}min ${Math.floor((ms % 60000) / 1000)}s`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR')
  }

  const getTimeSince = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca sincronizado'
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} dias atrás`
    if (hours > 0) return `${hours} horas atrás`
    return 'Agora'
  }

  if (!mounted) return null

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/integracao/aliexpress"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <FiArrowLeft />
          Voltar para Integração AliExpress
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Sincronização de Estoque
            </h1>
            <p className="text-gray-600 mt-1">
              Monitore e sincronize o estoque dos produtos importados do AliExpress
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Auto-sync toggle */}
            <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-4 py-2">
              <button
                onClick={toggleAutoSync}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoSyncEnabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoSyncEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <div className="text-sm">
                <div className="font-medium text-gray-900 flex items-center gap-1">
                  {autoSyncEnabled ? (
                    <>
                      <FiZap className="text-green-500" />
                      Auto-sync ON
                    </>
                  ) : (
                    <>
                      <FiPause className="text-gray-400" />
                      Auto-sync OFF
                    </>
                  )}
                </div>
                {autoSyncEnabled && countdown && (
                  <div className="text-xs text-gray-500">
                    Próxima: {countdown}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => handleSync(false)}
              disabled={syncing}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${
                syncing 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <FiRefreshCw className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {/* Auto-sync Status Card */}
        <div className={`rounded-lg shadow p-4 ${autoSyncEnabled ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gray-500'}`}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg">
              {syncing ? (
                <FiRefreshCw className="text-white text-xl animate-spin" />
              ) : autoSyncEnabled ? (
                <FiZap className="text-white text-xl" />
              ) : (
                <FiPause className="text-white text-xl" />
              )}
            </div>
            <div className="text-white">
              <p className="text-sm opacity-90">Auto-Sync</p>
              <p className="text-lg font-bold">
                {syncing ? 'Sincronizando' : autoSyncEnabled ? 'Ativo' : 'Pausado'}
              </p>
              {autoSyncEnabled && countdown && !syncing && (
                <p className="text-xs opacity-75">Próx: {countdown}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FiPackage className="text-blue-600 text-xl" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Importados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <FiCheck className="text-green-600 text-xl" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Sincronizados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.synced}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <FiClock className="text-yellow-600 text-xl" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingSync}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <FiAlertTriangle className="text-red-600 text-xl" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Sem Estoque</p>
              <p className="text-2xl font-bold text-gray-900">{stats.outOfStock}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Duas colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Histórico de Sincronizações */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-900">
              Histórico de Sincronizações
            </h2>
          </div>

          <div className="divide-y">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <FiRefreshCw className="animate-spin mx-auto text-2xl mb-2" />
                Carregando...
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nenhuma sincronização realizada ainda
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">
                      {formatDate(log.createdAt)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDuration(log.duration)}
                    </span>
                  </div>

                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <FiPackage className="text-gray-400" />
                      <span>{log.totalItems} verificados</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600">
                      <FiCheck />
                      <span>{log.synced} ok</span>
                    </div>
                    {log.details?.outOfStock ? (
                      <div className="flex items-center gap-1 text-yellow-600">
                        <FiTrendingDown />
                        <span>{log.details.outOfStock} sem estoque</span>
                      </div>
                    ) : null}
                    {log.details?.discontinued ? (
                      <div className="flex items-center gap-1 text-red-600">
                        <FiX />
                        <span>{log.details.discontinued} removidos</span>
                      </div>
                    ) : null}
                    {log.details?.priceChanges ? (
                      <div className="flex items-center gap-1 text-purple-600">
                        <FiDollarSign />
                        <span>{log.details.priceChanges} preços alterados</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Produtos para Sincronizar */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-900">
              Produtos Importados
            </h2>
          </div>

          <div className="divide-y max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <FiRefreshCw className="animate-spin mx-auto text-2xl mb-2" />
                Carregando...
              </div>
            ) : products.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FiPackage className="mx-auto text-4xl mb-2 text-gray-300" />
                <p>Nenhum produto importado do AliExpress</p>
                <Link
                  href="/admin/integracao/aliexpress/nichos"
                  className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                >
                  Importar produtos
                </Link>
              </div>
            ) : (
              products.map((product) => (
                <div key={product.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/admin/produtos/${product.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 truncate block"
                      >
                        {product.name}
                      </Link>
                      <p className="text-xs text-gray-500 mt-1">
                        SKU: {product.supplierSku}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {product.active ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                          Ativo
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                          Inativo
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                    <span className={`px-2 py-0.5 rounded ${
                      product.supplierStock === null 
                        ? 'bg-gray-100 text-gray-600' 
                        : product.supplierStock === 0 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                    }`}>
                      Estoque fornecedor: {product.supplierStock !== null ? product.supplierStock : 'Não sincronizado'}
                    </span>
                    <span>
                      Seu estoque: <strong>{product.stock}</strong>
                    </span>
                  </div>

                  <div className="mt-1 text-xs text-gray-400">
                    {getTimeSince(product.lastSyncAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-medium text-green-900 mb-2 flex items-center gap-2">
          <FiZap className="text-green-600" />
          Sincronização Automática
        </h3>
        <div className="text-sm text-green-800 space-y-2">
          <p>
            <strong>✅ Auto-sync ativado:</strong> O estoque é verificado automaticamente a cada <strong>1 hora</strong> enquanto esta página estiver aberta.
          </p>
          <div className="flex items-center gap-4 mt-3">
            <div className="bg-white rounded px-3 py-2 border border-green-200">
              <span className="text-xs text-gray-500">Última sincronização</span>
              <p className="font-medium">
                {lastSyncTime ? lastSyncTime.toLocaleString('pt-BR') : 'Nunca'}
              </p>
            </div>
            <div className="bg-white rounded px-3 py-2 border border-green-200">
              <span className="text-xs text-gray-500">Próxima sincronização</span>
              <p className="font-medium">
                {autoSyncEnabled && nextSyncTime ? nextSyncTime.toLocaleString('pt-BR') : 'Desativado'}
              </p>
            </div>
            <div className="bg-white rounded px-3 py-2 border border-green-200">
              <span className="text-xs text-gray-500">Status</span>
              <p className="font-medium flex items-center gap-1">
                {syncing ? (
                  <>
                    <FiRefreshCw className="animate-spin text-blue-500" />
                    Sincronizando...
                  </>
                ) : autoSyncEnabled ? (
                  <>
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Monitorando
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-gray-400 rounded-full" />
                    Pausado
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CRON Info (para servidor) */}
      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-700 mb-2">
          🖥️ Sincronização via Servidor (opcional)
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          Para sincronizar mesmo quando não estiver com a página aberta, configure um cron job:
        </p>
        <code className="block bg-gray-100 p-3 rounded text-sm font-mono text-gray-800">
          # Sincronizar a cada 1 hora
          <br />
          0 * * * * curl -H &quot;Authorization: Bearer $CRON_SECRET&quot; https://seu-site.com/api/cron/sync-aliexpress-stock
        </code>
      </div>
    </div>
  )
}
