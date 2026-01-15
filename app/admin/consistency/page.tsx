'use client'

import { useState } from 'react'
import { FiCheckCircle, FiAlertTriangle, FiRefreshCw, FiActivity } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface ConsistencyIssue {
  orderId: string
  issue: string
  fixed: boolean
  error?: string
}

interface CheckResult {
  timestamp: string
  totalChecked: number
  issuesFound: number
  issuesFixed: number
  issues: ConsistencyIssue[]
}

export default function ConsistencyCheckPage() {
  const [checking, setChecking] = useState(false)
  const [lastCheck, setLastCheck] = useState<CheckResult | null>(null)

  const runCheck = async () => {
    setChecking(true)
    try {
      const response = await fetch('/api/admin/consistency/check', {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        setLastCheck(data.result)
        
        if (data.result.issuesFound === 0) {
          toast.success('✅ Nenhuma inconsistência encontrada!')
        } else if (data.result.issuesFixed === data.result.issuesFound) {
          toast.success(`✅ ${data.result.issuesFixed} problemas corrigidos!`)
        } else {
          toast.error(`⚠️ ${data.result.issuesFound} problemas encontrados, ${data.result.issuesFixed} corrigidos`)
        }
      } else {
        toast.error('Erro ao verificar consistência')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao executar verificação')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FiActivity className="text-primary-600" />
          Verificação de Consistência
        </h1>
        <p className="text-gray-600 mt-2">
          Sistema automático que verifica e corrige inconsistências nos pedidos a cada 10 minutos
        </p>
      </div>

      {/* Card de Ação */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Verificação Manual
            </h2>
            <p className="text-gray-600 mb-4">
              Execute uma verificação imediata para detectar e corrigir problemas
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 mb-2">O que é verificado:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Pedidos com pagamento e antifraude aprovados mas não processando</li>
                <li>• Balance de vendedores não incrementado</li>
                <li>• Pedidos abandonados (48h sem pagamento)</li>
                <li>• Pedidos com score alto mas sem fraudStatus</li>
                <li>• ⚠️ Pedidos em PROCESSING sem pagamento aprovado</li>
                <li>• ⚠️ Pedidos sem cliente válido (órfãos)</li>
                <li>• ⚠️ Pedidos sem frete calculado</li>
                <li>• ⚠️ Pedidos dropshipping sem vendedor</li>
                <li>• ⚠️ Pedidos sem produtos (vazios)</li>
                <li>• ℹ️ Auditoria de pagamentos órfãos</li>
              </ul>
            </div>
          </div>
          <button
            onClick={runCheck}
            disabled={checking}
            className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 ${
              checking
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            <FiRefreshCw className={checking ? 'animate-spin' : ''} />
            {checking ? 'Verificando...' : 'Executar Verificação'}
          </button>
        </div>
      </div>

      {/* Info sobre Cron Automático */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <FiCheckCircle className="text-green-600 text-xl mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-green-900 mb-1">
              ✅ Verificação Automática Ativa
            </h3>
            <p className="text-green-700 text-sm">
              O sistema está verificando e corrigindo inconsistências automaticamente a cada{' '}
              <strong>10 minutos</strong>. Você só precisa usar a verificação manual em casos
              específicos.
            </p>
          </div>
        </div>
      </div>

      {/* Resultado da Última Verificação */}
      {lastCheck && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Resultado da Última Verificação
          </h2>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 mb-1">Total Verificado</p>
              <p className="text-2xl font-bold text-blue-900">{lastCheck.totalChecked}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm text-orange-600 mb-1">Problemas Encontrados</p>
              <p className="text-2xl font-bold text-orange-900">{lastCheck.issuesFound}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600 mb-1">Corrigidos</p>
              <p className="text-2xl font-bold text-green-900">{lastCheck.issuesFixed}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Horário</p>
              <p className="text-sm font-semibold text-gray-900">
                {new Date(lastCheck.timestamp).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Lista de Problemas */}
          {lastCheck.issues.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Detalhes dos Problemas</h3>
              <div className="space-y-2">
                {lastCheck.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border ${
                      issue.fixed
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {issue.fixed ? (
                            <FiCheckCircle className="text-green-600" />
                          ) : (
                            <FiAlertTriangle className="text-red-600" />
                          )}
                          <span className="font-mono text-sm text-gray-600">
                            {issue.orderId.slice(-8).toUpperCase()}
                          </span>
                        </div>
                        <p
                          className={`text-sm ${
                            issue.fixed ? 'text-green-800' : 'text-red-800'
                          }`}
                        >
                          {issue.issue}
                        </p>
                        {issue.error && (
                          <p className="text-xs text-red-600 mt-1">Erro: {issue.error}</p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          issue.fixed
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {issue.fixed ? 'CORRIGIDO' : 'FALHOU'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lastCheck.issues.length === 0 && (
            <div className="text-center py-8">
              <FiCheckCircle className="text-green-500 text-5xl mx-auto mb-3" />
              <p className="text-lg font-semibold text-gray-900">
                Nenhuma inconsistência encontrada!
              </p>
              <p className="text-gray-600 mt-1">Todos os pedidos estão em estado consistente</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
