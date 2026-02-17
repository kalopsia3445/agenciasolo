import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^14.0.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    httpClient: Stripe.createFetchHttpClient(),
});
const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

Deno.serve(async (req) => {
    console.log(`PAGAMENTO: Webhook acionado: ${req.method} ${req.url}`);
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
        console.error("Faltando assinatura stripe-signature");
        return new Response("Faltando assinatura", { status: 400 });
    }

    try {
        const body = await req.text();
        const event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret!);

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        switch (event.type) {
            case "checkout.session.completed":
            case "customer.subscription.created":
            case "customer.subscription.updated": {
                const session = event.data.object;
                console.log(`Recebido evento ${event.type} para Customer: ${session.customer}`);

                const customerId = session.customer as string;
                const subscriptionId = session.subscription as string || (session.id.startsWith("sub_") ? session.id : null);

                if (!subscriptionId) {
                    console.log("Sem ID de assinatura, ignorando...");
                    break;
                }

                console.log(`PAGAMENTO: Buscando assinatura no Stripe: ${subscriptionId}`);
                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                const status = (subscription.status === "active" || subscription.status === "trialing") ? "active" : "free";

                // 1. Detectar Tier (Prioridade: Metadata > Preço)
                let tier = subscription.metadata?.tier || session.metadata?.tier;
                if (!tier) {
                    const priceId = subscription.items.data[0]?.price.id;
                    const priceMapping: Record<string, string> = {
                        [Deno.env.get("STRIPE_PRICE_BASIC") || ""]: "basic",
                        [Deno.env.get("STRIPE_PRICE_PRO") || ""]: "pro",
                        [Deno.env.get("STRIPE_PRICE_ELITE") || ""]: "enterprise"
                    };
                    tier = priceMapping[priceId];
                    console.log(`PAGAMENTO: PriceID recebido: ${priceId}`);
                    console.log(`PAGAMENTO: Tier detectado via mapping: ${tier || "não mapeado"}`);
                }

                if (!tier) {
                    console.log("PAGAMENTO: Tier não pôde ser determinado, assumindo free ou mantendo atual");
                    tier = "free";
                }

                // 2. Localizar Usuário (Prioridade: Metadata > CustomerID em cache > Email)
                const userId = subscription.metadata?.supabase_user_id || session.metadata?.supabase_user_id;
                console.log(`PAGAMENTO: Status: ${status}, Tier: ${tier}, UserID Sugerido: ${userId}`);

                const updateData = {
                    subscription_status: status === "active" ? tier : "free",
                    stripe_customer_id: customerId
                };

                let updated = false;

                // Opção A: UserID no Metadata
                if (userId) {
                    console.log(`PAGAMENTO: Tentando atualizar via UserID: ${userId}`);
                    const { error } = await supabaseAdmin.from("profiles").update(updateData).eq("id", userId);
                    if (!error) {
                        const { data } = await supabaseAdmin.from("profiles").select("id").eq("id", userId).maybeSingle();
                        if (data) { updated = true; console.log("PAGAMENTO: Sucesso via UserID!"); }
                    }
                }

                // Opção B: CustomerID (se já estava vinculado)
                if (!updated) {
                    console.log(`PAGAMENTO: Tentando atualizar via CustomerID: ${customerId}`);
                    const { error } = await supabaseAdmin.from("profiles").update(updateData).eq("stripe_customer_id", customerId);
                    if (!error) {
                        const { data } = await supabaseAdmin.from("profiles").select("id").eq("stripe_customer_id", customerId).maybeSingle();
                        if (data) { updated = true; console.log("PAGAMENTO: Sucesso via CustomerID!"); }
                    }
                }

                // Opção C: Fallback Total por Email (mais lento mas infalível)
                if (!updated) {
                    console.log(`PAGAMENTO: Fallback final - Buscando email no Stripe...`);
                    const customer = await stripe.customers.retrieve(customerId);
                    const email = (customer as any).email;
                    if (email) {
                        console.log(`PAGAMENTO: Tentando atualizar via Email: ${email}`);
                        const { error } = await supabaseAdmin.from("profiles").update(updateData).eq("email", email);
                        if (!error) console.log("PAGAMENTO: Sucesso via Email!");
                    }
                }
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object;
                const customerId = subscription.customer as string;

                await supabaseAdmin
                    .from("profiles")
                    .update({ subscription_status: "free" })
                    .eq("stripe_customer_id", customerId);
                break;
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        console.error(`ERRO CRÍTICO NO WEBHOOK: ${err.message}`);
        return new Response(`Erro no Webhook: ${err.message}`, { status: 400 });
    }
});
