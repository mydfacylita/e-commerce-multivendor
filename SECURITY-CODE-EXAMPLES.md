# 💻 EXEMPLOS DE CÓDIGO - CORREÇÕES DE SEGURANÇA

## 🔐 1. VALIDAÇÃO DE WEBHOOKS

### MercadoPago Webhook - HMAC Validation

```typescript
// lib/webhook-validation.ts
import crypto from 'crypto';

export function validateMercadoPagoWebhook(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
  webhookSecret: string
): boolean {
  if (!xSignature || !xRequestId || !webhookSecret) {
    return false;
  }

  try {
    // Parsear x-signature: ts=xxx,v1=yyy
    const parts: Record<string, string> = {};
    xSignature.split(',').forEach(part => {
      const [key, value] = part.split('=');
      if (key && value) parts[key.trim()] = value.trim();
    });

    const ts = parts['ts'];
    const v1 = parts['v1'];

    if (!ts || !v1) return false;

    // Construir manifest conforme documentação MP
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    
    // Gerar HMAC SHA256
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(manifest)
      .digest('hex');

    // Comparar de forma segura (timing-safe)
    return crypto.timingSafeEqual(
      Buffer.from(v1),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[Webhook] Erro ao validar assinatura:', error);
    return false;
  }
}
```

### Aplicação no Webhook

```typescript
// app/api/payment/webhook/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateMercadoPagoWebhook } from '@/lib/webhook-validation';

export async function POST(request: Request) {
  try {
    // 🔒 Capturar headers de segurança ANTES de ler o body
    const xSignature = request.headers.get('x-signature');
    const xRequestId = request.headers.get('x-request-id');
    
    const body = await request.json();
    const paymentId = body.data?.id;
    
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID missing' }, { status: 400 });
    }

    // 🔒 Buscar webhook secret do gateway
    const mpConfig = await prisma.paymentGateway.findFirst({
      where: { gateway: 'MERCADOPAGO', isActive: true }
    });

    if (!mpConfig) {
      console.error('[Webhook] Gateway não configurado');
      return NextResponse.json({ error: 'Gateway not configured' }, { status: 500 });
    }

    const config = JSON.parse(mpConfig.config as string);
    
    // 🔒 VALIDAR ASSINATURA - CRÍTICO!
    const isValid = validateMercadoPagoWebhook(
      xSignature,
      xRequestId,
      String(paymentId),
      config.webhookSecret
    );
    
    if (!isValid) {
      console.error('[Webhook] ❌ Assinatura inválida - possível ataque!');
      
      // 🔒 Logar tentativa suspeita
      await prisma.securityLog.create({
        data: {
          type: 'WEBHOOK_INVALID_SIGNATURE',
          severity: 'HIGH',
          ip: request.headers.get('x-forwarded-for'),
          userAgent: request.headers.get('user-agent'),
          metadata: { paymentId, xSignature, xRequestId }
        }
      });
      
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // ✅ Assinatura válida - processar webhook
    console.log('[Webhook] ✅ Assinatura válida');
    
    // ... resto do processamento
    
    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('[Webhook] Erro:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

---

## 📝 2. AUDITORIA DE OPERAÇÕES FINANCEIRAS

### Schema de Auditoria

```prisma
// prisma/schema.prisma

