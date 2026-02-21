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
                pessoas: "Kwai-Kolors/Kolors",
                objetos: "black-forest-labs/FLUX.1-Krea-dev",
                abstrato: "black-forest-labs/FLUX.1-Krea-dev",
                texto: "black-forest-labs/FLUX.1-Krea-dev"
            };

            let modelId = "black-forest-labs/FLUX.1-Krea-dev"; // Modern Krea-dev Model
            let providerNode = "fal-ai"; // Target provider for stability

            if (visualSubject && BEST_MODEL_BY_FOCUS[visualSubject]) {
                modelId = BEST_MODEL_BY_FOCUS[visualSubject];
                console.log(`💎 PRO ROUTE: Target model -> ${modelId} (${visualSubject})`);

                // Kolors might need hf-inference or another provider if fal-ai doesn't host it
                if (modelId.includes("Kolors")) providerNode = "hf-inference";
            }

            // 1. PRE-FLIGHT CHECK: Verify if model is warm/available
            try {
                const statusUrl = `https://huggingface.co/api/models/${modelId}?expand[]=inference`;
                const statusRes = await fetch(statusUrl, {
                    headers: { "Authorization": `Bearer ${HF_TOKEN}` }
                });

                if (statusRes.ok) {
                    const info = await statusRes.json();
                    const isLive = info.inference === "warm" || info.inference === "live" || info.inference?.status === "live";
                    console.log(`[Status] ${modelId} is ${isLive ? "LIVE/WARM" : "NOT LIVE (Status: " + JSON.stringify(info.inference) + ")"}`);
                    // We proceed anyway as Inference API handles cold starts, but logging helps debug
                }
            } catch (e: any) {
                console.warn(`[Status Check Failed] Could not verify ${modelId} status:`, e.message);
            }

            console.log(`[Proxy] Final Pro Routed Model: ${modelId} via ${providerNode}`);

            // Using the modern Router URL
            const URL = `https://router.huggingface.co/v1/models/${modelId}/text-to-image`;

            try {
                const response = await fetch(URL, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${HF_TOKEN}`,
                        "Content-Type": "application/json",
                        "X-Inference-Provider": providerNode,
                        "x-use-cache": "false" // Avoid stale generated images
                    },
                    body: JSON.stringify({
                        inputs: prompt,
                        parameters: {
                            num_inference_steps: 35, // High quality steps for Pro models
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
                        console.log(`[Proxy] Success Pro HF (${modelId})! Buffer size: ${buffer.byteLength} bytes`);
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
                console.error(`[Error Details] Status: ${response.status}, Content: ${err}`);
                throw new Error(`HF Pro Error (${modelId}): ${err}`);

            } catch (e: unknown) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                console.error(`[Proxy] Fatal error in ${modelId}:`, errorMessage);
                throw new Error(`HF Pro Request failed: ${errorMessage}`);
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
