import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Instagram, Search, TrendingUp, Sparkles, CheckCircle2, ArrowRight, Loader2, RefreshCw, Save, Lock as LockIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getBrandKit, saveBrandKit } from "@/lib/data-service";
import { analyzeMarketWithGroq, fetchInstagramProfile } from "@/lib/groq";
import { useNavigate } from "react-router-dom";

const formSchema = z.object({
    handle: z.string().min(2, "Insira um @ de Instagram válido"),
});

type AnalysisResult = {
    niche: string;
    visualStyle: string;
    targetAudience: string;
    trends: string[];
    suggestions: string[];
    tone: string;
};

export default function InstagramAnalysis() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [profilePreview, setProfilePreview] = useState<{ name: string; bio: string; avatarUrl: string } | null>(null);

    const isEnterprise = profile?.subscription_status === "enterprise";

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { handle: "" },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!isEnterprise) {
            toast({ title: "Acesso Negado", description: "Esta ferramenta é exclusiva para o plano Elite.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            setStatus("Buscando informações do perfil...");
            const apiKey = localStorage.getItem("soloreels_groq_key") || import.meta.env.VITE_GROQ_API_KEY;
            if (!apiKey) throw new Error("Chave Groq não configurada");

            const preview = await fetchInstagramProfile(values.handle, apiKey);
            setProfilePreview(preview);
        } catch (error: any) {
            toast({ title: "Erro ao buscar perfil", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
            setStatus("");
        }
    }

    async function startFullAnalysis() {
        if (!isEnterprise || !profilePreview) return;

        setLoading(true);
        setResult(null);

        try {
            setStatus("Iniciando análise profunda...");

            const brandKit = await getBrandKit();
            const apiKey = localStorage.getItem("soloreels_groq_key") || import.meta.env.VITE_GROQ_API_KEY;

            if (!apiKey) throw new Error("Chave API do Groq não configurada.");

            setStatus("Analizando posts e engajamento...");
            await new Promise(r => setTimeout(r, 1500));

            setStatus("Pesquisando tendências de mercado...");
            const analysisResult = await analyzeMarketWithGroq(form.getValues().handle, brandKit, apiKey);

            setResult(analysisResult);
            toast({ title: "Análise concluída!", description: "Seu relatório de mercado está pronto." });
        } catch (error: any) {
            toast({ title: "Erro na análise", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
            setStatus("");
        }
    }

    async function syncBrandKit() {
        if (!result) return;

        try {
            const current = await getBrandKit();
            if (!current) return;

            const updated = {
                ...current,
                visualStyleDescription: `${current.visualStyleDescription}\n\n[Atualização IA]: ${result.visualStyle}`,
                toneAdjectives: [...new Set([...current.toneAdjectives, result.tone])],
                targetAudience: result.targetAudience
            };

            await saveBrandKit(updated);
            toast({ title: "Sincronizado!", description: "Seu Brand Kit foi atualizado com as novas tendências." });
            navigate("/app/brand-kit");
        } catch (error: any) {
            toast({ title: "Erro ao sincronizar", description: error.message, variant: "destructive" });
        }
    }

    if (!isEnterprise) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <LockIcon className="h-10 w-10 text-primary" />
                </div>
                <div className="max-w-xs space-y-2">
                    <h2 className="text-2xl font-bold font-[Space_Grotesk]">Recurso Elite</h2>
                    <p className="text-sm text-muted-foreground">A análise avançada de Instagram e mercado está disponível apenas para assinantes Elite.</p>
                </div>
                <Button onClick={() => navigate("/app/checkout")} className="gradient-primary border-0">
                    Ver Planos Elite
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate("/app/tools")}>
                    <ArrowRight className="h-5 w-5 rotate-180" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold font-[Space_Grotesk]">Análise do seu Instagram</h2>
                    <p className="text-sm text-muted-foreground">Mergulhe nas tendências e otimize sua presença.</p>
                </div>
            </div>

            {!result && !profilePreview && (
                <Card>
                    <CardContent className="pt-6 space-y-4">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="handle"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>@ do Perfil para Analisar</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Instagram className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                    <Input placeholder="ex: agenciasolo" className="pl-9" {...field} disabled={loading} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full gradient-primary border-0" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {status}
                                        </>
                                    ) : (
                                        <>
                                            <Search className="mr-2 h-4 w-4" />
                                            Encontrar Perfil
                                        </>
                                    )}
                                </Button>
                            </form>
                        </Form>
                        <p className="text-[10px] text-center text-muted-foreground italic">
                            Esta análise utiliza Groq para pesquisar tendências de mercado em tempo real.
                        </p>
                    </CardContent>
                </Card>
            )}

            {profilePreview && !result && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                    <Card className="border-primary/50 bg-primary/5 overflow-hidden">
                        <CardHeader className="pb-2">
                            <div className="flex items-start gap-4">
                                <div className="h-16 w-16 rounded-full border-2 border-primary overflow-hidden bg-muted flex-shrink-0">
                                    <img src={profilePreview.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                                </div>
                                <div className="space-y-1 mt-1">
                                    <h3 className="text-lg font-bold font-[Space_Grotesk] leading-none">{profilePreview.name}</h3>
                                    <p className="text-sm text-primary font-medium">@{form.getValues().handle}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-2">{profilePreview.bio}</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1 h-10 text-xs" onClick={() => setProfilePreview(null)} disabled={loading}>
                                    Alterar @
                                </Button>
                                <Button className="flex-[2] h-10 gradient-primary border-0 font-bold" onClick={startFullAnalysis} disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {status}
                                        </>
                                    ) : (
                                        <>
                                            <TrendingUp className="mr-2 h-4 w-4" />
                                            Iniciar Diagnóstico
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6 pb-12"
                    >
                        <Card className="border-primary/30 bg-primary/5">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <Badge className="bg-primary text-white">Relatório Elite</Badge>
                                    <Button variant="outline" size="sm" onClick={() => { setResult(null); setProfilePreview(null); }}>
                                        <RefreshCw className="h-3 w-3 mr-1" /> Nova Análise
                                    </Button>
                                </div>
                                <CardTitle className="text-xl font-[Space_Grotesk] mt-2">Diagnóstico de Branding</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-primary uppercase">Estilo Visual Sugerido</p>
                                        <p className="text-sm font-medium">{result.visualStyle}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-primary uppercase">Tom de Voz</p>
                                        <p className="text-sm font-medium">{result.tone}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-primary" />
                                        <h4 className="text-sm font-bold uppercase tracking-wider">Tendências de Mercado (Nicho)</h4>
                                    </div>
                                    <div className="space-y-2">
                                        {result.trends.map((trend, i) => (
                                            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-card border border-border">
                                                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                                <p className="text-xs">{trend}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-primary" />
                                        <h4 className="text-sm font-bold uppercase tracking-wider">Sugestões Estratégicas</h4>
                                    </div>
                                    <ul className="list-disc list-inside space-y-1">
                                        {result.suggestions.map((s, i) => (
                                            <li key={i} className="text-xs text-muted-foreground">{s}</li>
                                        ))}
                                    </ul>
                                </div>

                                <Button className="w-full gradient-primary border-0" onClick={syncBrandKit}>
                                    <Save className="mr-2 h-4 w-4" />
                                    Sincronizar com meu Brand Kit
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${className}`}>
            {children}
        </span>
    );
}
