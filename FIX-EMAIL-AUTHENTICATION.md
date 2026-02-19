# 🚨 CORREÇÃO URGENTE: E-mails sendo bloqueados pelo Gmail

## Problema
Gmail está rejeitando e-mails de `contato@mydsistemas.com.br` porque:
- ❌ **SPF não passou** - IP [2a02:4780:14:d0fc::1] não autorizado
- ❌ **DKIM não passou** - Assinatura digital ausente

## ✅ SOLUÇÃO: Adicionar registros DNS

### 1. SPF (Sender Policy Framework)
Adicione este registro TXT no DNS de **mydsistemas.com.br**:

```
Tipo: TXT
Nome: @
Valor: v=spf1 ip6:2a02:4780:14:d0fc::1 a mx ~all
TTL: 3600
```

**Explicação:**
- `v=spf1` = versão do SPF
- `ip6:2a02:4780:14:d0fc::1` = autoriza o IPv6 do servidor
- `a` = autoriza o IP do domínio
- `mx` = autoriza os servidores MX
- `~all` = soft fail para outros IPs

### 2. DKIM (DomainKeys Identified Mail)
No servidor `mail.mydsistemas.com.br`, execute:

```bash
# 1. Instalar OpenDKIM (se não estiver instalado)
ssh root@mydshop.com.br
apt-get update
apt-get install opendkim opendkim-tools -y

# 2. Gerar chaves DKIM
mkdir -p /etc/opendkim/keys/mydsistemas.com.br
cd /etc/opendkim/keys/mydsistemas.com.br
opendkim-genkey -s mail -d mydsistemas.com.br
chown opendkim:opendkim mail.private

# 3. Ver a chave pública (adicionar no DNS)
cat mail.txt
```

A saída será algo assim:
```
mail._domainkey IN TXT "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBA..."
```

### 3. Adicionar registro DKIM no DNS

```
Tipo: TXT
Nome: mail._domainkey
Valor: v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBA... (copiar do mail.txt)
TTL: 3600
```

### 4. DMARC (Opcional mas recomendado)
Adicione este registro TXT no DNS:

```
Tipo: TXT
Nome: _dmarc
Valor: v=DMARC1; p=none; rua=mailto:contato@mydsistemas.com.br
TTL: 3600
```

## 🔧 Configuração do Postfix (no servidor)

```bash
ssh root@mydshop.com.br

# Editar configuração do Postfix
nano /etc/postfix/main.cf
```

Adicionar ao final do arquivo:

```conf
# DKIM
milter_default_action = accept
milter_protocol = 6
smtpd_milters = inet:localhost:12301
non_smtpd_milters = inet:localhost:12301
```

Criar `/etc/opendkim.conf`:

```conf
Syslog                  yes
SyslogSuccess           yes
LogWhy                  yes
UMask                   002
Mode                    sv
Canonicalization        relaxed/simple
ExternalIgnoreList      refile:/etc/opendkim/TrustedHosts
InternalHosts           refile:/etc/opendkim/TrustedHosts
KeyTable                refile:/etc/opendkim/KeyTable
SigningTable            refile:/etc/opendkim/SigningTable
Socket                  inet:12301@localhost
PidFile                 /var/run/opendkim/opendkim.pid
SignatureAlgorithm      rsa-sha256
UserID                  opendkim:opendkim
```

Criar arquivos de configuração:

```bash
# /etc/opendkim/TrustedHosts
echo "127.0.0.1" > /etc/opendkim/TrustedHosts
echo "localhost" >> /etc/opendkim/TrustedHosts
echo "mydsistemas.com.br" >> /etc/opendkim/TrustedHosts
echo "mydshop.com.br" >> /etc/opendkim/TrustedHosts

# /etc/opendkim/KeyTable
echo "mail._domainkey.mydsistemas.com.br mydsistemas.com.br:mail:/etc/opendkim/keys/mydsistemas.com.br/mail.private" > /etc/opendkim/KeyTable

# /etc/opendkim/SigningTable
echo "*@mydsistemas.com.br mail._domainkey.mydsistemas.com.br" > /etc/opendkim/SigningTable

# Reiniciar serviços
systemctl restart opendkim
systemctl restart postfix

# Verificar status
systemctl status opendkim
systemctl status postfix
```

## 🧪 Testar após configuração

```bash
# 1. Testar SPF
dig mydsistemas.com.br TXT +short

# 2. Testar DKIM
dig mail._domainkey.mydsistemas.com.br TXT +short

# 3. Enviar e-mail de teste
echo "Teste SPF/DKIM" | mail -s "Teste" seuemail@gmail.com
```

## 🔍 Verificar autenticação online

Depois de configurar, envie um e-mail de teste para:
- https://www.mail-tester.com/
- https://mxtoolbox.com/emailhealth/

## ⏱️ Propagação DNS

**Atenção:** Registros DNS podem levar de 15 minutos a 48 horas para propagar. Após adicionar os registros, aguarde e teste.

## 📧 Alternativa temporária: Usar Gmail SMTP

Se não puder configurar SPF/DKIM imediatamente, use o Gmail:

1. Criar conta Gmail para o sistema (ex: `noreply.mydshop@gmail.com`)
2. Gerar senha de aplicativo: https://myaccount.google.com/apppasswords
3. Atualizar configurações no Admin → Sistema → E-mail:
   - SMTP Host: `smtp.gmail.com`
   - SMTP Port: `587`
   - SMTP User: `noreply.mydshop@gmail.com`
   - SMTP Password: `[senha de aplicativo]`
   - SMTP Secure: `TLS`

✅ Gmail já tem SPF/DKIM configurado e os e-mails serão entregues imediatamente.

---

## 🎯 Prioridade

1. **IMEDIATO**: Configurar Gmail SMTP (5 minutos) ✅
2. **LONGO PRAZO**: Configurar SPF/DKIM no servidor próprio (1-2 horas + propagação DNS)

O Gmail SMTP é a solução mais rápida e confiável.
