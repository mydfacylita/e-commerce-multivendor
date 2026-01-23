/**
 * INSTRUMENTATION - Next.js 14
 * 
 * Este arquivo é executado AUTOMATICAMENTE pelo Next.js
 * quando o servidor inicia. É o lugar correto para:
 * - Iniciar crons/jobs de background
 * - Configurar monitoramento
 * - Inicializar conexões
 * 
 * Documentação: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Só executar no lado do servidor (não no edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🚀 [INSTRUMENTATION] Iniciando sistemas de background...')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    // Importar dinamicamente para evitar problemas de build
    const { startPaymentSync, startOrderCleanup, startRefundSync } = await import('@/lib/payment-sync')
    const { startConsistencyCron } = await import('@/lib/order-consistency-cron')
    
    // Iniciar sistemas
    startPaymentSync()      // Verifica pagamentos pendentes a cada 30s
    startOrderCleanup()     // Cancela pedidos PENDING antigos a cada 1h
    startRefundSync()       // Processa reembolsos pendentes a cada 2min
    startConsistencyCron()  // Verifica inconsistências a cada 10min
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ [INSTRUMENTATION] Todos os sistemas iniciados!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  }
}
