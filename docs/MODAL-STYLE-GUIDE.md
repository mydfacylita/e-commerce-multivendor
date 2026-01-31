# 📋 Guia de Estilo - Modal de Notificação

Este documento define o padrão visual e de implementação para modais de notificação em todo o sistema MYDSHOP.

## 🎨 Design Visual

### Estrutura do Modal
```
┌─────────────────────────────────────┐
│                              [X]    │  ← Botão fechar (canto superior direito)
│                                     │
│             (  ⊘  )                 │  ← Ícone centralizado com borda circular
│                                     │
│              Título                 │  ← Título em negrito centralizado
│                                     │
│    Mensagem descritiva aqui         │  ← Mensagem em texto cinza centralizado
│                                     │
│   ┌─────────────────────────────┐   │
│   │            OK               │   │  ← Botão de ação (largura total)
│   └─────────────────────────────┘   │
│                                     │
│   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░   │  ← Barra de progresso (opcional, auto-close)
└─────────────────────────────────────┘
```

### Especificações de Design

| Propriedade | Valor |
|-------------|-------|
| Largura máxima | `max-w-md` (448px) |
| Margem lateral | `mx-4` |
| Border radius | `rounded-2xl` |
| Sombra | `shadow-2xl` |
| Border | `border-2` |
| Padding interno | `p-6` |
| Overlay | `bg-black/40 backdrop-blur-sm` |
| Z-index | `z-[100]` |
| Animação | `zoom-in-95 duration-200` |

## 🎭 Tipos de Notificação

### 1. Sucesso (success)
```tsx
// Cores
bgColor: 'bg-green-50'
borderColor: 'border-green-200'
iconColor: 'text-green-500'
titleColor: 'text-green-800'
buttonColor: 'bg-green-600 hover:bg-green-700'

// Ícone
FiCheckCircle
```

### 2. Erro (error)
```tsx
// Cores
bgColor: 'bg-red-50'
borderColor: 'border-red-200'
iconColor: 'text-red-500'
titleColor: 'text-red-800'
buttonColor: 'bg-red-600 hover:bg-red-700'

// Ícone
FiXCircle
```

### 3. Aviso (warning)
```tsx
// Cores
bgColor: 'bg-yellow-50'
borderColor: 'border-yellow-200'
iconColor: 'text-yellow-500'
titleColor: 'text-yellow-800'
buttonColor: 'bg-yellow-600 hover:bg-yellow-700'

// Ícone
FiAlertTriangle
```

### 4. Informação (info)
```tsx
// Cores
bgColor: 'bg-blue-50'
borderColor: 'border-blue-200'
iconColor: 'text-blue-500'
titleColor: 'text-blue-800'
buttonColor: 'bg-blue-600 hover:bg-blue-700'

// Ícone
FiInfo
```

## 📦 Componentes Disponíveis

### 1. Componente: `NotificationModal`
Localização: `components/ui/NotificationModal.tsx`

```tsx
interface NotificationModalProps {
  isOpen: boolean;          // Controla visibilidade
  onClose: () => void;      // Callback ao fechar
  type: NotificationType;   // 'success' | 'error' | 'warning' | 'info'
  title: string;            // Título do modal
  message: string;          // Mensagem principal
  details?: string;         // Detalhes adicionais (opcional)
  autoClose?: boolean;      // Fechar automaticamente (default: false)
  autoCloseDelay?: number;  // Tempo em ms (default: 3000)
}
```

### 2. Componente: `ConfirmModal`
Localização: `components/ui/ConfirmModal.tsx`

Para substituir o `confirm()` nativo do navegador.

```tsx
interface ConfirmModalProps {
  isOpen: boolean;          // Controla visibilidade
  onClose: () => void;      // Callback ao cancelar
  onConfirm: () => void;    // Callback ao confirmar
  type?: ConfirmType;       // 'danger' | 'warning' | 'info' (default: 'danger')
  title: string;            // Título do modal
  message: string;          // Mensagem de confirmação
  confirmText?: string;     // Texto do botão confirmar (default: 'Confirmar')
  cancelText?: string;      // Texto do botão cancelar (default: 'Cancelar')
  loading?: boolean;        // Mostrar loading no botão (default: false)
}
```

### Hook: `useNotification`
Localização: `hooks/useNotification.ts`

```tsx
const { notification, success, error, warning, info, hideNotification } = useNotification();
```

### Hook: `useConfirm`
Localização: `hooks/useConfirm.ts`

