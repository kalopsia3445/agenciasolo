import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^14.0.0";

console.log("Edge Function 'create-checkout-session' loaded v3 (NPM).");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req: Request) => {
    // 1. Handle CORS Preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        // 2. Initialize Supabase Client
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
        );

        // 3. Authenticate User
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) {
            console.error("Auth Error:", authError);
            throw new Error("Unauthorized: " + (authError?.message || "No user found"));
        }
        console.log("User authenticated:", user.id);

        // 4. Initialize Stripe (Lazy Load)
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) {
            console.error("Missing STRIPE_SECRET_KEY");
            throw new Error("Server Misconfiguration: Missing Stripe Key");
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
            // httpClient removed as it causes crash with npm:stripe
        });

        const body = await req.json();
        console.log("Received Body:", JSON.stringify(body));
        const { return_url, tier } = body as { return_url?: string; tier?: string };

        if (!tier) {
            throw new Error("Missing 'tier' parameter in request body.");
        }
        console.log(`Iniciando checkout para o tier: ${tier}, usuário: ${user.email}`);

        // Mapeamento de Tiers para Price IDs
        const priceMapping: Record<string, string | undefined> = {
            basic: Deno.env.get("STRIPE_PRICE_BASIC"),
            pro: Deno.env.get("STRIPE_PRICE_PRO"),
            enterprise: Deno.env.get("STRIPE_PRICE_ELITE"),
        };

        // Check for missing keys
        const missingKeys = [];
        if (!Deno.env.get("STRIPE_SECRET_KEY")) missingKeys.push("STRIPE_SECRET_KEY");
        if (tier === "basic" && !Deno.env.get("STRIPE_PRICE_BASIC")) missingKeys.push("STRIPE_PRICE_BASIC");
        if (tier === "pro" && !Deno.env.get("STRIPE_PRICE_PRO")) missingKeys.push("STRIPE_PRICE_PRO");
        if (tier === "enterprise" && !Deno.env.get("STRIPE_PRICE_ELITE")) missingKeys.push("STRIPE_PRICE_ELITE");

        if (missingKeys.length > 0) {
            const msg = `Configuração incompleta no Supabase. Faltam as keys: ${missingKeys.join(", ")}`;
            console.error(msg);
            throw new Error(msg);
        }

        const priceId = priceMapping[tier];
        if (!priceId) {
            console.error(`Price ID não configurado para o tier: ${tier}`);
            console.log("Mapeamento atual:", priceMapping);
            throw new Error(`Configuração incompleta: Price ID não encontrado para ${tier}`);
        }

        // 1. Verificar se o cliente já existe e é VÁLIDO no Stripe
        const { data: profile, error: profileError } = await supabaseClient
            .from("profiles")
            .select("stripe_customer_id")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
            console.error("Erro ao buscar perfil:", profileError);
        }

        let customerId = profile?.stripe_customer_id;

        // Se tivermos um ID, verificar se ele realmente existe no Stripe
        if (customerId) {
            try {
                console.log(`Verificando existência do customer ${customerId}...`);
                const customer = await stripe.customers.retrieve(customerId);
                if (customer.deleted) {
                    console.warn(`Customer ${customerId} foi deletado no Stripe.`);
                    customerId = null;
                }
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                console.warn(`Customer ${customerId} inválido ou não encontrado no Stripe (Ambiente diferente?):`, errorMessage);
                customerId = null;
            }
        }

        // Se não tiver ID (ou se o antigo era inválido), criar um novo
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
            console.log(`Novo Cliente Stripe ${customerId} vinculado ao usuário ${user.id}`);
        } else {
            console.log(`Customer existente e válido: ${customerId}`);
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
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Erro final na Edge Function:", errorMessage);
        return new Response(JSON.stringify({ error: errorMessage }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
