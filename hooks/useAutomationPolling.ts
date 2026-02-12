'use client';

import { useEffect, useState, useRef } from 'react';

/**
 * Hook para executar jobs automáticos em background
 * Usa polling para verificar e processar tarefas automáticas
 */

interface AutomationConfig {
  enabled: boolean;
  intervalMinutes: number;
  lastRun?: string | null;
  nextRun?: string | null;
}

interface AutomationConfigs {
  affiliatePayments: AutomationConfig;
  orderTracking: AutomationConfig;
  notifications: AutomationConfig;
  cleanup: AutomationConfig;
  orderProcessing: AutomationConfig;
}

interface JobDefinition {
  name: string;
  endpoint: string;
  configKey: keyof AutomationConfigs;
}

const JOBS: JobDefinition[] = [
  { name: 'Pagamentos de Afiliados', endpoint: '/api/jobs/process-automatic-affiliate-payments', configKey: 'affiliatePayments' },
  { name: 'Rastreamento de Pedidos', endpoint: '/api/jobs/sync-order-tracking', configKey: 'orderTracking' },
  { name: 'Envio de Notificações', endpoint: '/api/jobs/send-notifications', configKey: 'notifications' },
  { name: 'Limpeza do Sistema', endpoint: '/api/jobs/cleanup-system', configKey: 'cleanup' },
  { name: 'Processamento de Pedidos', endpoint: '/api/jobs/process-orders', configKey: 'orderProcessing' }
];

export function useAutomationPolling() {
  const [configs, setConfigs] = useState<Partial<AutomationConfigs>>({});
  const [isRunning, setIsRunning] = useState(false);
  const intervalRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Carregar configuração
  useEffect(() => {
    loadConfig();
  }, []);

  // Gerenciar polling para cada job
  useEffect(() => {
    JOBS.forEach(job => {
      const config = configs[job.configKey];
      const intervalRef = intervalRefs.current.get(job.configKey);

      if (config?.enabled && !intervalRef) {
        startPolling(job, config);
      } else if (!config?.enabled && intervalRef) {
        stopPolling(job.configKey);
      }
    });

    return () => {
      intervalRefs.current.forEach((_, key) => stopPolling(key));
    };
  }, [configs]);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/admin/automation/config');
      if (res.ok) {
        const data = await res.json();
        setConfigs(data);
      }
    } catch (error) {
      console.error('[AUTOMATION] Erro ao carregar config:', error);
    }
  };

  const startPolling = (job: JobDefinition, config: AutomationConfig) => {
    console.log(`[AUTOMATION] Iniciando polling de ${job.name} a cada ${config.intervalMinutes} minutos`);

    // Executar imediatamente (após 5 segundos para não sobrecarregar ao abrir)
    setTimeout(() => executeJob(job), 5000);

    // Configurar intervalo
    const intervalMs = config.intervalMinutes * 60 * 1000;
    const interval = setInterval(() => {
      executeJob(job);
    }, intervalMs);

    intervalRefs.current.set(job.configKey, interval);
  };

  const stopPolling = (configKey: string) => {
    const interval = intervalRefs.current.get(configKey);
    if (interval) {
      console.log(`[AUTOMATION] Parando polling de ${configKey}`);
      clearInterval(interval);
      intervalRefs.current.delete(configKey);
    }
  };

  const executeJob = async (job: JobDefinition) => {
    if (isRunning) {
      console.log(`[AUTOMATION] ${job.name} já está rodando, pulando execução`);
      return;
    }

    try {
      setIsRunning(true);
      console.log(`[AUTOMATION] Executando ${job.name}...`);

      const res = await fetch(job.endpoint, {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`[AUTOMATION] ${job.name} concluído:`, data);

        if (data.processed > 0 || data.updated > 0) {
          console.log(`✅ ${job.name}: ${data.message}`);
        }
      } else {
        console.error(`[AUTOMATION] Erro ao executar ${job.name}:`, await res.text());
      }
    } catch (error) {
      console.error(`[AUTOMATION] Erro na execução de ${job.name}:`, error);
    } finally {
      setIsRunning(false);
    }
  };

  const getActiveJobsCount = () => {
    return Object.values(configs).filter(c => c?.enabled).length;
  };

  return {
    configs,
    isRunning,
    activeJobsCount: getActiveJobsCount(),
    loadConfig,
    executeNow: (jobKey: keyof AutomationConfigs) => {
      const job = JOBS.find(j => j.configKey === jobKey);
      if (job) executeJob(job);
    }
  };
}