model AuditLog {
  id          String   @id @default(cuid())
  action      String   // REFUND_CREATED, WITHDRAWAL_APPROVED, etc
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  
  entityType  String?  // Order, Payment, Withdrawal, etc
  entityId    String?
  
  oldValue    Json?    // Estado anterior (se aplicável)
  newValue    Json?    // Estado novo
  
  metadata    Json?    // Dados adicionais
  
  ip          String?
  userAgent   String?
  
  createdAt   DateTime @default(now())
  
  @@index([userId])
  @@index([action])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

### Helper de Auditoria

```typescript
// lib/audit.ts
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

export interface AuditLogData {
  action: string;
  userId: string;
  entityType?: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
  request?: NextRequest;
}

export async function auditLog(data: AuditLogData) {
  try {
    return await prisma.auditLog.create({
      data: {
        action: data.action,
        userId: data.userId,
        entityType: data.entityType,
        entityId: data.entityId,
        oldValue: data.oldValue ? JSON.parse(JSON.stringify(data.oldValue)) : null,
        newValue: data.newValue ? JSON.parse(JSON.stringify(data.newValue)) : null,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null,
        ip: data.request?.headers.get('x-forwarded-for')?.split(',')[0] || null,
        userAgent: data.request?.headers.get('user-agent') || null,
      }
    });
  } catch (error) {
    console.error('[AuditLog] Erro ao registrar:', error);
    // Não falhar a operação por erro de auditoria
    // Mas logar para investigação
  }
}

// Helper para operações financeiras críticas
export async function auditFinancialOperation(data: {
  action: string;
  userId: string;
  amount: number;
  currency?: string;
  orderId?: string;
  paymentId?: string;
  details?: any;
  request?: NextRequest;
}) {
  return auditLog({
    action: data.action,
    userId: data.userId,
    entityType: 'FINANCIAL_OPERATION',
    entityId: data.paymentId || data.orderId,
    metadata: {
      amount: data.amount,
      currency: data.currency || 'BRL',
      ...data.details
    },
    request: data.request
  });
}
```

### Aplicação em Refund

```typescript
// app/api/admin/financeiro/refund/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { auditFinancialOperation } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    // 🔒 Verificar role ADMIN
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { paymentId, orderId, reason, amount } = await request.json();

    if (!paymentId) {
      return NextResponse.json({ error: 'PaymentId obrigatório' }, { status: 400 });
    }

    // Buscar payment original
    const payment = await prisma.payment.findUnique({
      where: { paymentId },
      include: { order: true }
    });

    if (!payment) {
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 });
    }

    // 🔒 AUDITAR ANTES da operação
    await auditFinancialOperation({
      action: 'REFUND_INITIATED',
      userId: session.user.id,
      amount: amount || payment.amount,
      paymentId,
      orderId: orderId || payment.orderId,
      details: {
        reason,
        originalAmount: payment.amount,
        refundAmount: amount || payment.amount,
        adminEmail: session.user.email
      },
      request
    });

    // Buscar gateway
    const gateway = await prisma.paymentGateway.findFirst({
      where: { gateway: 'MERCADOPAGO', isActive: true }
    });

    if (!gateway) {
      return NextResponse.json({ error: 'Gateway não encontrado' }, { status: 404 });
    }

    const config = gateway.config as any;
    const { accessToken } = config;
    const apiUrl = 'https://api.mercadopago.com';

    // Gerar chave de idempotência única
    const idempotencyKey = `refund-${paymentId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Processar estorno no Mercado Pago
    const refundResponse = await fetch(`${apiUrl}/v1/payments/${paymentId}/refunds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
      },
      body: amount ? JSON.stringify({ amount }) : undefined
    });

    if (!refundResponse.ok) {
      const error = await refundResponse.json();
      console.error('Erro ao processar estorno:', error);
      
      // 🔒 AUDITAR FALHA
      await auditFinancialOperation({
        action: 'REFUND_FAILED',
        userId: session.user.id,
        amount: amount || payment.amount,
        paymentId,
        details: { error, reason },
        request
      });
      
      return NextResponse.json({ 
        error: 'Erro ao processar estorno',
        details: error 
      }, { status: refundResponse.status });
    }

    const refundData = await refundResponse.json();

    // Registrar estorno no banco de dados
    const refund = await prisma.refund.create({
      data: {
        orderId: orderId || payment.orderId || 'unknown',
        paymentId,
        refundId: String(refundData.id),
        amount: refundData.amount || amount || payment.amount,
        reason: reason || 'Estorno processado',
        gateway: 'MERCADOPAGO',
        status: refundData.status || 'approved',
        processedBy: session.user.email || session.user.name || 'admin'
      }
    });

    // 🔒 AUDITAR SUCESSO
    await auditFinancialOperation({
      action: 'REFUND_COMPLETED',
      userId: session.user.id,
      amount: refund.amount,
      paymentId,
      orderId: refund.orderId,
      details: {
        refundId: refund.id,
        mpRefundId: refund.refundId,
        status: refund.status,
        reason: refund.reason
      },
      request
    });

    console.log('✅ Estorno processado e auditado:', refund.id);

    return NextResponse.json({
      success: true,
      refund
    });

  } catch (error) {
    console.error('Erro ao processar estorno:', error);
    return NextResponse.json({ 
      error: 'Erro interno ao processar estorno' 
    }, { status: 500 });
  }
}
```

---

## 🛡️ 3. MIDDLEWARE DE AUTENTICAÇÃO E AUTORIZAÇÃO

### Middleware Reutilizável

```typescript
// lib/auth-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export type UserRole = 'ADMIN' | 'SELLER' | 'CUSTOMER';

export interface AuthResult {
  authorized: boolean;
  session?: any;
  error?: string;
  status?: number;
}

/**
 * Verifica se usuário está autenticado
 */
export async function requireAuth(request?: NextRequest): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return {
      authorized: false,
      error: 'Não autenticado',
      status: 401
    };
  }
  
  return {
    authorized: true,
    session
  };
}

/**
 * Verifica se usuário tem role específica
 */
export async function requireRole(role: UserRole | UserRole[], request?: NextRequest): Promise<AuthResult> {
  const authResult = await requireAuth(request);
  
  if (!authResult.authorized) {
    return authResult;
  }
  
  const allowedRoles = Array.isArray(role) ? role : [role];
  const userRole = authResult.session.user.role;
  
  if (!allowedRoles.includes(userRole)) {
    return {
      authorized: false,
      error: 'Acesso negado - permissão insuficiente',
      status: 403
    };
  }
  
  return {
    authorized: true,
    session: authResult.session
  };
}

/**
 * Wrapper para rotas que exigem ADMIN
 */
export async function requireAdmin(request?: NextRequest): Promise<AuthResult> {
  return requireRole('ADMIN', request);
}

/**
 * Wrapper para rotas que exigem SELLER ou ADMIN
 */
export async function requireSellerOrAdmin(request?: NextRequest): Promise<AuthResult> {
  return requireRole(['SELLER', 'ADMIN'], request);
}

/**
 * Helper para retornar erro de autorização
 */
export function unauthorizedResponse(result: AuthResult): NextResponse {
  return NextResponse.json(
    { error: result.error || 'Não autorizado' },
    { status: result.status || 401 }
  );
}
```

### Uso nas Rotas

```typescript
// app/api/admin/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  // 🔒 Verificar autenticação e role ADMIN
  const authResult = await requireAdmin(request);
  
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult);
  }
  
  const session = authResult.session;
  
  // Continuar com a lógica da rota...
  try {
    const data = await request.json();
    
    // ... processar criação de produto
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // 🔒 Verificar autenticação e role (SELLER ou ADMIN podem listar)
  const authResult = await requireSellerOrAdmin(request);
  
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult);
  }
  
  // ... listar produtos
}
```

---

## ⏱️ 4. RATE LIMITING

### Configuração com Upstash

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Criar instância Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Rate limiters por tipo de operação
export const rateLimiters = {
  // Upload: 10 por minuto
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: 'ratelimit:upload',
  }),
  
  // Pagamento: 5 por minuto
  payment: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    analytics: true,
    prefix: 'ratelimit:payment',
  }),
  
  // API geral: 100 por minuto
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'ratelimit:api',
  }),
  
  // Login: 5 tentativas a cada 15 minutos
  login: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
    prefix: 'ratelimit:login',
  }),
};

