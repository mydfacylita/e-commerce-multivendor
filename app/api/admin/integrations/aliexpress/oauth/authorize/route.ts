import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Helper para obter URL base - SEMPRE usa gerencial-sys para rotas admin
function getBaseUrl(): string {
  // Para rotas de admin, SEMPRE usar o domínio gerencial-sys
  // Isso garante consistência com as configurações do OAuth no AliExpress
  return 'https://gerencial-sys.mydshop.com.br';
}

// Rota para iniciar o fluxo OAuth
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar credenciais configuradas
    const auth = await prisma.aliExpressAuth.findUnique({
      where: { userId: session.user.id }
    });

    if (!auth || !auth.appKey) {
      return NextResponse.json({ 
        error: 'Configure AppKey e AppSecret primeiro' 
      }, { status: 400 });
    }

    // URL de autorização do AliExpress (formato correto conforme documentação)
    const baseUrl = getBaseUrl();
    const redirectUri = `${baseUrl}/api/admin/integrations/aliexpress/oauth/callback`;
    
    // URL correta baseada na documentação OAuth 2.0 do AliExpress
    const authUrl = new URL('https://auth.aliexpress.com/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', auth.appKey);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'ds_access'); // Escopo para Dropshipping API
    authUrl.searchParams.set('state', session.user.id);
    
    console.log('🔗 URL de autorização gerada:', authUrl.toString());

    return NextResponse.json({ 
      authUrl: authUrl.toString() 
    });
  } catch (error) {
    console.error('Erro ao gerar URL de autorização:', error);
    return NextResponse.json({ 
      error: 'Erro ao gerar URL de autorização' 
    }, { status: 500 });
  }
}
