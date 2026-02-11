# 🚀 QUICK START - Google Shopping

## ✅ O QUE JÁ ESTÁ PRONTO NO SISTEMA

```
✅ Feed XML: http://mydshop.com.br/api/feeds/google-shopping
✅ Feed TXT: http://mydshop.com.br/api/feeds/google-shopping-txt
✅ Google Ads ID: AW-17927166534
✅ Tracking de conversões (compras)
✅ Tracking de add-to-cart
✅ Categorias mapeadas
✅ GTIN/EAN support
✅ Imagens múltiplas
✅ Promoções (sale_price)
✅ Cache otimizado (1 hora)
```

---

## 🎯 3 PASSOS PARA APARECER NO GOOGLE SHOPPING

### 1️⃣ Google Merchant Center (5 min)

```
1. Acesse: https://merchants.google.com/
2. Criar conta → Preencher dados da empresa
3. Adicionar site: https://www.mydshop.com.br
4. Verificar site (tag HTML ou Search Console)
```

**Verificação via Tag HTML:**
- Copie o código de verificação do Merchant Center
- Adicione em `app/layout.tsx` linha ~101:
  ```typescript
  verification: {
    google: 'SEU_CODIGO_AQUI',
  },
  ```
- Commit + push → Aguarde 2 min → Clique "Verificar"

### 2️⃣ Configurar Feed (2 min)

```
1. No Merchant Center: "Produtos" → "Feeds" → "+"
2. País: Brasil | Idioma: Português
3. Tipo: "Buscar programada"
4. URL: https://www.mydshop.com.br/api/feeds/google-shopping
5. Frequência: Diária
6. Salvar → "Buscar agora"
```

**Aguarde:** 10-30 minutos para primeira importação

### 3️⃣ Criar Campanha Google Ads (5 min)

```
1. Acesse: https://ads.google.com/
2. "+ Nova Campanha" → Objetivo: "Vendas"
3. Tipo: "Shopping"
4. Vincular Merchant Center
5. Orçamento: R$ 50/dia (ajustar depois)
6. Lance: R$ 0,50 por clique
7. Criar campanha
```

**Aguarde aprovação:** 1-3 dias úteis

---

## 🧪 TESTAR O FEED

```bash
# Executar script de teste
node test-google-shopping-feed.js
```

Ou acesse direto no navegador:
```
http://localhost:3000/api/feeds/google-shopping
```

---

## 📊 RESULTADOS ESPERADOS

### Após 7 dias:
- 📈 Impressões: 1.000 - 10.000
- 👆 Cliques: 50 - 500 (CTR ~5%)
- 🛒 Conversões: 5 - 50 (CR ~10%)
- 💰 ROI: 200-400%

### Otimizações:
1. **GTIN:** Produtos com código de barras ranqueiam melhor
2. **Imagens:** Mínimo 800x600px (ideal 1200x1200px)
3. **Título:** 70-150 caracteres com palavras-chave
4. **Descrição:** Mínimo 500 caracteres
5. **Frete Grátis:** +40% de cliques

---

## ⚠️ PROBLEMAS COMUNS

**❌ "Destino não reivindicado"**
→ Verificar site no Merchant Center

**❌ "Produtos não aprovados"**
→ Ver diagnóstico: Produtos → Diagnóstico

**❌ "Feed não carrega"**
→ Verificar se servidor está online

**❌ "Imagens com erro"**
→ Usar HTTPS para todas as imagens

**❌ "Títulos muito longos"**
→ Máximo 150 caracteres

---

## 📞 SUPORTE

**Google Merchant Center:**
https://support.google.com/merchants/

**Google Ads:**
https://support.google.com/google-ads/

**Chat ao vivo:**
Disponível 24/7 no painel do Google Ads

---

## 📄 DOCUMENTAÇÃO COMPLETA

Ver: `GOOGLE-SHOPPING-SETUP.md`

---

**Status:** ✅ Sistema 100% pronto  
**Última atualização:** 11/02/2026

🎉 **Configuração total: ~15 minutos**
