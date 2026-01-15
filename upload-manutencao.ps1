# Script PowerShell para fazer upload via SCP/SSH
# Execute este arquivo no Windows PowerShell

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "MYDSHOP - Upload de Página de Manutenção" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# CONFIGURAÇÕES - AJUSTE COM SEUS DADOS
$SERVER = "seu-servidor.com"  # IP ou domínio do servidor
$USER = "seu-usuario"          # Usuário SSH
$SERVER_PATH = "/var/www/html" # Caminho no servidor

# Arquivos locais
$MAINTENANCE_FILE = "maintenance.html"
$SCRIPT_FILE = "ativar-manutencao.sh"

Write-Host "Configurações:" -ForegroundColor Yellow
Write-Host "  Servidor: $SERVER"
Write-Host "  Usuário: $USER"
Write-Host "  Caminho: $SERVER_PATH"
Write-Host ""

# Verificar se os arquivos existem
if (-not (Test-Path $MAINTENANCE_FILE)) {
    Write-Host "❌ Erro: $MAINTENANCE_FILE não encontrado!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $SCRIPT_FILE)) {
    Write-Host "❌ Erro: $SCRIPT_FILE não encontrado!" -ForegroundColor Red
    exit 1
}

# Verificar se SCP está disponível
$scpExists = Get-Command scp -ErrorAction SilentlyContinue
if (-not $scpExists) {
    Write-Host "❌ Erro: SCP não encontrado. Instale OpenSSH Client." -ForegroundColor Red
    Write-Host ""
    Write-Host "Para instalar OpenSSH no Windows:" -ForegroundColor Yellow
    Write-Host "  1. Vá em Configurações > Apps > Recursos Opcionais"
    Write-Host "  2. Adicione 'Cliente OpenSSH'"
    Write-Host "  Ou execute no PowerShell como Admin:"
    Write-Host "  Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0"
    exit 1
}

Write-Host "1. Fazendo upload da página de manutenção..." -ForegroundColor Green
scp $MAINTENANCE_FILE "${USER}@${SERVER}:${SERVER_PATH}/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ maintenance.html enviado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao enviar maintenance.html" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Fazendo upload do script de ativação..." -ForegroundColor Green
scp $SCRIPT_FILE "${USER}@${SERVER}:${SERVER_PATH}/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ ativar-manutencao.sh enviado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao enviar script" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "ARQUIVOS ENVIADOS COM SUCESSO!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos passos no SERVIDOR:" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Conecte-se ao servidor via SSH:" -ForegroundColor White
Write-Host "   ssh ${USER}@${SERVER}" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Execute os comandos:" -ForegroundColor White
Write-Host "   cd ${SERVER_PATH}" -ForegroundColor Gray
Write-Host "   chmod +x ativar-manutencao.sh" -ForegroundColor Gray
Write-Host "   ./ativar-manutencao.sh" -ForegroundColor Gray
Write-Host ""
Write-Host "OU execute tudo de uma vez:" -ForegroundColor Yellow
Write-Host "ssh ${USER}@${SERVER} 'cd ${SERVER_PATH} && chmod +x ativar-manutencao.sh && ./ativar-manutencao.sh'" -ForegroundColor Gray
Write-Host ""
