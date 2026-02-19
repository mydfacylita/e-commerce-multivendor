const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function fixColumns() {
  try {
    const sql = fs.readFileSync('/tmp/fix-missing-columns.sql', 'utf8');
    
    const statements = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')
      .split(/;\s*[\r\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log('Executando', statements.length, 'statements...\n');
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log((i+1) + '/', statements.length, ':', stmt.substring(0, 70).replace(/\s+/g, ' ') + '...');
      try {
        await prisma.$executeRawUnsafe(stmt);
        console.log('   ✅ OK\n');
      } catch (err) {
        if (err.message.includes('Duplicate column') || err.code === 'P2010') {
          console.log('   ⚠️  Already exists (ignored)\n');
        } else {
          console.log('   ❌ Error:', err.message, '\n');
        }
      }
    }
    
    console.log('✅ Colunas adicionadas!');
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixColumns();
