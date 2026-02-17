import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock } from "lucide-react";

export default function ResetPassword() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        // Verificar se chegamos aqui via link de recuperação
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event !== "PASSWORD_RECOVERY") {
                // Se não for recuperação, redireciona pro login (opcional, pode ser rígido)
                // navigate("/auth");
            }
        });
        return () => subscription.unsubscribe();
    }, [navigate]);

    async function handleReset(e: React.FormEvent) {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast({ title: "Senhas não conferem", variant: "destructive" });
            return;
        }
        if (password.length < 6) {
            toast({ title: "Senha muito curta", description: "Mínimo de 6 caracteres.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            toast({ title: "Senha redefinida! 🚀", description: "Agora você já pode entrar com sua nova senha." });
            navigate("/auth");
        } catch (err: any) {
            toast({ title: "Erro ao redefinir", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold font-[Space_Grotesk]">Nova Senha</CardTitle>
                    <CardDescription>Defina sua nova senha de acesso</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleReset} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nova Senha</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Confirmar Senha</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" disabled={loading} className="w-full gradient-primary border-0">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                            Salvar Nova Senha
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
