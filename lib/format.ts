/**
 * Formata o ID do pedido para exibição
 * Converte CUID (cmk3p2d3y0005mpbdndwczpsp) em número sequencial
 */
export function formatOrderNumber(orderId: string): string {
  // Extrai parte numérica do CUID e converte para número
  // Exemplo: cmk3p2d3y0005mpbdndwczpsp -> pega "0005" -> 5
  const match = orderId.match(/\d+/)
  if (match) {
    const num = parseInt(match[0], 10)
    return num.toString().padStart(6, '0') // Formato: 000005
  }
  
  // Fallback: usar hash do ID completo
  let hash = 0
  for (let i = 0; i < orderId.length; i++) {
    hash = ((hash << 5) - hash) + orderId.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString().padStart(6, '0')
}

/**
 * Formata valor monetário para exibição
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

/**
 * Formata data para exibição
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pt-BR')
}

/**
 * Formata data e hora para exibição
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('pt-BR')
}
