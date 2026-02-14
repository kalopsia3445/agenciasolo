import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Zap, Palette, Video, CheckCircle } from "lucide-react";
import { NICHES } from "@/data/niches";
import { useAuth } from "@/contexts/AuthContext";

const benefits = [
  { icon: Sparkles, title: "Roteiros com IA", desc: "3 variações por geração, prontos para gravar" },
  { icon: Video, title: "Teleprompter", desc: "Leia o roteiro enquanto grava, com espelhamento" },
  { icon: Palette, title: "12 Packs de Estilo", desc: "Do humor leve à autoridade, escolha seu tom" },
  { icon: Zap, title: "Kit da Marca", desc: "Configure uma vez, gere conteúdo consistente" },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user, isDemoMode } = useAuth();

  function handleStart() {
    if (isDemoMode || user) {
      navigate("/app/generate");
    } else {
      navigate("/auth");
    }
  }

  return (
    <div className="min-h-screen">
      <section className="gradient-hero px-4 pb-16 pt-20 text-center text-white">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mx-auto max-w-lg">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm">
            <Sparkles className="h-4 w-4 text-primary" /> Para MEI solo
          </div>
          <h1 className="mb-4 text-4xl font-bold leading-tight font-[Space_Grotesk] md:text-5xl">
            Seus <span className="text-gradient">Reels</span> prontos<br />em 30 segundos
          </h1>
          <p className="mb-8 text-lg text-white/70">Roteiros, legendas e CTAs gerados por IA no estilo da sua marca. É só gravar.</p>
          <Button size="lg" className="gradient-primary border-0 px-8 text-base font-semibold shadow-lg" onClick={handleStart}>
            Começar grátis
          </Button>
          <p className="mt-3 text-xs text-white/50">3 gerações grátis por dia • Sem cartão</p>
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
          <h2 className="mb-4 text-2xl font-bold font-[Space_Grotesk]">Pronto para criar conteúdo?</h2>
          <div className="mb-6 space-y-2">
            {["3 gerações grátis por dia", "Teleprompter integrado", "12 estilos profissionais"].map((t) => (
              <div key={t} className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-primary" /> {t}
              </div>
            ))}
          </div>
          <Button size="lg" className="gradient-primary border-0 px-8 text-base font-semibold" onClick={handleStart}>
            Começar agora
          </Button>
        </div>
      </section>
    </div>
  );
}
