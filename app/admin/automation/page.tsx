'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { 
  FiPlay, FiPause, FiRefreshCw, FiClock, FiCheck, FiDollarSign, 
  FiTruck, FiBell, FiTrash2, FiPackage, FiShoppingCart 
} from 'react-icons/fi';

type TabType = 'payments' | 'tracking' | 'notifications' | 'cleanup' | 'orders' | 'webhooks';

export default function AutomationAdmin() {
  const [activeTab, setActiveTab] = useState<TabType>('payments');
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [lastResults, setLastResults] = useState<Record<string, any>>({});

  const tabs = [
    { id: 'payments', label: 'Pagamentos Afiliados', icon: FiDollarSign },
    { id: 'tracking', label: 'Rastreamento', icon: FiTruck },
    { id: 'notifications', label: 'Notificações', icon: FiBell },
    { id: 'cleanup', label: 'Limpeza', icon: FiTrash2 },
    { id: 'orders', label: 'Pedidos', icon: FiPackage },
    { id: 'webhooks', label: 'Webhooks', icon: FiShoppingCart },
  ];

  useEffect(() => {
    loadAllConfigs();
    const interval = setInterval(loadAllConfigs, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAllConfigs = async () => {
    try {
      const res = await fetch('/api/admin/automation/config');
      if (res.ok) {
        const data = await res.json();
        setConfigs(data);
      }
    } catch (error) {
      console.error('Erro ao carregar configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutomation = async (jobName: string, currentState: boolean) => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/automation/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job: jobName,
          enabled: !currentState,
          intervalMinutes: configs[jobName]?.intervalMinutes || 60
        })
      });

      if (res.ok) {
        await loadAllConfigs();
        alert(`Automação ${!currentState ? 'ativada' : 'desativada'} com sucesso!`);
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao alterar automação');
    } finally {
      setLoading(false);
    }
  };

  const executeJob = async (endpoint: string, jobName: string) => {
    try {
      setLoading(true);
      const res = await fetch(endpoint, { method: 'POST' });

      if (res.ok) {
        const data = await res.json();
        setLastResults((prev) => ({ ...prev, [jobName]: data }));
        alert(`Executado com sucesso!`);
      } else {
        alert('Erro ao executar job');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao executar job');
    } finally {
      setLoading(false);
    }
  };

  if (loading && Object.keys(configs).length === 0) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FiRefreshCw className="text-blue-600" />
          Automações do Sistema
        </h2>
        <p className="text-gray-600 mt-1">Gerencie todos os processos automáticos</p>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'payments' && (
          <PaymentsTab 
            config={configs.affiliatePayments || {}}
            onToggle={() => toggleAutomation('affiliatePayments', configs.affiliatePayments?.enabled)}
            onExecute={() => executeJob('/api/jobs/process-automatic-affiliate-payments', 'payments')}
            lastResult={lastResults.payments}
            loading={loading}
          />
        )}
        
        {activeTab === 'tracking' && (
          <TrackingTab
            config={configs.orderTracking || {}}
            onToggle={() => toggleAutomation('orderTracking', configs.orderTracking?.enabled)}
            onExecute={() => executeJob('/api/jobs/sync-order-tracking', 'tracking')}
            lastResult={lastResults.tracking}
            loading={loading}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsTab
            config={configs.notifications || {}}
            onToggle={() => toggleAutomation('notifications', configs.notifications?.enabled)}
            onExecute={() => executeJob('/api/jobs/send-notifications', 'notifications')}
            lastResult={lastResults.notifications}
            loading={loading}
          />
        )}

        {activeTab === 'cleanup' && (
          <CleanupTab
            config={configs.cleanup || {}}
            onToggle={() => toggleAutomation('cleanup', configs.cleanup?.enabled)}
            onExecute={() => executeJob('/api/jobs/cleanup-system', 'cleanup')}
            lastResult={lastResults.cleanup}
            loading={loading}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersTab
            config={configs.orderProcessing || {}}
            onToggle={() => toggleAutomation('orderProcessing', configs.orderProcessing?.enabled)}
            onExecute={() => executeJob('/api/jobs/process-orders', 'orders')}
            lastResult={lastResults.orders}
            loading={loading}
          />
        )}

        {activeTab === 'webhooks' && (
          <WebhooksTab
            config={configs.webhooks || {}}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}

// Componente Pagamentos (já existente, adaptado)
function PaymentsTab({ config, onToggle, onExecute, lastResult, loading }: any) {
  const [intervalMinutes, setIntervalMinutes] = useState(config.intervalMinutes || 60);
  const enabled = config.enabled || false;

  return (
    <div className="space-y-6">
      <AutomationCard
        title="Pagamentos Automáticos de Afiliados"
        description="Credita comissões automaticamente na conta MYD após 7 dias da entrega"
        enabled={enabled}
        onToggle={onToggle}
        onExecute={onExecute}
        loading={loading}
      >
        <IntervalConfig 
          value={intervalMinutes}
          onChange={setIntervalMinutes}
          onSave={() => {
            fetch('/api/admin/automation/config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                job: 'affiliatePayments',
                enabled,
                intervalMinutes
              })
            }).then(() => alert('Intervalo atualizado!'));
          }}
        />
        
        {lastResult && (
          <div className="mt-4 p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Última Execução</h4>
            <div className="text-sm space-y-1">
              <p>✅ Processados: {lastResult.processed} pagamentos</p>
              <p>👥 Afiliados: {lastResult.affiliatesCount || 0}</p>
            </div>
          </div>
        )}

        <InfoBox>
          <li>Verifica vendas que passaram dos 7 dias após entrega</li>
          <li>Credita automaticamente na conta MYD do afiliado</li>
          <li>Marca vendas como "PAID"</li>
          <li>Não requer aprovação manual</li>
        </InfoBox>
      </AutomationCard>
    </div>
  );
}

