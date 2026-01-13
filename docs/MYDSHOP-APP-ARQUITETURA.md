# 📱 MYDSHOP - Documentação do App Mobile

## Arquitetura Ionic + Angular + Capacitor

**Versão:** 1.0.0  
**Data:** 12/01/2026  
**Autor:** Equipe MYDSHOP

---

## 📋 Índice

1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitetura do Sistema](#3-arquitetura-do-sistema)
4. [Modelo de Dados](#4-modelo-de-dados)
5. [Estrutura de Pastas](#5-estrutura-de-pastas)
6. [Features do App](#6-features-do-app)
7. [Integração com Backend](#7-integração-com-backend)
8. [Segurança](#8-segurança)
9. [Deploy e Publicação](#9-deploy-e-publicação)

---

## 1. Visão Geral

### 1.1 Objetivo
Desenvolver um aplicativo mobile (Android e iOS) para a plataforma de e-commerce MYDSHOP, permitindo que clientes naveguem, comprem e acompanhem seus pedidos de forma nativa.

### 1.2 Público-Alvo
- Clientes finais (compradores)
- Usuários que preferem experiência mobile
- Compradores recorrentes

### 1.3 Funcionalidades Principais
- Navegação por categorias e produtos
- Busca inteligente de produtos
- Carrinho de compras persistente
- Checkout com múltiplas formas de pagamento
- Acompanhamento de pedidos em tempo real
- Notificações push
- Perfil e gerenciamento de endereços

---

## 2. Stack Tecnológico

### 2.1 Frontend Mobile
| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Ionic Framework** | 8.x | UI Components nativos |
| **Angular** | 17.x | Framework SPA |
| **Capacitor** | 5.x | Bridge para APIs nativas |
| **TypeScript** | 5.x | Linguagem tipada |
| **SCSS** | - | Estilização |
| **RxJS** | 7.x | Programação reativa |

### 2.2 Backend (Existente)
| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Next.js** | 14.x | API Routes |
| **Prisma** | 5.x | ORM |
| **MySQL** | 8.x | Banco de dados |
| **NextAuth.js** | 4.x | Autenticação |
| **MercadoPago SDK** | 2.x | Pagamentos |

### 2.3 Infraestrutura
| Serviço | Propósito |
|---------|-----------|
| **Firebase Cloud Messaging** | Push Notifications |
| **Capacitor Preferences** | Storage local |
| **Google Play Store** | Distribuição Android |
| **Apple App Store** | Distribuição iOS |

---

## 3. Arquitetura do Sistema

### 3.1 Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         APLICATIVO MOBILE                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Ionic     │  │   Angular   │  │  Capacitor  │              │
│  │ Components  │  │  Services   │  │   Plugins   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│                        CAMADA DE SERVIÇOS                        │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│  │  API   │ │  Auth  │ │  Cart  │ │Storage │ │  Push  │        │
│  │Service │ │Service │ │Service │ │Service │ │Service │        │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS / JWT
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND NEXT.JS                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    API Routes                            │    │
│  │  /api/auth  /api/products  /api/orders  /api/payment    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Prisma ORM                            │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         MYSQL DATABASE                           │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│  │  User  │ │Product │ │ Order  │ │Category│ │ Cart   │        │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Padrões de Arquitetura

#### Feature-Based Structure
Cada feature é um módulo independente com seus próprios componentes, serviços e rotas.

#### Standalone Components (Angular 17+)
Componentes independentes sem necessidade de NgModules tradicionais.

#### Signals para Estado Reativo
Uso de Angular Signals para gerenciamento de estado reativo e performático.

#### Lazy Loading
Carregamento sob demanda de features para otimizar tempo de inicialização.

---

## 4. Modelo de Dados

### 4.1 Entidades Principais

#### User (Usuário)
```typescript
interface User {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  cpf: string | null;
  image: string | null;
  role: 'USER' | 'ADMIN' | 'SELLER';
  createdAt: Date;
}
```

#### Product (Produto)
```typescript
interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  images: string[];
  stock: number;
  featured: boolean;
  categoryId: string;
  category?: Category;
  sizes: string[] | null;
  variants: ProductVariant[] | null;
  specifications: Record<string, string> | null;
  isDropshipping: boolean;
  active: boolean;
}
```

#### Category (Categoria)
```typescript
interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  children?: Category[];
}
```

#### CartItem (Item do Carrinho)
```typescript
interface CartItem {
  id: string;
  userId: string;
  productId: string;
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
  createdAt: Date;
}
```

#### Order (Pedido)
```typescript
interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  total: number;
  subtotal: number | null;
  shippingCost: number | null;
  discountAmount: number | null;
  couponCode: string | null;
  shippingAddress: string;
  trackingCode: string | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
  deliveryDays: number | null;
  createdAt: Date;
  items: OrderItem[];
}

type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
```

#### Address (Endereço)
```typescript
interface Address {
  id: string;
  userId: string;
  label: string | null;
  recipientName: string | null;
  street: string;
  complement: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  zipCode: string;
  phone: string | null;
  cpf: string | null;
  isDefault: boolean;
}
```

### 4.2 Diagrama de Relacionamentos

```
┌──────────┐       ┌──────────┐       ┌──────────┐
│   User   │───────│ Address  │       │ Category │
└──────────┘  1:N  └──────────┘       └──────────┘
     │                                      │
     │ 1:N                             1:N  │
     ▼                                      ▼
┌──────────┐       ┌──────────┐       ┌──────────┐
│CartItem  │───────│ Product  │───────│  Sizes   │
└──────────┘  N:1  └──────────┘       └──────────┘
     │                  │
     │                  │ 1:N
     │                  ▼
     │            ┌──────────┐
     │            │OrderItem │
     │            └──────────┘
     │                  │
     │             N:1  │
     ▼                  ▼
┌──────────┐       ┌──────────┐
│  Order   │───────│ Payment  │
└──────────┘  1:1  └──────────┘
```

---

## 5. Estrutura de Pastas

```
mydshop-app/
├── src/
│   ├── app/
│   │   ├── core/                          # Serviços singleton
│   │   │   ├── services/
│   │   │   │   ├── api.service.ts         # HTTP client base
│   │   │   │   ├── auth.service.ts        # Autenticação JWT
│   │   │   │   ├── storage.service.ts     # Ionic Storage
│   │   │   │   ├── cart.service.ts        # Estado do carrinho
│   │   │   │   ├── push.service.ts        # Push notifications
│   │   │   │   └── toast.service.ts       # Notificações UI
│   │   │   ├── guards/
│   │   │   │   ├── auth.guard.ts          # Rotas protegidas
│   │   │   │   └── guest.guard.ts         # Rotas públicas
│   │   │   ├── interceptors/
│   │   │   │   ├── auth.interceptor.ts    # Adiciona token JWT
│   │   │   │   └── error.interceptor.ts   # Tratamento de erros
│   │   │   └── core.module.ts
│   │   │
│   │   ├── shared/                        # Componentes compartilhados
│   │   │   ├── components/
│   │   │   │   ├── product-card/          # Card de produto
│   │   │   │   ├── category-chip/         # Chip de categoria
│   │   │   │   ├── cart-button/           # Botão do carrinho
│   │   │   │   ├── rating-stars/          # Estrelas de avaliação
│   │   │   │   ├── price-display/         # Exibição de preço
│   │   │   │   ├── quantity-selector/     # Seletor de quantidade
│   │   │   │   ├── empty-state/           # Estado vazio
│   │   │   │   └── skeleton-loader/       # Loading skeleton
│   │   │   ├── pipes/
│   │   │   │   ├── currency-brl.pipe.ts   # Formatação BRL
│   │   │   │   ├── truncate.pipe.ts       # Truncar texto
│   │   │   │   └── relative-time.pipe.ts  # Tempo relativo
│   │   │   └── shared.module.ts
│   │   │
│   │   ├── features/                      # Módulos de features
│   │   │   ├── tabs/                      # Container de navegação
│   │   │   │   ├── tabs.page.ts
│   │   │   │   ├── tabs.page.html
│   │   │   │   └── tabs.routes.ts
│   │   │   │
│   │   │   ├── home/                      # Tela inicial
│   │   │   │   ├── home.page.ts
│   │   │   │   ├── home.page.html
│   │   │   │   ├── home.page.scss
│   │   │   │   └── components/
│   │   │   │       ├── banner-slider/
│   │   │   │       ├── category-grid/
│   │   │   │       └── featured-products/
│   │   │   │
│   │   │   ├── categories/                # Categorias
│   │   │   │   ├── category-list/
│   │   │   │   └── category-products/
│   │   │   │
│   │   │   ├── products/                  # Produtos
│   │   │   │   ├── product-list/
│   │   │   │   ├── product-detail/
│   │   │   │   ├── product-search/
│   │   │   │   └── components/
│   │   │   │       ├── image-gallery/
│   │   │   │       ├── variant-selector/
│   │   │   │       └── specifications/
│   │   │   │
│   │   │   ├── cart/                      # Carrinho
│   │   │   │   ├── cart.page.ts
│   │   │   │   ├── cart.page.html
│   │   │   │   └── components/
│   │   │   │       ├── cart-item/
│   │   │   │       └── cart-summary/
│   │   │   │
│   │   │   ├── checkout/                  # Checkout
│   │   │   │   ├── checkout.routes.ts
│   │   │   │   ├── address-select/
│   │   │   │   ├── shipping-select/
│   │   │   │   ├── payment-select/
│   │   │   │   └── order-review/
│   │   │   │
│   │   │   ├── orders/                    # Pedidos
│   │   │   │   ├── order-list/
│   │   │   │   ├── order-detail/
│   │   │   │   └── order-tracking/
│   │   │   │
│   │   │   ├── profile/                   # Perfil
│   │   │   │   ├── profile.page.ts
│   │   │   │   ├── edit-profile/
│   │   │   │   ├── addresses/
│   │   │   │   └── settings/
│   │   │   │
│   │   │   └── auth/                      # Autenticação
│   │   │       ├── login/
│   │   │       ├── register/
│   │   │       └── forgot-password/
│   │   │
│   │   ├── models/                        # Interfaces TypeScript
│   │   │   ├── user.model.ts
│   │   │   ├── product.model.ts
│   │   │   ├── category.model.ts
│   │   │   ├── cart.model.ts
│   │   │   ├── order.model.ts
│   │   │   ├── address.model.ts
│   │   │   └── api-response.model.ts
│   │   │
│   │   ├── app.component.ts
│   │   ├── app.routes.ts
│   │   └── app.config.ts
│   │
│   ├── environments/
│   │   ├── environment.ts                 # Desenvolvimento
│   │   └── environment.prod.ts            # Produção
│   │
│   ├── theme/
│   │   ├── variables.scss                 # Cores MYDSHOP
│   │   └── global.scss                    # Estilos globais
│   │
│   └── assets/
│       ├── icon/                          # Ícones do app
│       ├── images/                        # Imagens estáticas
│       └── i18n/                          # Traduções (futuro)
│
├── android/                               # Projeto Android nativo
├── ios/                                   # Projeto iOS nativo
├── capacitor.config.ts                    # Config Capacitor
├── ionic.config.json                      # Config Ionic
├── angular.json                           # Config Angular
├── package.json
└── tsconfig.json
```

---

## 6. Features do App

### 6.1 Navegação por Tabs

| Tab | Ícone | Feature |
|-----|-------|---------|
| Home | 🏠 | Destaques, categorias, promoções |
| Categorias | 📂 | Navegação por categorias |
| Carrinho | 🛒 | Itens, checkout |
| Pedidos | 📦 | Histórico, rastreamento |
| Perfil | 👤 | Dados, endereços, config |

### 6.2 Fluxos Principais

#### Fluxo de Compra
```
Home → Produto → Adicionar ao Carrinho → Carrinho → 
Checkout → Endereço → Frete → Pagamento → Confirmação
```

#### Fluxo de Autenticação
```
Login/Registro → Verificação → Home (autenticado)
```

#### Fluxo de Pedido
```
Meus Pedidos → Detalhes → Rastreamento → Avaliação
```

### 6.3 Features por Tela

#### Home
- Banner slider com promoções
- Grid de categorias principais
- Produtos em destaque
- Produtos mais vendidos
- Pull-to-refresh

#### Produto
- Galeria de imagens com zoom
- Seletor de variantes (cor, tamanho)
- Especificações técnicas
- Botão "Adicionar ao Carrinho"
- Botão "Comprar Agora"

#### Carrinho
- Lista de itens com quantity selector
- Resumo do pedido
- Campo de cupom de desconto
- Botão "Finalizar Compra"

#### Checkout
- Seleção/cadastro de endereço
- Opções de frete com prazo
- Formas de pagamento:
  - PIX (QR Code)
  - Cartão de Crédito
  - Boleto Bancário
- Revisão final do pedido

#### Pedidos
- Lista com status visual
- Filtros por status
- Detalhes completos
- Código de rastreamento
- Timeline de atualizações

---

## 7. Integração com Backend

### 7.1 Endpoints da API

#### Autenticação
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/callback/credentials` | Login com email/senha |
| POST | `/api/auth/register` | Registro de novo usuário |
| GET | `/api/auth/session` | Sessão atual |
| POST | `/api/auth/signout` | Logout |

#### Produtos
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/products/paginated` | Lista paginada |
| GET | `/api/products/paginated?featured=true` | Produtos em destaque |
| GET | `/api/products/search?q={query}` | Busca |
| GET | `/api/products/{id}` | Detalhes do produto |

#### Categorias
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/categories` | Todas as categorias |
| GET | `/api/categories/{slug}` | Categoria específica |

#### Carrinho
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/cart` | Itens do carrinho |
| POST | `/api/cart` | Adicionar item |
| PUT | `/api/cart/{id}` | Atualizar quantidade |
| DELETE | `/api/cart/{id}` | Remover item |

#### Endereços
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/user/addresses` | Listar endereços |
| POST | `/api/user/addresses` | Criar endereço |
| PUT | `/api/user/addresses/{id}` | Atualizar endereço |
| DELETE | `/api/user/addresses/{id}` | Remover endereço |

#### Pedidos
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/orders` | Listar pedidos do usuário |
| GET | `/api/orders/{id}` | Detalhes do pedido |
| POST | `/api/orders` | Criar pedido |

#### Pagamentos
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/payment/pix` | Gerar PIX |
| POST | `/api/payment/card` | Pagar com cartão |
| POST | `/api/payment/boleto` | Gerar boleto |
| GET | `/api/payment/status/{id}` | Status do pagamento |

#### Frete
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/shipping/calculate` | Calcular frete |

### 7.2 Autenticação JWT

O app utiliza JWT (JSON Web Token) para autenticação:

```typescript
// auth.interceptor.ts
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const token = this.authService.getToken();
    
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    return next.handle(req);
  }
}
```

### 7.3 Tratamento de Erros

```typescript
// error.interceptor.ts
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.authService.logout();
          this.router.navigate(['/auth/login']);
        }
        
        if (error.status === 0) {
          this.toastService.show('Sem conexão com a internet');
        }
        
        return throwError(() => error);
      })
    );
  }
}
```

---

## 8. Segurança

### 8.1 Medidas Implementadas

| Medida | Descrição |
|--------|-----------|
| **HTTPS** | Todas as comunicações são criptografadas |
| **JWT Token** | Tokens com expiração curta (1h) |
| **Refresh Token** | Renovação automática de sessão |
| **Secure Storage** | Tokens armazenados de forma segura |
| **Certificate Pinning** | Validação de certificado SSL (prod) |
| **Input Validation** | Validação no frontend e backend |
| **Rate Limiting** | Limite de requisições por IP |

### 8.2 Boas Práticas

- Não armazenar dados sensíveis em logs
- Limpar dados ao fazer logout
- Validar todos os inputs do usuário
- Usar HTTPS em todos os ambientes
- Implementar timeout de sessão

---

## 9. Deploy e Publicação

### 9.1 Build para Produção

```bash
# Build do Angular
ionic build --prod

# Sincronizar com Capacitor
npx cap sync

# Build Android
npx cap open android
# No Android Studio: Build > Generate Signed Bundle

# Build iOS
npx cap open ios
# No Xcode: Product > Archive
```

### 9.2 Requisitos para Publicação

#### Google Play Store
- Conta de desenvolvedor ($25 único)
- App Bundle (.aab)
- Ícones e screenshots
- Política de privacidade
- Classificação de conteúdo

#### Apple App Store
- Apple Developer Program ($99/ano)
- Certificados e provisioning profiles
- App Store Connect configurado
- Review guidelines compliance

### 9.3 Versionamento

```
Versão: X.Y.Z
X = Major (breaking changes)
Y = Minor (novas features)
Z = Patch (correções)
```

---

## 📞 Contato e Suporte

**MYDSHOP - Equipe de Desenvolvimento**

Para dúvidas sobre esta documentação, entre em contato com a equipe de desenvolvimento.

---

*Documento gerado em 12/01/2026*
