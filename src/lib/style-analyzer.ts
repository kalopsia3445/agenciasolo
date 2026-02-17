export interface AnalysisResult {
    visualStyleDescription: string;
    colorPalette: string[];
    suggestedTone: string[];
}

/**
 * Remove prefixo data:image/...;base64, se existir
 */
function toPureBase64(base64: string): string {
    return base64.replace(/^data:(image|video)\/[a-z]+;base64,/, '');
}

/**
 * Redimensiona uma imagem para garantir que o payload não exceda os limites da API.
 */
async function resizeImage(base64Str: string, maxWidth = 1024): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        // Garante que temos o prefixo para carregar no Image
        img.src = base64Str.startsWith('data:') ? base64Str : `data:image/jpeg;base64,${base64Str}`;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxWidth) {
                    width *= maxWidth / height;
                    height = maxWidth;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            // Retorna pure base64 (sem prefixo, pois split remove)
            resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
        };
    });
}

/**
 * Analisa mídias (Base64) usando Groq Vision (Llama 3.2) para extrair o estilo visual da marca.
 */
export async function analyzeBrandStyle(urls: string[]): Promise<AnalysisResult> {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("VITE_GROQ_API_KEY não configurada.");
    }

    // Limitar a análise a 3 mídias para evitar limites de tokens/rate limit
    const selectedUrls = urls.slice(0, 3);
    console.log(`DEBUG [style-analyzer]: Iniciando análise de ${selectedUrls.length} mídias.`);

    // Converter URLs para Base64
    const mediaContents = await Promise.all(
        selectedUrls.map(async (url, idx) => {
            try {
                console.log(`DEBUG [style-analyzer]: Baixando mídia ${idx + 1}/${selectedUrls.length}...`);
                const response = await fetch(url);
                if (!response.ok) throw new Error("Falha ao baixar mídia");
                const blob = await response.blob();
                console.log(`DEBUG [style-analyzer]: Convertendo mídia ${idx + 1} (${blob.type}, ${Math.round(blob.size / 1024)}KB) para Base64...`);

                return new Promise<{ type: string; data: string }>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        console.log(`DEBUG [style-analyzer]: Mídia ${idx + 1} convertida.`);
                        let base64 = (reader.result as string).split(",")[1]; // This is already pure base64

                        // Se for imagem, redimensionar para garantir payload pequeno
                        if (blob.type.startsWith("image/")) {
                            console.log(`DEBUG [style-analyzer]: Otimizando imagem ${idx + 1}...`);
                            base64 = await resizeImage(reader.result as string); // resizeImage now returns pure base64
                        }

                        resolve({ type: blob.type, data: base64 });
                    };
                    reader.onerror = (e) => {
                        console.error(`DEBUG [style-analyzer]: Erro no FileReader para mídia ${idx + 1}`, e);
                        reject(e);
                    };
                    reader.readAsDataURL(blob);
                });
            } catch (err) {
                console.warn(`DEBUG [style-analyzer]: Erro no processamento da mídia ${idx + 1}:`, err);
                return null;
            }
        })
    );

    // Filtrar apenas IMAGENS (Groq Vision não suporta vídeo direto via Base64/image_url no payload JSON)
    const cleanMedia = mediaContents.filter(m => m !== null && m.type.startsWith("image/"));

    if (cleanMedia.length === 0) {
        throw new Error("Nenhuma imagem válida encontrada. Por favor, adicione pelo menos uma IMAGEM de referência (vídeos não são suportados nesta análise ainda).");
    }

    // Preparar mídias
    const preparedMedia = cleanMedia.map(m => {
        const pure = toPureBase64(m!.data);
        console.log("Pure base64 preview:", pure.slice(0, 50) + "...");
        return {
            mimeType: m!.type,
            pureBase64: pure,
            urlWithHeader: `data:${m!.type};base64,${pure}`
        };
    });

    const prompt = `Analyze the visual style of the provided images. Focus on identifying key characteristics such as:
- **Dominant visual style**: (e.g., minimalist, vibrant, retro, modern, elegant, playful, industrial, natural, futuristic, artistic, clean, bold, sophisticated, rustic, luxurious, abstract, geometric, organic, hand-drawn, photographic, illustrative, etc.)
- **Color palette**: List 3-5 main colors or color groups (e.g., "pastel blues and pinks", "earthy tones", "monochromatic with a pop of red", "bright primary colors", "dark and moody greens and grays").
- **Suggested tone/mood**: (e.g., professional, friendly, serious, innovative, calm, energetic, luxurious, approachable, edgy, traditional, whimsical, trustworthy, exciting, serene, dynamic, etc.)

Provide the analysis in a JSON object with the following structure:
{
  "visualStyleDescription": "A concise description of the overall visual style.",
  "colorPalette": ["color1", "color2", "color3"],
  "suggestedTone": ["tone1", "tone2"]
}

Ensure the response is a valid JSON object, and do not include any additional text or markdown formatting outside the JSON.`;

    // 1. TENTATIVA GROQ: LISTAR E USAR PRIMEIRO MODELO DISPONÍVEL
    let groqModel = "llama-3.2-90b-vision-preview"; // Default fallback

    try {
        console.log(`DEBUG [style-analyzer]: Fetching available Groq models...`);
        const groqModelsResp = await fetchWithTimeout("https://api.groq.com/openai/v1/models", {
            headers: { "Authorization": `Bearer ${apiKey}` }
        }, 5000); // 5s timeout listing

        if (groqModelsResp.ok) {
            const d = await groqModelsResp.json();
            // Tentar encontrar um modelo vision ou usar o primeiro
            const visionModel = d.data.find((m: any) => m.id.includes("vision") || m.id.includes("llama-3.2"));
            if (visionModel) {
                groqModel = visionModel.id;
                console.log(`DEBUG [style-analyzer]: Selected Groq Model: ${groqModel}`);
            } else if (d.data.length > 0) {
                groqModel = d.data[0].id;
                console.log(`DEBUG [style-analyzer]: Defaulting to first Groq Model: ${groqModel}`);
            }
        }
    } catch (e) {
        console.warn("Error listing Groq models, using default:", e);
    }

    const groqPayload = {
        model: groqModel,
        messages: [{
            role: "user",
            content: [
                {
                    type: "text",
                    text: prompt
                },
                ...preparedMedia.map((m) => ({
                    type: "image_url",
                    image_url: {
                        url: m.urlWithHeader
                    },
                })),
            ],
        }],
        temperature: 0.5,
        max_completion_tokens: 1000,
        response_format: { type: "json_object" },
    };

    try {
        console.log(`DEBUG [style-analyzer]: Sending request to Groq (${groqModel})...`);

        // Log seguro
        const logContent = [...groqPayload.messages[0].content];
        if (logContent.length > 1) {
            // @ts-ignore
            logContent[1] = { ...logContent[1], image_url: { url: "BASE64_TRUNCATED" } };
        }
        console.log("GROQ RAW messages[0]:", JSON.stringify(logContent, null, 2));

        const response = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(groqPayload),
        }, 30000);

        console.log("GROQ response status:", response.status);

        if (!response.ok) {
            const errText = await response.text();
            console.warn("GROQ response body:", errText);
            throw new Error(`Groq status ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error("Resposta vazia da IA (Groq)");
        console.log("Análise final (Groq):", content.slice(0, 100) + "...");
        return JSON.parse(content);

    } catch (groqError: any) {
        console.error("DEBUG [style-analyzer]: Groq falhou:", groqError.message);
        console.log("Tentando Fallback Gemini...");

        // 2. FALLBACK GEMINI
        const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!geminiKey) {
            console.warn("Gemini Key não encontrada. Usando Dummy Fallback.");
            // @ts-ignore
            return getDummyFallback(window.tempBrandKitContext);
        }

        // Tentar descobrir modelo Gemini dinamicamente
        let geminiModel = "gemini-1.5-flash";
        try {
            const modelsResp = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`, {}, 5000);
            if (modelsResp.ok) {
                const d = await modelsResp.json();
                // Preferir pro ou flash
                const selected = d.models?.find((m: any) => m.name.includes("gemini-1.5-pro")) || d.models?.find((m: any) => m.name.includes("gemini-1.5-flash")) || d.models?.[0];
                if (selected) {
                    // name vem como "models/gemini-1.5-pro", precisamos só do final ou endpoint correto
                    geminiModel = selected.name.replace("models/", "");
                    console.log(`DEBUG [style-analyzer]: Selected Gemini Model: ${geminiModel}`);
                }
            }
        } catch (e) {
            console.warn("Error listing Gemini models, using default", e);
        }

        const geminiPayload = {
            contents: [{
                parts: [
                    { text: prompt },
                    ...preparedMedia.map((m) => ({
                        inline_data: {
                            mime_type: m.mimeType,
                            data: m.pureBase64
                        }
                    }))
                ]
            }],
            generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 1000,
                response_mime_type: "application/json"
            }
        };

        // Log seguro para Gemini
        const logGeminiParts = [...geminiPayload.contents[0].parts];
        if (logGeminiParts.length > 1) {
            // @ts-ignore
            logGeminiParts[1] = { ...logGeminiParts[1], inline_data: { mime_type: "image/...", data: "BASE64_TRUNCATED" } };
        }
        console.log("GEMINI RAW contents[0]:", JSON.stringify(logGeminiParts, null, 2));

        try {
            const geminiResponse = await fetchWithTimeout(
                `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(geminiPayload)
                },
                30000
            );

            console.log("GEMINI response status:", geminiResponse.status);

            if (!geminiResponse.ok) {
                const errText = await geminiResponse.text();
                console.error("GEMINI error body:", errText);
                throw new Error(`Gemini fallback failed: ${geminiResponse.status} - ${errText}`);
            }

            const geminiData = await geminiResponse.json();
            const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) throw new Error("Gemini sem texto");
            console.log("Análise final (Gemini):", text.slice(0, 100) + "...");

            return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());

        } catch (geminiError: any) {
            console.error("DEBUG [style-analyzer]: Gemini falhou:", geminiError.message);
            console.log("Usando Fallback Dummy Final.");
            // @ts-ignore
            return getDummyFallback(window.tempBrandKitContext);
        }
    }
}

// Contexto opcional para o dummy
function getDummyFallback(context?: any): AnalysisResult {
    const palette = context?.colorPalette?.length > 0 ? context.colorPalette : ["#f8f1e9", "#4a7c59", "#ffffff", "#d4a373"];
    const tone = context?.toneAdjectives?.length > 0 ? context.toneAdjectives : ["professional", "serene", "trustworthy", "natural"];
    const niche = context?.niche || "Professional";

    return {
        visualStyleDescription: `${niche} aesthetic with clean lines, soft lighting, and a modern, approachable vibe.`,
        colorPalette: palette,
        suggestedTone: tone
    };
}

async function fetchWithTimeout(resource: RequestInfo, options: RequestInit = {}, timeout = 30000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });
    clearTimeout(id);
    return response;
}
