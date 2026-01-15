// Script para testar consulta de frete via API direta

const crypto = require('crypto')

const productId = '1005010001264169' // ID do produto da screenshot

async function testFreightDirect() {
  try {
    console.log('🔍 Testando consulta de frete para produto:', productId)
    
    // Buscar credenciais do banco (simulando)
    // Você pode pegar esses dados do banco ou da interface
    const appKey = '524396' // Substitua pelo seu AppKey
    const appSecret = 'XXXX' // Substitua pelo seu AppSecret  
    const accessToken = 'XXXX' // Substitua pelo seu Access Token
    
    if (!appKey || appKey === 'XXXX') {
      console.log('❌ Configure as credenciais no script primeiro')
      console.log('- Acesse /admin/integracao/aliexpress')
      console.log('- Copie AppKey, AppSecret e Access Token')
      console.log('- Cole no script debug-product-freight.js')
      return
    }

    const apiUrl = 'https://api-sg.aliexpress.com/sync'
    const timestamp = Date.now().toString()

    // Dados da consulta
    const queryDeliveryReq = {
      quantity: '1',
      shipToCountry: 'BR',
      productId: productId,
      language: 'en_US',
      currency: 'BRL',
      locale: 'pt_BR',
    }

    console.log('📋 Parâmetros da consulta:', JSON.stringify(queryDeliveryReq, null, 2))

    const params = {
      app_key: appKey,
      method: 'aliexpress.ds.freight.query',
      session: accessToken,
      timestamp: timestamp,
      format: 'json',
      v: '2.0',
      sign_method: 'sha256',
      queryDeliveryReq: JSON.stringify(queryDeliveryReq),
    }

    // Gerar assinatura
    const sortedKeys = Object.keys(params).filter(key => key !== 'sign').sort()
    const signString = sortedKeys.map(key => `${key}${params[key]}`).join('')
    const signature = crypto.createHmac('sha256', appSecret)
      .update(signString)
      .digest('hex')
      .toUpperCase()
    
    params.sign = signature

    const url = `${apiUrl}?${new URLSearchParams(params).toString()}`

    console.log('🌐 Fazendo requisição para AliExpress...')

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    const data = await response.json()

    console.log('\n📊 RESPOSTA COMPLETA:')
    console.log(JSON.stringify(data, null, 2))

    // Analisar resposta
    if (data.aliexpress_ds_freight_query_response?.result) {
      const result = data.aliexpress_ds_freight_query_response.result
      console.log('\n🔍 ANÁLISE:')
      console.log('- Success:', result.success)
      console.log('- Error Code:', result.error_code)
      console.log('- Error Message:', result.error_message)
      console.log('- Has Delivery Options:', !!result.delivery_options)
      
      if (result.delivery_options) {
        console.log('- Delivery Options Keys:', Object.keys(result.delivery_options))
      }
    } else {
      console.log('\n❌ Resposta inválida ou erro na API')
    }

  } catch (error) {
    console.error('❌ Erro na consulta:', error.message)
  }
}

testFreightDirect()