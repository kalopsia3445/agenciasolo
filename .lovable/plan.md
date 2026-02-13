
# SoloReels AI — Plano de Implementação Completo

## Visão Geral
PWA mobile-first para MEIs solo gerarem roteiros de Instagram (Reels/Stories/Carrossel) com IA, incluindo teleprompter integrado. Stack: React + Vite + Tailwind + shadcn/ui. Backend: Supabase externo (com Demo Mode via LocalStorage quando desconectado).

---

## 1. Arquitetura de Dados & Demo Mode

### Supabase (quando conectado)
- **profiles** — nome do usuário
- **brand_kits** — dados da marca (negócio, nicho, oferta, público, tom, palavras proibidas, diferenciais, provas, objeções, CTA, cidade)
- **style_packs** — packs oficiais (user_id null) + packs customizados do usuário
- **scripts** — roteiros gerados (resultado JSON completo)
- **favorites** — scripts marcados como favoritos
- **daily_usage** — controle de limite diário (3/dia grátis)
- **RLS** em todas as tabelas com `auth.uid() = user_id`

### Demo Mode (sem Supabase)
- Detecção automática: se `VITE_SUPABASE_URL` estiver vazio → Demo Mode
- Dados salvos em LocalStorage com a mesma estrutura
- Sem telas de login, acesso direto ao app
- Limite de 3 gerações/dia via LocalStorage

---

## 2. Integração IA (Groq)

- Edge Function no Supabase chamando a API do Groq (OpenAI-compatible)
- Em Demo Mode: chamada direta ao Groq (requer `VITE_GROQ_API_KEY` no .env — apenas para demo local)
- Schema JSON de resposta validado com Zod (variants com title, hook, script, teleprompterText, shotList, captions, CTA, hashtags, disclaimer)
- 3 variações por geração
- Repair pass automático se a resposta não validar

---

## 3. Telas & Navegação

### Landing Page (`/`)
- Hero focado em MEI solo
- Benefícios, nichos atendidos, CTA "Começar grátis"

### Auth (`/login`, `/signup`) — só com Supabase
- Email/senha + opção magic link
- Em Demo Mode: essas rotas não existem

### Onboarding (`/app/onboarding`)
- Passo 1: Preencher Kit da Marca (formulário completo com validação Zod)
- Passo 2: Escolher nicho (10 nichos quick-start)
- Passo 3: Escolher pack de estilo

### Gerar Roteiro (`/app/generate`)
- Selecionar formato (Reels/Stories/Carrossel)
- Selecionar objetivo, resumo do conteúdo
- Gerar 3 variações com IA
- Cada variação mostra: gancho, roteiro, legenda curta/longa, CTA, hashtags, shot list
- Botões: copiar, favoritar, abrir no teleprompter
- Indicador "Hoje: X/3" no topo

### Teleprompter (`/app/teleprompter/:scriptId`)
- Tela cheia, texto rolando automaticamente
- Play/pause, controle de velocidade, tamanho de fonte
- Espelhamento horizontal (opcional)
- Linha guia (opcional)

### Biblioteca (`/app/library`)
- Histórico de roteiros gerados
- Aba de favoritos
- Busca e filtros por nicho/formato/data

### Kit da Marca (`/app/brand-kit`)
- Editar todos os campos do brand kit

### Packs de Estilo (`/app/packs`)
- 12 packs oficiais (Direto ao ponto, Autoridade, Storytime, Anti-objeção, Humor leve, Premium, Oferta, Local, Tutorial, Antes/depois, FAQ, Bastidores)
- CRUD de packs customizados do usuário

---

## 4. PWA
- Manifest com nome, ícones, theme_color
- Service worker para instalação no Android/Chrome
- Layout mobile-first otimizado para uso no celular

---

## 5. 10 Nichos Quick-Start
Beleza/Estética, Delivery, Transporte/Frete, Personal/Fitness, Ensino/Aulas, Pet, Reparos/Manutenção, Consultoria, Marketing/Publicidade, Contabilidade

---

## 6. Design & UX
- Mobile-first com shadcn/ui
- Bottom navigation no app (Gerar, Biblioteca, Brand Kit, Packs)
- Dark mode support
- Toasts para feedback (geração, erros, limites)
