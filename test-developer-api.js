/**
 * Script de testes do Developer Portal
 * Uso: node test-developer-api.js
 *
 * Requer: uma API Key válida gerada no portal /developer/apps
 * Edite as variáveis abaixo antes de rodar.
 */

const crypto = require('crypto')

// ── CONFIGURAÇÃO ────────────────────────────────────────────────────────────
const API_KEY    = process.env.API_KEY    || 'COLE_AQUI_SUA_API_KEY'
const API_SECRET = process.env.API_SECRET || 'COLE_AQUI_SEU_API_SECRET'
const APP_ID     = process.env.APP_ID     || 'COLE_AQUI_SEU_APP_ID'
const BASE_URL   = process.env.BASE_URL   || 'http://localhost:3000'
// ────────────────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function sign(body = '') {
  const timestamp = Date.now().toString()
  const signature = crypto
    .createHmac('sha256', API_SECRET)
    .update(timestamp + body)
    .digest('hex')
  return { timestamp, signature }
}

async function req(method, path, body = null) {
  const bodyStr = body ? JSON.stringify(body) : ''
  const { timestamp, signature } = sign(bodyStr)
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'X-Api-Signature': signature,
      'X-Timestamp': timestamp,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: bodyStr } : {})
  }
  const res = await fetch(`${BASE_URL}${path}`, opts)
  const json = await res.json().catch(() => ({}))
  return { status: res.status, data: json }
}

