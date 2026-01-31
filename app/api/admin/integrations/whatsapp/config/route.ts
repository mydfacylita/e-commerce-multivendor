/**
 * 🚨 ROTA TEMPORARIAMENTE DESABILITADA PARA DEPLOY
 * 
 * PROBLEMA: Campo 'key' não existe no tipo CompanySettingsWhereInput
 * DATA: 13/01/2026 - PRE-DEPLOY  
 * COMMIT: 89a7767
 * 
 * FUNCIONALIDADE ORIGINAL: Configuração do WhatsApp
 * ÁREA CRÍTICA: Sistema de integrações
 */

import { NextRequest, NextResponse } from 'next/server'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET - Buscar configuração do WhatsApp (TEMPORARIAMENTE DESABILITADO)
 * 
 * @returns Response com erro 501 (Not Implemented)
 */
export async function GET() {
  return NextResponse.json(
    { 
      error: 'Funcionalidade temporariamente desabilitada',
      message: 'Configuração WhatsApp em manutenção.',
      code: 'WHATSAPP_CONFIG_MAINTENANCE',
      data: {}
    },
    { status: 501 }
  )
}

/**
 * PUT - Atualizar configuração do WhatsApp (TEMPORARIAMENTE DESABILITADO)
 * 
 * @returns Response com erro 501 (Not Implemented)
 */
export async function PUT() {
  return NextResponse.json(
    { 
      error: 'Funcionalidade temporariamente desabilitada',
      message: 'Configuração WhatsApp em manutenção.',
      code: 'WHATSAPP_CONFIG_MAINTENANCE'
    },
    { status: 501 }
  )
}
