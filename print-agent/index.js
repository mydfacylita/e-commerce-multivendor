/**
 * MydShop Print Agent
 * Agente de impressão local para impressão silenciosa
 * 
 * Funcionalidades:
 * - Lista impressoras instaladas no Windows
 * - Imprime PDFs diretamente
 * - Roda na bandeja do sistema
 * - API REST na porta 12345
 */

const express = require('express')
const cors = require('cors')
const { print, getPrinters, getDefaultPrinter } = require('pdf-to-printer')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { exec } = require('child_process')

const app = express()
const PORT = 12345
const VERSION = '1.0.0'

// Configurações
let config = {
  autoStart: true,
  defaultPrinter: null,
  port: PORT
}

// Middleware - CORS manual para garantir compatibilidade
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  // Responder imediatamente a preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Pasta temporária para arquivos
const tempDir = path.join(os.tmpdir(), 'mydshop-print-agent')
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true })
}

// ============================================
// ROTAS DA API
// ============================================

// Status do agente
app.get('/', (req, res) => {
  res.json({
    name: 'MydShop Print Agent',
    version: VERSION,
    status: 'online',
    platform: process.platform,
    hostname: os.hostname(),
    port: PORT
  })
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Listar impressoras
app.get('/printers', async (req, res) => {
  try {
    // Usar PowerShell para listar impressoras (mais confiável no Windows)
    const printers = await listPrintersWindows()
    
    res.json({
      success: true,
      printers: printers,
      defaultPrinter: printers.find(p => p.isDefault)?.name || null,
      count: printers.length
    })
  } catch (error) {
    console.error('Erro ao listar impressoras:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao listar impressoras',
      message: error.message
    })
  }
})

// Impressora padrão
app.get('/printers/default', async (req, res) => {
  try {
    const defaultPrinter = await getDefaultPrinter()
    res.json({
      success: true,
      printer: defaultPrinter?.name || null
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Imprimir PDF via URL
app.post('/print/url', async (req, res) => {
  try {
    const { url, printer, copies = 1 } = req.body
    
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL é obrigatória' })
    }
    
    console.log(`📥 Baixando PDF: ${url}`)
    
    // Baixar o PDF
    const https = url.startsWith('https') ? require('https') : require('http')
    const tempFile = path.join(tempDir, `print-${Date.now()}.pdf`)
    
    const file = fs.createWriteStream(tempFile)
    
    await new Promise((resolve, reject) => {
      https.get(url, (response) => {
        // Seguir redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          https.get(response.headers.location, (res2) => {
            res2.pipe(file)
            file.on('finish', () => {
              file.close()
              resolve()
            })
          }).on('error', reject)
        } else {
          response.pipe(file)
          file.on('finish', () => {
            file.close()
            resolve()
          })
        }
      }).on('error', reject)
    })
    
    console.log(`🖨️ Imprimindo em: ${printer || 'padrão'}`)
    
    // Imprimir
    const options = {}
    if (printer) options.printer = printer
    if (copies > 1) options.copies = copies
    
    await print(tempFile, options)
    
    // Limpar arquivo temporário após 30s
    setTimeout(() => {
      try { fs.unlinkSync(tempFile) } catch {}
    }, 30000)
    
    res.json({
      success: true,
      message: 'Documento enviado para impressão',
      printer: printer || 'padrão',
      copies
    })
    
  } catch (error) {
    console.error('Erro ao imprimir:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao imprimir',
      message: error.message
    })
  }
})

// Imprimir PDF via Base64
app.post('/print/base64', async (req, res) => {
  try {
    const { data, printer, copies = 1, filename = 'documento.pdf' } = req.body
    
    if (!data) {
      return res.status(400).json({ success: false, error: 'Dados Base64 são obrigatórios' })
    }
    
    console.log(`📄 Recebendo PDF: ${filename}`)
    
    // Converter Base64 para arquivo
    const buffer = Buffer.from(data, 'base64')
    const tempFile = path.join(tempDir, `print-${Date.now()}-${filename}`)
    
    fs.writeFileSync(tempFile, buffer)
    
    console.log(`🖨️ Imprimindo em: ${printer || 'padrão'}`)
    
    // Imprimir
    const options = {}
    if (printer) options.printer = printer
    if (copies > 1) options.copies = copies
    
    await print(tempFile, options)
    
    // Limpar arquivo temporário após 30s
    setTimeout(() => {
      try { fs.unlinkSync(tempFile) } catch {}
    }, 30000)
    
    res.json({
      success: true,
      message: 'Documento enviado para impressão',
      printer: printer || 'padrão',
      copies
    })
    
  } catch (error) {
    console.error('Erro ao imprimir:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao imprimir',
      message: error.message
    })
  }
})

// Imprimir arquivo local
app.post('/print/file', async (req, res) => {
  try {
    const { filePath, printer, copies = 1 } = req.body
    
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'Caminho do arquivo é obrigatório' })
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Arquivo não encontrado' })
    }
    
    console.log(`🖨️ Imprimindo arquivo: ${filePath}`)
    
    const options = {}
    if (printer) options.printer = printer
    if (copies > 1) options.copies = copies
    
    await print(filePath, options)
    
    res.json({
      success: true,
      message: 'Documento enviado para impressão',
      printer: printer || 'padrão',
      copies
    })
    
  } catch (error) {
    console.error('Erro ao imprimir:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao imprimir',
      message: error.message
    })
  }
})