async function test(name, fn) {
  try {
    await fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ❌ ${name}`)
    console.log(`     → ${err.message}`)
    failed++
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

// ── TESTES ──────────────────────────────────────────────────────────────────

async function runAll() {
  console.log('\n══════════════════════════════════════════')
  console.log('  MydShop Developer API — Testes')
  console.log('══════════════════════════════════════════\n')

  // Verificação inicial
  if (API_KEY === 'COLE_AQUI_SUA_API_KEY') {
    console.log('⚠️  Edite as variáveis API_KEY / API_SECRET / APP_ID no topo do arquivo')
    console.log('   ou passe como env vars:\n')
    console.log('   API_KEY=xxx API_SECRET=yyy APP_ID=zzz node test-developer-api.js\n')
    process.exit(1)
  }

  // ── 1. AUTENTICAÇÃO ──────────────────────────────────────────────────────
  console.log('📋 Autenticação\n')

  await test('Requisição sem bearer retorna 401', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/orders`)
    assert(res.status === 401, `esperado 401, recebido ${res.status}`)
  })

  await test('API Key inválida retorna 401', async () => {
    const { timestamp, signature } = sign('')
    const res = await fetch(`${BASE_URL}/api/v1/orders`, {
      headers: {
        'Authorization': 'Bearer key_invalida',
        'X-Api-Signature': signature,
        'X-Timestamp': timestamp,
      }
    })
    assert(res.status === 401, `esperado 401, recebido ${res.status}`)
  })

  await test('Assinatura inválida retorna 401', async () => {
    const timestamp = Date.now().toString()
    const res = await fetch(`${BASE_URL}/api/v1/orders`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'X-Api-Signature': 'assinatura_errada',
        'X-Timestamp': timestamp,
      }
    })
    assert(res.status === 401, `esperado 401, recebido ${res.status}`)
  })

  await test('Timestamp expirado retorna 401', async () => {
    const oldTimestamp = (Date.now() - 10 * 60 * 1000).toString() // 10 min atrás
    const sig = crypto.createHmac('sha256', API_SECRET).update(oldTimestamp).digest('hex')
    const res = await fetch(`${BASE_URL}/api/v1/orders`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'X-Api-Signature': sig,
        'X-Timestamp': oldTimestamp,
      }
    })
    assert(res.status === 401, `esperado 401, recebido ${res.status}`)
  })

  await test('Credenciais válidas retornam 200', async () => {
    const r = await req('GET', '/api/v1/orders')
    assert(r.status === 200, `esperado 200, recebido ${r.status}: ${JSON.stringify(r.data)}`)
  })

  // ── 2. PEDIDOS ───────────────────────────────────────────────────────────
  console.log('\n📦 Pedidos\n')

  let firstOrderId = null

  await test('GET /api/v1/orders → retorna data + pagination', async () => {
    const r = await req('GET', '/api/v1/orders')
    assert(r.status === 200, `status ${r.status}`)
    assert(Array.isArray(r.data.data), 'data.data deve ser array')
    assert(r.data.pagination, 'deve ter pagination')
    assert(typeof r.data.pagination.total === 'number', 'pagination.total deve ser number')
    if (r.data.data.length > 0) firstOrderId = r.data.data[0].id
    console.log(`     → ${r.data.pagination.total} pedidos encontrados`)
  })

  await test('GET /api/v1/orders?limit=5 → respeita limit', async () => {
    const r = await req('GET', '/api/v1/orders?limit=5')
    assert(r.status === 200, `status ${r.status}`)
    assert(r.data.data.length <= 5, `esperado ≤5, recebido ${r.data.data.length}`)
  })

  await test('GET /api/v1/orders?page=1 → paginação funciona', async () => {
    const r = await req('GET', '/api/v1/orders?page=1&limit=2')
    assert(r.status === 200, `status ${r.status}`)
    assert(r.data.pagination.page === 1, 'page deve ser 1')
  })

  if (firstOrderId) {
    await test(`GET /api/v1/orders/${firstOrderId} → retorna pedido específico`, async () => {
      const r = await req('GET', `/api/v1/orders/${firstOrderId}`)
      assert(r.status === 200, `status ${r.status}`)
      assert(r.data.data?.id === firstOrderId, 'id deve bater')
    })
  } else {
    console.log('  ⏭️  Nenhum pedido para testar GET /orders/:id (banco vazio)')
  }

  await test('GET /api/v1/orders/:id inválido → 404', async () => {
    const r = await req('GET', '/api/v1/orders/id_que_nao_existe_xyz')
    assert(r.status === 404, `esperado 404, recebido ${r.status}`)
  })

  // ── 3. PRODUTOS ──────────────────────────────────────────────────────────
  console.log('\n🛍️  Produtos\n')

  await test('GET /api/v1/products → retorna array', async () => {
    const r = await req('GET', '/api/v1/products')
    assert(r.status === 200 || r.status === 403, `status inesperado ${r.status}`)
    if (r.status === 200) {
      assert(Array.isArray(r.data.data), 'data.data deve ser array')
      console.log(`     → ${r.data.data.length} produtos (página 1)`)
    } else {
      console.log('     → scope products:read não concedido (esperado se não selecionado)')
    }
  })

  // ── 4. FRETE ─────────────────────────────────────────────────────────────
  console.log('\n🚚 Frete\n')

  await test('POST /api/v1/shipping/calculate → retorna opções', async () => {
    const r = await req('POST', '/api/v1/shipping/calculate', {
      zipCodeDestination: '01310-100',
      items: [{ weight: 0.5, height: 10, width: 15, length: 20, qty: 1 }]
    })
    assert(r.status === 200 || r.status === 403 || r.status === 422, `status inesperado ${r.status}`)
    if (r.status === 200) {
      assert(Array.isArray(r.data.data), 'data.data deve ser array')
      console.log(`     → ${r.data.data.length} opções de frete`)
    } else {
      console.log(`     → status ${r.status}: ${r.data.error || JSON.stringify(r.data)}`)
    }
  })

  // ── 5. WEBHOOKS ──────────────────────────────────────────────────────────
  console.log('\n🔔 Webhooks\n')

  let createdWebhookId = null

  await test('GET /api/v1/webhooks → lista webhooks', async () => {
    const r = await req('GET', '/api/v1/webhooks')
    assert(r.status === 200 || r.status === 403, `status ${r.status}`)
    if (r.status === 200) {
      assert(Array.isArray(r.data.data), 'data.data deve ser array')
      console.log(`     → ${r.data.data.length} webhooks`)
    }
  })

  await test('POST /api/v1/webhooks → cria webhook de teste', async () => {
    const r = await req('POST', '/api/v1/webhooks', {
      url: 'https://webhook.site/teste-mydshop',
      events: ['order.created', 'order.shipped']
    })
    assert(r.status === 201 || r.status === 200 || r.status === 403, `status ${r.status}`)
    if (r.status === 201 || r.status === 200) {
      createdWebhookId = r.data.data?.id
      console.log(`     → criado: ${createdWebhookId}`)
    }
  })

  if (createdWebhookId) {
    await test(`DELETE /api/v1/webhooks/${createdWebhookId} → remove webhook de teste`, async () => {
      const r = await req('DELETE', `/api/v1/webhooks/${createdWebhookId}`)
      assert(r.status === 200 || r.status === 204, `status ${r.status}`)
      console.log('     → webhook de teste removido')
    })
  }

  // ── 6. PORTAL DEVELOPER (endpoints de gerenciamento) ─────────────────────
  console.log('\n🔧 Gerenciamento do Portal (requer sessão ativa)\n')

  await test('GET /api/developer/apps → acessível sem autenticação de dev (retorna 401)', async () => {
    const res = await fetch(`${BASE_URL}/api/developer/apps`)
    assert(res.status === 401, `esperado 401, recebido ${res.status}`)
  })

  // ── 7. PÁGINAS DO PORTAL ──────────────────────────────────────────────────
  console.log('\n🌐 Páginas do Portal\n')

  for (const [name, path] of [
    ['Landing /',                '/developer'],
    ['Login /developer/login',   '/developer/login'],
    ['Dashboard',                '/developer/dashboard'],
    ['Docs',                     '/developer/docs'],
  ]) {
    await test(`${name} → HTTP 200`, async () => {
      const res = await fetch(`${BASE_URL}${path}`)
      assert(res.status === 200, `esperado 200, recebido ${res.status} em ${path}`)
    })
  }

  // ── RESULTADO FINAL ───────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════')
  const total = passed + failed
  console.log(`  Total: ${total} testes`)
  console.log(`  ✅ Passou: ${passed}`)
  console.log(`  ❌ Falhou: ${failed}`)
  console.log('══════════════════════════════════════════\n')

  process.exit(failed > 0 ? 1 : 0)
}

runAll().catch(err => {
  console.error('Erro crítico:', err)
  process.exit(1)
})
