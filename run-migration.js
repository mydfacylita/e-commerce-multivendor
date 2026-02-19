const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function runMigration() {
  try {
    const sql = fs.readFileSync('/tmp/add-affiliate-system.sql', 'utf8');
    
    // Remover comentários e espaços em branco
    const cleanSql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    // Split por statement (ponto-e-vírgula seguido de quebra de linha)
    const statements = cleanSql
      .split(/;\s*[\r\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('/*'));
    
    console.log('Executando', statements.length, 'statements...\n');
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log((i+1) + '/' + statements.length + ':', stmt.substring(0, 70).replace(/\s+/g, ' ') + '...');
      try {
        await prisma.$executeRawUnsafe(stmt);
        console.log('   ✅ OK\n');
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('Duplicate') || err.code === 'P2010') {
          console.log('   ⚠️  Already exists (ignored)\n');
        } else {
          console.log('   ❌ Error:', err.message, '\n');
        }
      }
    }
    
    console.log('\n✅ Migration completed!');
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

runMigration();
