/**
 * 🔒 AUDITORIA DE SEGURANÇA DE APIs
 * 
 * Script automatizado para auditar todas as 188 APIs do sistema
 * Verifica implementação de segurança e gera relatório detalhado
 */

const fs = require('fs');
const path = require('path');

// Configurações
const API_DIR = path.join(__dirname, 'app', 'api');
const OUTPUT_FILE = 'SECURITY-AUDIT-REPORT.md';

// Padrões de segurança a verificar
const SECURITY_PATTERNS = {
  authentication: [
    /getServerSession/,
    /authOptions/,
    /session\?\.user/,
    /validateApiKey/
  ],
  roleCheck: [
    /role\s*[=!]==\s*['"]ADMIN['"]/,
    /role\s*[=!]==\s*['"]SELLER['"]/,
    /role\s*!==\s*['"]ADMIN['"]/,
  ],
  ownership: [
    /session\.user\.id\s*[=!]==\s*\w+\.userId/,
    /session\.user\.id\s*[=!]==\s*seller\.userId/,
    /sellerId\s*[=!]==\s*session/,
  ],
  validation: [
    /z\./,  // zod
    /joi\./,  // joi
    /validateEmail/,
    /sanitize/,
    /\.trim\(\)/,
  ],
  rateLimit: [
    /rateLimit/i,
    /checkRateLimit/,
    /MAX_ATTEMPTS/,
    /429/,  // status code
  ],
  logging: [
    /console\.log/,
    /logApi/,
    /auditLog/,
    /logger\./,
  ],
  sqlInjection: [
    /prisma\./,
    /\$\{.*\}/,  // template literals (potencial perigo)
    /\.raw\(/,   // queries raw (potencial perigo)
  ],
  webhookValidation: [
    /validateWebhook/,
    /validateSignature/,
    /hmac/i,
    /x-signature/i,
  ],
  cors: [
    /Access-Control-Allow-Origin/,
    /ALLOWED_ORIGINS/,
  ],
  fileUpload: [
    /allowedTypes/,
    /maxSize/,
    /\.size/,
    /\.type/,
  ]
};

// Categorias de criticidade
const API_CATEGORIES = {
  CRITICAL: ['admin', 'financeiro', 'refund', 'saques', 'gateway', 'payment', 'webhook'],
  HIGH: ['seller', 'orders', 'upload', 'ean', 'subscription'],
  MEDIUM: ['user', 'products', 'shipping', 'analytics'],
  LOW: ['categories', 'packaging', 'config/public']
};

// Resultados da auditoria
const auditResults = {
  total: 0,
  safe: 0,
  partiallySafe: 0,
  vulnerable: 0,
  notFound: 0,
  details: []
};

/**
 * Verifica padrões de segurança no código
 */
function checkSecurityPatterns(content, filePath) {
  const findings = {
    authentication: false,
    roleCheck: false,
    ownership: false,
    validation: false,
    rateLimit: false,
    logging: false,
    sqlInjectionProtection: true,  // assume true se usar prisma
    xssProtection: false,
    cors: false,
    webhookValidation: false,
    fileUploadValidation: false,
  };

  // Autenticação
  findings.authentication = SECURITY_PATTERNS.authentication.some(p => p.test(content));
  
  // Role check
  findings.roleCheck = SECURITY_PATTERNS.roleCheck.some(p => p.test(content));
  
  // Ownership
  findings.ownership = SECURITY_PATTERNS.ownership.some(p => p.test(content));
  
  // Validação
  findings.validation = SECURITY_PATTERNS.validation.some(p => p.test(content));
  
  // Rate limiting
  findings.rateLimit = SECURITY_PATTERNS.rateLimit.some(p => p.test(content));
  
  // Logging
  findings.logging = SECURITY_PATTERNS.logging.some(p => p.test(content));
  
  // SQL Injection (verifica se usa prisma OU se tem queries raw perigosas)
  const usesPrisma = /prisma\./.test(content);
  const hasRawQuery = /\.raw\(/.test(content) || /\$\{.*\}/.test(content);
  findings.sqlInjectionProtection = usesPrisma && !hasRawQuery;
  
  // XSS Protection (se sanitiza ou usa biblioteca de template)
  findings.xssProtection = /sanitize/i.test(content) || /DOMPurify/i.test(content);
  
  // CORS
  findings.cors = SECURITY_PATTERNS.cors.some(p => p.test(content));
  
  // Webhook validation (se for webhook)
  if (filePath.includes('webhook')) {
    findings.webhookValidation = SECURITY_PATTERNS.webhookValidation.some(p => p.test(content));
  }
  
  // File upload validation (se for upload)
  if (filePath.includes('upload')) {
    findings.fileUploadValidation = SECURITY_PATTERNS.fileUpload.some(p => p.test(content));
  }

  return findings;
}

/**
 * Determina criticidade da API
 */
function getCriticality(filePath) {
  const lowerPath = filePath.toLowerCase();
  
  for (const [level, keywords] of Object.entries(API_CATEGORIES)) {
    if (keywords.some(k => lowerPath.includes(k))) {
      return level;
    }
  }
  
  return 'MEDIUM';
}

/**
 * Classifica status de segurança
 */
function classifySecurityStatus(findings, criticality, filePath) {
  const isPublicEndpoint = 
    filePath.includes('/products/') || 
    filePath.includes('/categories') ||
    filePath.includes('/shipping/calculate') ||
    filePath.includes('/config/public');
  
  const isWebhook = filePath.includes('webhook');
  const isUpload = filePath.includes('upload');
  const isAdmin = filePath.includes('/admin/');
  const isFinancial = filePath.includes('financeiro') || 
                      filePath.includes('payment') || 
                      filePath.includes('refund') ||
                      filePath.includes('saques');

  const missing = [];
  
  // Endpoints públicos: validação básica
  if (isPublicEndpoint) {
    if (!findings.validation) missing.push('Validação de inputs');
    if (!findings.logging) missing.push('Logging');
    
    if (missing.length === 0) return { status: 'SAFE', missing };
    if (missing.length <= 1) return { status: 'PARTIALLY_SAFE', missing };
    return { status: 'VULNERABLE', missing };
  }
  
  // Webhooks: validação de assinatura crítica
  if (isWebhook) {
    if (!findings.webhookValidation) missing.push('Validação de assinatura HMAC');
    if (!findings.logging) missing.push('Logging de eventos');
    if (!findings.sqlInjectionProtection) missing.push('Proteção SQL Injection');
    
    if (missing.length === 0) return { status: 'SAFE', missing };
    if (missing.includes('Validação de assinatura HMAC')) return { status: 'VULNERABLE', missing };
    return { status: 'PARTIALLY_SAFE', missing };
  }
  
  // Upload: validações críticas
  if (isUpload) {
    if (!findings.authentication) missing.push('Autenticação');
    if (!findings.fileUploadValidation) missing.push('Validação de arquivo (tipo, tamanho)');
    if (!findings.logging) missing.push('Logging de uploads');
    
    if (missing.length === 0) return { status: 'SAFE', missing };
    if (missing.length >= 2) return { status: 'VULNERABLE', missing };
    return { status: 'PARTIALLY_SAFE', missing };
  }
  
  // Admin: máxima segurança
  if (isAdmin) {
    if (!findings.authentication) missing.push('Autenticação');
    if (!findings.roleCheck) missing.push('Verificação role ADMIN');
    if (!findings.validation) missing.push('Validação de inputs');
    if (!findings.logging) missing.push('Logging de operações');
    if (!findings.sqlInjectionProtection) missing.push('Proteção SQL Injection');
    
    if (missing.length === 0) return { status: 'SAFE', missing };
    if (missing.includes('Autenticação') || missing.includes('Verificação role ADMIN')) {
      return { status: 'VULNERABLE', missing };
    }
    return { status: 'PARTIALLY_SAFE', missing };
  }
  
  // Financeiro: auditoria completa
  if (isFinancial) {
    if (!findings.authentication) missing.push('Autenticação');
    if (!findings.roleCheck) missing.push('Verificação de role');
    if (!findings.validation) missing.push('Validação de valores monetários');
    if (!findings.logging) missing.push('Logging/Auditoria');
    if (!findings.sqlInjectionProtection) missing.push('Proteção SQL Injection');
    
    if (missing.length === 0) return { status: 'SAFE', missing };
    if (missing.includes('Autenticação') || missing.includes('Logging/Auditoria')) {
      return { status: 'VULNERABLE', missing };
    }
    return { status: 'PARTIALLY_SAFE', missing };
  }
  
  // Endpoints privados (padrão)
  if (!findings.authentication) missing.push('Autenticação');
  if (!findings.validation) missing.push('Validação de inputs');
  if (!findings.logging) missing.push('Logging');
  
  if (missing.length === 0) return { status: 'SAFE', missing };
  if (missing.includes('Autenticação')) return { status: 'VULNERABLE', missing };
  return { status: 'PARTIALLY_SAFE', missing };
}

/**
 * Audita um arquivo de API
 */
function auditApiFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(API_DIR, filePath);
    const apiRoute = '/api/' + relativePath.replace(/\\/g, '/').replace(/\/route\.(ts|js)$/, '');
    
    const findings = checkSecurityPatterns(content, filePath);
    const criticality = getCriticality(filePath);
    const { status, missing } = classifySecurityStatus(findings, criticality, filePath);
    
    return {
      route: apiRoute,
      file: relativePath,
      status,
      criticality,
      findings,
      missing,
      recommendations: generateRecommendations(missing, criticality, filePath)
    };
  } catch (error) {
    return {
      route: filePath,
      status: 'NOT_FOUND',
      error: error.message
    };
  }
}

/**
 * Gera recomendações específicas
 */
function generateRecommendations(missing, criticality, filePath) {
  const recommendations = [];
  
  if (missing.includes('Autenticação')) {
    recommendations.push('🔴 CRÍTICO: Implementar autenticação com getServerSession()');
  }
  
  if (missing.includes('Verificação role ADMIN')) {
    recommendations.push('🔴 CRÍTICO: Adicionar verificação de role === "ADMIN"');
  }
  
  if (missing.includes('Validação de assinatura HMAC')) {
    recommendations.push('🔴 CRÍTICO: Implementar validação de assinatura HMAC para webhook');
  }
  
  if (missing.includes('Validação de arquivo (tipo, tamanho)')) {
    recommendations.push('🔴 CRÍTICO: Validar tipo e tamanho de arquivo no upload');
  }
  
  if (missing.includes('Validação de inputs')) {
    recommendations.push('🟡 IMPORTANTE: Implementar validação de inputs com Zod ou Joi');
  }
  
  if (missing.includes('Logging') || missing.includes('Logging/Auditoria')) {
    if (criticality === 'CRITICAL') {
      recommendations.push('🔴 CRÍTICO: Implementar auditoria de operações financeiras');
    } else {
      recommendations.push('🟡 RECOMENDADO: Adicionar logging de operações');
    }
  }
  
  if (missing.includes('Proteção SQL Injection')) {
    recommendations.push('🔴 CRÍTICO: Evitar queries raw, usar Prisma com parâmetros');
  }
  
  return recommendations;
}

/**
 * Escaneia recursivamente os arquivos de API
 */
function scanApiFiles(dir) {
  const files = [];
  
  function scan(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (item === 'route.ts' || item === 'route.js') {
        files.push(fullPath);
      }
    }
  }
  
  scan(dir);
  return files;
}

/**
 * Gera relatório em Markdown
 */
function generateMarkdownReport(results) {
  let md = `# 🔒 RELATÓRIO DE AUDITORIA DE SEGURANÇA - APIs MYDSHOP

**Data da Auditoria:** ${new Date().toLocaleString('pt-BR')}
**Total de APIs Auditadas:** ${results.total}

## 📊 RESUMO EXECUTIVO

| Status | Quantidade | Percentual |
|--------|------------|------------|
| 🟢 SEGURO | ${results.safe} | ${((results.safe/results.total)*100).toFixed(1)}% |
| 🟡 PARCIALMENTE SEGURO | ${results.partiallySafe} | ${((results.partiallySafe/results.total)*100).toFixed(1)}% |
| 🔴 VULNERÁVEL | ${results.vulnerable} | ${((results.vulnerable/results.total)*100).toFixed(1)}% |
| ⚫ NÃO VERIFICADO | ${results.notFound} | ${((results.notFound/results.total)*100).toFixed(1)}% |

---

## 🚨 PRIORIDADES CRÍTICAS

### APIs VULNERÁVEIS que precisam atenção IMEDIATA:

`;

  const vulnerable = results.details.filter(d => d.status === 'VULNERABLE');
  const criticalVulnerable = vulnerable.filter(d => d.criticality === 'CRITICAL');
  
  if (criticalVulnerable.length > 0) {
    md += `\n#### 🔴 CRÍTICAS (${criticalVulnerable.length})\n\n`;
    criticalVulnerable.forEach(api => {
      md += `##### ${api.route}\n`;
      md += `- **Arquivo:** \`${api.file}\`\n`;
      md += `- **Problemas:**\n`;
      api.missing.forEach(m => md += `  - ❌ ${m}\n`);
      if (api.recommendations.length > 0) {
        md += `- **Ações Necessárias:**\n`;
        api.recommendations.forEach(r => md += `  ${r}\n`);
      }
      md += '\n';
    });
  }
  
  const highVulnerable = vulnerable.filter(d => d.criticality === 'HIGH');
  if (highVulnerable.length > 0) {
    md += `\n#### 🟠 ALTA PRIORIDADE (${highVulnerable.length})\n\n`;
    highVulnerable.forEach(api => {
      md += `##### ${api.route}\n`;
      md += `- **Arquivo:** \`${api.file}\`\n`;
      md += `- **Problemas:** ${api.missing.join(', ')}\n\n`;
    });
  }

  md += `\n---\n\n## 📋 DETALHAMENTO POR CATEGORIA\n\n`;

  // Agrupar por criticidade
  for (const crit of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) {
    const filtered = results.details.filter(d => d.criticality === crit);
    if (filtered.length === 0) continue;
    
    md += `### ${crit === 'CRITICAL' ? '🔴' : crit === 'HIGH' ? '🟠' : crit === 'MEDIUM' ? '🟡' : '🟢'} ${crit} (${filtered.length} APIs)\n\n`;
    
    const byStatus = {
      SAFE: filtered.filter(d => d.status === 'SAFE'),
      PARTIALLY_SAFE: filtered.filter(d => d.status === 'PARTIALLY_SAFE'),
      VULNERABLE: filtered.filter(d => d.status === 'VULNERABLE'),
    };
    
    for (const [status, apis] of Object.entries(byStatus)) {
      if (apis.length === 0) continue;
      
      const icon = status === 'SAFE' ? '🟢' : status === 'PARTIALLY_SAFE' ? '🟡' : '🔴';
      md += `#### ${icon} ${status.replace('_', ' ')} (${apis.length})\n\n`;
      
      apis.forEach(api => {
        md += `**${api.route}**\n`;
        
        if (api.missing.length > 0) {
          md += `- Faltando: ${api.missing.join(', ')}\n`;
        }
        
        const implemented = [];
        if (api.findings.authentication) implemented.push('Autenticação');
        if (api.findings.roleCheck) implemented.push('Role Check');
        if (api.findings.validation) implemented.push('Validação');
        if (api.findings.logging) implemented.push('Logging');
        if (api.findings.rateLimit) implemented.push('Rate Limit');
        if (api.findings.webhookValidation) implemented.push('Webhook Validation');
        
        if (implemented.length > 0) {
          md += `- Implementado: ${implemented.join(', ')}\n`;
        }
        
        md += '\n';
      });
    }
  }

  md += `\n---\n\n## 📝 RECOMENDAÇÕES GERAIS\n\n`;
  md += `### 🔒 Segurança\n\n`;
  md += `1. **Autenticação Universal:** Implementar middleware de autenticação para todas as rotas não-públicas\n`;
  md += `2. **Rate Limiting:** Aplicar rate limiting em todas as APIs públicas e de autenticação\n`;
  md += `3. **Validação de Inputs:** Usar Zod ou Joi para validar todos os inputs de usuário\n`;
  md += `4. **Auditoria:** Implementar logging completo em operações financeiras e administrativas\n`;
  md += `5. **Webhooks:** Sempre validar assinaturas HMAC em webhooks de pagamento\n`;
  md += `6. **Upload:** Validar tipo, tamanho e fazer scan de vírus em uploads\n`;
  md += `7. **SQL Injection:** Sempre usar queries parametrizadas via Prisma\n`;
  md += `8. **XSS:** Sanitizar inputs HTML e usar Content Security Policy\n\n`;
  
  md += `### 🛡️ Boas Práticas\n\n`;
  md += `- Implementar CSRF protection\n`;
  md += `- Configurar CORS adequadamente para produção\n`;
  md += `- Usar HTTPS obrigatório\n`;
  md += `- Implementar header de segurança (X-Frame-Options, etc)\n`;
  md += `- Criptografar dados sensíveis no banco\n`;
  md += `- Não logar credenciais ou tokens\n`;
  md += `- Usar secrets em variáveis de ambiente\n\n`;

  md += `---\n\n`;
  md += `**Auditoria gerada automaticamente por:** \`audit-api-security.js\`\n`;
  md += `**Próxima auditoria recomendada:** ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('pt-BR')}\n`;

  return md;
}

/**
 * Executa a auditoria
 */
async function runAudit() {
  console.log('🔍 Iniciando auditoria de segurança das APIs...\n');
  
  const apiFiles = scanApiFiles(API_DIR);
  auditResults.total = apiFiles.length;
  
  console.log(`📂 Encontrados ${apiFiles.length} arquivos de API\n`);
  
  for (const file of apiFiles) {
    const result = auditApiFile(file);
    auditResults.details.push(result);
    
    switch (result.status) {
      case 'SAFE': auditResults.safe++; break;
      case 'PARTIALLY_SAFE': auditResults.partiallySafe++; break;
      case 'VULNERABLE': auditResults.vulnerable++; break;
      case 'NOT_FOUND': auditResults.notFound++; break;
    }
    
    const icon = result.status === 'SAFE' ? '🟢' : 
                 result.status === 'PARTIALLY_SAFE' ? '🟡' : 
                 result.status === 'VULNERABLE' ? '🔴' : '⚫';
    
    console.log(`${icon} ${result.route}`);
  }
  
  console.log(`\n✅ Auditoria concluída!\n`);
  console.log(`📊 Resultados:`);
  console.log(`   🟢 Seguro: ${auditResults.safe}`);
  console.log(`   🟡 Parcialmente Seguro: ${auditResults.partiallySafe}`);
  console.log(`   🔴 Vulnerável: ${auditResults.vulnerable}`);
  console.log(`   ⚫ Não Verificado: ${auditResults.notFound}\n`);
  
  const report = generateMarkdownReport(auditResults);
  fs.writeFileSync(OUTPUT_FILE, report, 'utf-8');
  
  console.log(`📄 Relatório gerado: ${OUTPUT_FILE}\n`);
}

// Executar
runAudit().catch(console.error);
