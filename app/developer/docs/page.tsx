'use client'
import { useState } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'

type Section = 'intro' | 'auth' | 'orders' | 'products' | 'shipping' | 'webhooks' | 'labels' | 'invoices' | 'returns' | 'errors'

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'intro',    label: 'Introdução',    icon: '📖' },
  { id: 'auth',     label: 'Autenticação',  icon: '🔐' },
  { id: 'orders',   label: 'Pedidos',       icon: '📦' },
  { id: 'products', label: 'Produtos',      icon: '🛍️'  },
  { id: 'shipping', label: 'Frete',         icon: '🚚' },
  { id: 'webhooks', label: 'Webhooks',      icon: '🔔' },
  { id: 'labels',   label: 'Etiquetas',     icon: '🏷️'  },
  { id: 'invoices', label: 'Notas Fiscais', icon: '🧾' },
  { id: 'returns',  label: 'Trocas/Devol.', icon: '🔄' },
  { id: 'errors',   label: 'Erros',         icon: '⚠️'  },
]

function Badge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET:    'bg-green-900 text-green-400 border-green-800',
    POST:   'bg-blue-900 text-blue-400 border-blue-800',
    PATCH:  'bg-yellow-900 text-yellow-400 border-yellow-800',
    DELETE: 'bg-red-900 text-red-400 border-red-800',
  }
  return (
    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${colors[method] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
      {method}
    </span>
  )
}

function Endpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-800 last:border-0">
      <Badge method={method} />
      <div>
        <code className="text-sm text-white">{path}</code>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

