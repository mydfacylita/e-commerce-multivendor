# 🔐 Lógica de Autenticação e Fluxo de Cadastro de Vendedores

## 📋 Resumo da Lógica Implementada

O sistema agora garante que o usuário **SEMPRE** esteja logado antes de ver qualquer página de cadastro de vendedor. Isso evita que o usuário preencha formulários para depois descobrir que precisa fazer login.

---

## 🔄 Fluxo Completo - Cenário 1: Usuário NÃO Logado

```
1. Usuário clica em "🤝 Seja um Parceiro" (Navbar/Footer)
   ↓
2. Vai para: /vendedor/cadastro
   ↓
3. Página verifica: useSession() → status === 'unauthenticated'
   ↓
4. REDIRECIONA IMEDIATAMENTE para:
   /login?callbackUrl=/vendedor/cadastro
   ↓
5. Página de login mostra mensagem:
   "🤝 Para se tornar um parceiro vendedor
    Faça login ou crie uma conta primeiro"
   ↓
6. Usuário tem 2 opções:
   
   OPÇÃO A - Já tem conta:
   - Faz login
   - Sistema redireciona para /vendedor/cadastro
   - Mostra escolha PF/PJ
   - Preenche formulário
   - ✅ Sucesso!
   
   OPÇÃO B - Não tem conta:
   - Clica em "Criar conta" (mantém callbackUrl)
   - Vai para /registro?callbackUrl=/vendedor/cadastro
   - Preenche formulário de registro
   - Sistema cria conta E faz login automático
   - Redireciona para /vendedor/cadastro
   - Mostra escolha PF/PJ
   - Preenche formulário
   - ✅ Sucesso!
```

---

## 🔄 Fluxo Completo - Cenário 2: Usuário JÁ Logado

```
1. Usuário logado clica em "🤝 Seja um Parceiro"
   ↓
2. Vai para: /vendedor/cadastro
   ↓
3. Página verifica: useSession() → status === 'authenticated'
   ↓
4. Sistema verifica se já é vendedor:
   - Faz GET em /api/seller/register
   
   CENÁRIO 2A - Já é vendedor cadastrado:
   - Toast: "Você já está cadastrado como vendedor!"
   - Redireciona para /vendedor/dashboard
   - ✅ Mostra dashboard
   
   CENÁRIO 2B - Ainda não é vendedor:
   - Mostra escolha PF/PJ
   - Usuário escolhe e preenche formulário
   - Envia para API
   - Status = PENDING
   - Redireciona para /vendedor/dashboard
   - ✅ Sucesso!
```

---

## 🔄 Fluxo Completo - Cenário 3: Usuário Vendedor Logado

```
1. Vendedor logado clica em "🤝 Seja um Parceiro"
   ↓
2. Vai para: /vendedor/cadastro
   ↓
3. Sistema detecta: role === 'SELLER'
   ↓
4. Verifica se já tem cadastro de vendedor
   ↓
5. Toast: "Você já está cadastrado como vendedor!"
   ↓
6. Redireciona para /vendedor/dashboard
   ↓
7. ✅ Mostra dashboard
```

---

## 📱 Estados de Loading

### Loading de Autenticação
```jsx
if (status === 'loading') {
  return (
    <div>
      <spinner />
      "Verificando autenticação..."
    </div>
  );
}
```

### Durante Verificação
- Mostra spinner centralizado
- Mensagem "Carregando..." ou "Verificando autenticação..."
- Evita flash de conteúdo

### Durante Redirecionamento
```jsx
if (status === 'unauthenticated') {
  // Já está redirecionando, não mostra nada
  return null;
}
```

---

## 🔐 Páginas Protegidas

### `/vendedor/cadastro` (Escolha PF/PJ)
```jsx
useEffect(() => {
  if (status === 'loading') return;
  
  if (status === 'unauthenticated') {
    router.push('/login?callbackUrl=/vendedor/cadastro');
  }
}, [status, router]);
```

