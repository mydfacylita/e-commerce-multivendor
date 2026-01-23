// Teste de Pré-postagem com campos corretos do schema
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPrePostagem() {
  try {
    // Buscar credenciais - estão em chaves separadas
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: {
          startsWith: 'correios.'
        }
      }
    });
    
    // Converter para objeto
    const correios = {};
    for (const c of configs) {
      const key = c.key.replace('correios.', '');
      correios[key] = c.value;
    }
    
    console.log('=== Credenciais ===');
    console.log('Usuario:', correios.usuario);
    console.log('Cartão:', correios.cartaoPostagem);
    console.log('CEP Origem:', correios.cepOrigem);
    console.log('Código Acesso:', correios.codigoAcesso ? 'SIM' : 'NÃO');
    
    // 1. Obter token
    console.log('\n=== Obtendo Token ===');
    const authString = Buffer.from(`${correios.usuario}:${correios.codigoAcesso}`).toString('base64');
    
    const tokenResponse = await fetch('https://api.correios.com.br/token/v1/autentica/cartaopostagem', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ numero: correios.cartaoPostagem })
    });
    
    const tokenData = await tokenResponse.json();
    console.log('Token obtido:', tokenData.token ? 'SIM' : 'NÃO');
    
    if (!tokenData.token) {
      console.error('Erro ao obter token:', tokenData);
      return;
    }
    
    // 2. Criar pré-postagem com campos corretos do schema
    console.log('\n=== Criando Pré-postagem ===');
    
    // Payload conforme RequestPrePostagemExternaDTO
    const payload = {
      // Remetente (RemetenteDTO)
      remetente: {
        nome: "MYD E-commerce Ltda",  // Obrigatório - min 3, max 50
        cpfCnpj: correios.usuario,    // Campo correto - não é "documento"
        endereco: {  // EnderecoRemetenteDTO - todos obrigatórios
          cep: correios.cepOrigem,
          logradouro: "Rua Principal",
          numero: "100",
          bairro: "Centro",
          cidade: "Sao Luis",
          uf: "MA"
        }
      },
      
      // Destinatário (DestinatarioDTO)
      destinatario: {
        nome: "Cliente Teste",  // Obrigatório - min 3, max 50
        cpfCnpj: "12345678909",
        endereco: {  // EnderecoDestinatarioDTO
          cep: "01310100",
          logradouro: "Avenida Paulista",
          numero: "1000",
          bairro: "Bela Vista",
          cidade: "Sao Paulo",
          uf: "SP",
          regiao: "Sudeste"  // Obrigatório no schema
        }
      },
      
      // Código do serviço (SEDEX=03220)
      codigoServico: "03220",
      
      // Peso em gramas (string, max 6 dígitos)
      pesoInformado: "500",
      
      // Formato: 1-Envelope, 2-Caixa/Pacote, 3-Cilindro
      codigoFormatoObjetoInformado: "2",
      
      // Dimensões em cm (strings, obrigatório para formato 2-Caixa)
      alturaInformada: "10",
      larguraInformada: "15",
      comprimentoInformado: "20",
      
      // Declaração de conteúdo (obrigatório - ItemDeclaracaoConteudo[])
      itensDeclaracaoConteudo: [
        {
          conteudo: "Produto Teste Ecommerce",
          quantidade: "1",
          valor: "100.00"
        }
      ],
      
      // Indica que NÃO é objeto proibido ("1" = permitido)
      cienteObjetoNaoProibido: "1",
      
      // Opcionais
      solicitarColeta: "N",
      logisticaReversa: "N"
    };
    
    console.log('\nPayload:');
    console.log(JSON.stringify(payload, null, 2));
    
    const response = await fetch('https://api.correios.com.br/prepostagem/v1/prepostagens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    console.log('\nStatus:', response.status, response.statusText);
    
    const result = await response.json();
    console.log('\nResposta:');
    console.log(JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ PRÉ-POSTAGEM CRIADA COM SUCESSO!');
      console.log('Código de Rastreio:', result.codigoObjeto);
    } else {
      console.log('\n❌ Erro ao criar pré-postagem');
    }
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPrePostagem();