function TrackingTab({ config, onToggle, onExecute, lastResult, loading }: any) {
  const [intervalMinutes, setIntervalMinutes] = React.useState(config.intervalMinutes || 60);
  const enabled = config.enabled || false;

  return (
    <div className="space-y-6">
      <AutomationCard
        title="Rastreamento Automático de Pedidos"
        description="Atualiza automaticamente o status dos pedidos consultando rastreamento dos Correios"
        enabled={enabled}
        onToggle={onToggle}
        onExecute={onExecute}
        loading={loading}
      >
        <IntervalConfig 
          value={intervalMinutes}
          onChange={setIntervalMinutes}
          onSave={() => {
            fetch('/api/admin/automation/config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                job: 'orderTracking',
                enabled,
                intervalMinutes
              })
            }).then(() => alert('Intervalo atualizado!'));
          }}
        />
        <InfoBox>
          <li>Consulta códigos de rastreamento dos Correios</li>
          <li>Atualiza pedidos enviados automaticamente</li>
          <li>Marca pedidos como entregues quando confirmado</li>
          <li>Confirma comissões de afiliados após entrega</li>
        </InfoBox>
        {lastResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded text-sm">
            <strong>Último resultado:</strong> {lastResult.message}
            <div className="mt-2 text-gray-600">
              {lastResult.processed > 0 && <div>Processados: {lastResult.processed}</div>}
              {lastResult.updated > 0 && <div>Atualizados: {lastResult.updated}</div>}
              {lastResult.delivered > 0 && <div>Entregues: {lastResult.delivered}</div>}
            </div>
          </div>
        )}
      </AutomationCard>
    </div>
  );
}

