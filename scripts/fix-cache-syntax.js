const fs = require('fs');
const path = require('path');

// Diretórios para corrigir
const dirs = [
  path.join(__dirname, '..', 'app', 'api'),
  path.join(__dirname, '..', 'app', 'admin')
];

// Exports que devem existir
const cacheExportsBlock = `
// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
`;

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Verificar se o arquivo já tem exports corretos (sem estar dentro de import)
    const hasCorrectExports = content.includes("export const dynamic = 'force-dynamic'") && 
                               !content.match(/import\s*\{[^}]*export\s+const\s+dynamic/s);
    
    // Se o arquivo tem erro de sintaxe (exports dentro de import), corrigir
    const brokenImportPattern = /import\s*\{\s*\n*\s*\/\/ Force dynamic[\s\S]*?export const fetchCache[^\n]*;?\s*\n*\s*/g;
    
    if (brokenImportPattern.test(content)) {
      // Remover os exports problemáticos inseridos dentro de imports
      content = content.replace(brokenImportPattern, 'import { ');
      console.log(`[FIX BROKEN] ${filePath}`);
    }
    
    // Verificar se já tem os exports corretos no lugar certo
    if (content.includes("export const dynamic = 'force-dynamic'")) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[ALREADY OK] ${filePath}`);
      return { fixed: true };
    }
    
    // Encontrar onde inserir - depois de todos os imports
    const lines = content.split('\n');
    let lastImportIndex = -1;
    let inImport = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detectar início de import multi-linha
      if (line.startsWith('import ') && line.includes('{') && !line.includes('}')) {
        inImport = true;
      }
      
      // Detectar fim de import multi-linha
      if (inImport && line.includes('}')) {
        inImport = false;
        lastImportIndex = i;
        continue;
      }
      
      // Import single line
      if (line.startsWith('import ') && !inImport) {
        lastImportIndex = i;
      }
      
      // Se estamos dentro de um import, continuar
      if (inImport) {
        continue;
      }
    }
    
    if (lastImportIndex === -1) {
      // Sem imports, inserir no início (após 'use client' ou 'use server' se existir)
      let insertAt = 0;
      if (lines[0]?.includes("'use client'") || lines[0]?.includes("'use server'")) {
        insertAt = 1;
      }
      lines.splice(insertAt, 0, cacheExportsBlock);
    } else {
      // Inserir após o último import
      lines.splice(lastImportIndex + 1, 0, cacheExportsBlock);
    }
    
    content = lines.join('\n');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[ADDED] ${filePath}`);
    return { added: true };
  } catch (err) {
    console.error(`[ERROR] ${filePath}: ${err.message}`);
    return { error: true };
  }
}

function walkDir(dir, pattern) {
  let results = { fixed: 0, added: 0, errors: 0 };
  
  if (!fs.existsSync(dir)) return results;
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      const subResults = walkDir(filePath, pattern);
      results.fixed += subResults.fixed;
      results.added += subResults.added;
      results.errors += subResults.errors;
    } else if (file.match(pattern)) {
      const result = fixFile(filePath);
      if (result.fixed) results.fixed++;
      else if (result.added) results.added++;
      else if (result.error) results.errors++;
    }
  }
  
  return results;
}

console.log('Corrigindo arquivos com exports mal posicionados...\n');

let totalResults = { fixed: 0, added: 0, errors: 0 };

for (const dir of dirs) {
  const pattern = dir.includes('api') ? /^route\.ts$/ : /^page\.tsx$/;
  const results = walkDir(dir, pattern);
  totalResults.fixed += results.fixed;
  totalResults.added += results.added;
  totalResults.errors += results.errors;
}

console.log(`\n========================================`);
console.log(`Corrigidos: ${totalResults.fixed}`);
console.log(`Adicionados: ${totalResults.added}`);
console.log(`Erros: ${totalResults.errors}`);
console.log(`========================================`);
