import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Loader2, User, Mail, ShieldCheck, Lock, Upload, Crown, Zap, Star, LogOut } from "lucide-react";

export default function Profile() {
    const { user, profile, refreshProfile, signOut } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [fullName, setFullName] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const currentTier = profile?.subscription_status || 'free';

    useEffect(() => {
        if (profile?.full_name) {
            setFullName(profile.full_name);
        }
    }, [profile]);

    async function handleUpdateProfile() {
        if (!user || !supabase) return;
        setLoading(true);

        try {
            const { error } = await supabase
                .from("profiles")
                .update({ full_name: fullName })
                .eq("id", user.id);

            if (error) throw error;
            await refreshProfile();
            toast({ title: "Perfil atualizado!", description: "Suas informações foram salvas com sucesso." });
        } catch (err: any) {
            console.error("Profile update error:", err);
            toast({
                title: "Erro ao atualizar",
                description: err.message || "Verifique sua conexão e tente novamente.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdatePassword() {
        if (!supabase) return;
        if (newPassword !== confirmPassword) {
            toast({ title: "Senhas não conferem", variant: "destructive" });
            return;
        }
        if (newPassword.length < 6) {
            toast({ title: "Senha muito curta", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
            return;
        }
        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            toast({ title: "Senha atualizada!", description: "Sua nova senha já está valendo." });
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            console.error("Password update error:", err);
            toast({
                title: "Erro ao atualizar senha",
                description: err.message || "Erro inesperado. Tente uma senha mais forte.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }

    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length === 0 || !user || !supabase) return;
        setUploading(true);

        try {
            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/avatar.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('brand-assets')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('brand-assets')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            await refreshProfile();
            toast({ title: "Foto atualizada!", description: "Sua nova foto já aparece no perfil." });
        } catch (err: any) {
            toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-xl group-hover:opacity-80 transition-opacity">
                            <AvatarImage src={profile?.avatar_url} />
                            <AvatarFallback className="bg-primary/5">
                                <User className="h-10 w-10 text-primary/50" />
                            </AvatarFallback>
                        </Avatar>
                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                            {uploading ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <Upload className="h-6 w-6 text-white" />}
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                        </label>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold font-[Space_Grotesk]">{profile?.full_name || "Seu Nome"}</h1>
                        <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
                            <Mail className="h-4 w-4" /> {user?.email}
                        </p>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2 border border-border/50"
                    onClick={async () => {
                        await signOut();
                        window.location.href = "/auth";
                    }}
                >
                    <LogOut className="h-4 w-4" />
                    Sair da Conta
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-8">
                    {/* Dados Pessoais */}
                    <Card className="border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                Dados Pessoais
                            </CardTitle>
                            <CardDescription>Atualize seu nome e informações básicas</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Nome Completo</Label>
                                <Input
                                    id="fullName"
                                    placeholder="Seu nome"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>
                            <Button
                                className="w-full gradient-primary"
                                onClick={handleUpdateProfile}
                                disabled={loading}
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Alterações
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Segurança */}
                    <Card className="border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="h-5 w-5 text-primary" />
                                Segurança
                            </CardTitle>
                            <CardDescription>Mude sua senha de acesso</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">Nova Senha</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                            <Button
                                variant="outline"
                                className="w-full border-primary/20 hover:bg-primary/5"
                                onClick={handleUpdatePassword}
                                disabled={loading || !newPassword}
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Atualizar Senha
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                    {/* Assinatura Atual */}
                    <Card className="border-border bg-primary/5 overflow-hidden">
                        <div className={`h-1.5 w-full ${currentTier !== 'free' ? 'gradient-primary' : 'bg-muted'}`} />
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                Sua Assinatura
                            </CardTitle>
                            <CardDescription>Status atual da sua conta</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Perfil</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {currentTier === 'free' ? <Star className="h-5 w-5 text-muted-foreground" /> : currentTier === 'pro' ? <Zap className="h-5 w-5 text-primary" /> : <Crown className="h-5 w-5 text-orange-500" />}
                                        <h3 className="text-xl font-bold capitalize">{currentTier === 'enterprise' ? 'Elite' : currentTier}</h3>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Status</p>
                                    <p className="text-sm font-bold text-green-500 mt-1">Ativo</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Button
                                    className="w-full gradient-primary"
                                    onClick={() => window.location.href = "/app/checkout"}
                                >
                                    {currentTier === 'free' ? "Ver Planos Premium" : "Fazer Upgrade de Plano"}
                                </Button>
                                {currentTier !== 'free' && (
                                    <Button
                                        variant="ghost"
                                        className="w-full text-xs text-muted-foreground"
                                        onClick={async () => {
                                            if (!supabase) return;
                                            const { data } = await supabase.functions.invoke("create-portal-link", {
                                                body: { return_url: window.location.href }
                                            });
                                            if (data?.url) window.location.href = data.url;
                                        }}
                                    >
                                        Gerenciar faturas ou cancelar
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Dica */}
                    <div className="p-6 rounded-2xl bg-orange-500/5 border border-orange-500/10 space-y-3">
                        <h4 className="text-sm font-bold text-orange-500 flex items-center gap-2">
                            <Zap className="h-4 w-4" /> Dica SoloReels
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Mantenha seu perfil atualizado para que os roteiros gerados pela IA
                            possam ser cada vez mais precisos e alinhados com sua autoridade.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
