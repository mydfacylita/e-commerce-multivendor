// Testar busca de etiqueta PDF (assíncrono para objetos registrados)
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function testEtiqueta() {
  try {
    // Buscar credenciais
    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: 'correios.' } }
    });
    
    const correios = {};
    for (const c of configs) {
      correios[c.key.replace('correios.', '')] = c.value;
    }
    
    // 1. Obter token
    console.log('=== Obtendo Token ===');
    const authString = Buffer.from(`${correios.usuario}:${correios.codigoAcesso}`).toString('base64');
    
    const tokenResponse = await fetch('https://api.correios.com.br/token/v1/autentica/cartaopostagem', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ numero: correios.cartaoPostagem })
    });
    
    const tokenData = await tokenResponse.json();
    console.log('Token obtido:', tokenData.token ? 'SIM' : 'NÃO');
    
    // 2. Solicitar geração assíncrona do rótulo
    // O ID da pré-postagem que foi retornado ao criar
    const idPrePostagem = 'PReoXydWOtQyeZp1l0Ej0AcQ'; 
    const codigoObjeto = 'AB941183339BR';
    
    console.log('\n=== Solicitando Geração de Rótulo ===');
    console.log('ID Pré-postagem:', idPrePostagem);
    
    // POST /v1/prepostagens/rotulo/assincrono/pdf
    const solicitaResponse = await fetch(
      'https://api.correios.com.br/prepostagem/v1/prepostagens/rotulo/assincrono/pdf',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          idsPrePostagem: [idPrePostagem],
          tipoRotulo: 'P',      // P = Padrão
          formatoRotulo: 'ET'   // ET = Etiqueta
        })
      }
    );
    
    console.log('Status solicitação:', solicitaResponse.status, solicitaResponse.statusText);
    const solicitaResult = await solicitaResponse.json();
    console.log('Resultado:', JSON.stringify(solicitaResult, null, 2));
    
    if (solicitaResult.idRecibo) {
      // 3. Aguardar e buscar o PDF
      console.log('\n=== Aguardando processamento (3s) ===');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('\n=== Baixando Rótulo ===');
      const downloadResponse = await fetch(
        `https://api.correios.com.br/prepostagem/v1/prepostagens/rotulo/download/assincrono/${solicitaResult.idRecibo}`,
        {
          headers: {
            'Authorization': `Bearer ${tokenData.token}`,
            'Accept': 'application/pdf,application/json'
          }
        }
      );
      
      console.log('Status download:', downloadResponse.status, downloadResponse.statusText);
      console.log('Content-Type:', downloadResponse.headers.get('content-type'));
      
      if (downloadResponse.ok) {
        const contentType = downloadResponse.headers.get('content-type');
        
        if (contentType?.includes('pdf')) {
          const buffer = Buffer.from(await downloadResponse.arrayBuffer());
          console.log('Tamanho do PDF:', buffer.length, 'bytes');
          fs.writeFileSync('etiqueta-teste.pdf', buffer);
          console.log('\n✅ Etiqueta salva em: etiqueta-teste.pdf');
        } else {
          const result = await downloadResponse.json();
          console.log('Resultado:', JSON.stringify(result, null, 2));
          
          // Se o PDF veio em base64
          if (result.dados) {
            const pdfBuffer = Buffer.from(result.dados, 'base64');
            console.log('Tamanho do PDF:', pdfBuffer.length, 'bytes');
            fs.writeFileSync('etiqueta-teste.pdf', pdfBuffer);
            console.log('\n✅ Etiqueta salva em: etiqueta-teste.pdf');
          }
        }
      } else {
        const text = await downloadResponse.text();
        console.log('Erro:', text);
      }
    }
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEtiqueta();
