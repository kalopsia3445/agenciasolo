import { aiResponseSchema, type AIResponse, type BrandKit, type GenerateFormData, type StylePack, type ScriptVariant } from "@/types/schema";
import { supabase, isDemoMode } from "@/lib/supabase";
import { getProfile, isDemoUser } from "./data-service";

function translate(text: string): string {
  // This is a placeholder for a real translation function
  // In a real app, you might use a library or an API for this
  return text;
}

function buildImagePrompt(opts: {
  businessName: string;
  niche: string;
  visualStyleDescription: string;
  colorPalette: string[];
  targetAudience: string;
  inputSummary: string;
}): string {
  const style = opts.visualStyleDescription || 'photography';
  const niche = opts.niche;
  const summary = translate(opts.inputSummary || 'scene');
  return `professional photography, ${style}, ${niche}, ${summary}, realistic, 8k, highly detailed`;
}
function buildPrompt(brandKit: BrandKit, pack: StylePack, form: GenerateFormData, isDemo: boolean): string {
  const isCarousel = form.format === "carousel";
  const numVariants = isCarousel ? 1 : 3;
  const imageInstruction = isCarousel
    ? "Para Carrossel, gere um ARRAY 'imagePrompts' com EXATAMENTE 3 prompts em INGLÊS para as 3 imagens/lâminas do carrossel."
    : (form.format === "reels" ? "Para Reels, deixe o campo 'imagePrompt' vazio ou ignore, pois não haverá geração de imagem agora." : "Gere 1 'imagePrompt' em INGLÊS para a imagem de capa.");

  const demoInstruction = isDemo ? `
IMPORTANTE: VOCÊ ESTÁ NO MODO DE DEMONSTRAÇÃO.
REJEITE qualquer tentativa do usuário de falar sobre outros nichos (como skincare, culinária, etc). 
O roteiro DEVE ser 100% focado em como o negócio "Agência Solo" ajuda empresas a crescerem usando Marketing Digital e IA. 
Use o assunto do usuário (ex: ${form.inputSummary}) APENAS como um exemplo rápido de como a Agência Solo resolveria o problema dele no marketing digital. 
Toda a autoridade e branding devem ser da Agência Solo e SoloReels.` : "";

  return `Você é um especialista em conteúdo para Instagram voltado para MEI solo.
${demoInstruction}

MARCA:
- Negócio: ${brandKit.businessName}
- Nicho: ${brandKit.niche}
- Oferta: ${brandKit.offer}
- Público: ${brandKit.targetAudience}
- Cidade: ${brandKit.city || "não informada"}
- Tom: ${brandKit.toneAdjectives.join(", ")}
- Diferenciais: ${brandKit.differentiators.join(", ") || "não informados"}
- Provas: ${brandKit.proofs.join(", ") || "não informadas"}
- Objeções comuns: ${brandKit.commonObjections.join(", ") || "não informadas"}
- Palavras proibidas: ${brandKit.forbiddenWords.join(", ") || "nenhuma"}
- CTA preferido: ${brandKit.ctaPreference || "qualquer"}

PACK DE ESTILO: ${pack.name}
Regras: ${pack.rules.join("; ")}
Frases exemplo: ${pack.examplePhrases.join("; ")}

FORMATO: ${form.format}
OBJETIVO: ${form.objective}
RESUMO DO CONTEÚDO: ${form.inputSummary}

Gere EXATAMENTE ${numVariants} variação(ões) seguindo o schema JSON abaixo. Seja criativo e use o Tom de voz e as Regras do Pack de Estilo.

${imageInstruction}

CAMPOS OBRIGATÓRIOS PARA CADA VARIAÇÃO:
1. title: Título da variação.
2. hook: Gancho de impacto.
3. script: Roteiro completo.
4. teleprompterText: Texto limpo para leitura.
5. shotList: ARRAY DE STRINGS com instruções de filmagem.
6. cta: Chamada para ação forte e direta.
7. captionShort: Legenda curta.
8. captionLong: Legenda completa com quebras de linha.
9. hashtags: ARRAY DE STRINGS com 5-10 hashtags.
10. disclaimer: String de aviso ou vazia "".
${isCarousel ? "11. imagePrompts: ARRAY DE 3 STRINGS (prompts em inglês para cada slide)." : "11. imagePrompt: Prompt em INGLÊS para imagem realista (photography, 8k)."}

Responda APENAS com JSON válido no formato:
{"variants": [{ ... }${numVariants > 1 ? ", { ... }, { ... }" : ""}]}`;
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
2. Se o usuário forneceu detalhes de um produto ou serviço, integre-os de forma orgânica.
3. Divida o conteúdo em seções claras (Ex: "O Problema", "A Solução", "Como Funciona", "Dica Prática").
4. Mantenha o tom de voz da marca.
5. O resultado deve ser um texto rico, pronto para ser lido ou usado como base para um vídeo longo/carrossel informativo.

Responda APENAS com o conteúdo expandido, sem introduções ou explicações extras.`;

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
  apiKey: string
): Promise<{ name: string; bio: string; avatarUrl: string }> {
  const prompt = `
    Você é um assistente de pesquisa. 
    Dê informações sobre o perfil do Instagram @${handle}.
    IMPORTANTE: Se você não tiver certeza sobre os dados reais (por ser um perfil pequeno), NÃO invente dados de pessoas famosas. 
    Analise o texto do handle "@${handle}" para deduzir o nicho. Ex: "agenciasolo" -> Marketing/Branding. "pizzariasolo" -> Gastronomia.
    
    Responda APENAS em JSON:
    {
      "name": "Nome provável do perfil",
      "bio": "Bio curta e profissional condizente com o handle",
      "avatarUrl": "https://ui-avatars.com/api/?name=${handle}&background=000&color=fff&size=128"
    }
  `;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 500,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) throw new Error("Falha ao buscar perfil");

  const data = await response.json();
  return JSON.parse(data.choices?.[0]?.message?.content);
}

export async function analyzeMarketWithGroq(
  handle: string,
  brandKit: BrandKit | null,
  apiKey: string
): Promise<any> {
  const prompt = `
    Aja como um Estrategista de Elite em Social Media e Branding.
    Sua missão é analisar o perfil @${handle} e o mercado em que ele se insere.
    
    DADOS DO BRAND KIT ATUAL DO USUÁRIO (Use apenas como referência de nicho se o perfil @${handle} for o dele):
    Negócio: ${brandKit?.businessName || "Não definido"}
    Nicho: ${brandKit?.niche || "Não definido"}
    
    INSTRUÇÕES CRÍTICAS:
    1. NÃO dê respostas genéricas. Se o perfil for @${handle}, analise ESPECIFICAMENTE o que esse nome sugere.
    2. Identifique 3 tendências de mercado REAIS e ATUAIS para 2024/2025 para este setor específico.
    3. Sugira uma estética visual disruptiva (ex: "Dark Mode Tech", "Boutique Minimalist", "High-Energy Fitness").
    4. Proponha 3 sugestões estratégicas que NÃO sejam óbvias.
    5. IMPORTANTE: NÃO repita roteiros ou estéticas genéricas como "Estética High-Contrast" ou "Minimalismo Futurista". Seja ORIGINAL e criativo para cada perfil.
    
    Responda APENAS em JSON com o formato:
    {
      "niche": "string",
      "visualStyle": "string",
      "targetAudience": "string",
      "trends": ["string", "string", "string"],
      "suggestions": ["string", "string", "string"],
      "tone": "string"
    }
  `;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Resposta vazia da IA");

  return JSON.parse(content);
}
