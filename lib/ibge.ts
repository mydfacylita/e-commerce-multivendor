/**
 * Busca código IBGE do município pelo CEP
 */
export async function buscarCodigoIBGEPorCEP(cep: string): Promise<string | null> {
  try {
    const cepLimpo = cep.replace(/\D/g, '')
    
    if (cepLimpo.length !== 8) {
      console.error('CEP inválido:', cep)
      return null
    }

    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
    
    if (!response.ok) {
      console.error('Erro ao consultar ViaCEP:', response.status)
      return null
    }

    const data = await response.json()
    
    if (data.erro) {
      console.error('CEP não encontrado:', cep)
      return null
    }

    // ViaCEP retorna o código IBGE do município
    return data.ibge || null
  } catch (error) {
    console.error('Erro ao buscar código IBGE:', error)
    return null
  }
}

/**
 * Tabela de códigos IBGE de capitais (fallback)
 */
export const codigosIBGECapitais: Record<string, string> = {
  'AC': '1200401', // Rio Branco
  'AL': '2704302', // Maceió
  'AP': '1600303', // Macapá
  'AM': '1302603', // Manaus
  'BA': '2927408', // Salvador
  'CE': '2304400', // Fortaleza
  'DF': '5300108', // Brasília
  'ES': '3205309', // Vitória
  'GO': '5208707', // Goiânia
  'MA': '2111300', // São Luís
  'MT': '5103403', // Cuiabá
  'MS': '5002704', // Campo Grande
  'MG': '3106200', // Belo Horizonte
  'PA': '1501402', // Belém
  'PB': '2507507', // João Pessoa
  'PR': '4106902', // Curitiba
  'PE': '2611606', // Recife
  'PI': '2211001', // Teresina
  'RJ': '3304557', // Rio de Janeiro
  'RN': '2408102', // Natal
  'RS': '4314902', // Porto Alegre
  'RO': '1100205', // Porto Velho
  'RR': '1400100', // Boa Vista
  'SC': '4205407', // Florianópolis
  'SP': '3550308', // São Paulo
  'SE': '2800308', // Aracaju
  'TO': '1721000', // Palmas
}
