const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  
  const config = await prisma.systemConfig.findFirst({
    where: { key: 'nfe_config' }
  });
  
  if (config) {
    const v = JSON.parse(config.value);
    v.sefazAmbiente = 'homologacao';
    v.ambiente = 'homologacao';
    await prisma.systemConfig.update({
      where: { id: config.id },
      data: { value: JSON.stringify(v) }
    });
    console.log('Ambiente alterado para HOMOLOGACAO');
    console.log('sefazAmbiente:', v.sefazAmbiente);
    console.log('ambiente:', v.ambiente);
  } else {
    console.log('Nenhuma config encontrada');
  }
  
  await prisma.$disconnect();
})();
