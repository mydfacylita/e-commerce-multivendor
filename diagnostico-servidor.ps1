# 🔍 Diagnóstico do Servidor - Identificar Sites
# Execute este script ANTES de ativar a manutenção

$SERVER = "212.85.15.25"
$USER = "root"

Write-Host "`n🔍 DIAGNÓSTICO DO SERVIDOR MULTI-SITE" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Servidor: $SERVER" -ForegroundColor Yellow
Write-Host "Usuário: $USER" -ForegroundColor Yellow
Write-Host ""

Write-Host "📋 Comandos de diagnóstico que serão executados:" -ForegroundColor Green
Write-Host ""

# Listar configurações do Apache/Nginx
$commands = @"
echo '=== 1. Verificando servidor web ==='
if command -v apache2 >/dev/null 2>&1; then 
    echo '✅ Apache detectado'
    apache2 -v | head -n1
elif command -v nginx >/dev/null 2>&1; then 
    echo '✅ Nginx detectado'
    nginx -v 2>&1
fi

echo ''
echo '=== 2. Sites configurados no Apache/Nginx ==='
if [ -d /etc/apache2/sites-enabled ]; then
    echo '📁 Sites Apache:'
    ls -la /etc/apache2/sites-enabled/
    echo ''
    echo '📄 Conteúdo dos arquivos de configuração:'
    for file in /etc/apache2/sites-enabled/*; do
        echo "--- \$file ---"
        grep -E 'ServerName|ServerAlias|DocumentRoot' "\$file" 2>/dev/null | head -n 10
        echo ''
    done
elif [ -d /etc/nginx/sites-enabled ]; then
    echo '📁 Sites Nginx:'
    ls -la /etc/nginx/sites-enabled/
    echo ''
    echo '📄 Conteúdo dos arquivos de configuração:'
    for file in /etc/nginx/sites-enabled/*; do
        echo "--- \$file ---"
        grep -E 'server_name|root' "\$file" 2>/dev/null | head -n 10
        echo ''
    done
fi

echo ''
echo '=== 3. Diretórios Web Comuns ==='
for dir in /var/www /var/www/html /home /usr/share/nginx /opt; do
    if [ -d "\$dir" ]; then
        echo "📂 \$dir:"
        ls -la "\$dir" 2>/dev/null | head -n 20
        echo ''
    fi
done

echo ''
echo '=== 4. Buscando por MYDSHOP ==='
find /var/www /home -type d -iname "*mydshop*" -o -iname "*myd*" 2>/dev/null | head -n 20

echo ''
echo '=== 5. Processos Node.js/Next.js ==='
ps aux | grep -E 'node|next' | grep -v grep

echo ''
echo '=== 6. Portas em uso ==='
netstat -tulpn | grep -E ':(80|443|3000|3001|8080)' 2>/dev/null || ss -tulpn | grep -E ':(80|443|3000|3001|8080)'

echo ''
echo '=== 7. Domínios apontados (via hosts virtuais) ==='
if [ -f /etc/hosts ]; then
    echo '📄 /etc/hosts:'
    cat /etc/hosts | grep -v '^#' | grep -v '^$'
fi
"@

Write-Host "Para executar o diagnóstico, copie e cole este comando no PowerShell:" -ForegroundColor Yellow
Write-Host ""
Write-Host "ssh $USER@$SERVER 'bash -s' << 'ENDSSH'" -ForegroundColor Cyan
Write-Host $commands -ForegroundColor White
Write-Host "ENDSSH" -ForegroundColor Cyan
Write-Host ""

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "📝 Ou execute comando por comando via SSH:" -ForegroundColor Green
Write-Host ""
Write-Host "# 1. Conectar ao servidor" -ForegroundColor Yellow
Write-Host "ssh $USER@$SERVER" -ForegroundColor White
Write-Host ""
Write-Host "# 2. Ver sites Apache" -ForegroundColor Yellow
Write-Host "ls -la /etc/apache2/sites-enabled/" -ForegroundColor White
Write-Host "cat /etc/apache2/sites-enabled/*-le-ssl.conf | grep -E 'ServerName|DocumentRoot'" -ForegroundColor White
Write-Host ""
Write-Host "# 3. Ver sites Nginx" -ForegroundColor Yellow
Write-Host "ls -la /etc/nginx/sites-enabled/" -ForegroundColor White
Write-Host "cat /etc/nginx/sites-enabled/* | grep -E 'server_name|root'" -ForegroundColor White
Write-Host ""
Write-Host "# 4. Listar diretórios web" -ForegroundColor Yellow
Write-Host "ls -la /var/www/" -ForegroundColor White
Write-Host ""
Write-Host "# 5. Buscar MYDSHOP" -ForegroundColor Yellow
Write-Host "find /var/www -type d -iname '*mydshop*'" -ForegroundColor White
Write-Host ""
Write-Host "# 6. Ver processos Node/Next.js" -ForegroundColor Yellow
Write-Host "ps aux | grep node" -ForegroundColor White
Write-Host ""

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "🎯 O QUE PROCURAR:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Nome do domínio do MYDSHOP (ex: mydshop.com.br)" -ForegroundColor White
Write-Host "2. Caminho do DocumentRoot/root do MYDSHOP" -ForegroundColor White
Write-Host "3. Se é Apache ou Nginx" -ForegroundColor White
Write-Host "4. Se o Next.js roda em porta diferente (3000, 3001, etc)" -ForegroundColor White
Write-Host "5. Se usa proxy reverso" -ForegroundColor White
Write-Host ""

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "⚠️  AGUARDANDO INFORMAÇÕES ANTES DE ATIVAR MANUTENÇÃO" -ForegroundColor Red
Write-Host ""

Read-Host "Pressione ENTER para fechar"
