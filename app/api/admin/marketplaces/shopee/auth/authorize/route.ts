import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const SHOPEE_PROD_URL = 'https://partner.shopeemobile.com';
const SHOPEE_SANDBOX_URL = 'https://partner.uat.shopeemobile.com';

function shopeeBaseUrl(isSandbox: boolean) {
  return isSandbox ? SHOPEE_SANDBOX_URL : SHOPEE_PROD_URL
}

// Helper para obter URL base - SEMPRE usa gerencial-sys para rotas admin
function getBaseUrl(): string {
  return 'https://gerencial-sys.mydshop.com.br';
}

// Função para gerar assinatura HMAC-SHA256 da Shopee
function generateShopeeSignature(url: string, body: string, partnerId: number, partnerKey: string, timestamp: number): string {
  const path = new URL(url).pathname;
  const baseString = `${partnerId}${path}${timestamp}${body}`;
  return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
}

// GET - Gerar URL de autorização
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { shopeeAuth: true },
    });

    if (!user?.shopeeAuth) {
      return NextResponse.json({ error: 'Configure as credenciais primeiro' }, { status: 400 });
    }

    const { partnerId, partnerKey, isSandbox } = user.shopeeAuth;
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/shop/auth_partner';
    const baseUrl = getBaseUrl();
    const redirectUri = `${baseUrl}/admin/integracao/shopee/callback`;
    const redirectUrl = encodeURIComponent(redirectUri);
    
    // Gerar assinatura para autorização
    const baseString = `${partnerId}${path}${timestamp}`;
    const sign = crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');

    const authUrl = `${shopeeBaseUrl(isSandbox)}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${redirectUrl}`;

    return NextResponse.json({ authUrl, isSandbox });
  } catch (error) {
    console.error('Erro ao gerar URL de autorização:', error);
    return NextResponse.json({ error: 'Erro ao gerar URL de autorização' }, { status: 500 });
  }
}
