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
        const { prompt: rawPrompt, provider, visualSubject, seed, colorPalette, visualStyle } = await req.json();

        if (!rawPrompt) {
            return new Response(JSON.stringify({ error: "Prompt is required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // --- BACKGROUND PROMPT ENGINE ---
        let finalPrompt = rawPrompt;
        if (visualSubject === 'texto') {
            const colors = colorPalette && Array.isArray(colorPalette) ? colorPalette.join(" and ") : "modern professional colors";
            const style = visualStyle || "minimalist clean aesthetic";

            // Build a strict background-only prompt. 
            // We ignore the rawPrompt (which might contain the hook/text) to avoid AI artifacts.
            finalPrompt = `High-end professional marketing background, clean minimalist aesthetic, perfect for text overlay, high contrast, colors: ${colors}, style: ${style}, atmospheric lighting, 1024x1024, highly detailed, cinematic texture, no text, no letters, no words, clean background.`;
            console.log(`[Nebius] Background Engine Active! Override Prompt for ${visualSubject}`);
        }

        // --- NEBIUS AI INTEGRATION ---
        if (provider === "nebius") {
            console.log(`[Nebius] Request - Focus: ${visualSubject || 'generic'}, Prompt: ${finalPrompt.substring(0, 50)}...`);

            const NEBIUS_API_KEY = Deno.env.get("NEBIUS_API_KEY");
            if (!NEBIUS_API_KEY) throw new Error("NEBIUS_API_KEY secret not found in Supabase");

            // Model Mapping
            const NEBIUS_MODELS: Record<string, string> = {
                pessoas: "black-forest-labs/flux-dev",
                abstrato: "black-forest-labs/flux-dev",
                objetos: "black-forest-labs/flux-schnell",
                texto: "black-forest-labs/flux-schnell"
            };

            const modelId = (visualSubject && NEBIUS_MODELS[visualSubject])
                ? NEBIUS_MODELS[visualSubject]
                : "black-forest-labs/flux-dev";

            console.log(`🚀 NEBIUS ROUTE: Using ${modelId}`);

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
        // --- END NEBIUS AI INTEGRATION ---

        if (provider === "pollinations") {
            console.log(`[Proxy] Chamando Pollinations...`);
            const pollSeed = Math.floor(Math.random() * 1000000);
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=800&height=1200&model=flux&seed=${pollSeed}&nologo=true`;

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
