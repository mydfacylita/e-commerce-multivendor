# 🔧 Como Resolver o Problema de Migração

## Método Manual (Recomendado)

### Opção 1: phpMyAdmin
1. Abra http://localhost/phpmyadmin
2. Selecione o banco `ecommerce`
3. Clique em "SQL"
4. Copie TODO o conteúdo de `scripts/add-analytics-tables.sql`
5. Cole e clique em "Executar"
6. No terminal: `npx prisma generate`

### Opção 2: MySQL CLI
```bash
# No PowerShell:
cd C:\xampp\mysql\bin
.\mysql.exe -u root -p ecommerce < "C:\xampp\htdocs\myd_adm\Modules\e-comece\scripts\add-analytics-tables.sql"

# Depois:
npx prisma generate
```

### Opção 3: Reset completo (última opção)
```bash
# ⚠️ CUIDADO: Apaga todos os dados!
npx prisma migrate reset
npx prisma migrate dev
```

## Depois de executar o SQL

```bash
npx prisma generate
npm run dev
```

✅ Pronto! Sem mais problemas de migração.
