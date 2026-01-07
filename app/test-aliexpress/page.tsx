'use client';

import { useState } from 'react';

export default function AliExpressTestPage() {
  const [step, setStep] = useState<'get-code' | 'generate-sign'>('get-code');
  
  const [appKey, setAppKey] = useState('524396');
  const [appSecret, setAppSecret] = useState('RMz60S4TWtjk3TapvbJNsLStsiuZ351R');
  const [code, setCode] = useState('');
  const [timestamp, setTimestamp] = useState(Date.now().toString());
  const [signMethod, setSignMethod] = useState('sha256');
  
  const [authUrl, setAuthUrl] = useState('');
  const [signString, setSignString] = useState('');
  const [signature, setSignature] = useState('');
  const [finalUrl, setFinalUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Passo 1: Gerar URL OAuth para obter o code
  const generateAuthUrl = () => {
    const redirectUri = encodeURIComponent('https://rpg-alumni-like-jpg.trycloudflare.com/api/admin/integrations/aliexpress/oauth/callback');
    const url = `https://auth.aliexpress.com/oauth/authorize?response_type=code&client_id=${appKey}&redirect_uri=${redirectUri}&scope=ds_access&state=test123`;
    setAuthUrl(url);
  };

  // Passo 2: Gerar assinatura com o code obtido (no servidor)
  const generateSignature = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/test/calculate-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appKey,
          code,
          timestamp,
          signMethod
        })
      });

      const data = await res.json();

      setSignString(data.signString);
      setSignature(data.signature);
      setFinalUrl(data.finalUrl);
    } catch (error: any) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-2">🧪 AliExpress OAuth - Teste Passo a Passo</h1>
      <p className="text-gray-600 mb-8">Siga os passos para obter o code OAuth e gerar a assinatura correta</p>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b">
        <button
          onClick={() => setStep('get-code')}
          className={`px-6 py-3 font-semibold transition border-b-2 ${
            step === 'get-code' 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          1️⃣ Obter Code OAuth
        </button>
        <button
          onClick={() => setStep('generate-sign')}
          className={`px-6 py-3 font-semibold transition border-b-2 ${
            step === 'generate-sign' 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          2️⃣ Gerar Assinatura
        </button>
      </div>

      {/* Step 1: Get OAuth Code */}
      {step === 'get-code' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">📋 Configuração</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">App Key</label>
                <input
                  type="text"
                  value={appKey}
                  onChange={(e) => setAppKey(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">App Secret</label>
                <input
                  type="text"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={generateAuthUrl}
                className="w-full px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 font-semibold transition"
              >
                🔗 Gerar URL de Autorização
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">🌐 URL OAuth</h2>
            
            {authUrl ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">URL Gerada:</label>
                  <textarea
                    value={authUrl}
                    readOnly
                    rows={4}
                    className="w-full px-3 py-2 border rounded bg-gray-50 text-xs font-mono"
                  />
                </div>

                <a
                  href={authUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-4 py-3 bg-green-500 text-white text-center rounded hover:bg-green-600 font-semibold transition"
                >
                  🚀 Abrir URL no AliExpress
                </a>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm font-semibold mb-2">📝 Próximos passos:</p>
                  <ol className="text-sm space-y-1 list-decimal list-inside text-gray-700">
                    <li>Clique no botão acima para autorizar</li>
                    <li>Você será redirecionado com o <code className="bg-white px-1 rounded">code=</code> na URL</li>
                    <li>Copie o valor do <strong>code</strong></li>
                    <li>Vá para a aba "2️⃣ Gerar Assinatura"</li>
                  </ol>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400 py-12">
                <p>Clique em "Gerar URL" para começar</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Generate Signature */}
      {step === 'generate-sign' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">🔐 Parâmetros</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Code (OAuth) *</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="3_524396_XXXXXX"
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Timestamp (ms)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={timestamp}
                    onChange={(e) => setTimestamp(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setTimestamp(Date.now().toString())}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
                  >
                    Agora
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sign Method</label>
                <input
                  type="text"
                  value={signMethod}
                  readOnly
                  className="w-full px-3 py-2 border rounded bg-gray-100"
                />
              </div>

              <button
                onClick={generateSignature}
                disabled={!code || loading}
                className="w-full px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 font-semibold transition"
              >
                {loading ? '⏳ Calculando...' : '🔐 Gerar Assinatura SHA256'}
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h2 className="text-xl font-semibold mb-4">📊 Resultado</h2>
            
            {signString && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">🔤 Sign String</label>
                  <textarea
                    value={signString}
                    readOnly
                    rows={3}
                    className="w-full px-3 py-2 border rounded bg-gray-50 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">✅ Signature (SHA256)</label>
                  <input
                    type="text"
                    value={signature}
                    readOnly
                    className="w-full px-3 py-2 border rounded bg-yellow-50 font-mono text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">🌐 URL Final</label>
                  <textarea
                    value={finalUrl}
                    readOnly
                    rows={4}
                    className="w-full px-3 py-2 border rounded bg-gray-50 text-xs font-mono"
                  />
                </div>
              </>
            )}

            {!signString && (
              <div className="text-center text-gray-400 py-12">
                <p>Preencha o code e clique em "Gerar Assinatura"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
