# � SoloReels (Agente Solo): Base de Conhecimento Suprema (2026)

Este documento é a fonte única de verdade (Single Source of Truth) para o sistema **SoloReels**. Ele detalha exaustivamente a tecnologia, estratégias de IA, arquitetura de dados e funcionalidades do Agente Solo.

---

## 🏗️ 1. Arquitetura de Sistema 360°

O SoloReels não é apenas um site; é um ecossistema distribuído que utiliza o que há de mais moderno em IA Generativa e Cloud Computing.

### **Stack Tecnológica Completa:**
*   **Core**: React 18 + Vite (Frontend ultra-veloz).
*   **Estilização**: Tailwind CSS + Shadcn/UI (Design System Premium "Luxury Tech").
*   **Backend & Infra**: Supabase Cloud (Auth, Database, Storage, Edge Functions).
*   **Orquestração de IA**:
    *   **Texto (Raciocínio)**: Groq (Llama 3.3 70B Versatile) - Inferência em milissegundos.
    *   **Texto (Fallback)**: Google Gemini 1.5 Flash - Estabilidade e janelas de contexto longas.
    *   **Busca em Tempo Real**: Tavily AI - O Google das IAs.
    *   **Imagens (Elite)**: Fal.ai (Flux.1 Schnell) - Qualidade fotorealista.
    *   **Imagens (Resiliência)**: Hugging Face Inference & Pollinations AI.
*   **Pagamentos & Assinaturas**: Stripe (Checkout Sessions & Webhooks com sincronização de Tiers).

---

## 🧠 2. O Motor de Inteligência (AI Engine)

### **A. Inteligência Factual (Instagram Intelligence)**
Diferente de IAs que "alucinam" dados, o Agente Solo usa o **Tavily AI** para realizar uma varredura profunda na web antes de sugerir qualquer estratégia.
*   **Modo Detetive**: O sistema busca por espelhadores de Instagram (Picuki, etc.) e redes sociais vinculadas para extrair bios reais e nichos específicos.
*   **Diagnóstico 2026**: A IA projeta tendências de mercado para os próximos anos baseada nos dados encontrados.
*   **Extração Visual**: Identifica paletas de cores e estilos estéticos (ex: "Pink Aesthetic", "Minimalist Blue") diretamente da linguagem visual descrita na web.

### **B. Estratégia "Anti-Genérico"**
O maior diferencial do SoloReels é a eliminação do conteúdo robótico.
*   **Regra de Proibição**: A IA é instruída a **NUNCA** iniciar roteiros com "Olá, eu sou [nome]" ou "Como especialista eu digo...".
*   **Voz de Autoridade**: O roteiro assume a identidade do dono do negócio (ex: fala como uma "Engenheira Florestal" e não como uma "IA simulando uma engenheira").
*   **Sincronização de Marca**: Cada linha gerada é filtrada pelo **Brand Kit**, respeitando:
    *   Palavras proibidas (forbidden words).
    *   Diferenciais únicos do negócio.
    *   Provas sociais específicas.

---

## 📸 3. Pipeline de Imagem "Infinite Storage"

O sistema de imagens foi projetado para ser à prova de falhas e expirações.

1.  **Geração**: O prompt é traduzido e enriquecido com os dados visuais do Brand Kit (estilo, iluminação, cores).
2.  **Multi-Provider**: Se o Fal.ai falhar, o sistema tenta automaticamente o Hugging Face e depois o Pollinations.
3.  **Persistência (Upload Forçado)**: Assim que a imagem é gerada, o Agente Solo faz o download do link temporário e o envia para o seu **Supabase Storage**.
4.  **Resultado**: O link salvo no seu banco de dados é **permanente**. A imagem nunca desaparece da biblioteca por expiração de cache.

---

## 🛠️ 4. Catálogo Exaustivo de Funcionalidades

### **1. Análise de Instagram (O "Mago" do Solo)**
*   **Função**: Transforma um @handle em um Brand Kit completo.
*   **Manual Override**: Permite que o usuário corrija o Nome e Bio caso a IA não encontre os dados em perfis privados.

