# 🛍️ Guia Completo - Google Shopping (Produtos Patrocinados)

## 📊 STATUS DA INTEGRAÇÃO

✅ **TUDO PRONTO NO SISTEMA!**

- ✅ Feed de produtos XML (RSS 2.0)
- ✅ Feed de produtos TXT/TSV
- ✅ Google Ads integrado (ID: `AW-17927166534`)
- ✅ Tracking de conversões configurado
- ✅ Tracking de add-to-cart configurado
- ✅ GTIN/EAN support
- ✅ Imagens múltiplas
- ✅ Preços e promoções
- ✅ Estoque em tempo real
- ✅ Categorias mapeadas

---

## 🚀 URLs DOS FEEDS (JÁ FUNCIONANDO)

### Feed XML (Recomendado)
```
https://www.mydshop.com.br/api/feeds/google-shopping
```

### Feed TXT/TSV (Alternativo)
```
https://www.mydshop.com.br/api/feeds/google-shopping-txt
```

**Teste agora mesmo:**
- Acesse http://localhost:3000/api/feeds/google-shopping (local)
- Ou https://mydshop.com.br/api/feeds/google-shopping (produção)

---

## 📋 PASSO A PASSO PARA CONFIGURAR

### **Etapa 1: Criar Conta no Google Merchant Center**

1. Acesse: https://merchants.google.com/
2. Clique em **"Começar"**
3. Faça login com sua conta Google
4. Preencha os dados:
   - **Nome da empresa:** MYDSHOP
   - **País:** Brasil 🇧🇷
   - **Fuso horário:** (UTC-03:00) Brasília

---

### **Etapa 2: Verificar e Reivindicar o Site**

#### Opção A: Verificação por Tag HTML (Mais Fácil)

1. No Merchant Center, vá em **"Ferramentas e configurações" (⚙️)**
2. Clique em **"Informações da empresa" → "Site"**
3. Insira: `https://www.mydshop.com.br`
4. Escolha **"Tag HTML"**
5. **Copie o código** fornecido (algo como `<meta name="google-site-verification" content="xxxxx">`)

6. **ADICIONE NO SISTEMA:**

Edite o arquivo `app/layout.tsx` e adicione o código no head:

```typescript
// Linha ~101 (na seção de verification)
verification: {
  google: 'SEU_CODIGO_AQUI', // Cole apenas o código, sem o meta tag
},
```

Exemplo:
```typescript
verification: {
  google: 'dQw4w9WgXcQ_abc123xyz', 
},
```

7. **Salve o arquivo** e faça commit/push
8. Aguarde 1-2 minutos para o deploy
9. Volte no Merchant Center e clique em **"Verificar URL"**

✅ **Site verificado!**

#### Opção B: Verificação via Google Search Console

1. Acesse: https://search.google.com/search-console
2. Adicione a propriedade: `https://www.mydshop.com.br`
3. Verifique usando um dos métodos
4. Volte ao Merchant Center e vincule o Search Console

---

### **Etapa 3: Configurar Feed de Produtos**

1. No Merchant Center, vá em **"Produtos" → "Feeds"**
2. Clique em **"Adicionar Feed +"**
3. Preencha:
   - **País:** Brasil
   - **Idioma:** Português (Brasil)
   - **Nome do feed:** Produtos MYDSHOP
4. Escolha **"Buscar programada"**
5. Cole a URL do feed:
   ```
   https://www.mydshop.com.br/api/feeds/google-shopping
   ```
6. **Frequência de busca:** Diária (todo dia às 2h da manhã)
7. Clique em **"Criar Feed"**
8. Clique em **"Buscar agora"** para testar

✅ **Feed configurado!** O Google vai importar seus produtos.

---

### **Etapa 4: Revisar e Corrigir Erros**

Após a primeira importação:

1. Vá em **"Produtos" → "Diagnóstico"**
2. Veja se há **erros ou avisos**

#### Problemas Comuns e Soluções:

**❌ "Faltando GTIN"**
- **Solução:** Adicione código de barras (GTIN/EAN) nos produtos
- Ou marque `identifier_exists: false` (já feito no feed)

**❌ "Imagem com baixa qualidade"**
- **Solução:** Use imagens com no mínimo 800x600px
- Idealmente 1200x1200px

**❌ "Descrição muito curta"**
- **Solução:** Descrições com no mínimo 500 caracteres

**❌ "Preço inválido"**
- **Solução:** Produtos devem ter preço maior que R$ 0,01

**❌ "Produto fora de estoque"**
- **Solução:** Certifique-se que `stock > 0` no banco de dados

---

