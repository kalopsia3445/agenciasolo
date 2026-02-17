import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Sparkles, Zap, ShieldCheck, Loader2, Crown, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams, useNavigate } from "react-router-dom";

const PLANS = [
    {
        id: "basic",
        name: "Básico",
        price: "R$ 37",
        limit: "3 gerações",
        period: "por semana",
        icon: Star,
        color: "text-blue-500",
        features: [
            "3 gerações por semana",
            "Imagens geradas por IA",
            "Todos os Style Packs",
            "Teleprompter integrado",
            "Brand Kit personalizado"
        ]
    },
    {
        id: "pro",
        name: "Pro",
        price: "R$ 67",
        limit: "6 gerações",
        period: "por semana",
        icon: Zap,
        color: "text-primary",
        recommended: true,
        features: [
            "6 gerações por semana",
            "Imagens em todas as gerações",
            "Todos os Style Packs",
            "Teleprompter integrado",
            "Packs de estilo exclusivos"
        ]
    },
    {
        id: "enterprise",
        name: "Elite",
        price: "R$ 127",
        limit: "12 gerações",
        period: "por semana",
        icon: Crown,
        color: "text-orange-500",
        features: [
            "12 gerações por semana",
            "Ideal para criadores ativos",
            "Todos os recursos do Pro",
            "Maior limite de volume",
            "Foco em produtividade"
        ]
    }
];



export default function Checkout() {
    const [loadingPortal, setLoadingPortal] = useState(false);
    const { profile, refreshProfile } = useAuth();
    const { toast } = useToast();
    const [loadingTier, setLoadingTier] = useState<string | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const currentTier = profile?.subscription_status || 'free';

    useEffect(() => {
        const status = searchParams.get("status");
        if (status === "success") {
            toast({
                title: "Assinatura confirmada! 🎉",
                description: "Seu plano será atualizado em instantes assim que o Stripe processar o pagamento."
            });
            refreshProfile();
            setTimeout(refreshProfile, 3000);
            setSearchParams({}, { replace: true });
        } else if (status === "cancel") {
            toast({
                title: "Pagamento cancelado",
                description: "O processo de checkout foi interrompido.",
                variant: "destructive"
            });
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, toast, setSearchParams, refreshProfile]);

    async function handleManageSubscription() {
        if (!supabase) return;
        setLoadingPortal(true);
        try {
            const { data, error } = await supabase.functions.invoke("create-portal-link", {
                body: { return_url: window.location.href }
            });
            if (error) throw error;
            if (data?.url) window.location.href = data.url;
        } catch (err: any) {
            toast({ title: "Erro ao abrir portal", description: err.message, variant: "destructive" });
        } finally {
            setLoadingPortal(false);
        }
    }

    async function handleUpgrade(tierId: string) {
        if (!supabase) return;
        setLoadingTier(tierId);
        try {
            const { data, error } = await supabase.functions.invoke("create-checkout-session", {
                body: {
                    tier: tierId,
                    return_url: window.location.href
                }
            });
            if (error) throw error;
            if (data?.url) window.location.href = data.url;
        } catch (err: any) {
            toast({ title: "Erro ao iniciar checkout", description: err.message, variant: "destructive" });
        } finally {
            setLoadingTier(null);
        }
    }

    return (
        <div className="space-y-6 pb-12">
            <div className="text-center">
                <h2 className="text-2xl font-bold font-[Space_Grotesk]">Escolha seu nível</h2>
                <p className="text-sm text-muted-foreground mt-1">Gere mais conteúdo e domine seus Reels</p>
                {currentTier !== 'free' && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 border-primary text-primary hover:bg-primary/5"
                        onClick={handleManageSubscription}
                        disabled={loadingPortal}
                    >
                        {loadingPortal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                        Gerenciar Assinatura ou Faturas
                    </Button>
                )}
            </div>

            <div className="space-y-4">
                {PLANS.map((plan) => {
                    const tierOrder = ["basic", "pro", "enterprise"];
                    const currentTierIndex = tierOrder.indexOf(currentTier);
                    const planTierIndex = tierOrder.indexOf(plan.id);
                    const isCurrent = currentTier === plan.id;
                    const isUpgrade = planTierIndex > currentTierIndex;
                    const isDowngrade = currentTier !== 'free' && planTierIndex < currentTierIndex;
                    const Icon = plan.icon;

                    let buttonLabel = "Selecionar Plano";
                    if (isCurrent) buttonLabel = "Plano Ativo";
                    else if (isUpgrade) buttonLabel = currentTier === 'free' ? "Quero este!" : "Fazer Upgrade";
                    else if (isDowngrade) buttonLabel = "Fazer Downgrade";

                    return (
                        <Card key={plan.id} className={`relative overflow-hidden border-2 flex flex-col ${plan.recommended ? 'border-primary shadow-lg shadow-primary/10' : 'border-border'}`}>
                            {plan.recommended && (
                                <div className="absolute top-0 right-0 bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground rounded-bl-lg uppercase tracking-wider z-10">
                                    Mais Popular
                                </div>
                            )}
                            {isCurrent && (
                                <div className="absolute top-0 left-0 bg-green-500 px-3 py-1 text-[10px] font-bold text-white rounded-br-lg uppercase tracking-wider z-10">
                                    Plano Atual
                                </div>
                            )}
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                    <Icon className={`h-5 w-5 ${plan.color}`} />
                                    <CardTitle className="font-[Space_Grotesk]">{plan.name}</CardTitle>
                                </div>
                                <CardDescription className="text-xs">{plan.limit} {plan.period}</CardDescription>
                                <div className="mt-2 flex items-baseline gap-1">
                                    <span className="text-3xl font-bold font-[Space_Grotesk]">{plan.price}</span>
                                    <span className="text-muted-foreground text-[10px]">/mês</span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                                <ul className="space-y-2">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-2 text-[11px] leading-tight text-muted-foreground">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Button
                                    className={`w-full mt-4 h-10 ${plan.recommended ? 'gradient-primary border-0' : 'variant-outline'} font-bold transition-all hover:scale-[1.02] active:scale-[0.98]`}
                                    onClick={() => handleUpgrade(plan.id)}
                                    disabled={loadingTier !== null || isCurrent}
                                >
                                    {loadingTier === plan.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" /> : buttonLabel}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="text-center space-y-2">
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Pagamento seguro via Stripe. Cancele quando quiser.
                </p>
                {currentTier === 'free' && (
                    <p className="text-[10px] text-muted-foreground">
                        Você está no plano <b>Grátis</b> (1 geração/semana)
                    </p>
                )}
            </div>
        </div>
    );
}
