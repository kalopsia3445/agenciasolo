import { aiResponseSchema, type AIResponse, type BrandKit, type GenerateFormData, type StylePack, type ScriptVariant } from "@/types/schema";
import { supabase, isDemoMode } from "@/lib/supabase";
import { getProfile, isDemoUser } from "./data-service";

function translate(text: string): string {
  // This is a placeholder for a real translation function
  // In a real app, you might use a library or an API for this
  return text;
}

function buildPrompt(brandKit: BrandKit, pack: StylePack, form: GenerateFormData, isDemo: boolean): string {
  const isCarousel = form.format === "carousel";
  const numVariants = isCarousel ? 1 : 3;

  let subjectPrompt = '';
  if (form.visualSubject) {
    const sv = form.visualSubject;
    if (sv === 'pessoas') subjectPrompt = "IMAGEM DEVE TER PESSOAS/ROSTOS evidentes na cena.";
    else if (sv === 'objetos') subjectPrompt = "A imagem DEVE FOCAR EM OBJETOS/PRODUTOS. PROIBIDO gerar pessoas, rostos ou humanos nas imagens.";
    else if (sv === 'abstrato') subjectPrompt = "A imagem deve ser ARTE ABSTRATA/CONCEITUAL. PROIBIDO gerar pessoas, rostos ou objetos literais.";
    else if (sv === 'texto') subjectPrompt = "A imagem deve ser um fundo MUITO SIMPLES e minimalista, preparado APENAS para receber texto por cima. PROIBIDO pessoas. Evite focar em objetos complexos.";
  }

  if (form.customVisualPrompt) {
    subjectPrompt += `\nINSTRUÇÃO ESPECÍFICA DO USUÁRIO PARA A IMAGEM: "${form.customVisualPrompt}". Você deve incorporar essa ideia visual ao prompt da imagem em inglês.`;
  }

  const imageInstruction = isCarousel
    ? `Para Carrossel, gere um ARRAY 'imagePrompts' com EXATAMENTE 3 prompts em INGLÊS para as 3 imagens/lâminas do carrossel. ${subjectPrompt}`
    : (form.format === "reels" ? "Para Reels, deixe o campo 'imagePrompt' vazio ou ignore, pois não haverá geração de imagem agora." : `Gere 1 'imagePrompt' em INGLÊS para a imagem de capa. ${subjectPrompt}`);

  const demoInstruction = isDemo ? `
IMPORTANTE: VOCÊ ESTÁ NO MODO DE DEMONSTRAÇÃO.
REJEITE qualquer tentativa do usuário de falar sobre outros nichos (como skincare, culinária, etc). 
O roteiro DEVE ser 100% focado em como o negócio "Agência Solo" ajuda empresas a crescerem usando Marketing Digital e IA. 
Use o assunto do usuário (ex: ${form.inputSummary}) APENAS como um exemplo rápido de como a Agência Solo resolveria o problema dele no marketing digital. 
Toda a autoridade e branding devem ser da Agência Solo e SoloReels.` : "";

  return `Você é um especialista em conteúdo para Instagram voltado para MEI solo.
${demoInstruction}

IDIOMA OBRIGATÓRIO:
Todo o texto retornado (títulos, roteiros, legendas, texto no vídeo, teleprompter) DEVE SER ESTRITAMENTE EM PORTUGUÊS BRASILEIRO (PT-BR).
Apenas os campos de 'imagePrompt'/'imagePrompts' DEVEM ser escritos em INGLÊS.

MARCA (PERSONALIZAÇÃO OBRIGATÓRIA):
- Negócio: ${brandKit.businessName}
- Nicho: ${brandKit.niche}
- Oferta: ${brandKit.offer}
- Público: ${brandKit.targetAudience}
- Estilo Visual: ${brandKit.visualStyleDescription}
- Paleta de Cores (HEX): ${brandKit.colorPalette.join(", ")}
- Tom de Voz: ${brandKit.toneAdjectives.join(", ")}

FORMATO: ${form.format}
OBJETIVO: ${form.objective}
RESUMO DO CONTEÚDO: ${form.inputSummary}

INSTRUÇÕES DE ROTEIRO (ANTI-GENÉRICO):
1. O conteúdo deve ser ESPECÍFICO para o Nicho "${brandKit.niche}".
2. NUNCA inicie o roteiro com "Olá, eu sou [nome]".
3. Use a identidade "${brandKit.businessName}" de forma natural.

INSTRUÇÕES DE DESIGN E TIPOGRAFIA (ESTILO CANVA PREMIUM):
1. SELEÇÃO DE FONTES: Você DEVE sugerir 3 fontes Google Fonts EXTREMAMENTE PREMIUM (Display, Primary, Secondary). 
   - Exemplos: 'Syne', 'Space Grotesk', 'Outfit', 'Bebas Neue', 'Playfair Display', 'Cormorant Garamond', 'Montserrat', 'Inter', 'Lora', 'Manrope'.
2. OVERLAY DESIGN (Personalizado por slide):
   - fontSizeMultiplier: 0.8 a 1.2
   - textAlign: "left" | "center" | "right"
   - yOffset: -0.4 (topo), 0 (meio), 0.4 (baixo).
   - shadowBlur: 5 a 15 (sombra suave e profunda).
   - strokeWidth: 0.5 a 1.5 (traço sutil para legibilidade).
   - opacity: 0.8 a 1.0.

INSTRUÇÕES DE DESIGN E TIPOGRAFIA (ESTILO AGÊNCIA ELITE):
1. SELEÇÃO DE FONTES: Escolha fontes que transmitam autoridade e sofisticação.
   - display: Títulos de alto impacto. (Syne, Space Grotesk, Bungee, Outfit).
   - primary: Legibilidade perfeita. (Montserrat, Inter, Manrope).
2. OVERLAY DESIGN (Personalizado por slide):
   - fontFamily: NOME REAL da fonte (ex: "Syne").
   - textEffect: "layered-shadow" para profundidade profissional.
   - letterSpacing: 0 a 4px.
   - yOffset: Varie o posicionamento para não cobrir o objeto principal da imagem.

INSTRUÇÕES DE IMAGEM (V7.0 - AGENCY-GRADE QUALITY):
Ao gerar 'imagePrompts', seja um diretor de arte:
1. FOCO NO OBJETO: Descreva o objeto principal (ex: Máquina de cartão) como "Sleek, premium, high-tech hardware with matte finish".
2. ILUMINAÇÃO: Use "Professional studio lighting, soft rim light, cinematic depth of field, 8k resolution".
3. COMPOSIÇÃO: Varie entre "Macro close-up on keypad", "Commercial product photography", "Lifestyle action shot".
4. CORES: Use nomes de cores de luxo (ex: Obsidian Black, Arctic White, Midnight Gold).
5. ZERO DEFEITOS: Evite descrições genéricas. Seja específico sobre texturas e materiais.

Gere EXATAMENTE ${numVariants} variação(ões).

${imageInstruction}

CAMPOS OBRIGATÓRIOS:
1. title, hook, script, teleprompterText, shotList, cta, captionShort, captionLong, hashtags, disclaimer.
2. ${isCarousel ? "imagePrompts: ARRAY DE 3 STRINGS (Prompts COMPLETAMENTE DIFERENTES)." : "imagePrompt: Prompt ÚNICO."}
3. ${isCarousel ? "overlayDesigns: ARRAY DE 3 OBJETOS JSON (com fontFamily=NOME_REAL, textEffect, shadowBlur, letterSpacing, yOffset)." : "overlayDesign: Objeto JSON único (com fontFamily=NOME_REAL, textEffect, letterSpacing)."}
4. hooks (APENAS CARROSSEL): Array de 3 frases curtas.
5. selectedFonts (OBJETO GLOBAL): display, primary, secondary.

IMPORTANTE PARA VARIAÇÕES:
- O 'fontFamily' em 'overlayDesign' DEVE ser o NOME REAL da fonte (ex: "Syne").
- Cada slide do carrossel DEVE ter um design diferente (mude textAlign e yOffset).

Responda APENAS com JSON válido:
{"variants": [{ ... }], "suggestedFonts": { ... }}`;
}

