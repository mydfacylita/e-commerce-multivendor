const fs = require('fs');
const path = require('path');

// Diretórios para corrigir
const dirs = [
  path.join(__dirname, '..', 'app', 'admin')
];

// Padrão dos exports que devem ser removidos de páginas 'use client'
const cacheExportsPattern = /\n*\/\/ Force dynamic - disable all caching\s*\nexport const dynamic = 'force-dynamic';\s*\nexport const revalidate = 0;\s*\nexport const fetchCache = 'force-no-store';\s*\n*/g;

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Se é 'use client', remover os exports
    if (content.includes("'use client'") || content.includes('"use client"')) {
      if (content.includes("export const dynamic = 'force-dynamic'")) {
        content = content.replace(cacheExportsPattern, '\n');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`[FIXED CLIENT] ${filePath}`);
        return { fixed: true };
      } else {
        console.log(`[SKIP CLIENT] ${filePath} - já está ok`);
        return { skipped: true };
      }
    }
    
    console.log(`[SKIP SERVER] ${filePath}`);
    return { skipped: true };
  } catch (err) {
    console.error(`[ERROR] ${filePath}: ${err.message}`);
    return { error: true };
  }
}

function walkDir(dir) {
  let results = { fixed: 0, skipped: 0, errors: 0 };
  
  if (!fs.existsSync(dir)) return results;
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      const subResults = walkDir(filePath);
      results.fixed += subResults.fixed;
      results.skipped += subResults.skipped;
      results.errors += subResults.errors;
    } else if (file === 'page.tsx') {
      const result = fixFile(filePath);
      if (result.fixed) results.fixed++;
      else if (result.skipped) results.skipped++;
      else if (result.error) results.errors++;
    }
  }
  
  return results;
}

console.log('Removendo exports de páginas "use client"...\n');

let totalResults = { fixed: 0, skipped: 0, errors: 0 };

for (const dir of dirs) {
  const results = walkDir(dir);
  totalResults.fixed += results.fixed;
  totalResults.skipped += results.skipped;
  totalResults.errors += results.errors;
}

console.log(`\n========================================`);
console.log(`Corrigidos: ${totalResults.fixed}`);
console.log(`Ignorados: ${totalResults.skipped}`);
console.log(`Erros: ${totalResults.errors}`);
console.log(`========================================`);
