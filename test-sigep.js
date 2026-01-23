const fetch = require('node-fetch');

async function testarSOAP() {
  // Credenciais confirmadas pelo usuário
  const usuario = '24223868000119';
  const senha = '@91332785Mi';
  const cartaoPostagem = '0079864821';
  const cnpj = '24223868000119'; // CNPJ com 14 dígitos
  const codigoAdministrativo = '26014556';

  // Tentando buscaCliente com formato diferente
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cli="http://cliente.bean.master.sigep.bsb.correios.com.br/">
  <soapenv:Header/>
  <soapenv:Body>
    <cli:buscaCliente>
      <idContrato>${cnpj}</idContrato>
      <idCartaoPostagem>${cartaoPostagem}</idCartaoPostagem>
      <usuario>${usuario}</usuario>
      <senha><![CDATA[${senha}]]></senha>
    </cli:buscaCliente>
  </soapenv:Body>
</soapenv:Envelope>`;

  console.log('Testando SIGEP Web...');
  
  // Testando endpoint de HOMOLOGAÇÃO
  const url = 'https://apphom.correios.com.br/SigepMasterJPA/AtendeClienteService/AtendeCliente';
  console.log('URL:', url);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction': ''
      },
      body: body
    });
    
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Resposta:', text.substring(0, 2000));
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

testarSOAP();
