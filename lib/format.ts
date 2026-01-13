/**
 * Formata o ID do pedido para exibição
 * Converte CUID (cmk3p2d3y0005mpbdndwczpsp) em número amigável
 * Usa os últimos 6 caracteres alfanuméricos como referência
 */
export function formatOrderNumber(orderId: string): string {
  if (!orderId || orderId.length < 8) {
    return '000000'
  }
  
  // Pegar os últimos 8 caracteres e converter para número usando hash
  const suffix = orderId.slice(-8)
  
  // Criar um hash numérico mais distribuído
  let hash = 0
  for (let i = 0; i < suffix.length; i++) {
    const char = suffix.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  // Usar valor absoluto e pegar últimos 6 dígitos
  const num = Math.abs(hash) % 1000000
  return num.toString().padStart(6, '0')
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
