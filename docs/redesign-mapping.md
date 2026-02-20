# Guia de Estilo & Mapeamento: Luxury Glow Redesign

Este documento formaliza a paleta de cores e o mapeamento técnico dos seletores do Chatwoot para o redesenho premium.

## 🎨 Paleta de Cores: "Cyber Luxury"

Uma combinação de tons profundos, transparência glassmorphism e brilhos neon controlados.

| Elemento | Cor | Hex / RGBA | Efeito |
| :--- | :--- | :--- | :--- |
| **Fundo Principal** | Deep Obsidian | `#050608` | Sólido |
| **Superfícies Glass** | Glass Night | `rgba(13, 16, 23, 0.75)` | Backdrop-blur: 16px |
| **Cor de Destaque** | Electric Cyan | `#00e5ff` | Box-shadow: 0 0 15px |
| **Bordas** | Starlight White | `rgba(255, 255, 255, 0.08)` | 1px solid |
| **Texto Primário** | Ivory Silver | `#f1f3f5` | Font-weight: 500 |
| **Ação Secundária** | Phantom Grey | `#2d3436` | Transição Suave |

## 🛠️ Mapeamento de Seletores (Chatwoot v3+)

Abaixo estão os seletores-chave que serão alvo do `luxury-theme.css`:

### 1. Estrutura Lateral (Sidebar)
- **Container**: `aside.sidebar` ou `.app-context-menu`
- **Itens de Menu**: `.sidebar-item-wrap`, `.sidebar-menu-item`
- **Logo Ativo**: `.sidebar-header img`

### 2. Lista de Conversas
- **Pai**: `.conversations-sidebar`
- **Cards**: `.conversation-card`
- **Status Online**: `.presence-status` (Aplicar brilho neon)

### 3. Área de Chat (Main View)
- **Header da Conversa**: `.conversation-header`
- **Bolhas Recebidas**: `.message-wrap.incoming .message-content`
- **Bolhas Enviadas**: `.message-wrap.outgoing .message-content`
- **Barra de Digitação**: `.message-input` (Aplicar Glassmorphism total)

### 4. Top Bar & Botões
- **Top Bar**: `.top-bar`
- **Botões Primários**: `.button.primary`, `.button--primary`
- **Modais**: `.modal-container` (Aplicar desfoque de fundo extremo)

## 📌 Próximos Passos (EXECUTION)
1. Integrar estas cores em variáveis CSS no `luxury-theme.css`.
2. Aplicar `backdrop-filter` em todos os containers mapeados.
3. Adicionar animações de entrada sutis (`fade-in-up`) para os cards.
