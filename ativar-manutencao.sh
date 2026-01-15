# Script para fazer backup e ativar página de manutenção
# Execute este script no seu servidor

echo "======================================"
echo "MYDSHOP - Ativação de Página de Manutenção"
echo "======================================"
echo ""

# Configurações (AJUSTE CONFORME SEU AMBIENTE)
SITE_ROOT="/var/www/html"  # Ou /home/usuario/public_html
BACKUP_DIR="/home/backup"
MAINTENANCE_FILE="maintenance.html"

# Criar diretório de backup se não existir
mkdir -p $BACKUP_DIR

# Data atual para o backup
DATE=$(date +%Y%m%d_%H%M%S)

echo "1. Fazendo backup do index atual..."
if [ -f "$SITE_ROOT/index.html" ]; then
    cp $SITE_ROOT/index.html $BACKUP_DIR/index_backup_$DATE.html
    echo "✓ Backup criado: $BACKUP_DIR/index_backup_$DATE.html"
elif [ -f "$SITE_ROOT/index.php" ]; then
    cp $SITE_ROOT/index.php $BACKUP_DIR/index_backup_$DATE.php
    echo "✓ Backup criado: $BACKUP_DIR/index_backup_$DATE.php"
fi

echo ""
echo "2. Movendo arquivos existentes..."
# Renomear index atual
if [ -f "$SITE_ROOT/index.html" ]; then
    mv $SITE_ROOT/index.html $SITE_ROOT/index.html.old
    echo "✓ index.html renomeado para index.html.old"
elif [ -f "$SITE_ROOT/index.php" ]; then
    mv $SITE_ROOT/index.php $SITE_ROOT/index.php.old
    echo "✓ index.php renomeado para index.php.old"
fi

echo ""
echo "3. Ativando página de manutenção..."
# Copiar página de manutenção
cp $MAINTENANCE_FILE $SITE_ROOT/index.html
chmod 644 $SITE_ROOT/index.html

echo "✓ Página de manutenção ativada!"
echo ""
echo "======================================"
echo "PÁGINA DE MANUTENÇÃO ATIVA!"
echo "======================================"
echo ""
echo "Para desativar, execute:"
echo "  rm $SITE_ROOT/index.html"
echo "  mv $SITE_ROOT/index.html.old $SITE_ROOT/index.html"
echo "  # ou"
echo "  mv $SITE_ROOT/index.php.old $SITE_ROOT/index.php"
echo ""
