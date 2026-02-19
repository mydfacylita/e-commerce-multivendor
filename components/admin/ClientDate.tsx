'use client'

interface ClientDateProps {
  date: Date | string
  format?: 'full' | 'date' | 'time'
}

export default function ClientDate({ date, format = 'full' }: ClientDateProps) {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (format === 'date') {
    return <>{dateObj.toLocaleDateString('pt-BR')}</>
  }
  
  if (format === 'time') {
    return <>{dateObj.toLocaleTimeString('pt-BR')}</>
  }

  return <>{dateObj.toLocaleString('pt-BR')}</>
}
