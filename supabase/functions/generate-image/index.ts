const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Expose-Headers": "X-Used-Model",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// VERSION: 2.1.0 - BRAND_DYNAMIC_RESTORED
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
            // v2.1.0: TRUST THE FRONTEND BRAND-KIT PROMPT
            finalPrompt = `${rawPrompt}, professional studio lighting, 8k resolution, clean backdrop, no text, no characters, no words, no signs.`;
            console.log(`[Nebius v2.1.0] Brand Engine: Preserving frontend prompt: ${finalPrompt.substring(0, 50)}...`);
        }

        // --- NEBIUS AI INTEGRATION ---
        if (provider === "nebius") {
            const NEBIUS_API_KEY = Deno.env.get("NEBIUS_API_KEY");
            if (!NEBIUS_API_KEY) throw new Error("NEBIUS_API_KEY secret not found in Supabase");

            const modelId = "black-forest-labs/flux-schnell";

            console.log(`🚀 NEBIUS REQUEST v2.1.0 - Model: ${modelId}, Prompt: ${finalPrompt.substring(0, 50)}...`);

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
                throw new Error(`Nebius API Error (${response.status}): ${errText}`);
            }

            const data = await response.json();
            const b64Data = data.data?.[0]?.b64_json;
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
            const buffer = await response.arrayBuffer();
            return new Response(buffer, { headers: { ...corsHeaders, "Content-Type": "image/jpeg" } });
        }

        throw new Error(`Provider não suportado: ${provider}`);

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
