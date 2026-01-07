/**
 * Funções utilitárias para pedidos
 */

/**
 * Formata o ID do pedido (CUID) para número de exibição
 * @param orderId - ID do pedido (CUID: cmk3p2d3y0005mpbdndwczpsp)
 * @returns String formatada (ex: "#123456")
 */
export function formatOrderNumber(orderId: string): string {
  // Gera hash numérico consistente do ID completo
  let hash = 0
  for (let i = 0; i < orderId.length; i++) {
    const char = orderId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  // Converte para número positivo de 6 dígitos
  const num = Math.abs(hash) % 1000000
  return `#${num.toString().padStart(6, '0')}`
}
