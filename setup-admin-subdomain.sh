#!/bin/bash
# Script para configurar subdomínio gerencial-sys.mydshop.com.br

echo "🔧 Configurando subdomínio gerencial-sys.mydshop.com.br..."

# Criar arquivo de configuração do VirtualHost
cat > /etc/apache2/sites-available/gerencial-sys.mydshop.com.br.conf <<'EOF'
<VirtualHost *:80>
    ServerName gerencial-sys.mydshop.com.br
    
    ErrorLog ${APACHE_LOG_DIR}/gerencial-sys_error.log
    CustomLog ${APACHE_LOG_DIR}/gerencial-sys_access.log combined
    
    # Proxy reverso para Next.js
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    ProxyTimeout 300
    
    # Headers de segurança extras para painel admin
    Header always set X-Frame-Options "DENY"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "no-referrer"
    
    # Rate limiting (proteção contra brute force)
    # Limita a 30 requisições por minuto por IP
    <Location />
        # Requer mod_evasive ou mod_qos instalado
        # Para implementar futuramente
    </Location>
</VirtualHost>
EOF

echo "✅ Arquivo de configuração criado"

# Habilitar site
a2ensite gerencial-sys.mydshop.com.br.conf

# Habilitar módulos necessários
a2enmod headers
a2enmod proxy
a2enmod proxy_http

# Testar configuração
apache2ctl configtest

# Recarregar Apache
systemctl reload apache2

echo ""
echo "✅ Configuração concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure o DNS: gerencial-sys.mydshop.com.br → 212.85.15.25"
echo "2. Aguarde propagação DNS (5-30 minutos)"
echo "3. Teste: http://gerencial-sys.mydshop.com.br"
echo "4. Instale SSL: certbot --apache -d gerencial-sys.mydshop.com.br"
echo ""