### `/vendedor/cadastro/pf` (Formulário PF)
```jsx
useEffect(() => {
  if (status === 'loading') return;
  
  if (status === 'unauthenticated') {
    router.push('/login?callbackUrl=/vendedor/cadastro/pf');
    return;
  }

  // Verifica se já é vendedor
  if (session?.user?.role === 'SELLER') {
    checkIfAlreadySeller();
  }
}, [status, session, router]);
```

### `/vendedor/cadastro/pj` (Formulário PJ)
```jsx
// Mesma lógica do PF
useEffect(() => {
  if (status === 'loading') return;
  
  if (status === 'unauthenticated') {
    router.push('/login?callbackUrl=/vendedor/cadastro/pj');
    return;
  }

  if (session?.user?.role === 'SELLER') {
    checkIfAlreadySeller();
  }
}, [status, session, router]);
```

---

## 🎯 CallbackUrl - Como Funciona

### No Link
```jsx
// Quando não logado, redireciona com callback
router.push('/login?callbackUrl=/vendedor/cadastro');
```

### Na Página de Login
```jsx
// Pega a URL de callback dos parâmetros
const searchParams = useSearchParams();
const callbackUrl = searchParams.get('callbackUrl') || '/';

// Após login bem-sucedido
router.push(callbackUrl);
```

### Na Página de Registro
```jsx
// Pega callback e passa adiante
const callbackUrl = searchParams.get('callbackUrl') || '/';

// Após registro, faz login automático
await signIn('credentials', { ... });
router.push(callbackUrl);
```

### Link "Criar Conta" Mantém Callback
```jsx
<Link href={`/registro?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
  Criar conta
</Link>
```

---

## ✅ Verificações de Segurança

### 1. Autenticação Obrigatória
- ❌ Não mostra formulário sem login
- ✅ Redireciona ANTES de mostrar conteúdo

### 2. Evita Duplicação
- Verifica se usuário já é vendedor
- Redireciona para dashboard se já cadastrado
- Mostra toast informativo

### 3. Mantém Contexto
- CallbackUrl preservado em toda jornada
- Usuário volta para onde queria após login
- Experiência fluida

### 4. Estados Claros
```
- 'loading'         → Mostra spinner
- 'unauthenticated' → Redireciona para login
- 'authenticated'   → Verifica se já é vendedor
```

---

## 🎨 Mensagens ao Usuário

### Login Page (quando vem de vendedor)
```jsx
{callbackUrl.includes('/vendedor') && (
  <div className="bg-blue-50 border border-blue-200">
    <p>
      <strong>🤝 Para se tornar um parceiro vendedor</strong>
      <br />
      Faça login ou crie uma conta primeiro
    </p>
  </div>
)}
```

### Já é Vendedor
```jsx
toast.info('Você já está cadastrado como vendedor!');
router.push('/vendedor/dashboard');
```

### Login Automático Após Registro
```jsx
toast.success('Conta criada com sucesso! Fazendo login...');
await signIn('credentials', { ... });
router.push(callbackUrl);
```

---

## 🔄 Comparação: ANTES vs DEPOIS

### ❌ ANTES (Problema)
```
1. Clica "Seja Parceiro"
2. Mostra escolha PF/PJ (sem verificar login)
3. Clica PF
4. Mostra formulário completo
5. Preenche tudo
6. Clica "Enviar"
7. AÍ descobre que não está logado ❌
8. Perde tudo que preencheu
9. Faz login
10. Tem que começar tudo de novo
```

### ✅ DEPOIS (Solução)
```
1. Clica "Seja Parceiro"
2. Sistema verifica: não logado
3. Redireciona imediatamente para login
4. Mostra mensagem explicativa
5. Faz login OU cria conta
6. Sistema redireciona automaticamente
7. Mostra escolha PF/PJ
8. Preenche formulário (já logado)
9. Envia com sucesso ✅
10. Tudo funcionando!
```

---

## 📊 Fluxograma Visual

```
                    [Usuário Clica "Seja Parceiro"]
                                |
                                v
                    [/vendedor/cadastro carrega]
                                |
                                v
                    [useSession() - Verifica Status]
                                |
                    +-----------+------------+
                    |                        |
                v (loading)              v (unauthenticated)
          [Mostra Spinner]          [Redireciona → /login?callback=...]
                                              |
                                              v
                                    [Página de Login]
                                    - Mostra mensagem
                                    - Campos login
                                    - Link "Criar conta"
                                              |
                        +---------------------+---------------------+
                        |                                           |
                    v (Login)                                 v (Criar Conta)
            [signIn() → Success]                      [/registro?callback=...]
                        |                                           |
                        |                                           v
                        |                                  [Cria Conta]
                        |                                           |
                        |                                           v
                        |                              [signIn() automático]
                        |                                           |
                        +-------------------+------------------------+
                                            |
                                            v
                              [router.push(callbackUrl)]
                                            |
                                            v
                              [/vendedor/cadastro - Já Logado]
                                            |
                                            v
                              [Verifica se já é vendedor]
                                            |
                        +-------------------+-------------------+
                        |                                       |
                    v (Sim)                                 v (Não)
        [Toast + Dashboard]                    [Mostra Escolha PF/PJ]
                                                            |
                                                            v
                                              [Preenche Formulário]
                                                            |
                                                            v
                                              [POST /api/seller/register]
                                                            |
                                                            v
                                              [Status = PENDING]
                                                            |
                                                            v
                                              [Redireciona → Dashboard]
                                                            |
                                                            v
                                                      [✅ SUCESSO]
