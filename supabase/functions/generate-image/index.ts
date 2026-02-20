const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Expose-Headers": "X-Used-Model",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { prompt, provider, visualSubject, seed } = await req.json();

        if (!prompt) {
            return new Response(JSON.stringify({ error: "Prompt is required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        console.log(`[Proxy] Provider: ${provider}, Prompt: ${prompt.substring(0, 30)}...`);

        if (provider === "hf") {
            const HF_TOKEN = Deno.env.get("HF_TOKEN");
            if (!HF_TOKEN) throw new Error("HF_TOKEN secret not found in Supabase");

            const BEST_MODEL_BY_FOCUS: Record<string, string> = {
                pessoas: "black-forest-labs/FLUX.2-pro",     // Máx fotorealismo
                objetos: "recraft-ai/Recraft-V3-Text-to-Image", // Rápido e isolamento perfeito
                abstrato: "black-forest-labs/FLUX.2-dev",    // Top quality art
                texto: "black-forest-labs/FLUX.1-dev"        // Melhor tipografia atual via HF
            };

            let modelId = "black-forest-labs/FLUX.1-dev";  // Default

            if (visualSubject === 'texto') {
                modelId = BEST_MODEL_BY_FOCUS["texto"];
                console.log(`🔥 TEXTO PRO: Usando modelo especialista direto -> ${modelId}`);
            } else if (visualSubject && BEST_MODEL_BY_FOCUS[visualSubject]) {
                modelId = BEST_MODEL_BY_FOCUS[visualSubject];
                console.log(`🚀 FOCO PRO: Priorizando modelo ótimo -> ${modelId}`);
            }

            console.log(`[Proxy] Modelo final roteado: ${modelId}`);
            // Endpoint V1 do HF Router Pro
            const URL = `https://router.huggingface.co/v1/models/${modelId}/text-to-image`;

            try {
                const response = await fetch(URL, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${HF_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        inputs: prompt,
                        parameters: {
                            num_inference_steps: 28,
                            guidance_scale: 8.0,
                            seed: seed || Math.floor(Math.random() * 1e9),
                            width: 1024,
                            height: 1024
                        }
                    }),
                });

                if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    if (buffer.byteLength > 1000) {
                        console.log(`[Proxy] Sucesso HF (${modelId})! Buffer size: ${buffer.byteLength} bytes`);
                        return new Response(buffer, {
                            headers: {
                                ...corsHeaders,
                                "Content-Type": "image/jpeg",
                                "Cache-Control": "public, max-age=31536000",
                                "X-Used-Model": modelId
                            },
                        });
                    }
                }

                const err = await response.text();
                throw new Error(`Falha no modelo ${modelId}: ${err}`);

            } catch (e: unknown) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                console.error(`[Proxy] Erro fatal no modelo ${modelId}:`, errorMessage);
                throw new Error(`Requisição falhou: ${errorMessage}`);
            }
        }

        if (provider === "pollinations") {
            console.log(`[Proxy] Chamando Pollinations...`);
            const seed = Math.floor(Math.random() * 1000000);
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=1200&model=flux&seed=${seed}&nologo=true`;

            const response = await fetch(url);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Pollinations API Error ${response.status}: ${errorText}`);
            }

            const buffer = await response.arrayBuffer();
            console.log(`[Proxy] Sucesso Pollinations! Buffer size: ${buffer.byteLength} bytes`);

            return new Response(buffer, {
                headers: {
                    ...corsHeaders,
                    "Content-Type": "image/jpeg",
                },
            });
        }

        throw new Error(`Provider não suportado: ${provider}`);

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Proxy] Erro Fatal:`, errorMessage);
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
