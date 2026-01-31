'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function ShopeeCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processando autorização...');

  useEffect(() => {
    const code = searchParams.get('code');
    const shopId = searchParams.get('shop_id');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setMessage(`Erro na autorização: ${error}`);
      return;
    }

    if (!code || !shopId) {
      setStatus('error');
      setMessage('Código de autorização ou Shop ID não encontrado');
      return;
    }

    handleCallback(code, shopId);
  }, [searchParams]);

  const handleCallback = async (code: string, shopId: string) => {
    try {
      const response = await fetch('/api/admin/marketplaces/shopee/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, shopId: parseInt(shopId) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar autorização');
      }

      setStatus('success');
      setMessage('Autorização concluída com sucesso!');
      
      // Redireciona após 2 segundos
      setTimeout(() => {
        router.push('/admin/integracao/shopee');
      }, 2000);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2">Processando...</h2>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="text-green-600 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-green-600">Sucesso!</h2>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="text-red-600 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-red-600">Erro</h2>
            </>
          )}

          <p className="text-gray-600">{message}</p>

          {status === 'error' && (
            <button
              onClick={() => router.push('/admin/integracao/shopee')}
              className="mt-6 bg-orange-600 text-white px-6 py-2 rounded hover:bg-orange-700"
            >
              Voltar para Integração
            </button>
          )}

          {status === 'success' && (
            <p className="text-sm text-gray-500 mt-4">Redirecionando...</p>
          )}
        </div>
      </div>
    </div>
  );
}