### **Etapa 5: Criar Campanha no Google Ads**

1. Acesse: https://ads.google.com
2. Clique em **"+ Nova Campanha"**
3. Escolha o objetivo: **"Vendas"**
4. Tipo de campanha: **"Shopping"**
5. **Merchant Center:** Selecione a conta criada
6. **País de venda:** Brasil
7. **Nome da campanha:** MYDSHOP - Vendas Geral - Fev 2026
8. **Orçamento diário:** R$ 50,00 (ajuste conforme necessário)
9. **Lances:** Cliques (CPC)
10. **Lance padrão:** R$ 0,50 (Google otimiza automaticamente)

#### Configurar Grupo de Anúncios:

- **Nome:** Todos os Produtos
- **Filtro:** Todos os produtos (sem filtro)
- **Lance:** R$ 0,50

11. Clique em **"Criar Campanha"**

✅ **Campanha criada!** Aguarde aprovação (1-2 dias úteis).

---

## 🎯 ESTRUTURA DO FEED (O QUE O GOOGLE RECEBE)

Para cada produto, o feed envia:

| Campo | Exemplo | Obrigatório |
|-------|---------|-------------|
| `id` | `cmk123...` | ✅ Sim |
| `title` | `Smartphone XYZ 128GB` | ✅ Sim |
| `description` | Descrição completa... | ✅ Sim |
| `link` | `https://mydshop.com.br/produto/smartphone-xyz` | ✅ Sim |
| `image_link` | URL da imagem principal | ✅ Sim |
| `additional_image_link` | Até 10 imagens extras | ❌ Opcional |
| `availability` | `in_stock` ou `out_of_stock` | ✅ Sim |
| `price` | `1999.00 BRL` | ✅ Sim |
| `sale_price` | `1599.00 BRL` (se tiver promoção) | ❌ Opcional |
| `brand` | `Samsung` | ✅ Sim |
| `gtin` | `7891234567890` | ⚠️ Recomendado |
| `condition` | `new` | ✅ Sim |
| `google_product_category` | `222` (Electronics) | ⚠️ Recomendado |
| `product_type` | `Eletrônicos > Celulares` | ❌ Opcional |
| `shipping` | Frete grátis | ⚠️ Recomendado |

---

## ⚙️ MAPEAMENTO DE CATEGORIAS

O sistema já mapeia automaticamente suas categorias para as categorias do Google:

| Categoria MyDShop | Google Category ID | Google Category Name |
|-------------------|-------------------|---------------------|
| Eletrônicos | 222 | Electronics |
| Celulares | 267 | Mobile Phones |
| Computadores | 298 | Computers |
| Moda / Roupas | 166 | Apparel & Accessories |
| Calçados | 187 | Shoes |
| Casa e Decoração | 536 | Home & Garden |
| Cozinha | 668 | Kitchen & Dining |
| Esportes | 988 | Sporting Goods |
| Saúde / Beleza | 469 | Health & Beauty |
| Livros | 784 | Media > Books |
| Brinquedos | 1253 | Toys & Games |
| Bebê | 537 | Baby & Toddler |
| Pet | 1 | Animals & Pet Supplies |
| Automotivo | 888 | Vehicles & Parts |
| Ferramentas | 1167 | Hardware |
| Outros | 5181 | General Merchandise |

**Adicionar nova categoria?** Edite a função `getGoogleCategory()` em:
`app/api/feeds/google-shopping/route.ts` (linha ~145)

---

## 🔍 TRACKING DE CONVERSÕES

O sistema já rastreia automaticamente:

### ✅ Conversão de Compra
Quando um pedido é concluído, o evento `purchase` é enviado:

```javascript
// Automático no checkout
trackPurchaseConversion(orderId, total, 'BRL')
```

**ID de Conversão:** `AW-17927166534/5BMTCJdz_EbEMa0g-RC`

### ✅ Add to Cart
Quando um produto é adicionado ao carrinho:

```javascript
// Automático ao adicionar produto
trackAddToCart(productId, productName, price, 'BRL')
```

---

## 📊 MELHORAR O DESEMPENHO DOS ANÚNCIOS

### 1. **Adicione GTIN/EAN nos Produtos**

Produtos com código de barras têm **melhor ranqueamento**:

```sql
-- No banco de dados
UPDATE product 
SET gtin = '7891234567890' 
WHERE id = 'produto-id';
```

Ou adicione manualmente no admin ao cadastrar/editar produtos.

### 2. **Use Imagens de Alta Qualidade**

- Mínimo: 800x600px
- Recomendado: 1200x1200px
- Fundo branco ou transparente
- Produto centralizado

