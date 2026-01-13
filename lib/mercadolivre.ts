// Utilitários para integração com Mercado Livre

/**
 * Traduz mensagens de erro do Mercado Livre do inglês para português
 */
export function translateMLMessage(text: string): string {
  const translations: Record<string, string> = {
    // Erros de atributos
    'The attributes': 'Os atributos',
    'are required': 'são obrigatórios',
    'are required for category': 'são obrigatórios para a categoria',
    'Check the attribute is present in the attributes list': 'Verifique se o atributo está presente na lista de atributos',
    'or in all variation\'s attributes_combination or attributes': 'ou em todas as combinações de atributos das variações',
    
    // Erros gerais
    'Validation error': 'Erro de validação',
    'Invalid attribute': 'Atributo inválido',
    'is not valid': 'não é válido',
    'item values': 'valores do item',
    
    // Erros de produto
    'Product Identifier': 'Identificador do Produto',
    'contains values with invalid format': 'contém valores com formato inválido',
    
    // Códigos de erro
    'missing_required': 'campo obrigatório faltando',
    'invalid_format': 'formato inválido',
    'missing_conditional_required': 'campo condicional obrigatório faltando',
    
    // Status e avisos
    'under_review': 'em análise',
    'paused': 'pausado',
    'closed': 'encerrado',
    'active': 'ativo',
    'Mandatory free shipping added': 'Frete grátis obrigatório adicionado',
    'User has not mode': 'Usuário não tem modo',
    'Item is under review': 'O anúncio está em análise pelo Mercado Livre',
    'Item cannot be activated': 'O anúncio não pode ser ativado',
    'item is under moderation': 'anúncio está em moderação',
    'item under review cannot be modified': 'anúncio em análise não pode ser modificado',
    
    // Outros
    'and channel': 'e canal',
    'marketplace': 'marketplace',
    'mshops': 'mshops',
  }
  
  let translated = text
  
  // Aplica todas as traduções
  for (const [en, pt] of Object.entries(translations)) {
    translated = translated.replace(new RegExp(en, 'gi'), pt)
  }
  
  return translated
}

/**
 * Retorna informações sobre o status do anúncio
 */
export function getStatusInfo(status: string): { 
  label: string
  description: string
  canActivate: boolean
  icon: string
} {
  const statusMap: Record<string, any> = {
    'active': {
      label: 'Ativo',
      description: 'O anúncio está ativo e visível para compradores',
      canActivate: false,
      icon: '✅'
    },
    'paused': {
      label: 'Pausado',
      description: 'O anúncio está pausado e não aparece nas buscas',
      canActivate: true,
      icon: '⏸️'
    },
    'closed': {
      label: 'Encerrado',
      description: 'O anúncio foi encerrado permanentemente',
      canActivate: false,
      icon: '❌'
    },
    'under_review': {
      label: 'Em Análise',
      description: 'O Mercado Livre está revisando o anúncio. Isso pode levar algumas horas. Aguarde a aprovação antes de tentar modificá-lo.',
      canActivate: false,
      icon: '🔍'
    },
    'payment_required': {
      label: 'Pagamento Necessário',
      description: 'É necessário realizar um pagamento para ativar este anúncio',
      canActivate: false,
      icon: '💳'
    },
    'inactive': {
      label: 'Inativo',
      description: 'O anúncio está inativo',
      canActivate: true,
      icon: '⚪'
    }
  }
  
  return statusMap[status.toLowerCase()] || {
    label: status,
    description: `Status: ${status}`,
    canActivate: false,
    icon: '❓'
  }
}

/**
 * Formata erros do Mercado Livre de forma legível e traduzida
 */
export function formatMLErrors(data: any): { message: string; details: any } {
  let errorMessages: string[] = []
  
  if (data.cause && Array.isArray(data.cause)) {
    // Separa erros de warnings
    const errors = data.cause.filter((c: any) => c.type === 'error')
    const warnings = data.cause.filter((c: any) => c.type === 'warning')
    
    // Adiciona erros críticos
    if (errors.length > 0) {
      errorMessages.push('❌ ERROS CRÍTICOS:')
      errors.forEach((err: any) => {
        const translatedMsg = translateMLMessage(err.message)
        errorMessages.push(`  • ${translatedMsg}`)
        if (err.code) {
          errorMessages.push(`    Código: ${err.code}`)
        }
      })
    }
    
    // Adiciona avisos
    if (warnings.length > 0) {
      if (errors.length > 0) errorMessages.push('')
      errorMessages.push('⚠️ AVISOS:')
      warnings.forEach((warn: any) => {
        const translatedMsg = translateMLMessage(warn.message)
        errorMessages.push(`  • ${translatedMsg}`)
      })
    }
  }
  
  // Se não encontrou mensagens no cause, usa a mensagem principal
  if (errorMessages.length === 0) {
    errorMessages.push(translateMLMessage(data.message || 'Erro ao comunicar com Mercado Livre'))
  }
  
  return {
    message: errorMessages.join('\n'),
    details: data.cause
  }
}
