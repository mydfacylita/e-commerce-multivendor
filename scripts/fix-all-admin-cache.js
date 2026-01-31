const fs = require('fs');
const path = require('path');

// Diretório das páginas admin
const adminDir = path.join(__dirname, '..', 'app', 'admin');

// Exports que desabilitam cache
const cacheExports = `
// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
`;

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Verificar se já tem os exports
    if (content.includes("dynamic = 'force-dynamic'")) {
      console.log(`[SKIP] ${filePath} - já tem exports`);
      return { skipped: true };
    }
    
    // Adicionar exports no início do arquivo (depois dos imports)
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Encontrar o final dos imports
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('import ') || line.startsWith('from ') || line === '' || line.startsWith("'use ")) {
        insertIndex = i + 1;
      } else if (!line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*')) {
        break;
      }
    }
    
    // Inserir os exports
    lines.splice(insertIndex, 0, cacheExports);
    content = lines.join('\n');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[OK] ${filePath}`);
    return { updated: true };
  } catch (err) {
    console.error(`[ERROR] ${filePath}: ${err.message}`);
    return { error: true };
  }
}

function walkDir(dir) {
  let results = { updated: 0, skipped: 0, errors: 0 };
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      const subResults = walkDir(filePath);
      results.updated += subResults.updated;
      results.skipped += subResults.skipped;
      results.errors += subResults.errors;
    } else if (file === 'page.tsx') {
      const result = processFile(filePath);
      if (result.updated) results.updated++;
      else if (result.skipped) results.skipped++;
      else if (result.error) results.errors++;
    }
  }
  
  return results;
}

console.log('Adicionando exports de no-cache em todas as páginas admin...\n');
const results = walkDir(adminDir);
console.log(`\n========================================`);
console.log(`Atualizados: ${results.updated}`);
console.log(`Ignorados (já tinham): ${results.skipped}`);
console.log(`Erros: ${results.errors}`);
console.log(`========================================`);
