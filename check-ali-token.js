const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const r = await prisma.aliExpressAuth.findFirst();
  if (!r) { console.log('SEM REGISTRO na tabela aliexpressauth'); return; }
  console.log('appKey:', r.appKey ? 'OK (' + r.appKey.substring(0,8) + '...)' : 'VAZIO');
  console.log('accessToken:', r.accessToken ? r.accessToken.substring(0,30)+'...' : 'VAZIO');
  console.log('refreshToken:', r.refreshToken ? r.refreshToken.substring(0,30)+'...' : 'VAZIO');
  console.log('tokenExpiry:', r.tokenExpiry);
  console.log('updatedAt:', r.updatedAt);
  const now = new Date();
  if (r.tokenExpiry) {
    const diff = new Date(r.tokenExpiry).getTime() - now.getTime();
    if (diff < 0) {
      console.log('>>> TOKEN EXPIRADO há', Math.abs(Math.round(diff/86400000)), 'dias');
    } else {
      console.log('>>> Token válido, expira em', Math.round(diff/86400000), 'dias');
    }
  } else {
    console.log('>>> tokenExpiry não definido — verificando manualmente...');
    // Access tokens do AliExpress DS expiram em 30 dias
    const tokenAge = now.getTime() - new Date(r.updatedAt).getTime();
    const ageDays = Math.round(tokenAge/86400000);
    console.log('>>> Token tem', ageDays, 'dias desde última atualização');
    if (ageDays > 30) console.log('>>> PROVÁVEL EXPIRAÇÃO (>30 dias)');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
