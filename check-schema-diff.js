const mysql = require('mysql2/promise');

async function checkSchemaDifferences() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ecommerce'
  });

  console.log('🔍 VERIFICANDO DIFERENÇAS ENTRE SCHEMA PRISMA E BANCO DE DADOS\n');

  // Campos que sabemos que deveriam existir baseado no schema Prisma
  const expectedFields = {
    'order': [
      'parentOrderId',
      'correiosIdPrePostagem', 
      'deliveryDays',
      'expeditionNotes',
      'labelPrintedAt',
      'packagingBoxId',
      'packedAt',
      'packedBy',
      'separatedAt',
      'separatedBy',
      'shippedAt',
      'shippedBy',
      'shippingCarrier',
      'shippingLabel',
      'shippingLabelType',
      'shippingMethod',
      'shippingService',
      'fraudScore',
      'fraudReasons',
      'fraudStatus',
      'fraudCheckedAt',
      'fraudCheckedBy',
      'fraudNotes',
      'ipAddress',
      'userAgent',
      'importTax',
      'icmsTax',
      'deliveredAt',
      'deliveredBy',
      'receiverName',
      'receiverDocument',
      'deliveryNotes',
      'deliveryPhoto',
      'deliveryAttempts',
      'affiliateId',
      'affiliateCode',
      'couponCode',
      'discountAmount',
      'subtotal'
    ],
    'affiliate_sale': [
      'availableAt'  // Este já existe, vamos confirmar
    ],
    'user': [
      'blockedAt',
      'blockedReason',
      'workForSellerId',
      'employeeRole'
    ]
  };

  for (const [tableName, fields] of Object.entries(expectedFields)) {
    console.log(`\n📋 TABELA: ${tableName.toUpperCase()}`);
    console.log('━'.repeat(50));

    try {
      // Buscar campos existentes na tabela
      const [existingFields] = await connection.execute(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = 'ecommerce' 
         AND TABLE_NAME = ?`,
        [tableName]
      );

      const existingFieldNames = existingFields.map(row => row.COLUMN_NAME);

      // Verificar quais campos estão faltando
      const missingFields = fields.filter(field => !existingFieldNames.includes(field));
      const presentFields = fields.filter(field => existingFieldNames.includes(field));

      console.log(`✅ PRESENTES (${presentFields.length}):`);
      presentFields.forEach(field => console.log(`   ✓ ${field}`));

      if (missingFields.length > 0) {
        console.log(`\n❌ FALTANDO (${missingFields.length}):`);
        missingFields.forEach(field => console.log(`   ✗ ${field}`));
      } else {
        console.log(`\n🎉 Todos os campos esperados estão presentes!`);
      }

    } catch (error) {
      console.log(`❌ Erro ao verificar tabela ${tableName}: ${error.message}`);
    }
  }

  // Verificar se todas as tabelas do schema existem
  console.log(`\n\n🏗️  VERIFICANDO TABELAS PRINCIPAIS\n`);
  console.log('━'.repeat(50));

  const expectedTables = [
    'affiliate',
    'affiliate_sale', 
    'affiliate_withdrawal',
    'affiliate_click',
    'seller_account',
    'seller_account_transaction',
    'coupon',
    'coupon_usage',
    'customer_cashback',
    'cashback_rule',
    'cashback_transaction'
  ];

  const [existingTables] = await connection.execute(
    'SHOW TABLES'
  );
  const existingTableNames = existingTables.map(row => Object.values(row)[0]);

  for (const tableName of expectedTables) {
    const exists = existingTableNames.includes(tableName);
    console.log(`${exists ? '✅' : '❌'} ${tableName}${exists ? '' : ' (FALTANDO)'}`);
  }

  await connection.end();
}

checkSchemaDifferences().catch(console.error);