import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";

export default function Auth() {
  const { signIn, signUp, resetPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    if (!isReset && !password) return;

    setLoading(true);
    try {
      if (isReset) {
        await resetPassword(email);
        toast({ title: "E-mail enviado! 📧", description: "Verifique sua caixa de entrada para redefinir a senha." });
        setIsReset(false);
        setIsLogin(true);
      } else if (isLogin) {
        await signIn(email, password);
        toast({ title: "Login realizado! 🎉" });
        navigate("/app/generate");
      } else {
        await signUp(email, password);
        toast({ title: "Conta criada! ✅", description: "Verifique seu e-mail para confirmar a conta." });
        navigate("/app/onboarding");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      toast({
        title: "Erro na autenticação",
        description: err.message || "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm border-primary/20 bg-card/50 backdrop-blur-xl">
        <CardContent className="pt-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center group mb-2">
              <div className="h-20 w-20 transition-transform group-hover:scale-110">
                <img
                  src="/logo-agencia-solo.png"
                  alt="SoloReels"
                  className="h-full w-full object-contain filter drop-shadow-[0_0_20px_rgba(232,80,26,0.5)]"
                />
              </div>
            </div>
            <div className="flex flex-col items-center leading-tight">
              <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Agência Solo</span>
              <h1 className="text-4xl font-bold font-[Space_Grotesk] tracking-tight">
                <span className="text-gradient">Solo</span>Reels
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {isReset ? "Recupere o acesso à sua conta" : isLogin ? "Seja bem-vindo de volta" : "Crie sua conta e comece a brilhar"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">E-mail</label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background/50 border-primary/10 focus:border-primary/30 transition-all rounded-lg"
              />
            </div>

            {!isReset && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Senha</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                  className="bg-background/50 border-primary/10 focus:border-primary/30 transition-all rounded-lg"
                />
              </div>
            )}

            {isLogin && !isReset && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsReset(true)}
                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full gradient-primary border-0 h-10 rounded-lg font-bold shadow-lg shadow-primary/20">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {isReset ? "Enviar Link" : isLogin ? "Entrar na Conta" : "Criar minha Conta"}
            </Button>

            {isReset && (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs h-8 hover:bg-primary/5 rounded-lg"
                onClick={() => setIsReset(false)}
              >
                Voltar para o login
              </Button>
            )}
          </form>

          <div className="pt-4 border-t border-primary/5">
            <p className="text-center text-sm text-muted-foreground">
              {isLogin ? "Ainda não tem uma conta?" : "Já possui uma conta?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setIsReset(false);
                }}
                className="font-bold text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
              >
                {isLogin ? "Cadastre-se" : "Faça Login"}
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