/**
 * Helper para aplicar rate limit
 */
export async function checkRateLimit(
  identifier: string,
  limiter: keyof typeof rateLimiters
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const ratelimit = rateLimiters[limiter];
  const result = await ratelimit.limit(identifier);
  
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Helper para obter identificador do request
 */
export function getRateLimitIdentifier(request: NextRequest, userId?: string): string {
  // Preferir user ID se autenticado
  if (userId) {
    return `user:${userId}`;
  }
  
  // Caso contrário, usar IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             'unknown';
  
  return `ip:${ip}`;
}
```

### Aplicação em Rotas

```typescript
// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // 2. Rate Limiting
    const identifier = getRateLimitIdentifier(request, session.user.id);
    const rateLimit = await checkRateLimit(identifier, 'upload');
    
    if (!rateLimit.success) {
      return NextResponse.json(
        { 
          error: 'Limite de uploads excedido',
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toString(),
          }
        }
      );
    }

    // 3. Processar upload
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido' }, { status: 400 });
    }

    // Validar tamanho (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Arquivo muito grande' }, { status: 400 });
    }

    // ... salvar arquivo e retornar URL
    
    return NextResponse.json({ success: true, url: 'https://...' });

  } catch (error) {
    console.error('Erro no upload:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
```

---

## ✅ 5. VALIDAÇÃO COM ZOD

### Schemas de Validação

```typescript
// lib/validation-schemas.ts
import { z } from 'zod';

// Schema para refund
export const refundSchema = z.object({
  paymentId: z.string()
    .min(1, 'PaymentId é obrigatório')
    .max(255, 'PaymentId muito longo'),
  orderId: z.string()
    .max(255)
    .optional(),
  reason: z.string()
    .max(500, 'Motivo muito longo')
    .optional(),
  amount: z.number()
    .positive('Valor deve ser positivo')
    .max(1000000, 'Valor muito alto')
    .optional(),
});

// Schema para saque
export const withdrawalSchema = z.object({
  amount: z.number()
    .positive('Valor deve ser positivo')
    .min(50, 'Valor mínimo é R$ 50')
    .max(100000, 'Valor máximo é R$ 100.000'),
  method: z.enum(['PIX', 'BANK_TRANSFER'], {
    errorMap: () => ({ message: 'Método inválido' })
  }),
  pixKey: z.string()
    .max(255)
    .optional(),
  bankData: z.object({
    bank: z.string().max(100),
    agency: z.string().max(20),
    account: z.string().max(20),
    accountType: z.enum(['CHECKING', 'SAVINGS']),
  }).optional(),
}).refine(
  (data) => {
    // Se método é PIX, pixKey é obrigatório
    if (data.method === 'PIX') {
      return !!data.pixKey;
    }
    // Se método é transferência, bankData é obrigatório
    if (data.method === 'BANK_TRANSFER') {
      return !!data.bankData;
    }
    return true;
  },
  {
    message: 'Dados bancários ou chave PIX são obrigatórios conforme o método',
    path: ['method'],
  }
);

// Schema para criar produto
export const createProductSchema = z.object({
  name: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(255, 'Nome muito longo'),
  description: z.string()
    .max(5000, 'Descrição muito longa')
    .optional(),
  price: z.number()
    .positive('Preço deve ser positivo')
    .max(1000000, 'Preço muito alto'),
  stock: z.number()
    .int('Estoque deve ser um número inteiro')
    .min(0, 'Estoque não pode ser negativo')
    .max(100000),
  categoryId: z.string()
    .uuid('ID de categoria inválido'),
  images: z.array(z.string().url('URL de imagem inválida'))
    .min(1, 'Pelo menos uma imagem é obrigatória')
    .max(10, 'Máximo 10 imagens'),
  weight: z.number()
    .positive('Peso deve ser positivo')
    .max(100000, 'Peso muito alto'),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
});

// Schema para pedido
export const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive().max(100),
    price: z.number().positive(),
  })).min(1, 'Pelo menos um item é obrigatório'),
  shippingAddressId: z.string().uuid(),
  paymentMethod: z.enum(['CREDIT_CARD', 'PIX', 'BOLETO']),
  installments: z.number().int().min(1).max(12).optional(),
});
```

### Aplicação nas Rotas

```typescript
// app/api/admin/financeiro/refund/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-middleware';
import { refundSchema } from '@/lib/validation-schemas';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  // 1. Autenticação e Autorização
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult);
  }

  try {
    const body = await request.json();
    
    // 2. Validação com Zod
    const validation = refundSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({
        error: 'Dados inválidos',
        details: validation.error.format()
      }, { status: 400 });
    }
    
    // 3. Usar dados validados (type-safe!)
    const { paymentId, orderId, reason, amount } = validation.data;
    
    // ... processar refund
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validação falhou',
        details: error.format()
      }, { status: 400 });
    }
    
    console.error('Erro ao processar refund:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
```

---

## 🔍 6. VERIFICAÇÃO DE OWNERSHIP

### Helper para Ownership

```typescript
// lib/ownership.ts
import { prisma } from '@/lib/prisma';

export async function verifyOrderOwnership(
  orderId: string,
  userId: string
): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { userId: true }
  });
  
  return order?.userId === userId;
}

