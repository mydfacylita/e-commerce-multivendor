# MydShop Print Agent 🖨️

Agente de impressão local para impressão silenciosa (sem diálogo) no Windows.

## Funcionalidades

- ✅ Lista todas as impressoras instaladas no Windows (USB, Rede, Bluetooth)
- ✅ Imprime PDFs diretamente na impressora
- ✅ API REST simples na porta 12345
- ✅ Suporta múltiplas cópias
- ✅ Página de teste integrada

## Instalação

### Opção 1: Executar via Node.js

```bash
cd print-agent
npm install
npm start
```

### Opção 2: Gerar executável Windows (.exe)

```bash
cd print-agent
npm install
npm run build
```

O executável será gerado em `dist/mydshop-print-agent.exe`

## Uso

### Verificar status
```bash
curl http://localhost:12345/
```

### Listar impressoras
```bash
curl http://localhost:12345/printers
```

### Imprimir PDF via URL
```bash
curl -X POST http://localhost:12345/print/url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/documento.pdf", "printer": "HP LaserJet", "copies": 1}'
```

### Imprimir PDF via Base64
```bash
curl -X POST http://localhost:12345/print/base64 \
  -H "Content-Type: application/json" \
  -d '{"data": "JVBERi0xLjQK...", "printer": "HP LaserJet", "filename": "etiqueta.pdf"}'
```

### Página de teste
Acesse: http://localhost:12345/test

## Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Status do agente |
| GET | `/health` | Health check |
| GET | `/printers` | Lista impressoras instaladas |
| GET | `/printers/default` | Impressora padrão |
| POST | `/print/url` | Imprime PDF via URL |
| POST | `/print/base64` | Imprime PDF em Base64 |
| POST | `/print/file` | Imprime arquivo local |
| GET | `/test` | Página de teste |

## Executar como Serviço Windows

Para rodar automaticamente ao iniciar o Windows:

1. Crie um atalho do executável
2. Pressione `Win + R` e digite `shell:startup`
3. Cole o atalho na pasta Inicializar

Ou use o NSSM (Non-Sucking Service Manager):

```bash
nssm install MydShopPrintAgent "C:\caminho\mydshop-print-agent.exe"
nssm start MydShopPrintAgent
```

## Segurança

- O agente só aceita conexões locais por padrão
- CORS habilitado para o domínio do MydShop
- Arquivos temporários são limpos após impressão

## Solução de Problemas

### Porta 12345 em uso
Edite a constante `PORT` no arquivo `index.js`

### Impressora não encontrada
Verifique se a impressora está instalada corretamente no Windows via "Impressoras e Scanners"

### PDF não imprime
Certifique-se que o Adobe Reader ou outro leitor de PDF está instalado
