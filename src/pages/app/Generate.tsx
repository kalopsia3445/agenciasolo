import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { generateFormSchema, type GenerateFormData, type SavedScript, FORMATS, OBJECTIVES, DAILY_LIMIT } from "@/types/schema";
import { OFFICIAL_PACKS } from "@/data/style-packs";
import { getBrandKit, getCustomPacks, canGenerate, incrementUsage, saveScript, getDailyUsage, toggleFavorite, getFavoriteIds } from "@/lib/demo-store";
import { generateWithGroq } from "@/lib/groq";
import { useNavigate } from "react-router-dom";
import { Sparkles, Copy, Heart, Video, Loader2 } from "lucide-react";

export default function Generate() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SavedScript | null>(null);
  const [favIds, setFavIds] = useState<Set<string>>(getFavoriteIds());
  const [groqKey, setGroqKey] = useState(() => localStorage.getItem("soloreels_groq_key") || import.meta.env.VITE_GROQ_API_KEY || "");

  const brandKit = getBrandKit();
  const allPacks = [...OFFICIAL_PACKS, ...getCustomPacks()];

  const form = useForm<GenerateFormData>({
    resolver: zodResolver(generateFormSchema),
    defaultValues: { format: "reels", objective: "", inputSummary: "", stylePackId: "" },
  });

  async function onSubmit(data: GenerateFormData) {
    if (!brandKit) {
      toast({ title: "Configure seu Kit da Marca primeiro", variant: "destructive" });
      navigate("/app/onboarding");
      return;
    }
    if (!canGenerate()) {
      toast({ title: `Limite diário atingido (${DAILY_LIMIT}/dia)`, description: "Volte amanhã!", variant: "destructive" });
      return;
    }

    const apiKey = groqKey;
    if (!apiKey) {
      toast({ title: "Chave Groq não configurada", description: "Cole sua API key no campo abaixo do formulário.", variant: "destructive" });
      return;
    }

    const pack = allPacks.find((p) => p.id === data.stylePackId);
    if (!pack) return;

    setLoading(true);
    try {
      const aiResponse = await generateWithGroq(brandKit, pack, data, apiKey);
      const script: SavedScript = {
        id: crypto.randomUUID(),
        stylePackId: data.stylePackId,
        niche: brandKit.niche,
        platform: "instagram",
        format: data.format,
        objective: data.objective,
        inputSummary: data.inputSummary,
        resultJson: aiResponse,
        createdAt: new Date().toISOString(),
      };
      saveScript(script);
      incrementUsage();
      setResult(script);
      toast({ title: "Roteiro gerado com sucesso! 🎉" });
    } catch (err: any) {
      toast({ title: "Erro ao gerar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado! 📋" });
  }

  function handleFav(scriptId: string) {
    const isFav = toggleFavorite(scriptId);
    setFavIds(getFavoriteIds());
    toast({ title: isFav ? "Adicionado aos favoritos ⭐" : "Removido dos favoritos" });
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-[Space_Grotesk]">3 Variações</h2>
          <Button variant="outline" size="sm" onClick={() => setResult(null)}>Nova geração</Button>
        </div>
        {result.resultJson.variants.map((v, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold">{v.title}</h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleFav(result.id)}>
                      <Heart className={`h-4 w-4 ${favIds.has(result.id) ? "fill-primary text-primary" : ""}`} />
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">🎣 Gancho</p>
                  <p className="text-sm font-medium">{v.hook}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">📝 Roteiro</p>
                  <p className="whitespace-pre-wrap text-sm">{v.script}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Legenda curta</p>
                    <p className="text-xs">{v.captionShort}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">CTA</p>
                    <p className="text-xs font-medium">{v.cta}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Legenda longa</p>
                  <p className="whitespace-pre-wrap text-xs">{v.captionLong}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">🎬 Shot List</p>
                  <ul className="space-y-1">
                    {v.shotList.map((s, j) => (
                      <li key={j} className="text-xs">• {s}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-1">
                  {v.hashtags.map((h) => (
                    <span key={h} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{h}</span>
                  ))}
                </div>
                {v.disclaimer && (
                  <p className="text-xs text-muted-foreground italic">⚠️ {v.disclaimer}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleCopy(`${v.hook}\n\n${v.script}\n\n${v.captionLong}\n\n${v.hashtags.join(" ")}`)}>
                    <Copy className="mr-1 h-3 w-3" /> Copiar tudo
                  </Button>
                  <Button size="sm" className="flex-1 gradient-primary border-0" onClick={() => navigate(`/app/teleprompter/${result.id}?variant=${i}`)}>
                    <Video className="mr-1 h-3 w-3" /> Teleprompter
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-[Space_Grotesk]">Gerar Roteiro</h2>
        <p className="text-sm text-muted-foreground">Preencha os dados e a IA cria 3 variações.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="format" render={({ field }) => (
            <FormItem>
              <FormLabel>Formato</FormLabel>
              <div className="grid grid-cols-3 gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => field.onChange(f.value)}
                    className={`rounded-xl border p-3 text-center transition-all ${
                      field.value === f.value ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "bg-card"
                    }`}
                  >
                    <span className="text-xl">{f.icon}</span>
                    <p className="mt-1 text-xs font-medium">{f.label}</p>
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="objective" render={({ field }) => (
            <FormItem>
              <FormLabel>Objetivo</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione o objetivo" /></SelectTrigger></FormControl>
                <SelectContent>
                  {OBJECTIVES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="stylePackId" render={({ field }) => (
            <FormItem>
              <FormLabel>Pack de Estilo</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione o estilo" /></SelectTrigger></FormControl>
                <SelectContent>
                  {allPacks.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}{p.isOfficial ? "" : " (custom)"}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="inputSummary" render={({ field }) => (
            <FormItem>
              <FormLabel>Sobre o que é o conteúdo?</FormLabel>
              <FormControl><Textarea {...field} placeholder="Ex: Dicas de skincare para pele oleosa no verão" rows={3} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <Button type="submit" disabled={loading} className="w-full gradient-primary border-0 text-base font-semibold">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</> : <><Sparkles className="mr-2 h-4 w-4" /> Gerar 3 variações</>}
          </Button>
        </form>
      </Form>

      {!import.meta.env.VITE_GROQ_API_KEY && (
        <div className="space-y-2 rounded-xl border border-dashed border-muted-foreground/30 p-4">
          <label className="text-xs font-medium text-muted-foreground">🔑 Chave API do Groq (Demo Mode)</label>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="gsk_..."
              value={groqKey}
              onChange={(e) => {
                setGroqKey(e.target.value);
                localStorage.setItem("soloreels_groq_key", e.target.value);
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Pegue sua chave em <a href="https://console.groq.com/keys" target="_blank" rel="noopener" className="underline text-primary">console.groq.com/keys</a></p>
        </div>
      )}
    </div>
  );
}
