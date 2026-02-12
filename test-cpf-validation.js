// Teste da validação de CPF usado na página de afiliado
// Para testar: node test-cpf-validation.js

// Função para validar CPF (copiada da página)
const validateCPF = (cpf) => {
  cpf = cpf.replace(/[^\d]/g, '')
  
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false
  
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i)
  }
  let digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cpf.charAt(9))) return false
  
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i)
  }
  digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cpf.charAt(10))) return false
  
  return true
}

// Função para formatar CPF (copiada da página)
const formatCPF = (value) => {
  const cleaned = value.replace(/[^\d]/g, '')
  if (cleaned.length <= 3) return cleaned
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`
  if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`
}

console.log('🧪 TESTANDO VALIDAÇÃO DE CPF\n');

// Testes com CPFs válidos
const cpfsValidos = [
  '11144477735',
  '502.103.703-43', // CPF do screenshot
  '123.456.789-09',
  '000.000.001-91'
];

console.log('✅ TESTANDO CPFs VÁLIDOS:');
cpfsValidos.forEach(cpf => {
  const resultado = validateCPF(cpf);
  const formatado = formatCPF(cpf);
  console.log(`   ${cpf} → ${formatado} → ${resultado ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
});

// Testes com CPFs inválidos
const cpfsInvalidos = [
  '111.111.111-11', // Todos os dígitos iguais
  '123.456.789-00', // Dígitos verificadores incorretos
  '123456789',      // Menos de 11 dígitos
  '1234567890123',  // Mais de 11 dígitos
  '502.103.703-99'  // Dígito verificador errado
];

console.log('\n❌ TESTANDO CPFs INVÁLIDOS:');
cpfsInvalidos.forEach(cpf => {
  const resultado = validateCPF(cpf);
  const formatado = formatCPF(cpf);
  console.log(`   ${cpf} → ${formatado} → ${resultado ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
});

// Teste do CPF específico do screenshot
console.log('\n🔍 TESTE ESPECÍFICO DO SCREENSHOT:');
const cpfScreenshot = '502.103.703-4'; // Como está aparecendo no campo
const cpfCompletoScreenshot = '502.103.703-43';

console.log(`CPF do campo: "${cpfScreenshot}" → ${validateCPF(cpfScreenshot) ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
console.log(`CPF completo: "${cpfCompletoScreenshot}" → ${validateCPF(cpfCompletoScreenshot) ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);

console.log('\nFormatação:');
console.log(`"50210370343" → "${formatCPF('50210370343')}"`);