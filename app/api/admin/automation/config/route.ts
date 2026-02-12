import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Sistema de Automação - Configuração de Jobs
 * 
 * Ativa/desativa jobs automáticos do sistema
 */

export const dynamic = 'force-dynamic'

// GET: Status atual das automações
export async function GET(req: NextRequest) {
  try {
    const config = await prisma.systemConfig.findMany({
      where: {
        key: {
          startsWith: 'automation.'
        }
      }
    })

    const groupedSettings: Record<string, any> = {};
    
    config.forEach(c => {
      const parts = c.key.split('.');
      const jobName = parts[1]; // automation.JOB_NAME.property
      const property = parts.slice(2).join('.');
      
      if (!groupedSettings[jobName]) {
        groupedSettings[jobName] = {};
      }
      
      if (property === 'enabled') {
        groupedSettings[jobName].enabled = c.value === 'true';
      } else if (property === 'intervalMinutes') {
        groupedSettings[jobName].intervalMinutes = parseInt(c.value || '60');
      } else if (property) {
        groupedSettings[jobName][property] = c.value;
      }
    });

    return NextResponse.json(groupedSettings);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// POST: Ativar/desativar automação
export async function POST(req: NextRequest) {
  try {
    const { job, enabled, intervalMinutes } = await req.json()

    const validJobs = [
      'affiliatePayments',
      'orderTracking',
      'notifications',
      'cleanup',
      'orderProcessing'
    ];

    if (!validJobs.includes(job)) {
      return NextResponse.json({ error: 'Job inválido' }, { status: 400 })
    }

    // Labels para cada job
    const jobLabels: Record<string, string> = {
      affiliatePayments: 'Pagamentos de Afiliados Automáticos',
      orderTracking: 'Rastreamento Automático de Pedidos',
      notifications: 'Envio Automático de Notificações',
      cleanup: 'Limpeza Automática do Sistema',
      orderProcessing: 'Processamento Automático de Pedidos'
    };

    // Atualizar configurações
    await prisma.systemConfig.upsert({
      where: { key: `automation.${job}.enabled` },
      update: { value: String(enabled), updatedAt: new Date() },
      create: {
        key: `automation.${job}.enabled`,
        value: String(enabled),
        category: 'automation',
        label: jobLabels[job],
        description: `Ativa/desativa ${jobLabels[job].toLowerCase()}`,
        type: 'boolean'
      }
    })

    if (intervalMinutes) {
      await prisma.systemConfig.upsert({
        where: { key: `automation.${job}.intervalMinutes` },
        update: { value: String(intervalMinutes), updatedAt: new Date() },
        create: {
          key: `automation.${job}.intervalMinutes`,
          value: String(intervalMinutes),
          category: 'automation',
          label: `Intervalo de Execução (${jobLabels[job]})`,
          description: `Intervalo em minutos para executar ${jobLabels[job].toLowerCase()}`,
          type: 'number'
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: `Automação ${enabled ? 'ativada' : 'desativada'} com sucesso`
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
