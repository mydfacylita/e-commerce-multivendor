# Correios CWS API Integration - Documentação

## Visão Geral

Integração completa com a API REST CWS dos Correios para:
- Geração automática de códigos de rastreio
- Criação de pré-postagens
- Geração de etiquetas/rótulos em PDF

## Arquivos Atualizados

### Biblioteca Principal
- **lib/correios-cws.ts** - Cliente TypeScript para API CWS

### Rotas da API
- **app/api/admin/expedicao/[id]/gerar-etiqueta-correios/route.ts** - Gera código de rastreio
- **app/api/admin/expedicao/[id]/etiqueta-pdf/route.ts** - Baixa etiqueta em PDF

### Banco de Dados
- **add-correios-prepostagem-id.sql** - Adiciona campo `correiosIdPrePostagem` na tabela order
- **prisma/schema.prisma** - Atualizado com novo campo

## Configuração Necessária

As credenciais devem estar salvas no banco de dados (tabela `systemconfig`):

| Key | Descrição |
|-----|-----------|
| `correios.usuario` | CNPJ ou usuário de acesso |
| `correios.codigoAcesso` | Código de acesso (senha/API key) |
| `correios.cartaoPostagem` | Número do cartão de postagem |
| `correios.cepOrigem` | CEP de origem (remetente) |

## Fluxo de Funcionamento

### 1. Autenticação
```
POST /token/v1/autentica/cartaopostagem
Authorization: Basic base64(usuario:codigoAcesso)
Body: { "numero": "cartaoPostagem" }
→ Retorna token Bearer válido por 24h
```

### 2. Criação de Pré-Postagem
```
POST /prepostagem/v1/prepostagens
Authorization: Bearer {token}
Body: { remetente, destinatario, codigoServico, pesoInformado, ... }
→ Retorna { codigoObjeto: "AB123456789BR", id: "PRxxxx" }
```

### 3. Geração de Etiqueta (Assíncrono)
```
POST /prepostagem/v1/prepostagens/rotulo/assincrono/pdf
Body: { idsPrePostagem: [id], tipoRotulo: "P", formatoRotulo: "ET" }
→ Retorna { idRecibo: "xxx" }

Aguardar 3 segundos...

GET /prepostagem/v1/prepostagens/rotulo/download/assincrono/{idRecibo}
→ Retorna { dados: "base64_pdf..." }
```

## Campos Importantes do Payload

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `cpfCnpj` | string | CPF/CNPJ do remetente/destinatário |
| `codigoFormatoObjetoInformado` | string | "1"=Envelope, "2"=Caixa, "3"=Cilindro |
| `pesoInformado` | string | Peso em gramas (até 6 dígitos) |
| `cienteObjetoNaoProibido` | string | "1" = objeto não é proibido |
| `regiao` | string | Região do destinatário (Sudeste, Sul, etc.) |

## Códigos de Serviço

| Código | Serviço |
|--------|---------|
| 03220 | SEDEX |
| 03298 | PAC |
| 04162 | SEDEX 12 |
| 04669 | PAC Contrato |
| 04510 | PAC |

## Uso na Aplicação

### Gerar Código de Rastreio
```typescript
import { correiosCWS } from '@/lib/correios-cws'

const resultado = await correiosCWS.criarPrePostagem(
  destinatario,  // { nome, cpfCnpj, logradouro, numero, ... }
  remetente,     // { nome, cnpj, logradouro, numero, ... }
  objeto         // { peso, altura, largura, comprimento, codigoServico }
)

// resultado.codigoRastreio = "AB123456789BR"
// resultado.idPrePostagem = "PRxxxx"
```

### Gerar Etiqueta PDF
```typescript
const resultado = await correiosCWS.gerarEtiqueta(idPrePostagem)

if (resultado.success) {
  // resultado.pdfBuffer contém o PDF em Buffer
  fs.writeFileSync('etiqueta.pdf', resultado.pdfBuffer)
}
```

## Testes

Execute o script de teste:
```bash
node test-correios-complete.js
```

Saída esperada:
```
✅ Token obtido com sucesso!
✅ Pré-postagem criada! Código: AB123456789BR
✅ Rótulo solicitado! ID Recibo: xxx
✅ PDF baixado com sucesso! Tamanho: ~32KB
📄 Etiqueta salva em: etiqueta-AB123456789BR.pdf
```

## Observações

1. **Valor Declarado**: O serviço adicional 019 (valor declarado) precisa estar vinculado ao contrato. Se não estiver, remova do payload.

2. **Campo `regiao`**: Obrigatório no endereço do destinatário. Use a função `getRegiao(uf)` para converter UF para região.

3. **Fluxo Assíncrono**: A geração de etiqueta para objetos registrados é assíncrona. Aguarde ~3 segundos antes de baixar o PDF.

4. **Cache de Token**: O token é cacheado em memória por 24h para evitar chamadas desnecessárias.

## Referências

- [Portal CWS Correios](https://cws.correios.com.br)
- [Documentação API](https://cws.correios.com.br/plp)
- [Swagger API](https://api.correios.com.br/prepostagem/v1/swagger-ui.html)