function NotificationsTab({ config, onToggle, onExecute, lastResult, loading }: any) {
  const [intervalMinutes, setIntervalMinutes] = React.useState(config.intervalMinutes || 60);
  const enabled = config.enabled || false;

  return (
    <div className="space-y-6">
      <AutomationCard
        title="Envio Automático de Notificações"
        description="Envia emails usando templates configurados em Configurações > Contas de E-mail > Templates"
        enabled={enabled}
        onToggle={onToggle}
        onExecute={onExecute}
        loading={loading}
      >
        <IntervalConfig 
          value={intervalMinutes}
          onChange={setIntervalMinutes}
          onSave={() => {
            fetch('/api/admin/automation/config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                job: 'notifications',
                enabled,
                intervalMinutes
              })
            }).then(() => alert('Intervalo atualizado!'));
          }}
        />
        <InfoBox>
          <li>📧 Email para pedidos aguardando envio (&gt; 2 dias)</li>
          <li>📧 Email de confirmação de entrega</li>
          <li>📧 Lembrete de carrinho abandonado (&gt; 3 dias)</li>
          <li>📱 Mensagens WhatsApp (em breve)</li>
          <li>🎨 Templates editáveis em Configurações &gt; E-mail</li>
        </InfoBox>
        {lastResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded text-sm">
            <strong>Último resultado:</strong> {lastResult.message}
            <div className="mt-2 text-gray-600">
              {lastResult.emailsSent > 0 && <div>📧 Emails enviados: {lastResult.emailsSent}</div>}
              {lastResult.whatsappSent > 0 && <div>📱 WhatsApp enviados: {lastResult.whatsappSent}</div>}
              {lastResult.errors && lastResult.errors.length > 0 && (
                <div className="mt-2 text-red-600">
                  <div>⚠️ Erros: {lastResult.errors.length}</div>
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs">Ver detalhes</summary>
                    <div className="mt-1 text-xs bg-red-50 p-2 rounded">
                      {lastResult.errors.slice(0, 5).map((err: string, i: number) => (
                        <div key={i}>{err}</div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        )}
      </AutomationCard>
    </div>
  );
}

function CleanupTab({ config, onToggle, onExecute, lastResult, loading }: any) {
  const [intervalMinutes, setIntervalMinutes] = React.useState(config.intervalMinutes || 60);
  const enabled = config.enabled || false;

  return (
    <div className="space-y-6">
      <AutomationCard
        title="Limpeza Automática do Sistema"
        description="Remove dados antigos e desnecessários para otimizar performance"
        enabled={enabled}
        onToggle={onToggle}
        onExecute={onExecute}
        loading={loading}
      >
        <IntervalConfig 
          value={intervalMinutes}
          onChange={setIntervalMinutes}
          onSave={() => {
            fetch('/api/admin/automation/config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                job: 'cleanup',
                enabled,
                intervalMinutes
              })
            }).then(() => alert('Intervalo atualizado!'));
          }}
        />
        <InfoBox>
          <li>Remove sessões expiradas (mais de 30 dias)</li>
          <li>Limpa itens de carrinho antigos (mais de 30 dias)</li>
          <li>Arquiva pedidos cancelados (mais de 6 meses)</li>
          <li>Limpa tokens de senha expirados</li>
        </InfoBox>
        {lastResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded text-sm">
            <strong>Último resultado:</strong> {lastResult.message}
            <div className="mt-2 text-gray-600">
              {lastResult.sessionsDeleted > 0 && <div>Sessões removidas: {lastResult.sessionsDeleted}</div>}
              {lastResult.cartsDeleted > 0 && <div>Carrinhos limpos: {lastResult.cartsDeleted}</div>}
            </div>
          </div>
        )}
      </AutomationCard>
    </div>
  );
}

