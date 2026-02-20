const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { prompt, provider } = await req.json();

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

            // LISTA DE MODELOS PRO/PAGOS (Serverless Inference API)
            // Prioridade para FLUX.1-dev conforme solicitado para qualidade extrema ("agência real")
            const models = [
                "black-forest-labs/FLUX.1-dev",
                "black-forest-labs/FLUX.1-schnell"
            ];


            let lastError = "";
            for (const modelId of models) {
                try {
                    // MUDANÇA OBRIGATÓRIA: Hugging Face agora exige o uso do router.huggingface.co
                    const URL = `https://router.huggingface.co/hf-inference/models/${modelId}`;
                    console.log(`[Proxy] Tentando Modelo HF Grátis via Router: ${modelId}`);

                    const response = await fetch(URL, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${HF_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            inputs: prompt,
                            options: { wait_for_model: true }
                        }),
                    });

                    if (response.ok) {
                        const buffer = await response.arrayBuffer();
                        if (buffer.byteLength > 1000) { // Garantir que não é um JSON minúsculo de erro
                            console.log(`[Proxy] Sucesso HF (${modelId})! Buffer size: ${buffer.byteLength} bytes`);
                            return new Response(buffer, {
                                headers: {
                                    ...corsHeaders,
                                    "Content-Type": "image/jpeg",
                                    "Cache-Control": "public, max-age=31536000",
                                },
                            });
                        }
                    } else {
                        const err = await response.text();
                        console.warn(`[Proxy] Falha no modelo ${modelId}: ${err}`);
                        lastError = err;
                    }
                } catch (e: unknown) {
                    const errorMessage = e instanceof Error ? e.message : String(e);
                    console.error(`[Proxy] Erro de rede/v8 no modelo ${modelId}:`, errorMessage);
                    lastError = errorMessage;
                }
            }

            throw new Error(`Todos os modelos HF grátis falharam. Último erro: ${lastError}`);
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