```tsx
const { confirmState, loading, confirmDelete, confirmAction, hideConfirm } = useConfirm();
```

## 🔧 Implementação

### Passo 1: Importar componente e hook
```tsx
import NotificationModal from '@/components/ui/NotificationModal';
import { useNotification } from '@/hooks/useNotification';
```

### Passo 2: Usar o hook no componente
```tsx
export default function MeuComponente() {
  const { notification, success, error, warning, info, hideNotification } = useNotification();
  
  // ... resto do código
}
```

### Passo 3: Adicionar o modal no JSX
```tsx
return (
  <div>
    {/* Seu conteúdo */}
    
    {/* Modal de notificação - SEMPRE no final do JSX */}
    <NotificationModal
      isOpen={notification.isOpen}
      onClose={hideNotification}
      type={notification.type}
      title={notification.title}
      message={notification.message}
      details={notification.details}
    />
  </div>
);
```

### Passo 4: Chamar notificações
```tsx
// Sucesso
success('Sucesso!', 'Operação realizada com sucesso.');

// Erro
error('Erro', 'Não foi possível completar a operação.');

// Aviso
warning('Atenção', 'Esta ação não pode ser desfeita.');

// Informação
info('Informação', 'Seu plano expira em 7 dias.');

// Com detalhes adicionais
error('Erro', 'Falha ao processar pagamento.', 'Código: PIX_TIMEOUT');
```

## ✅ Exemplos de Uso

### Exemplo Completo
```tsx
'use client';

import NotificationModal from '@/components/ui/NotificationModal';
import { useNotification } from '@/hooks/useNotification';

export default function ExemploPage() {
  const { notification, success, error, hideNotification } = useNotification();
  
  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/exemplo', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        success('Sucesso!', 'Dados salvos com sucesso.');
      } else {
        error('Erro', data.message || 'Erro ao salvar dados.');
      }
    } catch (err) {
      error('Erro', 'Erro de conexão.');
    }
  };
  
  return (
    <div>
      <button onClick={handleSubmit}>Salvar</button>
      
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={hideNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        details={notification.details}
      />
    </div>
  );
}
```

### Substituindo `alert()` nativo
```tsx
// ❌ NÃO USAR (antigo)
alert('Erro ao salvar');

// ✅ USAR (novo padrão)
error('Erro', 'Erro ao salvar');
```

### Substituindo `confirm()` nativo
```tsx
// ❌ NÃO USAR (antigo)
if (confirm('Deseja excluir?')) {
  // ação
}

// ✅ USAR (novo padrão)
import ConfirmModal from '@/components/ui/ConfirmModal'
import { useConfirm } from '@/hooks/useConfirm'

// No componente:
const { confirmState, confirmLoading, confirmDelete, hideConfirm } = useConfirm()

// Chamar confirmação:
confirmDelete('Deseja realmente excluir este item?', async () => {
  await deleteItem()
  success('Sucesso', 'Item excluído!')
})

// No JSX (final):
<ConfirmModal
  isOpen={confirmState.isOpen}
  onClose={hideConfirm}
  onConfirm={confirmState.onConfirm}
  type={confirmState.type}
  title={confirmState.title}
  message={confirmState.message}
  confirmText={confirmState.confirmText}
  cancelText={confirmState.cancelText}
  loading={confirmLoading}
/>
```

## 🚫 O que NÃO fazer

1. **NÃO** usar `alert()` nativo do navegador
2. **NÃO** usar `confirm()` nativo do navegador  
3. **NÃO** criar modais inline com estilos diferentes
4. **NÃO** usar cores diferentes das definidas neste guia
5. **NÃO** modificar o tamanho do ícone (manter 40px)
6. **NÃO** alterar a estrutura do modal (ícone > título > mensagem > botão)

## 📝 Checklist de Migração

Ao refatorar componentes existentes:

- [ ] Remover todos os `alert()` e substituir por `error()` ou `success()`
- [ ] Importar `NotificationModal` e `useNotification`
- [ ] Adicionar o componente `<NotificationModal />` no JSX
- [ ] Testar todas as notificações visualmente
- [ ] Verificar que o modal fecha com ESC e click no overlay

## 🔄 Versionamento

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0.0 | 2026-01-30 | Versão inicial do guia |

---

**Mantenedor:** Equipe MYDSHOP  
**Localização dos componentes:**
- Modal: `components/ui/NotificationModal.tsx`
- Hook: `hooks/useNotification.ts`