export async function verifyAddressOwnership(
  addressId: string,
  userId: string
): Promise<boolean> {
  const address = await prisma.address.findUnique({
    where: { id: addressId },
    select: { userId: true }
  });
  
  return address?.userId === userId;
}

export async function verifyWithdrawalOwnership(
  withdrawalId: string,
  userId: string
): Promise<boolean> {
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: { seller: true }
  });
  
  return withdrawal?.seller.userId === userId;
}

export async function verifyProductOwnership(
  productId: string,
  userId: string
): Promise<boolean> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { seller: true }
  });
  
  // Admin pode editar qualquer produto
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });
  
  if (user?.role === 'ADMIN') {
    return true;
  }
  
  return product?.seller?.userId === userId;
}
```

### Aplicação nas Rotas

```typescript
// app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/auth-middleware';
import { verifyOrderOwnership } from '@/lib/ownership';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Autenticação
  const authResult = await requireAuth(request);
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult);
  }

  const session = authResult.session;
  const orderId = params.id;

  // 2. Verificar Ownership (ou ADMIN)
  const isAdmin = session.user.role === 'ADMIN';
  const isOwner = await verifyOrderOwnership(orderId, session.user.id);

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  // 3. Buscar pedido
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      payments: true,
      shipping: true,
    }
  });

  if (!order) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ order });
}
```

---

## 📊 7. LOGGING COMPLETO

### Schema de Log

```prisma
// prisma/schema.prisma

