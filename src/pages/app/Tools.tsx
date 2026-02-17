import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Instagram, TrendingUp, Sparkles, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Tools() {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const isEnterprise = profile?.subscription_status === "enterprise";

    const tools = [
        {
            id: "instagram-analysis",
            title: "Análise do seu Instagram",
            description: "Análise completa do seu perfil, posts e tendências de mercado para otimizar seu branding.",
            icon: Instagram,
            color: "text-pink-500",
            isPremium: true,
            path: "/app/tools/instagram-analysis"
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold font-[Space_Grotesk]">Ferramentas</h2>
                <p className="text-sm text-muted-foreground">Utilitários inteligentes para potencializar seus resultados.</p>
            </div>

            <div className="grid gap-4">
                {tools.map((tool) => (
                    <Card key={tool.id} className="relative overflow-hidden border-2 border-border hover:border-primary/50 transition-colors">
                        {tool.isPremium && !isEnterprise && (
                            <div className="absolute top-0 right-0 bg-primary/20 px-3 py-1 text-[10px] font-bold text-primary rounded-bl-lg uppercase tracking-wider z-10 flex items-center gap-1">
                                <Lock className="h-3 w-3" /> Plano Elite
                            </div>
                        )}
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-muted ${tool.color}`}>
                                    <tool.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-[Space_Grotesk]">{tool.title}</CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <CardDescription className="text-sm leading-relaxed">
                                {tool.description}
                            </CardDescription>

                            <Button
                                onClick={() => navigate(tool.path)}
                                disabled={tool.isPremium && !isEnterprise}
                                className={`w-full ${tool.isPremium && !isEnterprise ? 'bg-muted' : 'gradient-primary border-0'}`}
                            >
                                {tool.isPremium && !isEnterprise ? 'Bloqueado (Requer Elite)' : 'Acessar Ferramenta'}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
