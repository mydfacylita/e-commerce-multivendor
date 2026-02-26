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
    'The body does not contains some or none of the following properties': 'O corpo da requisição não contém alguns campos obrigatórios',
    'does not contains some or none of the following properties': 'não contém os campos obrigatórios',
    
    // Códigos de erro
    'missing_required': 'campo obrigatório faltando',
    'invalid_format': 'formato inválido',
    'missing_conditional_required': 'campo condicional obrigatório faltando',
    'body.invalid_fields': 'Campos inválidos no payload enviado ao Mercado Livre',
    'body.required_fields': 'Campos obrigatórios ausentes no payload',
    'invalid_body': 'Corpo da requisição inválido',
    'item.invalid_pictures_source': 'URL de imagem inválida ou inacessível',
    'item.invalid_attribute': 'Atributo inválido para esta categoria',
    'item.attributes.invalid_value': 'Valor de atributo inválido',
    'item.attributes.not_allowed': 'Atributo não permitido nesta categoria',
    
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
    const rawMsg = data.message || 'Erro ao comunicar com Mercado Livre'
    const translatedMain = translateMLMessage(rawMsg)
    
    if (rawMsg === 'body.invalid_fields' || rawMsg.includes('invalid_fields')) {
      // Tenta extrair campos específicos de data.error (ex: "The fields [title] are invalid")
      const fieldMatch = typeof data.error === 'string'
        ? data.error.match(/The fields \[([^\]]+)\] are invalid/i)
        : null
      const invalidFields = fieldMatch ? fieldMatch[1].split(',').map((f: string) => f.trim()) : []

      if (invalidFields.includes('title')) {
        errorMessages.push('❌ Esta categoria exige publicação via catálogo ML.')
        errorMessages.push('')
        errorMessages.push('O campo "title" foi rejeitado porque o ML controla o título pelo produto de catálogo.')
        errorMessages.push('')
        errorMessages.push('Como resolver: use o botão "Buscar no Catálogo ML" no modal, selecione o produto correto e publique novamente.')
      } else if (invalidFields.length > 0) {
        errorMessages.push(`Campos inválidos rejeitados pelo Mercado Livre: ${invalidFields.map((f: string) => `"${f}"`).join(', ')}`)
        errorMessages.push('')
        errorMessages.push('Verifique os logs do servidor para mais detalhes.')
      } else {
        errorMessages.push('Campos inválidos rejeitados pelo Mercado Livre.')
        errorMessages.push('')
        errorMessages.push('Causas mais comuns:')
        errorMessages.push('  • Atributo enviado não existe nesta categoria')
        errorMessages.push('  • URL de imagem inacessível pelo Mercado Livre')
        errorMessages.push('  • Categoria exige vinculação ao catálogo (catalog_product_id)')
        errorMessages.push('  • Valor de atributo fora dos valores aceitos')
        errorMessages.push('')
        errorMessages.push('Verifique os logs do servidor para detalhes dos campos rejeitados.')
      }
    } else if (rawMsg === 'body.required_fields' || rawMsg.includes('required_fields')) {
      errorMessages.push('Campos obrigatórios ausentes no payload.')
      errorMessages.push('')
      errorMessages.push('Verifique nos logs qual campo está faltando (ex: family_name) e se o produto tem as informações necessárias preenchidas.')
    } else {
      errorMessages.push(translatedMain)
    }
  }
  
  return {
    message: errorMessages.join('\n'),
    details: data.cause
  }
}
