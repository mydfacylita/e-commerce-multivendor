# 🔧 Página de Manutenção MYDSHOP

## 📦 Arquivos Criados

1. **maintenance.html** - Página de manutenção responsiva e profissional
2. **ativar-manutencao.sh** - Script para ativar no servidor Linux
3. **upload-manutencao.ps1** - Script PowerShell para upload via SCP

## 🚀 Método 1: Upload via PowerShell (Recomendado para Windows)

### Pré-requisitos
- OpenSSH Client instalado no Windows
- Acesso SSH ao servidor

### Passos

1. **Edite o arquivo `upload-manutencao.ps1`** com suas credenciais:
   ```powershell
   $SERVER = "seu-servidor.com"  # IP ou domínio
   $USER = "seu-usuario"          # Usuário SSH
   $SERVER_PATH = "/var/www/html" # Caminho no servidor
   ```

2. **Execute o PowerShell como Administrador** e navegue até a pasta:
   ```powershell
   cd C:\xampp\htdocs\myd_adm\Modules\e-comece
   ```

3. **Execute o script de upload**:
   ```powershell
   .\upload-manutencao.ps1
   ```

4. **Ative a página no servidor**:
   ```bash
   ssh seu-usuario@seu-servidor.com 'cd /var/www/html && chmod +x ativar-manutencao.sh && ./ativar-manutencao.sh'
   ```

## 🖥️ Método 2: Upload Manual via SCP

```bash
# Enviar arquivos
scp maintenance.html seu-usuario@seu-servidor.com:/var/www/html/
scp ativar-manutencao.sh seu-usuario@seu-servidor.com:/var/www/html/

# Conectar ao servidor
ssh seu-usuario@seu-servidor.com

# Ativar página de manutenção
cd /var/www/html
chmod +x ativar-manutencao.sh
./ativar-manutencao.sh
```

## 🌐 Método 3: Upload via FTP/cPanel

1. Acesse seu cPanel ou cliente FTP (FileZilla)
2. Navegue até a pasta `public_html` ou raiz do site
3. Faça backup do arquivo `index.html` ou `index.php` atual
4. Renomeie o arquivo atual para `index.html.old` ou `index.php.old`
5. Faça upload do arquivo `maintenance.html`
6. Renomeie `maintenance.html` para `index.html`

## 🔄 Método 4: Comando SSH Direto (Rápido)

Execute este comando único no PowerShell (ajuste credenciais):

```powershell
# Upload
scp maintenance.html seu-usuario@seu-servidor.com:/var/www/html/

# Ativar (tudo em um comando)
ssh seu-usuario@seu-servidor.com 'cd /var/www/html && [ -f index.html ] && mv index.html index.html.old; [ -f index.php ] && mv index.php index.php.old; mv maintenance.html index.html && chmod 644 index.html'
```

## ❌ Desativar a Manutenção

### Via SSH:
```bash
ssh seu-usuario@seu-servidor.com
cd /var/www/html

# Restaurar index.html
rm index.html
mv index.html.old index.html

# OU restaurar index.php
rm index.html
mv index.php.old index.php
```

### Via comando único:
```bash
ssh seu-usuario@seu-servidor.com 'cd /var/www/html && rm index.html && mv index.html.old index.html'
```

## 🎨 Características da Página

✅ Design responsivo (mobile-friendly)
✅ Animações suaves
✅ Auto-reload a cada 30 segundos
✅ Links para redes sociais
✅ Gradiente moderno da MYDSHOP
✅ Ícones e loading animado
✅ Tempo estimado de manutenção
✅ Informações de contato

## 🔒 Segurança

O script de ativação:
- Faz backup automático do index atual
- Preserva arquivos antigos (.old)
- Define permissões corretas (644)
- Cria histórico de backups com timestamp

## 📞 Informações de Contato

Edite em `maintenance.html` (linha ~150):
```html
<p><strong>📧 Dúvidas:</strong> contato@mydshop.com.br</p>
```

## 🌍 Links de Redes Sociais

Edite em `maintenance.html` (linhas ~160-180):
```html
<a href="https://facebook.com/suapagina" target="_blank">
<a href="https://instagram.com/suapagina" target="_blank">
<a href="https://twitter.com/suapagina" target="_blank">
```

## ⚠️ Notas Importantes

1. **Backup**: Sempre faça backup antes de ativar
2. **Caminho**: Verifique o caminho correto do seu servidor
3. **Permissões**: Garanta que tem permissão de escrita
4. **DNS**: A página substitui o index principal
5. **APIs**: APIs e rotas do Next.js continuarão funcionando

## 🆘 Troubleshooting

### Erro: "Permission denied"
```bash
# No servidor, ajuste permissões
sudo chown seu-usuario:seu-usuario /var/www/html/maintenance.html
sudo chmod 644 /var/www/html/maintenance.html
```

### Erro: "scp: command not found" no Windows
```powershell
# Instalar OpenSSH Client (PowerShell como Admin)
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

### Página não aparece
1. Limpe o cache do navegador (Ctrl + Shift + R)
2. Verifique se o arquivo está como `index.html` principal
3. Verifique permissões: `ls -la /var/www/html/index.html`
4. Verifique logs do servidor: `tail -f /var/log/apache2/error.log`

## 📊 Testando Localmente

Abra o arquivo diretamente no navegador:
```
file:///C:/xampp/htdocs/myd_adm/Modules/e-comece/maintenance.html
```

Ou via XAMPP:
```
http://localhost/myd_adm/Modules/e-comece/maintenance.html
```

---

**Criado em:** 15/01/2026
**Versão:** 1.0
**Status:** ✅ Pronto para uso
