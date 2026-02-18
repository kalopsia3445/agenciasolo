!/// <reference lib="deno.ns" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        const { handle, type, profileData } = await req.json();
        if (!handle) {
            console.error("No handle provided in request body.");
            return new Response(JSON.stringify({ error: "Handle is required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        console.log(`Processing intelligence for handle: ${handle}`);

        if (!TAVILY_API_KEY) {
            console.error("TAVILY_API_KEY is missing in Edge Runtime.");
            return new Response(JSON.stringify({
                error: "TAVILY_API_KEY não encontrada nas Secrets do Supabase. Por favor, configure a chave para usar a busca real."
            }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 1. Enhanced Search Strategy:
        // We act as a detective because Instagram often blocks direct scraping.
        // We look for the profile directly AND cross-referencing information.

        console.log(`Executing enhanced search for: ${handle}`);

        const searchResponse = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                api_key: TAVILY_API_KEY,
                // Query broader sources including Instagram mirrors which are often scrapable
                query: `"${handle}" instagram bio profile (site:instagram.com OR site:picuki.com OR site:imginn.com OR site:greatfon.com OR site:facebook.com)`,
                search_depth: "advanced",
                include_answer: true,
                include_images: true,
                max_results: 10
            }),
        });

        if (!searchResponse.ok) {
            const errorText = await searchResponse.text();
            console.error("Tavily Search Error:", searchResponse.status, errorText);
            throw new Error(`Tavily API error: ${searchResponse.status} - ${errorText}`);
        }

        const searchData = await searchResponse.json();

        // Filter results that actually contain the handle to reduce hallucination
        const relevantResults = searchData.results.filter((r: any) =>
            r.url.includes(handle) || r.content.includes(handle)
        );

        const webContext = (relevantResults.length > 0 ? relevantResults : searchData.results)
            .map((r: any) => `Source: ${r.url}\nContent: ${r.content}`)
            .join("\n\n");

        // 1.5 Dedicated Image Search Plan B
        console.log("Executing dedicated image search...");
        let imageSearchData = { images: [] };
        try {
            const imageSearchResponse = await fetch("https://api.tavily.com/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    api_key: TAVILY_API_KEY,
                    query: `"${handle}" instagram profile picture`,
                    search_depth: "advanced",
                    include_images: true,
                    max_results: 5
                }),
            });
            if (imageSearchResponse.ok) {
                imageSearchData = await imageSearchResponse.json();
            } else {
                console.warn("Image search failed (non-fatal):", await imageSearchResponse.text());
            }
        } catch (imgErr) {
            console.error("Image search exception (non-fatal):", imgErr);
        }

        const allImages = [
            ...(searchData.images || []),
            ...(imageSearchData.images || [])
        ];

        const imagesContext = allImages.length > 0
            ? allImages.map((img: string) => `Image URL: ${img}`).slice(0, 8).join("\n")
            : "No images found";

        console.log(`Found ${relevantResults.length} relevant context snippets and ${allImages.length} images.`);

        // 2. Synthesize with Groq
        const prompt = `
      You are an expert Brand Analyst in 2026.
      I have found real-time web data about the Instagram handle @${handle}.
      
      WEB CONTEXT:
      ${webContext}
      
      TASK:
      1. Extract the REAL Display Name and Bio. If not found in snippets, use the handle.
      2. Analyze the niche and suggest a complete Brand Identity for 2026/2027.
      3. Identify 3 market trends for this specific niche.
      
      IMPORTANT: 
      - If the personal profile is personal, treat it as a "Personal Brand". 
      - Do NOT invent fake company names if not found in the context.
      - **RESPOND EM PORTUGUÊS (PT-BR)**. All analysis, trends, and suggestions MUST be in Portuguese.
      - **COLOR PALETTE**: Must be extracted from the content descriptions (e.g., "dark mode", "pink aesthetic", "blue medical"). Do not output random colors.
      
      RESPONSE JSON FORMAT:
      {
        "name": "Nome Factual",
        "bio": "Bio Factual",
        "niche": "Nicho Detectado (Em PT-BR)",
        "offer": "Oferta Sugerida (Em PT-BR)",
        "targetAudience": "Público Alvo (Em PT-BR)",
        "toneAdjectives": ["Adjetivo1", "Adjetivo2", "Adjetivo3"],
        "visualStyle": "Descrição Visual (Em PT-BR)",
        "colorPalette": ["#hex1", "#hex2", "#hex3"],
        "differentiators": ["Diferencial1", "Diferencial2", "Diferencial3"],
        "trends": ["Tendência1", "Tendência2", "Tendência3"],
        "suggestions": ["Sugestão1", "Sugestão2", "Sugestão3"]
      }
    `;

        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                temperature: type === "profile" ? 0.1 : 0.2,
                response_format: { type: "json_object" },
            }),
        });

        const groqData = await groqResponse.json();
        const result = JSON.parse(groqData.choices[0].message.content);

        // INJECT FOUND AVATAR
        // The LLM doesn't handle the URL, we pass the one we found in step 1.5
        result.avatarUrl = allImages.length > 0 ? allImages[0] : null;

        // FINAL SAFEGUARD: Force overwrite with user data if provided
        // This ensures the Manual Override is truly "God Mode"
        if (profileData) {
            console.log("Applying Manual Override to result...");
            result.name = profileData.name;
            result.bio = profileData.bio;
        }

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err: unknown) {
        console.error("CRITICAL EDGE FUNCTION ERROR:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