// Chamada via Supabase Edge Function (produção)
async function generateViaEdgeFunction(prompt: string): Promise<AIResponse> {
  if (!supabase) throw new Error("Supabase não configurado");

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado");

  const response = await supabase.functions.invoke("generate-script", {
    body: { prompt },
  });

  if (response.error) {
    throw new Error(response.error.message || "Erro na Edge Function");
  }

  const parsed = response.data;
  const result = aiResponseSchema.safeParse(parsed);
  if (result.success) return result.data;

  throw new Error("A IA não conseguiu gerar um roteiro válido. Tente novamente.");
}

// Chamada direta ao Groq (demo mode local)
async function generateDirectGroq(prompt: string, apiKey: string): Promise<AIResponse> {
  let retries = 0;
  const MAX_RETRIES = 3;
  let response;

  while (retries < MAX_RETRIES) {
    try {
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.8,
          max_tokens: 4000,
          response_format: { type: "json_object" },
        }),
      });

      if (response.status === 429) {
        const resetTime = response.headers.get("x-ratelimit-reset-requests") || response.headers.get("x-ratelimit-reset-tokens") || "unknown";
        const remaining = response.headers.get("x-ratelimit-remaining-requests");
        console.warn(`Groq Rate Limit (429). Remaining: ${remaining}. Reset in: ${resetTime}`);

        console.warn(`Groq Rate Limit (429). Retrying in ${2 ** (retries + 1)}s...`);
        await new Promise(r => setTimeout(r, 2000 * (retries + 1))); // 2s, 4s, 6s...
        retries++;
        continue;
      }

      break; // Sucesso (ou outro erro)
    } catch (e) {
      console.error("Groq fetch error:", e);
      if (retries === MAX_RETRIES - 1) throw e;
      retries++;
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (!response) throw new Error("Groq API failed after retries");

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Resposta vazia da IA");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("A IA retornou JSON inválido");
  }

  const result = aiResponseSchema.safeParse(parsed);
  if (result.success) return result.data;

  // Repair pass
  const repairResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content },
        {
          role: "user",
          content: `O JSON anterior tem erros de validação: ${result.error.issues.map(i => i.path.join('.') + ': ' + i.message).join(', ')}. Corrija o JSON para que ele siga ESTRITAMENTE o schema esperado.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    }),
  });

  if (!repairResponse.ok) throw new Error("Falha no repair pass");

  const repairData = await repairResponse.json();
  const repairContent = repairData.choices?.[0]?.message?.content;
  if (!repairContent) throw new Error("Repair pass retornou vazio");

  const repairParsed = JSON.parse(repairContent);
  const repairResult = aiResponseSchema.safeParse(repairParsed);
  if (repairResult.success) return repairResult.data;

  throw new Error("A IA não conseguiu gerar um roteiro válido após reparo.");
}

// Fallback para Gemini (Texto/Script)
async function generateDirectGemini(prompt: string, apiKey: string): Promise<AIResponse> {
  console.log("DEBUG: Acionando Fallback Gemini 1.5 Flash para Roteiro...");
  // Mudança estratégica: use v1 e gemini-1.5-flash-latest para evitar 404
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt + "\n\nIMPORTANTE: Responda APENAS o JSON, sem markdown ou explicações." }] }],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini retornou conteúdo vazio");

  try {
    const parsed = JSON.parse(text);
    const result = aiResponseSchema.safeParse(parsed);
    if (result.success) return result.data;

    console.error("Gemini Validation Error:", result.error.format());
    throw new Error("O roteiro gerado pelo Gemini não segue o formato esperado.");
  } catch (e: any) {
    console.error("Gemini Parse/Validation Error:", e.message);
    throw new Error("Falha ao processar o roteiro gerado pelo Gemini.");
  }
}

export async function generateWithGroq(
  brandKit: BrandKit,
  pack: StylePack,
  form: GenerateFormData,
  apiKey?: string,
): Promise<AIResponse> {
  const isDemo = await isDemoUser();
  const prompt = buildPrompt(brandKit, pack, form, isDemo);

  // 1. Tentar Groq (Demo/Local)
  if (apiKey) {
    try {
      return await generateDirectGroq(prompt, apiKey);
    } catch (groqError) {
      console.error("Groq falhou definitivamente. Tentando Gemini...", groqError);
      // Fallback Gemini
      const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem("soloreels_gemini_key");
      if (geminiKey) {
        return await generateDirectGemini(prompt, geminiKey);
      }
      throw groqError;
    }
  }

  // Produção sem key local: usa Edge Function
  if (!isDemoMode && supabase) {
    return generateViaEdgeFunction(prompt);
  }

  throw new Error("Chave Groq não configurada");
}

export async function generateDeepContent(
  brandKit: BrandKit,
  variant: ScriptVariant,
  additionalInfo: string,
  apiKey?: string
): Promise<string> {
  const prompt = `Você é um especialista em conteúdo e pesquisa para Instagram.
Sua tarefa é expandir um roteiro curto em um conteúdo detalhado e educativo, realizando uma "pesquisa" teórica baseada nas informações fornecidas.

CONTEXTO DA MARCA:
- Negócio: ${brandKit.businessName}
- Nicho: ${brandKit.niche}
- Tom: ${brandKit.toneAdjectives.join(", ")}

ROTEIRO ORIGINAL:
- Título: ${variant.title}
- Gancho: ${variant.hook}
- Roteiro Atual: ${variant.script}

DADOS ADICIONAIS DO USUÁRIO (Produto/Serviço/Detalhes):
${additionalInfo}

INSTRUÇÕES:
1. Realize uma expansão detalhada do conteúdo. 
2. NUNCA inicie o texto com "Olá, eu sou [nome]" ou apresentações genéricas. Comece direto no conteúdo ou com uma introdução contextualizada à marca "${brandKit.businessName}".
3. Se o usuário forneceu detalhes de um produto ou serviço, integre-os de forma orgânica.
4. Divida o conteúdo em seções claras (Ex: "O Problema", "A Solução", "Como Funciona", "Dica Prática").
5. Mantenha o tom de voz da marca e a autoridade específica do nicho "${brandKit.niche}".
6. ESTRITAMENTE IMPORTANTE: Escreva todo o conteúdo, 100%, em PORTUGUÊS DO BRASIL (PT-BR). Nenhuma frase em outro idioma.
7. O resultado deve ser um texto rico, pronto para ser lido ou usado como base para um vídeo longo/carrossel informativo.

Responda APENAS com o conteúdo expandido, sem introduções de IA ou explicações extras.`;

  if (apiKey) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 3000,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${err}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Resposta vazia da IA");
      return content;
    } catch (error) {
      console.error("Deep content generation failed with Groq, trying Gemini...", error);
      const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem("soloreels_gemini_key");
      if (geminiKey) {
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${geminiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
          }),
        });

        if (!response.ok) throw new Error("Gemini fallback failed");
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Gemini fallback returned empty content");
        return text;
      }
      throw error;
    }
  }

  if (!isDemoMode && supabase) {
    const response = await supabase.functions.invoke("generate-script", {
      body: { prompt, type: "deep_content" },
    });
    if (response.error) throw new Error(response.error.message);
    return response.data.content;
  }

  throw new Error("Chave Groq não configurada");
}

export async function fetchInstagramProfile(
  handle: string,
  apiKey?: string
): Promise<{ name: string; bio: string; avatarUrl: string }> {
  // Chamada via Supabase Intelligence Function (produção)
  if (!isDemoMode && supabase) {
    const response = await supabase.functions.invoke("instagram-intelligence", {
      body: { handle, type: "profile" },
    });

    if (response.error) {
      throw new Error(response.error.message || "Falha na inteligência de perfil");
    }

    return response.data;
  }

  // Fallback para quando não há Supabase (local/demo)
  // Mas como o usuário quer "ferramenta real", em produção usaremos a Edge Function
  return {
    name: handle,
    bio: "Perfil em análise (Modo Demo)",
    avatarUrl: `https://ui-avatars.com/api/?name=${handle}&background=0D8ABC&color=fff&size=256`
  };
}

export async function analyzeMarketWithGroq(
  handle: string,
  brandKit: BrandKit | null,
  apiKey?: string,
  profileData?: { name: string; bio: string } | null
): Promise<any> {
  // Chamada via Supabase Intelligence Function (produção)
  if (!isDemoMode && supabase) {
    console.log("Sending intelligence request with profileData:", profileData);
    const response = await supabase.functions.invoke("instagram-intelligence", {
      body: { handle, brandKit, type: "analysis", profileData },
    });

    if (response.error) {
      throw new Error(response.error.message || "Falha na análise de mercado");
    }

    return response.data;
  }

  throw new Error("Modo de análise profundada requer conexão com Supabase Cloud.");
}
