/**
 * Utilitários de Data/Hora com Timezone do Brasil (America/Sao_Paulo)
 * 
 * Use estas funções em vez de `new Date()` para garantir consistência
 * em todas as operações de data no sistema.
 */

// Timezone padrão do Brasil
export const BRAZIL_TIMEZONE = 'America/Sao_Paulo'

/**
 * Retorna a data/hora atual no timezone do Brasil
 */
export function nowBrazil(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE }))
}

/**
 * Retorna a data/hora atual como string ISO no timezone do Brasil
 */
export function nowBrazilISO(): string {
  const now = new Date()
  const brazilTime = new Date(now.toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE }))
  return brazilTime.toISOString()
}

/**
 * Formata uma data para o formato brasileiro (dd/mm/yyyy HH:mm:ss)
 */
export function formatDateBrazil(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('pt-BR', { timeZone: BRAZIL_TIMEZONE })
}

/**
 * Formata apenas a data (dd/mm/yyyy)
 */
export function formatDateOnlyBrazil(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pt-BR', { timeZone: BRAZIL_TIMEZONE })
}

/**
 * Formata apenas a hora (HH:mm:ss)
 */
export function formatTimeBrazil(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('pt-BR', { timeZone: BRAZIL_TIMEZONE })
}

/**
 * Retorna o início do dia atual no timezone do Brasil
 */
export function startOfDayBrazil(date?: Date): Date {
  const d = date || nowBrazil()
  const brazilDate = new Date(d.toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE }))
  brazilDate.setHours(0, 0, 0, 0)
  return brazilDate
}

/**
 * Retorna o fim do dia atual no timezone do Brasil
 */
export function endOfDayBrazil(date?: Date): Date {
  const d = date || nowBrazil()
  const brazilDate = new Date(d.toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE }))
  brazilDate.setHours(23, 59, 59, 999)
  return brazilDate
}

/**
 * Calcula a diferença em horas entre duas datas
 */
export function hoursDiff(date1: Date, date2: Date): number {
  return Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60)
}

/**
 * Calcula a diferença em dias entre duas datas
 */
export function daysDiff(date1: Date, date2: Date): number {
  return Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24)
}

/**
 * Verifica se a data é de hoje (no timezone do Brasil)
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  const today = startOfDayBrazil()
  const dateStart = startOfDayBrazil(d)
  return dateStart.getTime() === today.getTime()
}

/**
 * Adiciona dias a uma data
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Adiciona horas a uma data
 */
export function addHours(date: Date, hours: number): Date {
  const result = new Date(date)
  result.setTime(result.getTime() + hours * 60 * 60 * 1000)
  return result
}
