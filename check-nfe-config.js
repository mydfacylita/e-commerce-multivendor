const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  
  const config = await prisma.systemConfig.findFirst({
    where: { key: 'nfe_config' }
  });
  
  if (config) {
    const v = JSON.parse(config.value);
    // Corrigir regime para NORMAL (CRT=3) conforme SINTEGRA/SEFAZ MA
    v.emitenteCrt = '3';
    v.emitenteRegimeTributario = '3';
    await prisma.systemConfig.update({
      where: { id: config.id },
      data: { value: JSON.stringify(v) }
    });
    console.log('CRT alterado para:', v.emitenteCrt);
    console.log('Regime Tributário alterado para:', v.emitenteRegimeTributario);
    console.log('OK - Regime Normal configurado');
  } else {
    console.log('Nenhuma config encontrada');
  }
  
  await prisma.$disconnect();
})();
