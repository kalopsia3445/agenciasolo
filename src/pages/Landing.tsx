import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Zap, Image, TrendingUp, BarChart3, CheckCircle, LogIn, LogOut, User } from "lucide-react";
import { NICHES } from "@/data/niches";
import { useAuth } from "@/contexts/AuthContext";

const benefits = [
  { icon: BarChart3, title: "Análise de Perfil", desc: "IA conecta no seu Instagram e diz exatamente o que postar." },
  { icon: TrendingUp, title: "Notícias em Tempo Real", desc: "Monitore tendências do seu nicho via Google/Tavily." },
  { icon: Image, title: "Imagens Hiper-Realistas", desc: "Crie visuais de estúdio sem câmeras, com consistência." },
  { icon: Sparkles, title: "Roteiros Validamos", desc: "Hooks e CTAs de alta conversão baseados em dados." },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user, isDemoMode, signOut } = useAuth();

  function handleStart() {
    if (isDemoMode || user) {
      navigate("/app/generate");
    } else {
      navigate("/auth");
    }
  }

  async function handleLogout() {
    await signOut();
  }

  return (
    <div className="min-h-screen">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <button onClick={() => navigate("/")} className="flex items-center gap-4 transition-transform hover:scale-105 group">
            <div className="h-16 w-16 flex-shrink-0">
              <img
                src="/logo-agencia-solo.png"
                alt="Agência Solo"
                className="h-full w-full object-contain filter drop-shadow-[0_0_15px_rgba(232,80,26,0.5)]"
              />
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-[12px] uppercase tracking-[0.3em] text-primary font-black mb-1">Agência Solo</span>
              <div className="text-3xl font-bold font-[Space_Grotesk]">
                <span className="text-gradient">Solo</span>Reels
              </div>
            </div>
          </button>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/app/generate")} className="text-xs">
                  <User className="mr-1 h-3.5 w-3.5" /> App
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs text-muted-foreground">
                  <LogOut className="mr-1 h-3.5 w-3.5" /> Sair
                </Button>
              </>
            ) : isDemoMode ? (
              <Button variant="ghost" size="sm" onClick={() => navigate("/app/generate")} className="text-xs">
                <Sparkles className="mr-1 h-3.5 w-3.5" /> Demo
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-xs">
                <LogIn className="mr-1 h-3.5 w-3.5" /> Entrar
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="gradient-hero px-4 pb-16 pt-28 text-center text-white">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mx-auto max-w-lg">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-5 text-sm uppercase tracking-widest font-bold backdrop-blur-md">
            <div className="h-10 w-10 rounded-full bg-white/10 p-1.5">
              <img src="/logo-agencia-solo.png" alt="Solo" className="h-full w-full object-contain" />
            </div>
            <span className="text-white/90">agência solo</span>
          </div>
          <h1 className="mb-4 text-4xl font-bold leading-tight font-[Space_Grotesk] md:text-5xl">
            Domine o Instagram com <span className="text-gradient">Inteligência Real</span>
          </h1>
          <p className="mb-8 text-lg text-white/70">
            De análise profunda do seu perfil a roteiros virais e imagens de estúdio.
            <br className="hidden md:block" />
            Tudo automático, tudo conectado.
          </p>
          <Button size="lg" className="gradient-primary border-0 px-8 text-base font-semibold shadow-lg" onClick={handleStart}>
            {user ? "Ir para o App" : "Começar grátis"}
          </Button>
          <p className="mt-3 text-xs text-white/50">1 geração grátis por semana • Sem cartão</p>
        </motion.div>
      </section>

      <section className="bg-background px-4 py-16">
        <div className="mx-auto max-w-lg">
          <h2 className="mb-8 text-center text-2xl font-bold font-[Space_Grotesk]">Tudo que você precisa</h2>
          <div className="grid grid-cols-2 gap-4">
            {benefits.map((b, i) => (
              <motion.div key={b.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="rounded-xl border bg-card p-4">
                <b.icon className="mb-2 h-6 w-6 text-primary" />
                <h3 className="mb-1 text-sm font-semibold">{b.title}</h3>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/50 px-4 py-16">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="mb-6 text-2xl font-bold font-[Space_Grotesk]">Funciona para o seu nicho</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {NICHES.map((n) => (
              <span key={n.id} className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-sm">{n.emoji} {n.label}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background px-4 py-16 text-center">
        <div className="mx-auto max-w-lg">
          <h2 className="mb-4 text-2xl font-bold font-[Space_Grotesk]">Pronto para profissionalizar?</h2>
          <div className="mb-6 space-y-2">
            {["Análise de Conta em Tempo Real", "Geração de Imagens Ilimitada", "Roteiros com Estratégia Viral"].map((t) => (
              <div key={t} className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-primary" /> {t}
              </div>
            ))}
          </div>
          <Button size="lg" className="gradient-primary border-0 px-8 text-base font-semibold" onClick={handleStart}>
            {user ? "Ir para o App" : "Começar agora"}
          </Button>
        </div>
      </section>
    </div>
  );
}