// Página de teste
app.get('/test', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>MydShop Print Agent - Teste</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2563eb; margin: 0 0 10px; }
        .status { display: inline-block; padding: 5px 15px; border-radius: 20px; background: #22c55e; color: white; font-size: 14px; }
        .info { margin: 20px 0; padding: 15px; background: #f0f9ff; border-radius: 8px; }
        .printers { margin: 20px 0; }
        .printer { padding: 10px 15px; background: #f5f5f5; border-radius: 5px; margin: 5px 0; display: flex; justify-content: space-between; align-items: center; }
        .printer.default { background: #dbeafe; border: 1px solid #2563eb; }
        button { padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        button:hover { background: #1d4ed8; }
        .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🖨️ MydShop Print Agent</h1>
        <span class="status">● Online</span>
        
        <div class="info">
          <strong>Versão:</strong> ${VERSION}<br>
          <strong>Porta:</strong> ${PORT}<br>
          <strong>Host:</strong> ${os.hostname()}
        </div>
        
        <h3>Impressoras Instaladas:</h3>
        <div class="printers" id="printers">
          Carregando...
        </div>
        
        <div>
          <button onclick="testPrint()">🖨️ Imprimir Página de Teste</button>
          <button onclick="loadPrinters()">🔄 Atualizar</button>
        </div>
        
        <div class="footer">
          MydShop Print Agent v${VERSION} - Rodando em http://localhost:${PORT}
        </div>
      </div>
      
      <script>
        async function loadPrinters() {
          try {
            const res = await fetch('/printers');
            const data = await res.json();
            const container = document.getElementById('printers');
            
            if (data.printers && data.printers.length > 0) {
              container.innerHTML = data.printers.map(p => 
                '<div class="printer ' + (p.isDefault ? 'default' : '') + '">' +
                  '<span>' + (p.isDefault ? '⭐ ' : '') + p.name + '</span>' +
                  '<button onclick="printTest(\\'' + p.name.replace(/'/g, "\\\\'") + '\\')">Testar</button>' +
                '</div>'
              ).join('');
            } else {
              container.innerHTML = '<p>Nenhuma impressora encontrada</p>';
            }
          } catch (e) {
            document.getElementById('printers').innerHTML = '<p style="color:red">Erro ao carregar impressoras</p>';
          }
        }
        
        async function testPrint() {
          window.print();
        }
        
        async function printTest(printerName) {
          alert('Enviando teste para: ' + printerName);
          // Aqui você pode enviar um PDF de teste
        }
        
        loadPrinters();
      </script>
    </body>
    </html>
  `)
})

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// Listar impressoras via PowerShell (mais confiável)
function listPrintersWindows() {
  return new Promise((resolve, reject) => {
    // Usar Get-Printer que é mais moderno e confiável
    const cmd = 'powershell -NoProfile -Command "Get-Printer | Select-Object Name, PrinterStatus, Default | ConvertTo-Json -Compress"'
    
    exec(cmd, { encoding: 'utf8', timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        console.log('Get-Printer falhou, tentando WMIC...')
        // Fallback: usar WMIC
        const wmicCmd = 'wmic printer get name,default /format:csv'
        exec(wmicCmd, { encoding: 'utf8', timeout: 10000 }, (err2, stdout2) => {
          if (err2) {
            reject(err2)
            return
          }
          
          try {
            // Parse CSV do WMIC
            const lines = stdout2.trim().split('\n').filter(l => l.trim())
            const printers = []
            
            // Pular header
            for (let i = 1; i < lines.length; i++) {
              const parts = lines[i].split(',')
              if (parts.length >= 3) {
                const isDefault = parts[1]?.trim().toUpperCase() === 'TRUE'
                const name = parts[2]?.trim()
                if (name) {
                  printers.push({
                    name: name,
                    isDefault: isDefault,
                    status: 'Pronta'
                  })
                }
              }
            }
            
            resolve(printers)
          } catch (parseErr) {
            reject(parseErr)
          }
        })
        return
      }
      
      try {
        // Pode retornar objeto único ou array
        let data = JSON.parse(stdout || '[]')
        if (!Array.isArray(data)) {
          data = data ? [data] : []
        }
        
        const printers = data.map(p => ({
          name: p.Name,
          isDefault: p.Default === true,
          status: p.PrinterStatus === 0 ? 'Pronta' : p.PrinterStatus === 1 ? 'Pausada' : 'Ocupada'
        }))
        
        resolve(printers)
      } catch (e) {
        console.error('Erro ao fazer parse:', e)
        reject(e)
      }
    })
  })
}

// ============================================
// INICIALIZAÇÃO
// ============================================

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('')
  console.log('╔════════════════════════════════════════════╗')
  console.log('║     🖨️  MydShop Print Agent v' + VERSION + '       ║')
  console.log('╠════════════════════════════════════════════╣')
  console.log('║  Status: ✅ Online                         ║')
  console.log('║  Porta:  ' + PORT + '                            ║')
  console.log('║  Host:   http://localhost:' + PORT + '          ║')
  console.log('╚════════════════════════════════════════════╝')
  console.log('')
  console.log('Endpoints disponíveis:')
  console.log('  GET  /           - Status do agente')
  console.log('  GET  /printers   - Lista impressoras')
  console.log('  POST /print/url  - Imprime PDF via URL')
  console.log('  POST /print/base64 - Imprime PDF em Base64')
  console.log('  GET  /test       - Página de teste')
  console.log('')
})

// Tratar encerramento gracioso
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando agente...')
  server.close()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Encerrando agente...')
  server.close()
  process.exit(0)
})

// Tratar erros não capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada:', reason)
})
