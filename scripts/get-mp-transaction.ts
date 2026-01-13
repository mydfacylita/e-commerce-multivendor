import { prisma } from '../lib/prisma'

async function getTransactionDetails() {
  const transactionId = '141136014142'
  
  // Buscar credenciais do MP
  const gateway = await prisma.paymentGateway.findUnique({
    where: { gateway: 'MERCADOPAGO' }
  })

  if (!gateway) {
    console.log('Gateway não encontrado')
    return
  }

  const config = gateway.config as any
  const accessToken = config.accessToken

  // Buscar detalhes da transação
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${transactionId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  const data = await response.json()
  console.log(JSON.stringify(data, null, 2))
}

getTransactionDetails()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