function OrdersTab({ config, onToggle, onExecute, lastResult, loading }: any) {
  const [intervalMinutes, setIntervalMinutes] = React.useState(config.intervalMinutes || 60);
  const enabled = config.enabled || false;

  return (
    <div className="space-y-6">
      <AutomationCard
        title="Processamento Automático de Pedidos"
        description="Cancela pedidos pendentes automaticamente e processa status"
        enabled={enabled}
        onToggle={onToggle}
        onExecute={onExecute}
        loading={loading}
      >
        <IntervalConfig 
          value={intervalMinutes}
          onChange={setIntervalMinutes}
          onSave={() => {
            fetch('/api/admin/automation/config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                job: 'orderProcessing',
                enabled,
                intervalMinutes
              })
            }).then(() => alert('Intervalo atualizado!'));
          }}
        />
        <InfoBox>
          <li>Cancela pedidos não pagos após 3 dias</li>
          <li>Libera estoque de pedidos cancelados</li>
          <li>Alerta pedidos sem envio após 5 dias</li>
          <li>Alerta pedidos enviados há mais de 30 dias</li>
          <li>Monitora pedidos entregues</li>
        </InfoBox>
        {lastResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded text-sm">
            <strong>Último resultado:</strong> {lastResult.message}
            <div className="mt-2 text-gray-600">
              {lastResult.cancelled > 0 && <div>Pedidos cancelados: {lastResult.cancelled}</div>}
              {lastResult.completed > 0 && <div>Pedidos entregues: {lastResult.completed}</div>}
              {lastResult.alerted > 0 && <div>Alertas gerados: {lastResult.alerted}</div>}
            </div>
          </div>
        )}
      </AutomationCard>
    </div>
  );
}

function WebhooksTab({ config, loading }: any) {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <FiShoppingCart className="text-blue-600" />
          Webhooks Ativos
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Webhooks processam eventos em tempo real, não requerem polling
        </p>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="font-semibold">MercadoPago:</span>
            <span>/api/webhooks/mercadopago</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="font-semibold">Shopee:</span>
            <span>/api/webhooks/shopee</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="font-semibold">Mercado Livre:</span>
            <span>/api/webhooks/mercadolivre</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="font-semibold">WhatsApp:</span>
            <span>/api/webhooks/whatsapp</span>
          </div>
        </div>
      </div>

      <InfoBox>
        <li>Webhooks funcionam em tempo real via eventos HTTP</li>
        <li>Não consomem recursos com polling</li>
        <li>Processam pagamentos instantaneamente</li>
        <li>Sincronizam pedidos de marketplaces</li>
      </InfoBox>
    </div>
  );
}

// Componentes auxiliares
function AutomationCard({ title, description, enabled, onToggle, onExecute, loading, children }: any) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-gray-50">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`px-4 py-2 rounded-full font-semibold ${enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            {enabled ? <><FiCheck className="inline mr-1" />Ativo</> : 'Desativado'}
          </span>
          <button
            onClick={onToggle}
            disabled={loading}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              enabled 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } disabled:opacity-50`}
          >
            {enabled ? <><FiPause className="inline mr-2" />Desativar</> : <><FiPlay className="inline mr-2" />Ativar</>}
          </button>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {onExecute && (
          <button
            onClick={onExecute}
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            <FiPlay className="inline mr-2" />
            Executar Agora
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

function IntervalConfig({ config, value, onChange, onSave }: any) {
  // Se config for passado, usar valores dele
  const intervalValue = value !== undefined ? value : (config?.intervalMinutes || 60);
  
  return (
    <div className="p-4 border rounded-lg">
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <FiClock />
        Intervalo de Execução
      </h4>
      <div className="flex items-center gap-4">
        <input
          type="number"
          min="5"
          max="1440"
          value={intervalValue}
          onChange={(e) => onChange && onChange(parseInt(e.target.value))}
          className="px-4 py-2 border rounded-lg w-24"
          disabled={!onChange}
        />
        <span className="text-gray-600">minutos</span>
        {onSave && (
          <button
            onClick={onSave}
            className="ml-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
          >
            Salvar
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mt-2">
        Recomendado: 60 minutos (1 hora)
      </p>
      {!onChange && (
        <p className="text-xs text-gray-400 mt-2">
          Configure o intervalo na configuração do sistema
        </p>
      )}
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
      <h4 className="font-semibold mb-2">ℹ️ Como funciona:</h4>
      <ul className="list-disc list-inside space-y-1">{children}</ul>
    </div>
  );
}
