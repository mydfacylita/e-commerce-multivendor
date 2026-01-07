# Guia: Usar Conta de Teste do Mercado Livre

## Por que usar Sandbox?

- ✅ Pedidos de teste não são bloqueados por fraude
- ✅ Dados completos sem censura (XXXXXXX)
- ✅ Pode testar fluxo completo sem risco
- ✅ Não afeta sua reputação de vendedor real

## Como Ativar Sandbox

### 1. Acesse o Portal de Desenvolvedores
```
https://developers.mercadolivre.com.br/
```

### 2. Crie Usuários de Teste
1. Vá em: **Suas aplicações** → Sua app → **Usuários de teste**
2. Crie 2 usuários:
   - **Vendedor** (seller)
   - **Comprador** (buyer)

### 3. Gere Token de Teste
```bash
# Endpoint de autorização SANDBOX
https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=SEU_APP_ID&redirect_uri=SUA_CALLBACK_URL&state=test
```

### 4. URLs do Sandbox

Troque as URLs de produção por sandbox no código:

**Produção:**
```
https://api.mercadolibre.com
```

**Sandbox:**
```
https://api.mercadolibre.com/sandbox
```

## Criar Pedido de Teste

1. Acesse com usuário **comprador** de teste
2. Compre produto do **vendedor** de teste
3. Finalize com cartão de teste:
   - **Aprovado**: 5031 7557 3453 0604
   - **Recusado**: 5031 4332 1540 6351

## Configurar no Sistema

No arquivo `.env`:
```env
# Modo sandbox
ML_SANDBOX_MODE=true
ML_TEST_USER_ID=123456789
```

No código `auto-fetch/route.ts`:
```typescript
const baseUrl = process.env.ML_SANDBOX_MODE === 'true' 
  ? 'https://api.mercadolibre.com/sandbox'
  : 'https://api.mercadolibre.com'
```

## Diferenças Sandbox vs Produção

| Recurso | Sandbox | Produção |
|---------|---------|----------|
| Dados censurados | ❌ Não | ✅ Sim (até aprovar) |
| Bloqueio fraude | ❌ Não | ✅ Sim |
| Notificações | ✅ Sim | ✅ Sim |
| Frete real | ❌ Não | ✅ Sim |

## Recomendação

🎯 **Use Sandbox para desenvolvimento e testes**  
🎯 **Use Produção apenas quando validado**

Assim evita:
- 🚫 Pedidos bloqueados por fraude
- 🚫 Dados censurados XXXXXXX
- 🚫 Problemas de reputação
- 🚫 Testes afetando métricas reais
