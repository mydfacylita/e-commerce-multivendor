# ========================================
# 🚀 GUIA DE DEPLOY - MYDSHOP
# ========================================

## 1. REQUISITOS DO SERVIDOR

### Mínimo recomendado:
- VPS com 2GB RAM, 2 vCPU
- Ubuntu 22.04 LTS ou similar
- Node.js 20+ (ou 22)
- MySQL 8.0+
- Nginx (proxy reverso)
- SSL (Let's Encrypt)

### Provedores recomendados:
- DigitalOcean ($12-24/mês)
- Hostinger VPS ($10-20/mês)
- Contabo ($6-12/mês)
- AWS Lightsail ($10-20/mês)

---

## 2. CONFIGURAÇÃO DO SERVIDOR

### 2.1 Instalar dependências
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Instalar Nginx
sudo apt install -y nginx

# Instalar PM2 (gerenciador de processos)
sudo npm install -g pm2

# Instalar Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx
```

### 2.2 Configurar MySQL
```bash
sudo mysql

# No MySQL:
CREATE DATABASE mydshop_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mydshop_user'@'localhost' IDENTIFIED BY 'SUA_SENHA_SEGURA';
GRANT ALL PRIVILEGES ON mydshop_db.* TO 'mydshop_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2.3 Configurar Nginx
```bash
sudo nano /etc/nginx/sites-available/mydshop
```

Conteúdo:
```nginx
server {
    listen 80;
    server_name www.mydshop.com.br mydshop.com.br;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/mydshop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Configurar SSL
sudo certbot --nginx -d www.mydshop.com.br -d mydshop.com.br
```

---

## 3. DEPLOY DO CÓDIGO

### 3.1 No seu computador local
```bash
cd c:\xampp\htdocs\myd_adm\Modules\e-comece

# Fazer build de produção
npm run build

# Zipar arquivos para upload
# Incluir: .next, node_modules, package.json, prisma, public, etc.
```

### 3.2 No servidor
```bash
# Criar diretório
sudo mkdir -p /var/www/mydshop
sudo chown $USER:$USER /var/www/mydshop

# Upload dos arquivos (via SCP, SFTP ou Git)
cd /var/www/mydshop

# Se usar Git:
git clone https://github.com/mydfacylita/e-commerce-multivendor.git .

# Instalar dependências
npm ci --legacy-peer-deps

# Copiar .env de produção
cp .env.production .env
nano .env  # Editar com credenciais reais

# Rodar migrations do Prisma
npx prisma migrate deploy
npx prisma generate

# Build
npm run build

# Iniciar com PM2
pm2 start npm --name "mydshop" -- start
pm2 save
pm2 startup
```

---

## 4. COMANDOS ÚTEIS

```bash
# Ver logs
pm2 logs mydshop

# Reiniciar app
pm2 restart mydshop

# Parar app
pm2 stop mydshop

# Status
pm2 status

# Atualizar código
cd /var/www/mydshop
git pull
npm ci --legacy-peer-deps
npm run build
pm2 restart mydshop
```

---

## 5. CONFIGURAR DNS

No seu provedor de domínio (Registro.br, GoDaddy, etc.):

| Tipo | Nome | Valor |
|------|------|-------|
| A | @ | IP_DO_SERVIDOR |
| A | www | IP_DO_SERVIDOR |

---

## 6. BUILD DO APP MOBILE PARA PRODUÇÃO

Depois que o servidor estiver rodando:

```bash
cd mydshop-app

# Build para produção (já configurado para https://www.mydshop.com.br/api)
npm run build

# Sincronizar
npx cap sync android

# O Codemagic vai gerar o APK automaticamente no próximo push
git add .
git commit -m "chore: Production build"
git push origin master
```

---

## 7. CHECKLIST PRÉ-DEPLOY

- [ ] Servidor configurado com Node.js 22+
- [ ] MySQL instalado e configurado
- [ ] Nginx configurado como proxy reverso
- [ ] SSL configurado (HTTPS)
- [ ] DNS apontando para o servidor
- [ ] .env.production configurado com credenciais reais
- [ ] Migrations do Prisma rodadas
- [ ] PM2 configurado para iniciar automaticamente
- [ ] Testado acesso via https://www.mydshop.com.br