model ApiLog {
  id            String   @id @default(cuid())
  method        String   // GET, POST, PUT, DELETE
  endpoint      String   // /api/admin/products
  statusCode    Int      // 200, 401, 500, etc
  
  userId        String?
  user          User?    @relation(fields: [userId], references: [id])
  
  duration      Int?     // milissegundos
  
  errorMessage  String?
  errorStack    String?  @db.Text
  
  requestBody   Json?
  responseBody  Json?
  
  ip            String?
  userAgent     String?
  
  createdAt     DateTime @default(now())
  
  @@index([userId])
  @@index([endpoint])
  @@index([statusCode])
  @@index([createdAt])
}
```

### Helper de Logging

```typescript
// lib/api-logger.ts
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

export interface ApiLogData {
  method: string;
  endpoint: string;
  statusCode: number;
  userId?: string;
  duration?: number;
  errorMessage?: string;
  errorStack?: string;
  requestBody?: any;
  responseBody?: any;
  request?: NextRequest;
}

export async function logApi(data: ApiLogData) {
  try {
    // Sanitizar dados sensíveis
    const sanitizedRequestBody = sanitizeSensitiveData(data.requestBody);
    const sanitizedResponseBody = sanitizeSensitiveData(data.responseBody);

    await prisma.apiLog.create({
      data: {
        method: data.method,
        endpoint: data.endpoint,
        statusCode: data.statusCode,
        userId: data.userId,
        duration: data.duration,
        errorMessage: data.errorMessage,
        errorStack: data.errorStack,
        requestBody: sanitizedRequestBody,
        responseBody: sanitizedResponseBody,
        ip: data.request?.headers.get('x-forwarded-for')?.split(',')[0],
        userAgent: data.request?.headers.get('user-agent'),
      }
    });
  } catch (error) {
    console.error('[ApiLogger] Erro ao registrar log:', error);
  }
}

function sanitizeSensitiveData(data: any): any {
  if (!data) return null;
  
  const sensitiveFields = [
    'password',
    'accessToken',
    'refreshToken',
    'apiKey',
    'secret',
    'creditCard',
    'cvv',
    'pixKey',
  ];
  
  const sanitized = JSON.parse(JSON.stringify(data));
  
  function recursiveSanitize(obj: any) {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const key in obj) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        obj[key] = '***REDACTED***';
      } else if (typeof obj[key] === 'object') {
        recursiveSanitize(obj[key]);
      }
    }
  }
  
  recursiveSanitize(sanitized);
  return sanitized;
}

// Wrapper para rotas
export function withLogging(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    const startTime = Date.now();
    let statusCode = 200;
    let errorMessage: string | undefined;
    let errorStack: string | undefined;
    let responseBody: any;

    try {
      const response = await handler(request, ...args);
      statusCode = response.status;
      
      // Capturar body da resposta (se possível)
      try {
        responseBody = await response.clone().json();
      } catch {
        // Resposta não é JSON
      }
      
      return response;
    } catch (error: any) {
      statusCode = 500;
      errorMessage = error.message;
      errorStack = error.stack;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      
      await logApi({
        method: request.method,
        endpoint: request.nextUrl.pathname,
        statusCode,
        duration,
        errorMessage,
        errorStack,
        responseBody,
        request,
      });
    }
  };
}
```

---

**Data de criação:** 16 de Janeiro de 2026
**Última atualização:** 16 de Janeiro de 2026

**Nota:** Estes são exemplos práticos e prontos para uso. Adapte conforme necessário para sua aplicação.
