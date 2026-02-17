# 🧠 SoloReels (Solo Story Spark) - Documentação de Contexto
*Versão: 1.0 | Data: Fevereiro 2026*

Este documento serve como fonte de verdade para o entendimento profundo do projeto **SoloReels**, cobrindo desde sua identidade visual até sua lógica de processamento de IA.

---

## 1. Visão Geral e Missão
O **SoloReels** é uma plataforma "AI-First" focada em habilitar Microempreendedores Individuais (MEIs) e profissionais solo a criarem conteúdo de vídeo viral de forma profissional e escalável. O app resolve o problema do "bloqueio criativo" e da falta de recursos visuais, entregando roteiros estruturados e imagens de alta qualidade em segundos.

---

## 2. Sistema de Design (Identidade Visual)

A interface é moderna, utilizando **Glassmorphism**, gradientes vibrantes e um layout focado em dispositivos móveis (Mobile-First).

### 🎨 Paleta de Cores (HSL)
*   **Background**: `230 25% 7%` (Escuro profundo, elegante).
*   **Primary**: `15 90% 55%` (Laranja vibrante/Coral, usado para CTAs e destaques).
*   **Secondary**: `170 55% 40%` (Verde Esmeralda suave).
*   **Accent**: `270 60% 55%` (Púrpura criativo).
*   **Card Background**: `230 22% 11%` (Cinza azulado escuro para profundidade).

### ✍️ Tipografia
*   **Títulos (h1-h6)**: `Space Grotesk` (Moderna, geométrica, com um toque tecnológico).
*   **Corpo de Texto**: `Inter` (Altamente legível, profissional).

---

## 3. Arquitetura de Páginas (Mapa do App)

1.  **Landing Page (`/`)**: Página de entrada focada em conversão, apresentando os benefícios e provas sociais.
2.  **Auth (`/auth`)**: Sistema de login e cadastro via Supabase Auth (Email/Senha e Social).
3.  **Onboarding (`/app/onboarding`)**: Fluxo inicial para o usuário configurar seu primeiro Brand Kit.
4.  **Gerador Principal (`/app/generate`)**: O coração do app. Onde o usuário define formato, objetivo e resumo, recebendo 3 variações completas.
5.  **Kit da Marca (`/app/brand-kit`)**: Onde a identidade do usuário reside. Inclui upload de logos e análise inteligente de referências visuais com IA.
6.  **Packs de Estilo (`/app/packs`)**: Galeria de estilos pré-definidos (ex: Dark Mode, Soft Aesthetic) e criação de packs customizados.
7.  **Biblioteca (`/app/library`)**: Histórico de todas as produções passadas e favoritos.
8.  **Teleprompter (`/app/teleprompter/:id`)**: Ferramenta de auxílio à gravação com roteiro em movimento.
9.  **Checkout (`/app/checkout`)**: Gestão de planos e upgrades com integração via Stripe/Supabase.
10. **Admin Dashboard (`/app/admin`)**: Painel de métricas e monitoramento para os fundadores.

---

## 4. Motores de Inteligência Artificial

### 📝 Engine de Roteiro (Scripter)
Utiliza uma hierarquia de modelos LLM:
- **Principal**: `Llama-3.3-70b-versatile` (via Groq) para velocidade extrema e alta qualidade.
- **Fallback**: `Gemini 1.5 Flash` (via Google) caso o Groq atinja limites ou falhe.
- **Lógica de Reparo**: O app possui um sistema de "auto-repair" que identifica JSONs mal formados e solicita uma correção imediata à IA antes de mostrar ao usuário.

### 🖼️ Engine Visual (Image Pipeline)
Um sistema de cascata inteligente ("Waterfall Failover"):
1.  **Fal.ai (Flux Schnell)**: Qualidade ultra-realista e rapidez excepcional.
2.  **Hugging Face**: Segunda camada de segurança para modelos estáveis.
3.  **Pollinations AI**: Geração rápida e gratuita para garantir continuidade.
4.  **Stable Horde**: Camada final baseada em comunidade, garantindo que o usuário nunca fique sem imagem.

---

## 5. Estrutura de Dados e Lógica Core

### O Brand Kit como Cérebro
O app não apenas gera texto; ele injeta o **Brand Kit** do usuário no prompt do sistema. Diferenciais, tom de voz e até as dores do público-alvo são passados para a IA, garantindo que o roteiro pareça escrito pelo próprio usuário.

### Style Packs como Filtros
Os Packs de Estilo definem "regras de ouro" e exemplos de frases que a IA deve seguir. Isso permite que um mesmo negócio gere conteúdos com "vibes" totalmente diferentes apenas trocando o pack.

---

## 6. Modelo de Negócio e Limites (Tiers)
O sistema opera em um modelo semanal de créditos:
- **Grátis**: 1 geração/semana.
- **Básico (R$ 37)**: 3 gerações/semana.
- **Pro (R$ 67)**: 6 gerações/semana.
- **Elite (R$ 127)**: 12 gerações/semana.

---

## 7. Tecnologias (Tech Stack)
- **Vite/React/TS**: Núcleo da aplicação estável e performático.
- **Tailwind + shadcn/ui**: Desenvolvimento rápido de interface premium.
- **Supabase**: Backend completo (Auth, DB, Edge Functions, Storage).
- **Zod**: Validação rigorosa de dados da IA para evitar erros em runtime.
