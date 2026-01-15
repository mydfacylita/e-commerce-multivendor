# 🔒 Configuração do Subdomínio Administrativo

## O que foi feito

✅ **Segurança implementada:**
- Subdomínio exclusivo para painel admin: `gerencial-sys.mydshop.com.br`
- Bloqueio total de `/admin` no domínio principal (retorna 404)
- Página de login exclusiva em `gerencial-sys.mydshop.com.br`
- Configuração Apache com headers de segurança extras

## Arquivos modificados

1. **middleware.ts** - Bloqueia `/admin` exceto no subdomínio
2. **next.config.js** - Rewrites baseado em host
3. **app/admin/login/page.tsx** - Nova página de login administrativa
4. **setup-admin-subdomain.sh** - Script de configuração do servidor

## Como funciona

### Domínio Principal (mydshop.com.br)
- ❌ Acesso a `/admin` bloqueado (404)
- ✅ Acesso público normal (loja, login clientes, etc)

### Subdomínio Admin (gerencial-sys.mydshop.com.br)
- ✅ Rota `/` redireciona para `/admin`
- ✅ Login exclusivo em `gerencial-sys.mydshop.com.br/login`
- ✅ Todas rotas mapeadas para `/admin/*`
- ✅ Headers de segurança extras

## Deploy no Servidor

### 1. Configurar DNS (IMPORTANTE - FAÇA PRIMEIRO!)

No painel do provedor DNS:
```
Tipo: A
Nome: gerencial-sys
Valor: 212.85.15.25
TTL: 3600
```

### 2. Fazer commit e push (Local Windows)

```powershell
cd C:\xampp\htdocs\myd_adm\Modules\e-comece

git add .
git commit -m "🔒 Segurança: Subdomínio administrativo gerencial-sys.mydshop.com.br"
git push origin master
```

### 3. Atualizar código no servidor

```bash
ssh root@212.85.15.25

cd /var/www/mydshop
git pull origin master
```

### 4. Executar script de configuração

```bash
cd /var/www/mydshop
chmod +x setup-admin-subdomain.sh
./setup-admin-subdomain.sh
```

### 5. Rebuild Next.js

```bash
cd /var/www/mydshop
npm run build
pm2 restart mydshop
```

### 6. Testar acesso

Aguarde 5-30 minutos para DNS propagar, depois:

- ❌ Teste bloqueio: http://mydshop.com.br/admin → Deve retornar 404
- ✅ Teste admin: http://gerencial-sys.mydshop.com.br → Deve mostrar login
- ✅ Login: Entre com credenciais de admin

### 7. Instalar SSL (Após DNS propagar)

```bash
certbot --apache -d gerencial-sys.mydshop.com.br
```

Depois do SSL:
```bash
# Atualizar .env
nano /var/www/mydshop/.env

# Adicionar/atualizar:
NEXT_PUBLIC_ADMIN_URL="https://gerencial-sys.mydshop.com.br"

# Reiniciar
pm2 restart mydshop
```

## Verificar Propagação DNS

```bash
# Linux/Mac
nslookup gerencial-sys.mydshop.com.br

# Windows PowerShell
Resolve-DnsName gerencial-sys.mydshop.com.br
```

Deve retornar: `212.85.15.25`

## Segurança Adicional (Opcional)

### Restringir por IP no Apache

Editar `/etc/apache2/sites-available/gerencial-sys.mydshop.com.br.conf`:

```apache
<Location />
    # Permite apenas IPs específicos
    Require ip 45.165.210.199
    Require ip SEU_IP_FIXO
</Location>
```

### Instalar Fail2Ban

```bash
apt install fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

## URLs Finais

| Ambiente | Loja Pública | Painel Admin |
|----------|--------------|--------------|
| **HTTP** | http://mydshop.com.br | http://gerencial-sys.mydshop.com.br |
| **HTTPS** | https://mydshop.com.br | https://gerencial-sys.mydshop.com.br |

## Troubleshooting

### Admin retorna 404
- Verificar se DNS propagou: `nslookup gerencial-sys.mydshop.com.br`
- Verificar Apache: `systemctl status apache2`
- Verificar logs: `tail -f /var/log/apache2/gerencial-sys_error.log`

### Login não funciona
- Verificar PM2: `pm2 logs mydshop`
- Verificar .env: `NEXTAUTH_URL` deve estar correto
- Importar usuário admin do banco local

### SSL não instala
- Aguardar DNS propagar completamente (até 48h)
- Verificar firewall porta 80/443 aberta
- Tentar: `certbot --apache -d gerencial-sys.mydshop.com.br --dry-run`
