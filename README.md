# 🎥 Solo Reels (Solo Story Spark)
### *A Engine de Conteúdo Viral para Criadores Solo e MEIs*

**Solo Reels** é uma plataforma projetada para transformar a presença digital de empreendedores individuais (MEIs) e profissionais solo. Utilizamos Inteligência Artificial de ponta para remover a barreira da "página em branco", gerando roteiros e imagens profissionais em segundos.

---

## ✅ O QUE O SOLO REELS FAZ (Nossas Forças)

### 🧠 Inteligência de Marca (Brand Kit)
- **Identidade Unificada**: Salva seu nicho, público-alvo, tom de voz e diferenciais.
- **Style Packs**: Permite alternar entre estilos de conteúdo (ex: Educativo, Venda, Humanizado) sem perder sua essência.

### ✍️ Geração de Roteiros Estratégicos
- **3 Variações por Clique**: Cada geração entrega três opções diferentes para você escolher.
- **Formatos Específicos**: Otimizado para **Reels**, **Stories** e **Carrosséis**.
- **Shot List Detalhado**: Diz exatamente o que fazer na frente da câmera (cenas, ângulos, gestos).
- **Legendas e Hashtags**: Entrega a legenda completa (curta e longa) e hashtags prontas para copiar.

### 🖼️ Criação de Imagens com IA
- **Capas e Slides**: Gera imagens profissionais (vertical para Stories, quadrada para Carrosséis).
- **Consistência Visual**: As imagens tentam seguir as cores e o estilo descritos no seu Brand Kit.
- **Persistência**: Todas as imagens ficam salvas permanentemente na sua biblioteca.

### 🔬 Estudo de Roteiro (Deep Content)
- **Conteúdo Aprofundado**: Função extra que gera um "estudo" detalhado sobre o tema do roteiro, ideal para vídeos mais longos ou posts educativos densos.

### 📱 Ferramentas de Execução
- **Teleprompter**: Interface dedicada para ler o roteiro enquanto você grava, facilitando a gravação de vídeos longos sem erro.
- **Biblioteca Organizada**: Histórico completo de todas as suas criações com visualização detalhada.

---

## 🛑 O QUE O SOLO REELS NÃO FAZ (Para não mentirmos)

- **NÃO gera o vídeo final sozinho**: O app não cria o vídeo editado do seu rosto falando. Ele te dá o "caminho das pedras" (roteiro + imagens), mas você é a estrela que grava.
- **NÃO posta direto no Instagram**: Por segurança e política da plataforma, você deve baixar ou copiar o conteúdo e postar manualmente.
- **NÃO é ilimitado**: O uso de IA de alta performance tem custo, por isso existem limites semanais baseados no seu plano Escolhido.
- **NÃO garante viralização**: Nós entregamos a estratégia e o roteiro com maior potencial baseado em tendências, mas o sucesso depende da sua execução e do algoritmo.

---

## 🛠️ Stack Tecnológica

- **Frontend**: React + TypeScript + Vite
- **UI & Design**: Tailwind CSS + shadcn/ui + Framer Motion
- **Backend & Auth**: Supabase (Database, Auth, Edge Functions, Storage)
- **AI Models**:
  - **Texto**: Llama 3 (via Groq), Gemini 1.5 Flash.
  - **Imagem**: Flux (via Fal.ai/Pollinations), SDXL (via HF).

---

## ⚙️ Configuração do Ambiente

O projeto depende de APIs para funcionar plenamente. Renomeie o `.env.example` para `.env.local` e preencha:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
VITE_GROQ_API_KEY=sua-chave-groq
VITE_GEMINI_API_KEY=sua-chave-gemini
VITE_FAL_KEY=sua-chave-fal-ai
```

---

## 📄 Licença

Este projeto é privado e de uso exclusivo da **Agência Solo**. Todos os direitos reservados.
