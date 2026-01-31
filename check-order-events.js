/**
 * Script para verificar eventos de pedidos do AliExpress
 * Uso: node check-order-events.js <orderId> [trackingCode]
 * 
 * IMPORTANTE: Usa a API DS correta (api-sg.aliexpress.com/sync)
 */

const orderId = process.argv[2] || '8208376838605015';
const trackingCode = process.argv[3] || '1507670097738968';

const API_URL = 'https://api-sg.aliexpress.com/sync';

async function checkOrderEvents() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔍 VERIFICAÇÃO DE EVENTOS DO PEDIDO ALIEXPRESS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📦 Order ID: ${orderId}`);
  console.log(`🚚 Tracking Code: ${trackingCode}`);
  console.log('───────────────────────────────────────────────────────────────');

  // Carregar configurações
  const { PrismaClient } = require('@prisma/client');
  const crypto = require('crypto');
  const prisma = new PrismaClient();

  try {
    // Buscar credenciais do AliExpress
    const auth = await prisma.aliExpressAuth.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!auth) {
      console.log('❌ Nenhuma autenticação AliExpress ativa encontrada');
      return;
    }

    console.log(`✅ Auth encontrada: App Key ${auth.appKey.substring(0, 8)}...`);
    console.log('───────────────────────────────────────────────────────────────');

    // Função para assinar requisição (HMAC-SHA256 para API DS)
    function signRequest(params, appSecret) {
      const sortedKeys = Object.keys(params).filter(k => k !== 'sign').sort();
      const signString = sortedKeys.map(k => `${k}${params[k]}`).join('');
      return crypto.createHmac('sha256', appSecret).update(signString).digest('hex').toUpperCase();
    }

    // ========== 1. BUSCAR DETALHES DO PEDIDO ==========
    console.log('\n📋 1. DETALHES DO PEDIDO');
    console.log('───────────────────────────────────────────────────────────────');
    
    const orderParams = {
      app_key: auth.appKey,
      session: auth.accessToken,
      method: 'aliexpress.trade.ds.order.get',
      sign_method: 'sha256',
      timestamp: Date.now().toString(),
      v: '2.0',
      format: 'json',
      single_order_query: JSON.stringify({
        order_id: parseInt(orderId)
      })
    };
    orderParams.sign = signRequest(orderParams, auth.appSecret);

    const orderResponse = await fetch(API_URL + '?' + new URLSearchParams(orderParams));
    const orderData = await orderResponse.json();
    
    // Capturar o service_name do pedido
    let logisticsServiceName = null;
    
    if (orderData.aliexpress_trade_ds_order_get_response?.result) {
      const order = orderData.aliexpress_trade_ds_order_get_response.result;
      console.log(`   Status: ${order.order_status}`);
      console.log(`   Logistics Status: ${order.logistics_status || 'N/A'}`);
      console.log(`   Valor: ${order.order_amount?.amount || 'N/A'} ${order.order_amount?.currency_code || ''}`);
      console.log(`   Criado: ${order.gmt_create}`);
      console.log(`   Loja: ${order.store_info?.store_name || 'N/A'}`);
      
      // Buscar informações de logística
      const logisticsInfo = order.logistics_info_list?.aeop_order_logistics_info || 
                           order.logistics_info_list?.order_logistics_info_dto;
      
      if (logisticsInfo) {
        const logList = Array.isArray(logisticsInfo) ? logisticsInfo : [logisticsInfo];
        console.log('\n   📦 Informações de Logística:');
        for (const log of logList) {
          console.log(`      - Tracking: ${log.logistics_no || 'N/A'}`);
          console.log(`      - Serviço: ${log.logistics_service || 'N/A'}`);
          console.log(`      - Status: ${log.logistics_status || 'N/A'}`);
          if (log.logistics_service) {
            logisticsServiceName = log.logistics_service;
          }
        }
      } else {
        console.log('\n   ⚠️ Sem informações de logística no pedido');
      }
    } else if (orderData.error_response) {
      console.log(`   ❌ Erro: ${orderData.error_response.msg} (${orderData.error_response.code})`);
    } else {
      console.log('   ❌ Erro ao buscar pedido:', JSON.stringify(orderData, null, 2));
    }

    // ========== 2. BUSCAR EVENTOS DE RASTREAMENTO ==========
    console.log('\n\n🚚 2. EVENTOS DE RASTREAMENTO');
    console.log('───────────────────────────────────────────────────────────────');
    
    // Usar o método correto: aliexpress.ds.order.tracking.get
    const trackingParams = {
      app_key: auth.appKey,
      session: auth.accessToken,
      method: 'aliexpress.ds.order.tracking.get',
      sign_method: 'sha256',
      timestamp: Date.now().toString(),
      v: '2.0',
      format: 'json',
      ae_order_id: orderId,
      language: 'pt_BR'
    };
    trackingParams.sign = signRequest(trackingParams, auth.appSecret);

    const trackingResponse = await fetch(API_URL + '?' + new URLSearchParams(trackingParams));
    const trackingData = await trackingResponse.json();
    
    if (trackingData.aliexpress_ds_order_tracking_get_response?.result?.ret) {
      const result = trackingData.aliexpress_ds_order_tracking_get_response.result;
      const data = result.data;
      
      console.log('   ✅ Eventos encontrados!');
      
      const trackingDetails = data.tracking_detail_line_list?.tracking_detail;
      if (trackingDetails) {
        const detailList = Array.isArray(trackingDetails) ? trackingDetails : [trackingDetails];
        
        for (const detail of detailList) {
          console.log(`\n   📦 Pacote: ${detail.mail_no}`);
          console.log(`   🚚 Transportadora: ${detail.carrier_name?.trim()}`);
          
          if (detail.eta_time_stamps) {
            const eta = new Date(detail.eta_time_stamps);
            console.log(`   📅 Previsão de entrega: ${eta.toLocaleDateString('pt-BR')}`);
          }
          
          const nodes = detail.detail_node_list?.detail_node;
          if (nodes) {
            const nodeList = Array.isArray(nodes) ? nodes : [nodes];
            console.log(`\n   📍 ${nodeList.length} eventos:\n`);
            
            for (const node of nodeList) {
              const time = new Date(node.time_stamp).toLocaleString('pt-BR');
              console.log(`   [${time}] ${node.tracking_name}`);
              console.log(`             ${node.tracking_detail_desc}`);
            }
          }
        }
      }
    } else if (trackingData.error_response) {
      console.log(`   ❌ Erro: ${trackingData.error_response.msg}`);
    } else {
      console.log('   ⚠️ Sem eventos');
      console.log('   Response:', JSON.stringify(trackingData, null, 2));
    }

    // ========== 3. VERIFICAR NO BANCO LOCAL ==========
    console.log('\n\n💾 3. DADOS NO BANCO LOCAL');
    console.log('───────────────────────────────────────────────────────────────');
    
    const localOrder = await prisma.order.findFirst({
      where: {
        OR: [
          { supplierOrderId: orderId },
          { trackingCode: trackingCode }
        ]
      },
      include: {
        items: true,
        user: { select: { name: true, email: true } }
      }
    });

    if (localOrder) {
      console.log(`   ✅ Pedido encontrado no banco local`);
      console.log(`   ID: ${localOrder.id}`);
      console.log(`   Cliente: ${localOrder.user?.name || 'N/A'}`);
      console.log(`   Status: ${localOrder.status}`);
      console.log(`   Tracking: ${localOrder.trackingCode || 'N/A'}`);
      console.log(`   Supplier Order ID: ${localOrder.supplierOrderId || 'N/A'}`);
      console.log(`   Criado: ${localOrder.createdAt}`);
      console.log(`   Itens: ${localOrder.items.length}`);
    } else {
      console.log('   ⚠️ Pedido não encontrado no banco local');
    }

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ Erro:', error);
    await prisma.$disconnect();
  }
}

checkOrderEvents();
