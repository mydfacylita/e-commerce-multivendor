# 📧 Webmail MYDSHOP - Sistema Completo

Sistema de webmail customizado para acesso aos emails corporativos.

## 🌐 Acesso

**URL:** `https://mydshop.com.br/webmail`

## ✅ Funcionalidades Implementadas

### 🔐 Autenticação
- Login com email e senha
- Validação via Dovecot (doveadm auth test)
- Sessão segura com cookie HttpOnly
- Logout

### 📬 Gerenciamento de Emails
- **Caixa de Entrada** - Ver emails recebidos
- **Enviados** - Histórico de emails enviados
- **Rascunhos** - Emails não enviados
- **Favoritos** - Emails marcados com estrela
- **Lixeira** - Emails excluídos

### 📝 Composição
- Escrever novo email
- Destinatário, assunto e corpo
- Envio via SMTP
- Suporte para anexos (preparado)

### 🔍 Recursos
- Busca por emails
- Atualização manual (refresh)
- Visualização de detalhes
- Interface responsiva (mobile-ready)

## 📂 Arquivos Criados

```
app/
├── webmail/
│   ├── page.tsx              # Login do webmail
│   └── inbox/
│       └── page.tsx          # Interface principal (inbox)
│
└── api/webmail/
    ├── auth/route.ts         # Autenticação via Dovecot
    ├── session/route.ts      # Verificar sessão
    ├── logout/route.ts       # Fazer logout
    ├── emails/route.ts       # Listar emails (lê /var/mail)
    └── send/route.ts         # Enviar emails via SMTP
```

## 🔧 Como Funciona

### 1. Login
```typescript
POST /api/webmail/auth
Body: { email: "contato@mydsistemas.com.br", password: "senha" }
```
- Extrai username do email (contato)
- Valida com: `doveadm auth test contato senha`
- Cria cookie de sessão com 24h de validade

### 2. Ler Emails
```typescript
GET /api/webmail/emails?folder=inbox
```
- Lê arquivo `/var/mail/username`
- Parseia formato mbox
- Retorna lista de emails em JSON

### 3. Enviar Email
```typescript
POST /api/webmail/send
Body: { to: "destino@email.com", subject: "Assunto", body: "Mensagem" }
```
- Usa nodemailer
- Autentica com credenciais do usuário
- Envia via SMTP configurado

## 👥 Usuários

Cada colaborador pode fazer login com:
- **Email:** `usuario@mydsistemas.com.br`
- **Senha:** A senha configurada no servidor

### Criar Novo Usuário (via SSH)

```bash
# Criar usuário no sistema
adduser nomeuser

# Configurar senha
passwd nomeuser

# Email automaticamente será: nomeuser@mydsistemas.com.br
```

## 🎨 Interface

### Desktop
- 3 colunas: Sidebar | Lista | Visualização
- Navegação rápida entre pastas
- Busca em tempo real

### Mobile
- Interface adaptativa
- Toggle entre lista e visualização
- Menu hamburger para pastas

## 🔒 Segurança

✅ **Implementado:**
- Cookie HttpOnly (não acessível via JavaScript)
- Validação de sessão em todas as rotas
- Escape de comandos shell
- Expiração automática (24h)

⚠️ **Melhorias Recomendadas:**
- SSL/HTTPS obrigatório (já configurado no Apache)
- Rate limiting para login
- 2FA (autenticação em dois fatores)
- Criptografia end-to-end para emails sensíveis

## 📋 Requisitos

### Servidor (VPS)
- ✅ Postfix (SMTP)
- ✅ Dovecot (IMAP/SASL)
- ✅ Usuários do sistema (adduser)

### Next.js
- ✅ nodemailer
- ✅ Cookie support
- ✅ API routes

## 🐛 Troubleshooting

### "Email ou senha incorretos"
```bash
# Testar autenticação manual
doveadm auth test username senha
```

### Emails não aparecem
```bash
# Verificar se arquivo existe
ls -la /var/mail/username

# Ver conteúdo
cat /var/mail/username
```

### Erro ao enviar
```bash
# Verificar config SMTP no banco
SELECT * FROM SystemConfig WHERE key LIKE 'email.%';

# Testar porta SMTP
telnet localhost 587
```

## 🚀 Próximas Melhorias

- [ ] Anexos (upload e download)
- [ ] Pastas customizadas
- [ ] Filtros e regras
- [ ] Assinaturas de email
- [ ] Tema escuro
- [ ] Notificações em tempo real
- [ ] Integração com calendário
- [ ] Contatos/agenda

## 📞 Suporte

Para problemas ou dúvidas:
- Email: suporte@mydshop.com.br
- Admin Panel: `/admin/configuracoes/email`

---

**Status:** ✅ Funcional  
**Versão:** 1.0.0  
**Data:** Janeiro 2026
