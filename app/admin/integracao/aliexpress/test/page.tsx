'use client';

import { useState } from 'react';
import crypto from 'crypto-js';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function AliExpressTestPage() {
  const [appKey, setAppKey] = useState('524396');
  const [appSecret, setAppSecret] = useState('RMz60S4TWtjk3TapvbJNsLStsiuZ351R');
  const [code, setCode] = useState('');
  const [timestamp, setTimestamp] = useState(Date.now().toString());
  const [uuid, setUuid] = useState('uuid');
  const [signMethod, setSignMethod] = useState<'md5' | 'sha256'>('sha256');
  const [productId, setProductId] = useState('1005006851856601');
  
  const [signString, setSignString] = useState('');
  const [signature, setSignature] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const calculateSignature = () => {
    const params: Record<string, string> = {
      app_key: appKey,
      code: code,
      timestamp: timestamp,
      sign_method: signMethod,
      uuid: uuid
    };

    // Ordenar alfabeticamente
    const sortedKeys = Object.keys(params).sort();
    
    // Construir sign string: appSecret + key1value1key2value2 + appSecret
    const signStr = appSecret + sortedKeys.map(key => `${key}${params[key]}`).join('') + appSecret;
    setSignString(signStr);

    // Calcular hash
    let hash;
    if (signMethod === 'md5') {
      hash = crypto.MD5(signStr).toString().toUpperCase();
    } else {
      hash = crypto.SHA256(signStr).toString().toUpperCase();
    }
    setSignature(hash);

    return { params, hash, signStr };
  };

  const testRequest = async () => {
    setLoading(true);
    setResponse(null);

    const { params, hash } = calculateSignature();

    try {
      const paramString = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');

      const url = `https://api-sg.aliexpress.com/rest/auth/token/create?${paramString}&sign=${hash}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      const data = await res.json();
      setResponse({
        status: res.status,
        headers: Object.fromEntries(res.headers.entries()),
        body: data
      });
    } catch (error: any) {
      setResponse({
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const testWholesaleGet = async () => {
    setLoading(true)
    setResponse(null)

    try {
      const res = await fetch('/api/admin/integrations/aliexpress/test-wholesale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })

      const data = await res.json()
      setResponse(data)
    } catch (error: any) {
      setResponse({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const testProductGet = async () => {
    setLoading(true)
    setResponse(null)

    try {
      const res = await fetch('/api/admin/integrations/aliexpress/test-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })

      const data = await res.json()
      setResponse(data)
    } catch (error: any) {
      setResponse({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">🧪 AliExpress API Test</h1>

      {/* Seção de testes DS */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">🔍 Teste APIs Dropshipping</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Product ID do AliExpress
          </label>
          <input
            type="text"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full px-4 py-2 border rounded-md"
            placeholder="Ex: 1005006851856601"
          />
        </div>

        <div className="flex gap-3 mb-4">
          <button
            onClick={testWholesaleGet}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? '⏳ Testando...' : '🛒 Testar wholesale.get (Minha Lista DS)'}
          </button>

          <button
            onClick={testProductGet}
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? '⏳ Testando...' : '📦 Testar product.get (Qualquer Produto)'}
          </button>
        </div>

        <div className="p-4 bg-gray-50 rounded-md">
          <p className="text-sm font-medium mb-2">ℹ️ Diferença:</p>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>wholesale.get</strong>: Só retorna produtos que você adicionou à sua lista DS</li>
            <li>• <strong>product.get</strong>: Retorna qualquer produto público</li>
          </ul>
        </div>
      </div>

      {/* Seção OAuth */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">🔐 Teste OAuth Token</h2>

      <div className="grid grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold mb-4">Parâmetros</h3>
          
          <div>
            <label className="block text-sm font-medium mb-1">App Key</label>
            <input
              type="text"
              value={appKey}
              onChange={(e) => setAppKey(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">App Secret</label>
            <input
              type="text"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="3_524396_XXXXXX"
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Timestamp (ms)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                className="flex-1 px-3 py-2 border rounded"
              />
              <button
                onClick={() => setTimestamp(Date.now().toString())}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Agora
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">UUID</label>
            <input
              type="text"
              value={uuid}
              onChange={(e) => setUuid(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Sign Method</label>
            <select
              value={signMethod}
              onChange={(e) => setSignMethod(e.target.value as 'md5' | 'sha256')}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="md5">MD5</option>
              <option value="sha256">SHA256</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={calculateSignature}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Calcular Signature
            </button>
            <button
              onClick={testRequest}
              disabled={loading || !code}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
            >
              {loading ? 'Enviando...' : 'Testar Request'}
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Resultado</h2>
          
          {signString && (
            <div>
              <label className="block text-sm font-medium mb-1">Sign String</label>
              <textarea
                value={signString}
                readOnly
                rows={4}
                className="w-full px-3 py-2 border rounded bg-gray-50 text-xs font-mono"
              />
            </div>
          )}

          {signature && (
            <div>
              <label className="block text-sm font-medium mb-1">Signature ({signMethod.toUpperCase()})</label>
              <input
                type="text"
                value={signature}
                readOnly
                className="w-full px-3 py-2 border rounded bg-gray-50 font-mono"
              />
            </div>
          )}

          {response && (
            <div>
              <label className="block text-sm font-medium mb-1">Response</label>
              <pre className="w-full px-3 py-2 border rounded bg-gray-50 text-xs overflow-auto max-h-96">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* URL Preview */}
      {signature && code && (
        <div className="mt-8">
          <label className="block text-sm font-medium mb-1">URL Completa</label>
          <textarea
            value={`https://api-sg.aliexpress.com/rest/auth/token/create?app_key=${appKey}&code=${code}&sign_method=${signMethod}&timestamp=${timestamp}&uuid=${uuid}&sign=${signature}`}
            readOnly
            rows={3}
            className="w-full px-3 py-2 border rounded bg-gray-50 text-xs font-mono"
          />
        </div>
      )}
      </div>
    </div>
  );
}