function Code({ children, lang = 'json' }: { children: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(children.trim())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative group">
      <pre className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm overflow-x-auto text-gray-300 leading-relaxed">
        <code>{children.trim()}</code>
      </pre>
      <button onClick={copy}
        className="absolute top-3 right-3 text-xs text-gray-500 hover:text-white bg-gray-800 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? '✓ Copiado' : 'Copiar'}
      </button>
    </div>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-white mb-4 mt-8 first:mt-0">{children}</h2>
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-gray-200 mb-3 mt-6">{children}</h3>
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-400 text-sm leading-relaxed mb-3">{children}</p>
}

export default function DocsPage() {
  const [active, setActive] = useState<Section>('intro')

  const base = 'https://api.mydshop.com.br/api/v1'
  const baseLocal = 'http://localhost:3000/api/v1'

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 bg-gray-950 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">M</div>
          <span className="font-semibold">MydShop <span className="text-blue-400">API Docs</span></span>
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">v1</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/admin" className="text-gray-400 hover:text-white text-sm transition-colors">Painel admin</a>
          <Link href="/developer/dashboard" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
            Meu portal
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-xs text-gray-500 hover:text-red-400 border border-gray-700 hover:border-red-800 px-3 py-1.5 rounded-lg transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-56 border-r border-gray-800 p-4 sticky top-[57px] self-start h-[calc(100vh-57px)] overflow-y-auto">
          <p className="text-xs text-gray-600 uppercase tracking-wider mb-3 px-2">Referência</p>
          <nav className="space-y-0.5">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setActive(n.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left
                  ${active === n.id ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                <span className="text-base">{n.icon}</span>
                {n.label}
              </button>
            ))}
          </nav>

          <div className="mt-6 pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-600 mb-2 px-2">Base URL</p>
            <code className="text-xs text-blue-400 px-2 block break-all">{base}</code>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 max-w-3xl px-10 py-10">

          {/* ── INTRODUÇÃO ────────────────────────────────────── */}
          {active === 'intro' && (
            <div>
              <H2>Introdução</H2>
              <P>
                A API MydShop permite integrações externas com o marketplace — consulta de pedidos, produtos,
                cálculo de frete, emissão de etiquetas e notas fiscais, e recebimento de eventos via webhooks.
              </P>
              <P>
                Todas as requisições são feitas por HTTPS contra o endpoint base:
              </P>
              <Code>{base}</Code>

              <H3>Ambiente de desenvolvimento</H3>
              <P>Para testes locais, use:</P>
              <Code>{baseLocal}</Code>

              <H3>Formato</H3>
              <P>Todos os endpoints aceitam e retornam <code className="text-blue-400">application/json</code>.
              Datas estão no formato ISO 8601 (UTC).</P>

              <H3>Paginação</H3>
              <P>Listas aceitam os parâmetros <code className="text-blue-400">page</code> e <code className="text-blue-400">limit</code> (máx 100).</P>
              <Code>{`GET /api/v1/orders?page=2&limit=50`}</Code>

              <H3>Scopes disponíveis</H3>
              <div className="space-y-2 mt-2">
                {[
                  ['orders:read',        'Listar e visualizar pedidos'],
                  ['orders:write',       'Atualizar status de pedidos'],
                  ['labels:read',        'Gerar e baixar etiquetas de envio'],
                  ['invoices:read',      'Acessar notas fiscais'],
                  ['products:read',      'Listar produtos e estoque'],
                  ['shipping:calculate', 'Calcular fretes'],
                  ['webhooks:manage',    'Criar e remover webhooks'],
                ].map(([scope, desc]) => (
                  <div key={scope} className="flex items-start gap-3">
                    <code className="text-xs text-blue-400 bg-blue-950 px-2 py-1 rounded shrink-0">{scope}</code>
                    <span className="text-sm text-gray-400">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── AUTENTICAÇÃO ──────────────────────────────────── */}
          {active === 'auth' && (
            <div>
              <H2>Autenticação</H2>
              <P>
                A API usa autenticação via <strong className="text-white">HMAC-SHA256</strong>. Cada requisição precisa
                de três headers obrigatórios:
              </P>

              <div className="space-y-3 mb-6">
                {[
                  ['Authorization', 'Bearer <api_key>', 'Sua API Key obtida no portal'],
                  ['X-Api-Signature', '<hmac_hex>', 'Assinatura HMAC-SHA256 do body'],
                  ['X-Timestamp', '<unix_ms>', 'Timestamp atual em milissegundos (janela de 5 min)'],
                ].map(([h, v, d]) => (
                  <div key={h} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-yellow-400 text-sm">{h}</code>
                      <code className="text-gray-500 text-sm">{v}</code>
                    </div>
                    <p className="text-xs text-gray-500">{d}</p>
                  </div>
                ))}
              </div>

              <H3>Gerando a assinatura</H3>
              <P>
                A assinatura é o HMAC-SHA256 do timestamp usando o
                <code className="text-orange-400"> api_secret</code> como chave:
              </P>
              <Code lang="js">{`
// Node.js
const crypto = require('crypto')

const timestamp = Date.now().toString()

const signature = crypto
  .createHmac('sha256', process.env.API_SECRET)
  .update(timestamp)
  .digest('hex')

// Headers
headers = {
  'Authorization': \`Bearer \${process.env.API_KEY}\`,
  'X-Api-Signature': signature,
  'X-Timestamp': timestamp,
  'Content-Type': 'application/json'
}
              `}</Code>

              <H3>Exemplo completo (GET /orders)</H3>
              <Code lang="js">{`
const crypto = require('crypto')

async function getOrders() {
  const timestamp = Date.now().toString()

  const signature = crypto
    .createHmac('sha256', process.env.API_SECRET)
    .update(timestamp)
    .digest('hex')

  const res = await fetch('https://api.mydshop.com.br/api/v1/orders', {
    headers: {
      'Authorization': \`Bearer \${process.env.API_KEY}\`,
      'X-Api-Signature': signature,
      'X-Timestamp': timestamp,
    }
  })

  return res.json()
}
              `}</Code>

              <H3>Obtendo credenciais</H3>
              <P>
                Acesse o <Link href="/developer/dashboard" className="text-blue-400 hover:underline">portal de desenvolvedores</Link>,
                crie um app, gere uma API Key e selecione os scopes necessários.
                O <code className="text-orange-400">api_secret</code> é exibido apenas uma vez na criação.
              </P>
            </div>
          )}

          {/* ── PEDIDOS ───────────────────────────────────────── */}
          {active === 'orders' && (
            <div>
              <H2>Pedidos</H2>
              <P>Endpoints para consulta e atualização de pedidos. Requer scope <code className="text-blue-400">orders:read</code> (leitura) ou <code className="text-blue-400">orders:write</code> (atualização).</P>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
                <Endpoint method="GET"   path="/api/v1/orders"     desc="Listar pedidos com filtros e paginação" />
                <Endpoint method="GET"   path="/api/v1/orders/:id" desc="Detalhes de um pedido específico" />
                <Endpoint method="PATCH" path="/api/v1/orders/:id" desc="Atualizar status ou campos do pedido" />
              </div>

              <H3>GET /api/v1/orders</H3>
              <P>Parâmetros de query:</P>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-gray-500 border-b border-gray-800">
                    <th className="pb-2 pr-4">Parâmetro</th>
                    <th className="pb-2 pr-4">Tipo</th>
                    <th className="pb-2">Descrição</th>
                  </tr></thead>
                  <tbody className="text-gray-400">
                    {[
                      ['status',        'string',  'Filtrar por status (ex: SHIPPED, PROCESSING)'],
                      ['page',          'number',  'Página (padrão: 1)'],
                      ['limit',         'number',  'Itens por página (padrão: 20, máx: 100)'],
                      ['warehouseCode', 'string',  'Filtrar por galpão (se não restrito pelo app)'],
                    ].map(([p, t, d]) => (
                      <tr key={p} className="border-b border-gray-800/50">
                        <td className="py-2 pr-4"><code className="text-blue-400">{p}</code></td>
                        <td className="py-2 pr-4 text-gray-500">{t}</td>
                        <td className="py-2">{d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <H3>Resposta</H3>
              <Code>{`
{
  "data": [
    {
      "id": "cm9x1abc",
      "status": "SHIPPED",
      "total": 149.90,
      "warehouseCode": "galpao-sp",
      "customer": {
        "name": "João Silva",
        "email": "joao@email.com",
        "phone": "11999998888"
      },
      "address": {
        "street": "Rua das Flores",
        "number": "123",
        "city": "São Paulo",
        "state": "SP",
        "zipCode": "01310-100"
      },
      "items": [
        { "productId": "abc", "name": "Produto X", "qty": 2, "price": 74.95 }
      ],
      "createdAt": "2026-02-20T14:30:00.000Z",
      "updatedAt": "2026-02-21T09:15:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "pages": 8
  }
}
              `}</Code>

              <H3>PATCH /api/v1/orders/:id</H3>
              <P>Atualiza status ou campos de rastreio. Requer <code className="text-blue-400">orders:write</code>.</P>

              <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-4 mb-4">
                <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-2">⛓ Cadeia de pré-requisitos</p>
                <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                  <li>Pagamento aprovado (<code className="text-green-400">paymentStatus: APPROVED</code>)</li>
                  <li>Emitir NF-e → <code className="text-blue-400">POST /api/v1/invoices/:id/emit</code></li>
                  <li>Gerar etiqueta → <code className="text-blue-400">POST /api/v1/labels/:id/generate</code></li>
                  <li>Então marcar <code className="text-blue-400">SHIPPED</code> com <code className="text-blue-400">trackingCode</code></li>
                </ol>
                <p className="text-xs text-yellow-600 mt-2">⚠ <code>DELIVERED</code> é definido automaticamente pelo sistema via rastreamento Correios — não pode ser enviado pelo app.</p>
              </div>

              <P>Status aceitos pelo PATCH:</P>
              <div className="flex flex-wrap gap-2 mb-4">
                {['PROCESSING','SHIPPED','CANCELLED'].map(s => (
                  <code key={s} className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">{s}</code>
                ))}
              </div>

              <Code>{`
// Marcar como enviado (trackingCode obrigatório)
{
  "status": "SHIPPED",
  "trackingCode": "BR123456789BR",
  "trackingUrl": "https://rastreio.correios.com.br/"
}

// Response 200
{
  "data": { "id": "cm9x1abc", "status": "SHIPPED", "updatedAt": "..." }
}

// Erro 422 — sem etiqueta gerada
{
  "error": "Etiqueta não gerada para este pedido.",
  "prerequisite": "Gere a etiqueta antes de marcar como SHIPPED.",
  "nextStep": "/api/v1/labels/cm9x1abc/generate"
}
              `}</Code>

              <H3>GET /api/v1/orders/:id/return</H3>
              <P>Consulta solicitações de troca/devolução de um pedido. Requer <code className="text-blue-400">orders:read</code>.</P>
              <Code>{`
{
  "data": {
    "orderId": "cm9x1abc",
    "orderStatus": "DELIVERED",
    "hasReturn": true,
    "returns": [
      {
        "id": "ret_xyz789",
        "type": "RETURN",
        "reason": "Produto com defeito de fabricação",
        "status": "APPROVED",
        "inspection": {
          "condition": "DAMAGED",
          "conditionLabel": "Produto danificado",
          "recommendation": "APPROVE",
          "notes": "Arranhão visível na lateral",
          "inspectedAt": "2026-02-25T10:00:00Z"
        },
        "requestedAt": "2026-02-23T09:00:00Z"
      }
    ]
  }
}
              `}</Code>

              <H3>POST /api/v1/orders/:id/return</H3>
              <P>Abre solicitação de troca ou devolução. Requer <code className="text-blue-400">orders:write</code>. O pedido deve estar com status <code className="text-blue-400">DELIVERED</code>.</P>
              <Code>{`
// Request body
{
  "type": "RETURN",          // RETURN = devolução | EXCHANGE = troca
  "reason": "Produto com defeito de fabricação",
  "description": "A costura lateral veio desfeita.",  // opcional
  "itemIds": ["item_abc", "item_def"]                  // opcional; padrão = todos
}

// Response 201
{
  "data": {
    "id": "ret_xyz789",
    "orderId": "cm9x1abc",
    "type": "RETURN",
    "status": "PENDING",
    "requestedAt": "2026-02-25T10:00:00Z",
    "message": "Solicitação de devolução aberta. Aguarde análise."
  }
}

// Erro 422 — pedido não entregue
{
  "error": "O pedido não está com status DELIVERED.",
  "prerequisite": "O pedido precisa estar com status DELIVERED.",
  "orderStatus": "SHIPPED"
}
              `}</Code>
            </div>
          )}

          {/* ── PRODUTOS ──────────────────────────────────────── */}
          {active === 'products' && (
            <div>
              <H2>Produtos</H2>
              <P>Requer scope <code className="text-blue-400">products:read</code>.</P>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
                <Endpoint method="GET" path="/api/v1/products" desc="Listar produtos com estoque" />
              </div>

              <H3>Parâmetros</H3>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-gray-500 border-b border-gray-800">
                    <th className="pb-2 pr-4">Parâmetro</th><th className="pb-2">Descrição</th>
                  </tr></thead>
                  <tbody className="text-gray-400">
                    {[
                      ['search', 'Busca por nome ou SKU'],
                      ['categoryId', 'Filtrar por categoria'],
                      ['inStock', 'true para mostrar apenas com estoque'],
                      ['page / limit', 'Paginação padrão'],
                    ].map(([p, d]) => (
                      <tr key={p} className="border-b border-gray-800/50">
                        <td className="py-2 pr-4"><code className="text-blue-400">{p}</code></td>
                        <td className="py-2">{d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <H3>Resposta</H3>
              <Code>{`
{
  "data": [
    {
      "id": "prod_abc123",
      "name": "Camiseta Premium",
      "sku": "CAM-P-AZUL",
      "price": 89.90,
      "stock": 45,
      "category": "Roupas",
      "images": ["https://cdn.mydshop.com.br/img/abc.jpg"],
      "active": true
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 380 }
}
              `}</Code>
            </div>
          )}

          {/* ── FRETE ─────────────────────────────────────────── */}
          {active === 'shipping' && (
            <div>
              <H2>Cálculo de Frete</H2>
              <P>Calcule opções de frete para um destino. Requer scope <code className="text-blue-400">shipping:calculate</code>.</P>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
                <Endpoint method="POST" path="/api/v1/shipping/calculate" desc="Calcular opções de frete" />
              </div>

              <H3>Request</H3>
              <Code>{`
{
  "zipCodeDestination": "01310-100",
  "items": [
    { "weight": 0.5, "height": 10, "width": 15, "length": 20, "qty": 1 }
  ]
}
              `}</Code>

              <H3>Resposta</H3>
              <Code>{`
{
  "data": [
    {
      "service": "PAC",
      "carrier": "Correios",
      "price": 18.50,
      "deadline": 7,
      "deadlineLabel": "7 dias úteis"
    },
    {
      "service": "SEDEX",
      "carrier": "Correios",
      "price": 32.90,
      "deadline": 2,
      "deadlineLabel": "2 dias úteis"
    }
  ]
}
              `}</Code>
            </div>
          )}

          {/* ── WEBHOOKS ──────────────────────────────────────── */}
          {active === 'webhooks' && (
            <div>
              <H2>Webhooks</H2>
              <P>
                Webhooks enviam notificações em tempo real para a sua URL quando eventos ocorrem na plataforma.
                Requer scope <code className="text-blue-400">webhooks:manage</code>.
              </P>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
                <Endpoint method="GET"    path="/api/v1/webhooks"    desc="Listar webhooks cadastrados" />
                <Endpoint method="POST"   path="/api/v1/webhooks"    desc="Criar novo webhook" />
                <Endpoint method="DELETE" path="/api/v1/webhooks/:id" desc="Remover webhook" />
              </div>

              <H3>Criar webhook</H3>
              <Code>{`
// POST /api/v1/webhooks
{
  "url": "https://meuapp.com.br/webhook",
  "events": ["order.created", "order.shipped", "order.delivered"]
}
              `}</Code>

              <H3>Eventos disponíveis</H3>
              <div className="space-y-2 mt-2 mb-6">
                {[
                  ['order.created',   'Novo pedido criado'],
                  ['order.paid',      'Pagamento confirmado'],
                  ['order.shipped',   'Pedido enviado'],
                  ['order.delivered', 'Pedido entregue'],
                  ['order.cancelled', 'Pedido cancelado'],
                  ['order.refunded',  'Pedido reembolsado'],
                ].map(([e, d]) => (
                  <div key={e} className="flex items-center gap-3">
                    <code className="text-xs text-orange-400 bg-orange-950 px-2 py-1 rounded shrink-0">{e}</code>
                    <span className="text-sm text-gray-400">{d}</span>
                  </div>
                ))}
              </div>

              <H3>Payload recebido</H3>
              <P>Sua URL receberá um POST com o header <code className="text-yellow-400">X-Webhook-Signature</code> para validação:</P>
              <Code>{`
// Headers recebidos
{
  "X-Webhook-Signature": "sha256=<hmac_hex>",
  "X-Webhook-Event": "order.shipped",
  "Content-Type": "application/json"
}

// Body
{
  "event": "order.shipped",
  "timestamp": "2026-02-20T14:30:00.000Z",
  "data": {
    "orderId": "cm9x1abc",
    "status": "SHIPPED",
    "trackingCode": "BR123456789BR"
  }
}
              `}</Code>

              <H3>Validando a assinatura</H3>
              <Code lang="js">{`
const crypto = require('crypto')

function verifyWebhook(body, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )
}
              `}</Code>
            </div>
          )}

          {/* ── ETIQUETAS ─────────────────────────────────────── */}
          {active === 'labels' && (
            <div>
              <H2>Etiquetas</H2>
              <P>Gera a etiqueta de envio (PDF) via Correios e retorna a URL de download. Requer scope <code className="text-blue-400">labels:read</code>.</P>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
                <Endpoint method="POST" path="/api/v1/labels/:orderId/generate" desc="Gerar etiqueta de envio (Correios)" />
                <Endpoint method="GET"  path="/api/v1/labels/:orderId"          desc="Obter URL da etiqueta já gerada" />
              </div>

              <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-4 mb-6">
                <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-1">⛓ Pré-requisito</p>
                <p className="text-sm text-gray-300">A NF-e do pedido deve estar emitida (<code className="text-green-400">status: ISSUED</code>) antes de gerar a etiqueta.</p>
              </div>

              <H3>POST /api/v1/labels/:orderId/generate</H3>
              <Code>{`
// Response 201 — etiqueta gerada
{
  "data": {
    "orderId": "cm9x1abc",
    "labelUrl": "https://cdn.mydshop.com.br/labels/cm9x1abc.pdf",
    "carrier": "Correios",
    "service": "SEDEX",
    "trackingCode": "BR123456789BR",
    "prePostagemId": "PRE123456789",
    "generatedAt": "2026-02-20T14:30:00.000Z"
  }
}

// Erro 422 — NF-e não emitida
{
  "error": "Nota fiscal não emitida para este pedido.",
  "prerequisite": "Emita a NF-e antes de gerar a etiqueta.",
  "nextStep": "/api/v1/invoices/cm9x1abc/emit"
}
              `}</Code>
            </div>
          )}

          {/* ── NF-e ──────────────────────────────────────────── */}
          {active === 'invoices' && (
            <div>
              <H2>Notas Fiscais</H2>
              <P>Emissão e consulta de NF-e para pedidos. Requer scope <code className="text-blue-400">invoices:read</code>.</P>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
                <Endpoint method="POST" path="/api/v1/invoices/:orderId/emit" desc="Emitir NF-e para o pedido" />
                <Endpoint method="GET"  path="/api/v1/invoices/:orderId"      desc="Obter nota fiscal emitida" />
              </div>

              <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-4 mb-6">
                <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-1">⛓ Pré-requisitos</p>
                <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                  <li>Pagamento aprovado — <code className="text-green-400">paymentStatus: APPROVED</code></li>
                  <li>Pedido em separação — <code className="text-blue-400">status: PROCESSING</code></li>
                  <li>Regras fiscais configuradas no painel da filial/matriz</li>
                </ul>
              </div>

              <H3>POST /api/v1/invoices/:orderId/emit</H3>
              <Code>{`
// Response 201 — NF-e emitida com sucesso
{
  "data": {
    "orderId": "cm9x1abc",
    "invoiceId": "inv_abc123",
    "nfeNumber": "000123456",
    "nfeSeries": "001",
    "nfeKey": "35260201234567000199550010001234561000123456",
    "status": "ISSUED",
    "xmlUrl": "https://cdn.mydshop.com.br/nfe/cm9x1abc.xml",
    "pdfUrl": "https://cdn.mydshop.com.br/nfe/cm9x1abc.pdf",
    "issuedAt": "2026-02-20T15:00:00.000Z"
  }
}

// Erro 422 — pagamento não aprovado
{
  "error": "Pagamento não aprovado para este pedido.",
  "prerequisite": "O pagamento deve estar aprovado antes de emitir a NF-e.",
  "paymentStatus": "PENDING"
}

// Erro 400 — regras fiscais não configuradas
{
  "error": "Nenhuma regra fiscal configurada para esta filial.",
  "hint": "Configure as regras fiscais no painel: Configurações > Nota Fiscal."
}
              `}</Code>

              <H3>GET /api/v1/invoices/:orderId</H3>
              <Code>{`
{
  "data": {
    "orderId": "cm9x1abc",
    "nfeNumber": "000123456",
    "nfeSeries": "001",
    "nfeKey": "35260201234567000199550010001234561000123456",
    "status": "ISSUED",
    "xmlUrl": "https://cdn.mydshop.com.br/nfe/cm9x1abc.xml",
    "pdfUrl": "https://cdn.mydshop.com.br/nfe/cm9x1abc.pdf",
    "issuedAt": "2026-02-20T15:00:00.000Z"
  }
}
              `}</Code>
            </div>
          )}

          {/* ── TROCAS E DEVOLUÇÕES ───────────────────────────── */}
          {active === 'returns' && (
            <div>
              <H2>Trocas e Devoluções</H2>
              <P>
                Fluxo para abertura de troca/devolução pelo app e inspeção física pelo galpão.
                O administrador aprova ou rejeita via painel. Requer scope <code className="text-blue-400">orders:write</code>.
              </P>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
                <Endpoint method="POST" path="/api/v1/orders/:id/return"       desc="Abrir solicitação de troca ou devolução" />
                <Endpoint method="GET"  path="/api/v1/orders/:id/return"       desc="Consultar status da solicitação" />
                <Endpoint method="POST" path="/api/v1/returns/:returnId/inspect" desc="Registrar laudo de inspeção (galpão)" />
              </div>

              <div className="bg-blue-950 border border-blue-800 rounded-xl p-4 mb-6">
                <p className="text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">Fluxo completo</p>
                <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                  <li>App abre a solicitação → <code className="text-blue-400">POST /orders/:id/return</code></li>
                  <li>Admin aprova no painel (<code className="text-gray-400">/admin/devolucoes</code>)</li>
                  <li>Cliente envia o produto de volta (logística reversa)</li>
                  <li>Galpão recebe e registra laudo → <code className="text-blue-400">POST /returns/:returnId/inspect</code></li>
                  <li>Admin vê laudo no painel e conclui ou rejeita</li>
                </ol>
              </div>

              <H3>POST /api/v1/orders/:id/return</H3>
              <P>Pedido deve estar com status <code className="text-green-400">DELIVERED</code>. Só pode haver uma solicitação ativa por pedido.</P>
              <Code>{`
{
  "type": "RETURN",    // RETURN = devolução | EXCHANGE = troca
  "reason": "Produto com defeito de fabricação",
  "description": "A costura lateral veio desfeita.",  // opcional
  "itemIds": ["item_abc123"]                          // opcional; padrão = todos
}
              `}</Code>

              <H3>POST /api/v1/returns/:returnId/inspect</H3>
              <P>Chamado pelo galpão após receber fisicamente o produto. A solicitação deve estar com status <code className="text-green-400">APPROVED</code>. Só pode ser inspecionada uma vez.</P>
              <Code>{`
{
  "condition":      "GOOD",     // GOOD | DAMAGED | WRONG_PRODUCT | INCOMPLETE
  "recommendation": "APPROVE", // APPROVE | REJECT  — parecer do galpão
  "notes": "Produto em perfeito estado, sem sinais de uso.",
  "photos": [                   // opcional, até 10 URLs
    "https://seus-storage.com/photo1.jpg"
  ],
  "receivedAt": "2026-02-25T10:00:00Z"  // opcional; padrão = agora
}

// Response 200
{
  "returnRequestId": "ret_xyz789",
  "orderId": "cm9x1abc",
  "inspection": {
    "condition": "GOOD",
    "conditionLabel": "Produto em bom estado",
    "recommendation": "APPROVE",
    "notes": "Produto em perfeito estado, sem sinais de uso.",
    "inspectedAt": "2026-02-25T10:00:00Z",
    "warehouseCode": "galpao-sp"
  },
  "status": "APPROVED",
  "nextStep": "Informar administrador para concluir (reembolso/troca).",
  "message": "Inspeção registrada. Aguardando decisão do administrador."
}

// Erro 422 — solicitação não aprovada ainda
{
  "error": "Inspeção só é possível em solicitações com status APPROVED.",
  "currentStatus": "PENDING",
  "prerequisite": "Solicitar aprovação do administrador antes de inspecionar."
}

// Erro 409 — já inspecionado
{
  "error": "Esta solicitação já foi inspecionada pelo galpão."
}
              `}</Code>

              <H3>Valores de <code className="text-blue-400">condition</code></H3>
              <div className="space-y-2 mt-2">
                {[
                  ['GOOD',          'Produto em bom estado — adequado para troca/reestoque'],
                  ['DAMAGED',       'Produto danificado — avaria física visível'],
                  ['WRONG_PRODUCT', 'Produto diferente do que foi pedido'],
                  ['INCOMPLETE',    'Produto com partes faltando'],
                ].map(([v, d]) => (
                  <div key={v} className="flex items-start gap-3">
                    <code className="text-xs text-blue-400 bg-blue-950 px-2 py-1 rounded shrink-0">{v}</code>
                    <span className="text-sm text-gray-400">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ERROS ─────────────────────────────────────────── */}
          {active === 'errors' && (
            <div>
              <H2>Erros e Códigos HTTP</H2>
              <P>A API retorna erros no formato JSON com campo <code className="text-blue-400">error</code> (mensagem) e opcionalmente <code className="text-blue-400">code</code>.</P>

              <Code>{`
{
  "error": "Scope insuficiente",
  "code": "INSUFFICIENT_SCOPE"
}
              `}</Code>

              <H3>Códigos HTTP</H3>
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-gray-500 border-b border-gray-800">
                    <th className="pb-2 pr-4">Código</th>
                    <th className="pb-2 pr-4">Nome</th>
                    <th className="pb-2">Quando ocorre</th>
                  </tr></thead>
                  <tbody className="text-gray-400">
                    {[
                      ['200', 'OK',                   'Sucesso'],
                      ['201', 'Created',              'Recurso criado com sucesso (NF-e emitida, etiqueta gerada, devolução aberta)'],
                      ['400', 'Bad Request',           'Parâmetros inválidos ou faltando'],
                      ['401', 'Unauthorized',          'API Key inválida, assinatura incorreta ou timestamp expirado'],
                      ['403', 'Forbidden',             'Scope insuficiente para o recurso'],
                      ['404', 'Not Found',             'Recurso não encontrado'],
                      ['409', 'Conflict',              'Já existe recurso ativo (ex: devolução em andamento)'],
                      ['422', 'Unprocessable Entity',  'Pré-requisito não atendido na cadeia de operações'],
                      ['429', 'Too Many Requests',     'Limite de requests excedido'],
                      ['500', 'Internal Server Error', 'Erro interno — tente novamente'],
                    ].map(([code, name, desc]) => (
                      <tr key={code} className="border-b border-gray-800/50">
                        <td className="py-2 pr-4">
                          <code className={`text-sm font-mono ${code.startsWith('2') ? 'text-green-400' : code.startsWith('4') ? 'text-yellow-400' : 'text-red-400'}`}>{code}</code>
                        </td>
                        <td className="py-2 pr-4 text-gray-300">{name}</td>
                        <td className="py-2">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <H3>Códigos de erro internos</H3>
              <div className="space-y-2 mt-2">
                {[
                  ['INVALID_KEY',         'API Key não encontrada ou revogada'],
                  ['INVALID_SIGNATURE',    'Assinatura HMAC inválida'],
                  ['TIMESTAMP_EXPIRED',    'Timestamp fora da janela de 5 minutos'],
                  ['INSUFFICIENT_SCOPE',   'A chave não tem o scope necessário'],
                  ['FILTER_RESTRICTED',    'Recurso fora do filtro configurado para o app'],
                  ['PREREQUISITE_FAILED',  'Pré-requisito não atendido — verifique os campos prerequisite e nextStep'],
                  ['ALREADY_EXISTS',       'Recurso já criado (ex: devolução ou inspeção duplicada)'],
                ].map(([code, desc]) => (
                  <div key={code} className="flex items-start gap-3">
                    <code className="text-xs text-red-400 bg-red-950 px-2 py-1 rounded shrink-0">{code}</code>
                    <span className="text-sm text-gray-400">{desc}</span>
                  </div>
                ))}
              </div>

              <H3>Rate Limiting</H3>
              <P>
                Cada API Key tem limite de <strong className="text-white">1.000 requests/hora</strong>.
                Ao exceder, a API retorna <code className="text-yellow-400">429</code> com o header
                <code className="text-blue-400"> Retry-After</code> indicando quando tentar novamente.
              </P>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
