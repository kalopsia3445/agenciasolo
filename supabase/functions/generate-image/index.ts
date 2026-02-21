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
        const { prompt: rawPrompt, provider, visualSubject, seed } = await req.json();

        if (!rawPrompt) {
            return new Response(JSON.stringify({ error: "Prompt is required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // --- BACKGROUND PROMPT ENGINE ---
        let finalPrompt = rawPrompt;
        if (visualSubject === 'texto') {
            // TRUST THE FRONTEND. The frontend now builds high-quality, brand-aligned prompts.
            // We only add negative weights and technical quality markers here to ensure professional results.
            finalPrompt = `${rawPrompt}, professional studio lighting, 8k resolution, clean backdrop, no text, no characters, no words, no signs.`;
            console.log(`[Nebius] Background Engine: Preserved Brand-Kit Prompt for ${visualSubject}`);
        }

        // --- NEBIUS AI INTEGRATION ---
        if (provider === "nebius") {
            const NEBIUS_API_KEY = Deno.env.get("NEBIUS_API_KEY");
            if (!NEBIUS_API_KEY) throw new Error("NEBIUS_API_KEY secret not found in Supabase");

            const NEBIUS_MODELS: Record<string, string> = {
                pessoas: "black-forest-labs/flux-dev",
                abstrato: "black-forest-labs/flux-dev",
                objetos: "black-forest-labs/flux-schnell",
                texto: "black-forest-labs/flux-schnell"
            };

            const modelId = (visualSubject && NEBIUS_MODELS[visualSubject])
                ? NEBIUS_MODELS[visualSubject]
                : "black-forest-labs/flux-dev";

            console.log(`🚀 NEBIUS REQUEST - Focus: ${visualSubject}, Model: ${modelId}, Prompt: ${finalPrompt.substring(0, 50)}...`);

            const response = await fetch("https://api.studio.nebius.ai/v1/images/generations", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${NEBIUS_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: modelId,
                    prompt: finalPrompt,
                    n: 1,
                    size: "1024x1024",
                    response_format: "b64_json",
                    seed: seed || Math.floor(Math.random() * 1000000)
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error(`[Nebius Error] ${response.status}: ${errText}`);
                throw new Error(`Nebius API Error (${response.status}): ${errText}`);
            }

            const data = await response.json();
            const b64Data = data.data?.[0]?.b64_json;

            if (!b64Data) {
                throw new Error("No image data received from Nebius");
            }

            // Convert base64 to binary
            const binaryString = atob(b64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            return new Response(bytes, {
                headers: {
                    ...corsHeaders,
                    "Content-Type": "image/jpeg",
                    "X-Used-Model": modelId
                },
            });
        }

        if (provider === "pollinations") {
            const pollSeed = Math.floor(Math.random() * 1000000);
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=1024&height=1024&model=flux&seed=${pollSeed}&nologo=true`;

            const response = await fetch(url);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Pollinations API Error ${response.status}: ${errorText}`);
            }

            const buffer = await response.arrayBuffer();
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
