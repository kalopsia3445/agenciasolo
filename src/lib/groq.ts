import { aiResponseSchema, type AIResponse, type BrandKit, type GenerateFormData, type StylePack } from "@/types/schema";

function buildPrompt(brandKit: BrandKit, pack: StylePack, form: GenerateFormData): string {
  return `Você é um especialista em conteúdo para Instagram voltado para MEI solo.

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

Gere EXATAMENTE 3 variações. Para cada variação inclua:
- title: título curto do roteiro
- hook: gancho de abertura (primeiros 3 segundos)
- script: roteiro completo para ${form.format}
- teleprompterText: texto limpo para leitura no teleprompter (sem marcações técnicas)
- shotList: array de instruções de filmagem
- captionShort: legenda curta (até 150 chars)
- captionLong: legenda longa com quebras de linha
- cta: call to action
- hashtags: array de hashtags relevantes (5-10)
- disclaimer: aviso legal se necessário, ou string vazia

Responda APENAS com JSON válido no formato:
{"variants": [{ ... }, { ... }, { ... }]}`;
}

export async function generateWithGroq(
  brandKit: BrandKit,
  pack: StylePack,
  form: GenerateFormData,
  apiKey: string,
  baseUrl = "https://api.groq.com/openai/v1"
): Promise<AIResponse> {
  const prompt = buildPrompt(brandKit, pack, form);

  const response = await fetch(`${baseUrl}/chat/completions`, {
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

  // Validate
  const result = aiResponseSchema.safeParse(parsed);
  if (result.success) return result.data;

  // Repair pass
  const repairResponse = await fetch(`${baseUrl}/chat/completions`, {
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
          content: `O JSON anterior tem erros de validação: ${result.error.message}. Corrija e retorne APENAS o JSON corrigido no mesmo formato.`,
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

  throw new Error("A IA não conseguiu gerar um roteiro válido. Tente novamente.");
}
