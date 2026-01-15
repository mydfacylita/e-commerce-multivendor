# API de Analytics - Documentação

## Autenticação

Todas as requisições devem incluir a API key no header:

```
X-API-Key: sua_api_key_aqui
```

Ou:

```
Authorization: Bearer sua_api_key_aqui
```

### Configurando a API Key

Adicione no arquivo `.env`:

```env
ANALYTICS_API_KEY=seu_token_secreto_aqui
```

Se não configurado, será gerado automaticamente baseado no `NEXTAUTH_SECRET`.

---

## Endpoint: POST /api/analytics/track

Registra um evento de analytics no sistema.

### Request

```http
POST /api/analytics/track
Content-Type: application/json
X-API-Key: sua_api_key_aqui

{
  "name": "page_view",
  "description": "Usuário visitou a página inicial",
  "data": {
    "page": "/",
    "url": "https://meusite.com/",
    "visitorId": "uuid-do-visitante",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "referrer": "https://google.com"
  }
}
```

### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | Sim | Tipo do evento (veja tipos aceitos abaixo) |
| `description` | string | Não | Descrição legível do evento |
| `data` | object | Sim | Dados do evento em formato JSON |

### Tipos de Eventos Aceitos

#### 1. **page_view** - Visualização de Página
```json
{
  "name": "page_view",
  "data": {
    "page": "/produtos",
    "url": "https://meusite.com/produtos",
    "visitorId": "uuid",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "referrer": "https://google.com",
    "sessionDuration": 125
  }
}
```

#### 2. **visitor** - Novo Visitante
```json
{
  "name": "visitor",
  "data": {
    "visitorId": "uuid",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "country": "BR",
    "city": "São Paulo",
    "device": "mobile"
  }
}
```

#### 3. **click** - Clique em Elemento
```json
{
  "name": "click",
  "data": {
    "element": "button.cta",
    "text": "Comprar Agora",
    "page": "/produtos/123",
    "visitorId": "uuid"
  }
}
```

#### 4. **form_submit** - Envio de Formulário
```json
{
  "name": "form_submit",
  "data": {
    "formId": "newsletter",
    "formName": "Newsletter Signup",
    "page": "/",
    "visitorId": "uuid"
  }
}
```

#### 5. **purchase** - Compra Realizada
```json
{
  "name": "purchase",
  "data": {
    "orderId": "ORD-12345",
    "total": 299.90,
    "items": 3,
    "visitorId": "uuid",
    "userId": "user-123"
  }
}
```

#### 6. **add_to_cart** - Adicionar ao Carrinho
```json
{
  "name": "add_to_cart",
  "data": {
    "productId": "prod-123",
    "productName": "Notebook",
    "price": 2999.90,
    "quantity": 1,
    "visitorId": "uuid"
  }
}
```

#### 7. **search** - Busca
```json
{
  "name": "search",
  "data": {
    "query": "notebook gamer",
    "results": 25,
    "page": "/produtos",
    "visitorId": "uuid"
  }
}
```

#### 8. **custom** - Evento Customizado
```json
{
  "name": "custom",
  "description": "Meu evento personalizado",
  "data": {
    // qualquer estrutura de dados
  }
}
```

---

## Response

### Sucesso (200)
```json
{
  "success": true,
  "message": "Evento registrado com sucesso"
}
```

### Erro - API Key Inválida (401)
```json
{
  "error": "API key inválida"
}
```

### Erro - Dados Inválidos (400)
```json
{
  "error": "Campos obrigatórios: name, data"
}
```

### Erro - Tipo de Evento Inválido (400)
```json
{
  "error": "Tipo de evento inválido. Aceitos: page_view, visitor, click, ..."
}
```

---

## Exemplos de Uso

### cURL
```bash
curl -X POST http://localhost:3000/api/analytics/track \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_api_key_aqui" \
  -d '{
    "name": "page_view",
    "description": "Usuário na home",
    "data": {
      "page": "/",
      "url": "https://meusite.com/",
      "visitorId": "abc123",
      "ip": "192.168.1.1"
    }
  }'
```

### JavaScript/Fetch
```javascript
await fetch('http://localhost:3000/api/analytics/track', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'sua_api_key_aqui'
  },
  body: JSON.stringify({
    name: 'page_view',
    data: {
      page: window.location.pathname,
      url: window.location.href,
      visitorId: getVisitorId(),
      userAgent: navigator.userAgent,
      referrer: document.referrer
    }
  })
})
```

### Node.js (com Axios)
```javascript
const axios = require('axios')

await axios.post('http://localhost:3000/api/analytics/track', {
  name: 'purchase',
  description: 'Nova compra realizada',
  data: {
    orderId: 'ORD-789',
    total: 599.90,
    items: 2,
    userId: 'user-456'
  }
}, {
  headers: {
    'X-API-Key': process.env.ANALYTICS_API_KEY
  }
})
```

---

## Teste Rápido

Execute o script de teste:

```bash
npx tsx scripts/test-analytics-api.ts
```

Ou acesse a documentação interativa:

```
GET http://localhost:3000/api/analytics/track
```

---

## Segurança

⚠️ **IMPORTANTE:**

1. **Nunca exponha a API key no código frontend**
2. Use a API apenas em **servidor** ou através de um **proxy seguro**
3. Configure um rate limit em produção
4. Use HTTPS em produção
5. Considere adicionar validação de origem (CORS)
6. Rotacione a API key periodicamente

---

## Visualizando os Dados

Acesse o dashboard de analytics:

```
http://localhost:3000/admin/analytics
```

Os dados serão processados e exibidos com:
- Visitas totais e únicas
- Páginas mais acessadas
- Taxa de conversão
- Evolução temporal
- Dispositivos e navegadores
