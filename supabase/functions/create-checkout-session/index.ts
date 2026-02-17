import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^14.0.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
        );

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) {
            console.error("Erro de autenticação:", authError);
            throw new Error("Usuário não autenticado ou sessão expirada");
        }

        const body = await req.json();
        const { return_url, tier } = body;
        console.log(`Iniciando checkout para o tier: ${tier}, usuário: ${user.email}`);

        // Mapeamento de Tiers para Price IDs
        const priceMapping: Record<string, string | undefined> = {
            basic: Deno.env.get("STRIPE_PRICE_BASIC"),
            pro: Deno.env.get("STRIPE_PRICE_PRO"),
            enterprise: Deno.env.get("STRIPE_PRICE_ELITE"),
        };

        const priceId = priceMapping[tier];
        if (!priceId) {
            console.error(`Price ID não configurado para o tier: ${tier}`);
            console.log("Mapeamento atual:", priceMapping);
            throw new Error(`Configuração incompleta: Price ID não encontrado para ${tier}`);
        }

        // 1. Verificar se o cliente já existe
        const { data: profile, error: profileError } = await supabaseClient
            .from("profiles")
            .select("stripe_customer_id")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
            console.error("Erro ao buscar perfil:", profileError);
        }

        let customerId = profile?.stripe_customer_id;

        if (!customerId) {
            console.log("Criando novo cliente no Stripe...");
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { supabase_user_id: user.id },
            });
            customerId = customer.id;

            // Salvar o customerId imediatamente no perfil (usando service role para garantir)
            const supabaseAdmin = createClient(
                Deno.env.get("SUPABASE_URL") ?? "",
                Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
            );
            await supabaseAdmin
                .from("profiles")
                .update({ stripe_customer_id: customerId })
                .eq("id", user.id);
            console.log(`Cliente Stripe ${customerId} vinculado ao usuário ${user.id}`);
        }

        // 2. Criar sessão de checkout
        console.log("Criando sessão do Checkout Stripe...");
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: "subscription",
            success_url: `${return_url}?session_id={CHECKOUT_SESSION_ID}&status=success`,
            cancel_url: `${return_url}?status=cancel`,
            metadata: {
                supabase_user_id: user.id,
                tier: tier
            },
            subscription_data: {
                metadata: {
                    supabase_user_id: user.id,
                    tier: tier
                }
            }
        });

        console.log("Sessão criada com sucesso!");
        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        console.error("Erro final na Edge Function:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
