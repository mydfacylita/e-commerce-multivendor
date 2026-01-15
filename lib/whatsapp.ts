/**
 * 🚨 BIBLIOTECA TEMPORARIAMENTE DESABILITADA PARA DEPLOY
 * 
 * PROBLEMA: Campo 'key' não existe no tipo CompanySettingsWhereInput
 * DATA: 13/01/2026 - PRE-DEPLOY  
 * COMMIT: 89a7767
 * 
 * FUNCIONALIDADE ORIGINAL: Sistema WhatsApp
 * ÁREA CRÍTICA: Integrações
 */

export const sendWhatsAppMessage = async () => {
  throw new Error('WhatsApp temporariamente desabilitado para deploy')
}

export const getWhatsAppConfig = async () => {
  return null
}

// Export dummy class para compatibilidade
export class WhatsAppService {
  constructor() {
    throw new Error('WhatsApp temporariamente desabilitado para deploy')
  }
  
  static async sendMessage(data: any) {
    return { 
      success: false, 
      error: 'WhatsApp temporariamente desabilitado para deploy',
      messageId: null 
    }
  }
  
  static async sendPixCode(phone: any, data: any) {
    return { success: false, error: 'WhatsApp temporariamente desabilitado para deploy' }
  }
  
  static async sendBoletoLink(phone: any, data: any) {
    return { success: false, error: 'WhatsApp temporariamente desabilitado para deploy' }
  }
  
  static async getConfig() {
    return {
      provider: 'disabled',
      enabled: false,
      phoneNumberId: null,
      accessToken: null,
      apiKey: null
    }
  }
}
