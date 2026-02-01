const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  const apiKey = 'AIzaSyBJWzTTv7aLKfZL-ujrUatRkuybdW4lL-8';
  
  console.log('Testando chave:', apiKey.substring(0, 10) + '...');
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Listar modelos disponíveis primeiro
    console.log('\nTestando modelo gemini-1.5-flash...');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent('Diga apenas "OK" se você está funcionando.');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Resposta:', text);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('\n⚠️ A chave é inválida ou expirou.');
      console.log('Crie uma nova em: https://aistudio.google.com/app/apikey');
    }
  }
}

testGemini();
