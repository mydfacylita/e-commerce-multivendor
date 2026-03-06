// =====================================================
// PERMISSÕES DO PAINEL ADMINISTRATIVO
// Cada chave corresponde a um item do menu
// =====================================================

export interface PermissionItem {
  key: string
  label: string
}

export interface PermissionGroup {
  group: string
  items: PermissionItem[]
}

export const ADMIN_PERMISSIONS: PermissionGroup[] = [
  {
    group: 'Geral',
    items: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'sac', label: 'SAC' },
      { key: 'email', label: 'E-mail' },
      { key: 'ajuda', label: 'Central de Ajuda' },
    ],
  },
  {
    group: 'Catálogo',
    items: [
      { key: 'catalogo.produtos', label: 'Produtos' },
      { key: 'catalogo.aprovacao', label: 'Aprovação de Produtos' },
      { key: 'catalogo.categorias', label: 'Categorias' },
      { key: 'catalogo.tipos', label: 'Tipos' },
      { key: 'catalogo.ean', label: 'Solicitações EAN' },
      { key: 'catalogo.fornecedores', label: 'Fornecedores' },
    ],
  },
  {
    group: 'Vendas',
    items: [
      { key: 'vendas.pedidos', label: 'Pedidos' },
      { key: 'vendas.dropshipping', label: 'Dropshipping' },
      { key: 'vendas.entregas', label: 'Entregas' },
      { key: 'vendas.devolucoes', label: 'Devoluções' },
      { key: 'vendas.cupons', label: 'Cupons' },
      { key: 'vendas.marketing', label: 'Marketing' },
      { key: 'vendas.perguntas', label: 'Perguntas' },
      { key: 'vendas.ia_conversas', label: 'Mydi — Conversas IA' },
      { key: 'vendas.carne', label: 'Carnê / Parcelado' },
      { key: 'vendas.afiliados', label: 'Afiliados' },
    ],
  },
  {
    group: 'Logística',
    items: [
      { key: 'logistica.expedicao', label: 'Expedição' },
      { key: 'logistica.fretes', label: 'Fretes' },
      { key: 'logistica.embalagens', label: 'Embalagens' },
      { key: 'logistica.etiquetas', label: 'Etiquetas Produtos' },
    ],
  },
  {
    group: 'Gestão',
    items: [
      { key: 'gestao.usuarios', label: 'Usuários' },
      { key: 'gestao.vendedores', label: 'Vendedores' },
      { key: 'gestao.contas_digitais', label: 'Contas Digitais' },
      { key: 'gestao.cashback', label: 'Cashback' },
      { key: 'gestao.empresa', label: 'Empresa' },
      { key: 'gestao.financeiro', label: 'Financeiro' },
      { key: 'gestao.saques', label: 'Saques' },
      { key: 'gestao.contabilidade', label: 'Contabilidade' },
      { key: 'gestao.notas_fiscais', label: 'Notas Fiscais' },
      { key: 'gestao.planos', label: 'Planos' },
      { key: 'gestao.assinaturas', label: 'Assinaturas' },
      { key: 'gestao.equipe', label: 'Equipe Admin' },
    ],
  },
  {
    group: 'Monitoramento',
    items: [
      { key: 'monitoramento.vendas', label: 'Analytics de Vendas' },
      { key: 'monitoramento.analytics', label: 'Analytics' },
      { key: 'monitoramento.ips', label: 'IPs Suspeitos' },
      { key: 'monitoramento.bots', label: 'Bots Aliados' },
      { key: 'monitoramento.mapa', label: 'Mapa de Pedidos' },
      { key: 'monitoramento.antifraude', label: 'Antifraude' },
      { key: 'monitoramento.consistencia', label: 'Consistência' },
      { key: 'monitoramento.performance', label: 'Performance' },
      { key: 'monitoramento.logs', label: 'Logs API' },
    ],
  },
  {
    group: 'Integrações',
    items: [
      { key: 'integracoes.geral', label: 'Todas Integrações' },
      { key: 'integracoes.correios', label: 'Correios' },
      { key: 'integracoes.mercadopago', label: 'Mercado Pago' },
      { key: 'integracoes.whatsapp', label: 'WhatsApp' },
      { key: 'integracoes.dropshipping', label: 'Dropshipping API' },
      { key: 'integracoes.aliexpress_nichos', label: 'Nichos AliExpress' },
      { key: 'integracoes.aliexpress_sync', label: 'Sync Estoque AliExpress' },
      { key: 'integracoes.shopify', label: 'Shopify' },
      { key: 'integracoes.shopee', label: 'Shopee' },
      { key: 'integracoes.developer_apps', label: 'Apps de Devs' },
    ],
  },
  {
    group: 'Configurações',
    items: [
      { key: 'config.geral', label: 'Configurações Gerais' },
      { key: 'config.nfe', label: 'Nota Fiscal (NF-e)' },
      { key: 'config.aparencia', label: 'Aparência App' },
      { key: 'config.email_config', label: 'Contas de E-mail' },
      { key: 'config.impressoras', label: 'Impressoras' },
      { key: 'config.ia', label: 'Inteligência Artificial' },
      { key: 'config.automacoes', label: 'Automações' },
    ],
  },
]

// Todas as keys em um array flat
export const ALL_PERMISSION_KEYS = ADMIN_PERMISSIONS.flatMap(g => g.items.map(i => i.key))
