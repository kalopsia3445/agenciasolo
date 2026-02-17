import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
        const { handle } = await req.json();
        if (!handle) {
            return new Response(JSON.stringify({ error: "Handle is required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (!TAVILY_API_KEY) {
            return new Response(JSON.stringify({
                error: "TAVILY_API_KEY não encontrada nas Secrets do Supabase. Por favor, configure a chave para usar a busca real."
            }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 1. Search Tavily for Instagram Profile Data
        const searchResponse = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                api_key: TAVILY_API_KEY,
                query: `instagram.com/${handle} profile bio and details`,
                search_depth: "basic",
                include_answer: true,
            }),
        });

        if (!searchResponse.ok) {
            throw new Error(`Tavily API error: ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();
        const webContext = searchData.results
            .map((r: any) => `Source: ${r.url}\nContent: ${r.content}`)
            .join("\n\n");

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
      
      IMPORTANT: If the personal profile is personal, treat it as a "Personal Brand". 
      Do NOT invent fake company names if not found in the context.
      
      RESPONSE JSON FORMAT:
      {
        "name": "Factual Name",
        "bio": "Factual Bio",
        "niche": "Detected Niche",
        "offer": "Suggested Offer for 2026",
        "targetAudience": "Ideal Audience",
        "toneAdjectives": ["Adjective1", "Adjective2", "Adjective3"],
        "visualStyle": "Visual Style Description",
        "colorPalette": ["#hex1", "#hex2", "#hex3"],
        "differentiators": ["Diff1", "Diff2", "Diff3"],
        "trends": ["Trend1", "Trend2", "Trend3"],
        "suggestions": ["Sugg1", "Sugg2", "Sugg3"]
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
                temperature: 0.2,
                response_format: { type: "json_object" },
            }),
        });

        const groqData = await groqResponse.json();
        const result = JSON.parse(groqData.choices[0].message.content);

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
