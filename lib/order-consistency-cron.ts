/**
 * 🔍 Cron Job - Verificação Automática de Consistência
 * 
 * Roda automaticamente a cada X minutos para detectar e corrigir:
 * - Pedidos travados
 * - Pedidos abandonados
 * - Status inconsistentes
 */

import { checkAndFixConsistency } from './order-consistency-checker'

const CHECK_INTERVAL = 10 * 60 * 1000 // 10 minutos

let isRunning = false
let intervalId: NodeJS.Timeout | null = null

/**
 * Inicia o cron job
 */
export function startConsistencyCron() {
  if (intervalId) {
    console.log('[Consistency Cron] Cron já está rodando')
    return
  }

  console.log('[Consistency Cron] Iniciando verificação automática a cada 10 minutos...')

  // Executar imediatamente na inicialização
  runCheck()

  // Depois executar a cada 10 minutos
  intervalId = setInterval(() => {
    runCheck()
  }, CHECK_INTERVAL)
}

/**
 * Para o cron job
 */
export function stopConsistencyCron() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
    console.log('[Consistency Cron] Cron parado')
  }
}

/**
 * Executa a verificação (com lock para evitar sobreposição)
 */
async function runCheck() {
  if (isRunning) {
    console.log('[Consistency Cron] Verificação anterior ainda em execução, pulando...')
    return
  }

  isRunning = true

  try {
    const result = await checkAndFixConsistency()

    if (result.issuesFound > 0) {
      console.log(`[Consistency Cron] ⚠️ Encontrados ${result.issuesFound} problemas, ${result.issuesFixed} corrigidos`)
    } else {
      console.log('[Consistency Cron] ✅ Nenhuma inconsistência encontrada')
    }
  } catch (error) {
    console.error('[Consistency Cron] ❌ Erro na verificação:', error)
  } finally {
    isRunning = false
  }
}

/**
 * Status do cron
 */
export function getConsistencyCronStatus() {
  return {
    running: intervalId !== null,
    checking: isRunning,
    intervalMinutes: CHECK_INTERVAL / 60000
  }
}
