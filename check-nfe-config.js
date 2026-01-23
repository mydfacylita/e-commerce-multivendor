const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  
  const config = await prisma.systemConfig.findFirst({
    where: { key: 'nfe_config' }
  });
  
  if (config) {
    const v = JSON.parse(config.value);
    console.log('=== Config NF-e do Banco ===');
    console.log('naturezaOperacao:', v.naturezaOperacao);
    console.log('cfopPadrao:', v.cfopPadrao);
    console.log('\n=== taxRules salvos ===');
    console.log(JSON.stringify(v.taxRules, null, 2));
  } else {
    console.log('Nenhuma config encontrada');
  }
  
  await prisma.$disconnect();
})();
