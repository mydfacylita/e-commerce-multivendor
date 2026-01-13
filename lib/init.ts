import { startPaymentSync, startOrderCleanup } from '@/lib/payment-sync'

// Iniciar o verificador UNIFICADO de pagamentos quando o servidor iniciar
// NOTA: Substituiu payment-checker.ts e payment-sync-cron.ts
if (process.env.NODE_ENV !== 'test') {
  startPaymentSync()
  startOrderCleanup() // Cancela pedidos PENDING com mais de 7 dias
}

export {}