```

---

## 🎯 Benefícios da Nova Lógica

1. **Melhor UX**: Usuário sabe logo no início que precisa estar logado
2. **Sem Perda de Dados**: Não preenche formulário para depois perder tudo
3. **Fluxo Claro**: Cada passo tem propósito e contexto
4. **Auto-Login**: Após criar conta, já entra automaticamente
5. **Callback Inteligente**: Sempre volta para onde queria ir
6. **Evita Duplicação**: Não deixa criar vendedor duplicado
7. **Mensagens Claras**: Usuário sempre sabe o que está acontecendo
8. **Performance**: Não carrega formulários desnecessários

---

## 🛠️ Arquivos Modificados

1. **app/vendedor/cadastro/page.tsx**
   - Adicionado verificação de autenticação
   - Loading state
   - Redirecionamento com callback

2. **app/vendedor/cadastro/pf/page.tsx**
   - Verificação de autenticação
   - Verificação se já é vendedor
   - Loading states

3. **app/vendedor/cadastro/pj/page.tsx**
   - Mesmas verificações do PF
   - Loading states

4. **app/login/page.tsx**
   - Aceita callbackUrl
   - Mostra mensagem contextual
   - Redireciona após login
   - Link mantém callback

5. **app/registro/page.tsx**
   - Aceita callbackUrl
   - Login automático após registro
   - Redireciona para callback

---

## ✅ Checklist de Funcionamento

- [x] Usuário não logado é redirecionado ANTES de ver formulário
- [x] CallbackUrl é preservado em toda jornada
- [x] Mensagem explicativa no login
- [x] Link "Criar conta" mantém callback
- [x] Login automático após registro
- [x] Redirecionamento correto após login/registro
- [x] Verifica se já é vendedor (evita duplicação)
- [x] Loading states em todos os pontos
- [x] Não mostra conteúdo durante redirecionamento
- [x] Toast informativo quando já é vendedor
- [x] Experiência fluida sem quebras

---

## 🚀 Pronto para Uso!

O sistema agora garante que **NENHUM usuário** verá formulários de cadastro de vendedor sem estar logado, proporcionando uma experiência muito melhor e evitando frustrações.