### 3. **Otimize Títulos e Descrições**

**❌ Ruim:**
```
Produto top
```

**✅ Bom:**
```
Smartphone Samsung Galaxy S23 128GB 5G Câmera 50MP Tela 6.1" - Preto
```

**Dica:** Inclua:
- Marca
- Modelo
- Especificações principais
- Cor/tamanho

### 4. **Configure Frete Grátis**

Produtos com frete grátis têm **40% mais cliques**!

No feed, já está configurado:
```xml
<g:shipping>
  <g:country>BR</g:country>
  <g:service>Entrega Padrão</g:service>
  <g:price>0 BRL</g:price>
</g:shipping>
```

### 5. **Use Promoções**

Produtos com `sale_price` ganham **badge de promoção** no Google Shopping:

```sql
UPDATE product 
SET comparePrice = 2999.00, price = 1999.00 
WHERE id = 'produto-id';
```

O feed detecta automaticamente e envia:
```xml
<g:price>2999.00 BRL</g:price>
<g:sale_price>1999.00 BRL</g:sale_price>
```

---

## 🚨 PROBLEMAS COMUNS E SOLUÇÕES

### Problema: Feed não carrega
**Solução:** Verifique se o servidor está rodando:
```bash
curl http://localhost:3000/api/feeds/google-shopping
```

### Problema: Produtos não aparecem no Google
**Causas:**
1. Site não verificado → Verifique no Merchant Center
2. Feed com erros → Veja "Diagnóstico" no Merchant Center
3. Produtos sem estoque → `stock` deve ser > 0
4. Produtos inativos → `active` deve ser `true`
5. Aguardar aprovação → Pode levar 1-7 dias

### Problema: Conversões não aparecem no Google Ads
**Solução:** 
1. Verifique se o Google Ads ID está correto: `AW-17927166534`
2. Aguarde até 24h para conversões aparecerem
3. Teste em modo de navegação anônima

### Problema: "Destino não reivindicado"
**Solução:** Vá em "Configurações" → "Sites" e clique em "Reivindicar site"

---

## ✅ CHECKLIST COMPLETO

- [ ] **Google Merchant Center criado**
- [ ] **Site verificado** (tag HTML adicionada)
- [ ] **Feed configurado** (URL: `/api/feeds/google-shopping`)
- [ ] **Primeira importação concluída** (produtos aparecendo)
- [ ] **Erros corrigidos** (diagnóstico limpo)
- [ ] **Google Ads vinculado** ao Merchant Center
- [ ] **Campanha de Shopping criada**
- [ ] **Orçamento definido** (ex: R$ 50/dia)
- [ ] **Tracking de conversões testado**
- [ ] **Imagens otimizadas** (min 800x600px)
- [ ] **GTIN adicionado** nos produtos principais
- [ ] **Descrições completas** (min 500 caracteres)
- [ ] **Categorias corretas**
- [ ] **Preços competitivos**
- [ ] **Estoque atualizado**

---

## 🔄 SINCRONIZAÇÃO AUTOMÁTICA

O feed é **atualizado automaticamente** sempre que:
- Um produto é criado/editado
- Estoque muda
- Preço é alterado
- Produto é ativado/desativado

**Frequência de busca do Google:** Diária (configurável no Merchant Center)

**Cache do feed:** 1 hora (para não sobrecarregar o servidor)

---

## 📞 SUPORTE

### Google Merchant Center
- Central de Ajuda: https://support.google.com/merchants/
- Suporte: https://support.google.com/merchants/contact/

### Google Ads
- Central de Ajuda: https://support.google.com/google-ads/
- Chat: Disponível 24/7 no painel

### Suporte MyDShop
- Email: mydfacylitecnology@gmail.com
- WhatsApp: (212) xxx-xxxx

---

## 📈 PRÓXIMOS PASSOS (OPCIONAL)

### 1. Google Ads Remarketing
- Mostrar anúncios para quem visitou mas não comprou
- Aumenta conversão em até 400%

### 2. Promotions no Feed
- Adicionar cupons e promoções especiais
- Badge "Oferta especial" no Google Shopping

### 3. Merchant Promotions
- Frete grátis acima de X reais
- Desconto de X% na primeira compra

### 4. Dynamic Remarketing
- Mostrar exatamente os produtos que o usuário viu
- Personalização 100% automática

---

**Última atualização:** 11/02/2026  
**Versão:** 1.0.0

**Status do Sistema:** ✅ 100% Pronto para Google Shopping

🎉 **Agora é só configurar o Merchant Center e começar a vender!**
