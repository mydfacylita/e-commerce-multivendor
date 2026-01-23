import { startPaymentSync, startOrderCleanup, startRefundSync } from '@/lib/payment-sync'
import { startConsistencyCron } from '@/lib/order-consistency-cron'

// Iniciar o verificador UNIFICADO de pagamentos quando o servidor iniciar
// NOTA: Substituiu payment-checker.ts e payment-sync-cron.ts
if (process.env.NODE_ENV !== 'test') {
  startPaymentSync()
  startOrderCleanup() // Cancela pedidos PENDING com mais de 7 dias
  startRefundSync() // Processa reembolsos pendentes a cada 2 minutos
  startConsistencyCron() // Verifica e corrige inconsistências a cada 10 minutos
}

export {}
