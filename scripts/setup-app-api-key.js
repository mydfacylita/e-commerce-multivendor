/**
 * 🔑 Script para gerar e configurar API Key do App Móvel
 * 
 * Execute: node scripts/setup-app-api-key.js
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function setupApiKey() {
  console.log('🔑 Configurando API Key para o App Móvel...\n');

  try {
    // Verificar se já existe uma API Key
    const existingKey = await prisma.systemConfig.findFirst({
      where: { key: 'app.apiKey' }
    });

    if (existingKey) {
      console.log('✅ API Key já existe:');
      console.log(`   ${existingKey.value}\n`);
      console.log('⚠️  Para gerar uma nova, delete a configuração existente primeiro.');
      return existingKey.value;
    }

    // Gerar nova API Key
    const apiKey = `myd_${crypto.randomBytes(32).toString('hex')}`;

    // Salvar no banco
    await prisma.systemConfig.create({
      data: {
        key: 'app.apiKey',
        value: apiKey,
        description: 'API Key para o aplicativo móvel MYDSHOP',
        category: 'app',
        label: 'API Key do App Móvel'
      }
    });

    console.log('✅ API Key gerada com sucesso!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔑 SUA API KEY:');
    console.log(`   ${apiKey}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📱 Configure no app móvel em:');
    console.log('   mydshop-app/src/environments/environment.ts\n');
    console.log('   apiKey: "' + apiKey + '"');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return apiKey;
  } catch (error) {
    console.error('❌ Erro ao configurar API Key:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupApiKey().catch(console.error);