### **2. Estúdio de Geração (Multiformato)**
*   **Carrossel**: Entrega 3 lâminas com imagens exclusivas e roteiro narrativo.
*   **Stories**: 3 variações de fundo e texto focado em interação (CTAs de engajamento).
*   **Reels**: Roteiros de 30-60 segundos com "Shot List" (instruções de câmera) e legenda premium.

### **3. Kit da Marca (Brand Kit)**
*   **Central de Identidade**: Onde você define a alma do negócio.
*   **Análise de Estilo por IA**: Você sobe fotos ou vídeos de referência, e a IA descreve o seu estilo visual e sugere sua paleta de cores automaticamente.

### **4. Biblioteca de Ativos (Library)**
*   **Gestão de Favoritos**: Salve suas melhores ideias.
*   **Download Direto**: Baixe capas e lâminas em alta definição com um clique.
*   **Filtros Inteligentes**: Separação por formato (Reels, Stories, Carrossel).

### **5. Teleprompter de Gravação**
*   **Interface Limpa**: Remove as "notas do diretor" e foca apenas na sua fala.
*   **Controles**: Velocidade de rolagem variável, ajuste de tamanho de fonte e **Modo Espelho** (Flip) para gravação com a câmera frontal.

---

## 💰 5. Lógica de Negócios & Limites

O SoloReels utiliza um sistema de Tiers escaláveis gerenciado via Stripe:

| Nível (Tier) | Descrição | Limite Semanal |
| :--- | :--- | :--- |
| **Free (Demo)** | Uso da marca "Agência Solo" | 1 Geração |
| **Basic (Plano 1)** | Marca própria desbloqueada | 3 Gerações |
| **Pro (Plano 2)** | Uso moderado | 6 Gerações |
| **Elite (Plano 3)** | Uso intenso + Análise Instagram | 12 Gerações |

*   **Deteção de Admin**: Emails específicos (`kalopsia3445@gmail.com`, etc.) possuem acesso ilimitado ("God Mode").

---

## ❓ 6. FAQ Técnico e Funcional (Exaustivo)

#### **P: Por que a IA pede para analisar "referências visuais" no Brand Kit?**
**R:** Isso treina a "visão" do Agente Solo. Ao entender o que você gosta (cores, iluminação, enquadramento), a IA gera prompts de imagem que se alinham perfeitamente à sua estética atual.

#### **P: O que acontece se o Groq estiver lento ou fora do ar?**
**R:** O sistema possui um redundância automática. Se o Groq apresentar o erro 429 (Rate Limit) ou falhar, o SoloReels aciona o **Google Gemini 1.5 Flash** para entregar o roteiro sem que o usuário perceba a interrupção.

#### **P: Como garantir que a IA use minhas cores nos Carrosséis?**
**R:** O SoloReels injeta os códigos Hex da sua paleta diretamente no "Image Prompt" enviado para o Fal.ai. Ele prioriza essas cores como tons dominantes na composição da imagem.

#### **P: O botão de download está dando erro de segurança?**
**R:** No passado sim, mas a arquitetura atual de **Persistência no Supabase** resolve isso. Como a imagem está no seu próprio servidor, o navegador permite o download sem restrições de CORS.

#### **P: A IA pode criar posts sobre assuntos que eu proibi?**
**R:** No **Modo Demo**, a IA é extremamente rígida e forçará o assunto "Agência Solo". Em **Produção**, ela segue as suas `forbiddenWords` configuradas no Brand Kit para garantir que termos sensíveis nunca apareçam.

#### **P: Como o Teleprompter calcula a velocidade?**
**R:** Ele usa um algoritmo de interpolação baseado em milissegundos para garantir uma rolagem suave e sem "engasgos", mesmo em dispositivos mais lentos.

---
*Documentação Gerada e Atualizada pelo Agente Solo - Fevereiro de 2026*
