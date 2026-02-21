import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { generateFormSchema, type GenerateFormData, type SavedScript, type BrandKit, type StylePack, FORMATS, OBJECTIVES, WEEKLY_LIMITS, type SubscriptionTier } from "@/types/schema";
import { OFFICIAL_PACKS } from "@/data/style-packs";
import { getBrandKit, getCustomPacks, canGenerate, incrementUsage, saveScript, getFavoriteIds, toggleFavorite } from "@/lib/data-service";
import { generateWithGroq, generateDeepContent } from "@/lib/groq";
import { buildImagePrompt, generateImage, regenerateImage, downloadImage, generateImagePipeline } from "@/lib/image-gen";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Sparkles, Copy, Star, Video, Loader2, ImageIcon, Download, RefreshCw, FileText, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

export default function Generate() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SavedScript | null>(null);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [customPacks, setCustomPacks] = useState<StylePack[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const { isDemoMode, profile, isAdmin, isDemo } = useAuth();
  const envGroqKey = import.meta.env.VITE_GROQ_API_KEY || "";
  const envGeminiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  const [groqKey, setGroqKey] = useState(() => envGroqKey || localStorage.getItem("soloreels_groq_key") || "");
  const [geminiKey, setGeminiKey] = useState(() => envGeminiKey || localStorage.getItem("soloreels_gemini_key") || "");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState<boolean[]>([]);
  const [imageErrors, setImageErrors] = useState<boolean[]>([]);
  const [imageProgress, setImageProgress] = useState<number[]>([0, 0, 0]);
  const [carouselImageIdx, setCarouselImageIdx] = useState(0);
  const [deepLoading, setDeepLoading] = useState<number | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [dialogOpen, setDialogOpen] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([getBrandKit(), getCustomPacks(), getFavoriteIds()]).then(([bk, cp, fi]) => {
      setBrandKit(bk);
      setCustomPacks(cp);
      setFavIds(fi);
      setDataLoading(false);
    });
  }, []);

  // Removido simulation effect - progresso agora vem direto da API de imagem

  const allPacks = [...OFFICIAL_PACKS, ...customPacks];

  const form = useForm<GenerateFormData>({
    resolver: zodResolver(generateFormSchema),
    defaultValues: { format: "carousel", objective: "", inputSummary: "", stylePackId: "" },
  });

  function handleImageLoad(idx: number) {
    setImageProgress((prev) => {
      const next = [...prev];
      next[idx] = 100;
      return next;
    });
    setImagesLoading((prev) => {
      const next = [...prev];
      next[idx] = false;
      return next;
    });
  }

  function handleImageError(idx: number, url?: string) {
    const now = new Date().toLocaleTimeString();
    console.error(`DEBUG [${now}] [Generate.tsx]: Erro ao carregar imagem index ${idx}.`);
    console.log(`DEBUG [${now}] [Generate.tsx]: URL que falhou:`, url);

    setImagesLoading((prev) => {
      const next = [...prev];
      next[idx] = false;
      return next;
    });
    setImageErrors((prev) => {
      const next = [...prev];
      next[idx] = true;
      return next;
    });
  }

  async function handleRegenImage(idx: number) {
    if (!result || !brandKit) return;
    const isCarousel = result.format === "carousel";
    const v = result.resultJson.variants[0]; // Carousel sempre usa a primeira variação

    // Para stories, pega o prompt da variação específica
    const prompt = isCarousel
      ? (v.imagePrompts?.[idx] || v.imagePrompt || "")
      : (result.resultJson.variants[idx]?.imagePrompt || "");

    if (!prompt) return;

    setImagesLoading((prev) => { const next = [...prev]; next[idx] = true; return next; });
    setImageErrors((prev) => { const next = [...prev]; next[idx] = false; return next; });
    setImageProgress((prev) => { const next = [...prev]; next[idx] = 0; return next; });

    try {
      const newUrl = await regenerateImage(prompt, geminiKey);
      const updatedResult = { ...result };

      if (isCarousel) {
        const newUrls = [...(updatedResult.resultJson.variants[0].imageUrls || [])];
        newUrls[idx] = newUrl;
        updatedResult.resultJson.variants[0].imageUrls = newUrls;
      } else {
        updatedResult.resultJson = {
          ...updatedResult.resultJson,
          variants: updatedResult.resultJson.variants.map((variant, i) =>
            i === idx ? { ...variant, imageUrl: newUrl } : variant
          ),
        };
      }

      setResult(updatedResult);
      setImageUrls((prev) => { const next = [...prev]; next[idx] = newUrl; return next; });
      await saveScript(updatedResult);
    } catch (err: any) {
      console.error("Regen image failed:", err);
      setImagesLoading((prev) => { const next = [...prev]; next[idx] = false; return next; });
      setImageErrors((prev) => { const next = [...prev]; next[idx] = true; return next; });
    }
  }

  async function onSubmit(data: GenerateFormData) {
    if (!brandKit) {
      toast({ title: "Configure seu Kit da Marca primeiro", variant: "destructive" });
      navigate("/app/onboarding");
      return;
    }
    const tier = (profile?.subscription_status || 'free') as SubscriptionTier;
    const limit = WEEKLY_LIMITS[tier] || WEEKLY_LIMITS.free;

    const allowed = await canGenerate();
    if (!allowed) {
      toast({
        title: `Limite semanal atingido (${limit}/semana)`,
        description: "Assine um plano superior para mais gerações!",
        variant: "destructive",
        action: <Button variant="outline" size="sm" onClick={() => navigate("/app/checkout")}>Ver Planos</Button>
      });
      return;
    }

    const apiKey = groqKey;
    if (!apiKey) {
      toast({ title: "Chave Groq não configurada", description: "Configure VITE_GROQ_API_KEY no .env.local ou cole no campo abaixo.", variant: "destructive" });
      return;
    }

    const pack = allPacks.find((p) => p.id === data.stylePackId);
    if (!pack) return;

    setLoading(true);
    try {
      const aiResponse = await generateWithGroq(brandKit, pack, data, apiKey);

      // Garantir que cada variação tenha um imagePrompt personalizado
      aiResponse.variants.forEach((v) => {
        const base = v.imagePrompt || v.hook;
        v.imagePrompt = buildImagePrompt({
          hook: v.hook,
          inputSummary: data.inputSummary,
          niche: brandKit.niche,
          format: data.format,
          objective: data.objective,
          businessName: brandKit.businessName,
          visualStyle: brandKit.visualStyleDescription,
          targetAudience: brandKit.targetAudience,
          colorPalette: brandKit.colorPalette,
          toneAdjectives: brandKit.toneAdjectives,
          visualSubject: data.visualSubject,
          customVisualPrompt: data.customVisualPrompt,
        }, base);
      });

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

      await saveScript(script);
      await incrementUsage();

      // Iniciar estados de carregamento de imagem
      if (data.format === "reels") {
        setImagesLoading([false, false, false]);
        setImageErrors([false, false, false]);
      } else if (data.format === "carousel") {
        setImagesLoading([true, true, true]);
        setImageErrors([false, false, false]);
        setImageProgress([0, 0, 0]);
      } else {
        setImagesLoading([true, true, true]);
        setImageErrors([false, false, false]);
        setImageProgress([0, 0, 0]);
      }

      setImageUrls([]);
      setResult(script);
      toast({ title: data.format === "reels" ? "Roteiro gerado! ✨" : "Roteiro gerado! Gerando imagens... 🎨" });
      setLoading(false);

      // Gerar imagens em série com delay para evitar Rate Limit (429) ou REUSAR FUNDO se for texto
      if (geminiKey && data.format !== "reels") {
        const updatedScript = { ...script };
        updatedScript.resultJson = { ...updatedScript.resultJson, variants: [...updatedScript.resultJson.variants] };

        let baseBlob: Blob | undefined = undefined;

        if (data.format === "carousel") {
          // Processamento para Carrossel (1 variant, 3 images)
          const variant = updatedScript.resultJson.variants[0];
          const prompts = variant.imagePrompts || [variant.imagePrompt || ""];
          const urls: string[] = [];
          const errors: boolean[] = [];

          for (let i = 0; i < 3; i++) {
            try {
              if (i > 0) await new Promise(r => setTimeout(r, 2000));
              const prompt = prompts[i] || prompts[0];

              // Se for texto, tentamos reusar o fundo da primeira geração
              const isTexto = data.visualSubject === "texto";

              // Helper para pegar o blob se estivermos em 'texto' e for a primeira vez
              const genOpts: any = {
                hook: variant.hook,
                inputSummary: data.inputSummary,
                niche: brandKit.niche,
                format: data.format,
                objective: data.objective,
                businessName: brandKit.businessName,
                visualStyle: brandKit.visualStyleDescription,
                targetAudience: brandKit.targetAudience,
                colorPalette: brandKit.colorPalette,
                toneAdjectives: brandKit.toneAdjectives,
                visualSubject: data.visualSubject,
                customVisualPrompt: data.customVisualPrompt,
                onProgress: (idx: number, p: number) => setImageProgress(prev => { const n = [...prev]; n[i] = p; return n; }),
                overlayDesign: variant.overlayDesigns?.[i] || variant.overlayDesign,
                fontFamily: data.fontFamily || (aiResponse.suggestedFonts as any)?.display,
                baseBlob: (i > 0 && isTexto) ? baseBlob : undefined
              };

              const newImageUrl = await generateImage(prompt, undefined, genOpts, i);

              // Se for a primeira imagem e for texto, vamos baixar esse fundo para as próximas se o Nebius gerou um
              // NOTE: generateImage retorna URL. Para reusar o BLOB sem baixar de novo, precisariamos que ela retornasse o blob.
              // Otimização rápida: Se i=0 e isTexto, fazemos um fetch rápido do que acabamos de subir.
              if (i === 0 && isTexto && !baseBlob) {
                const res = await fetch(newImageUrl);
                baseBlob = await res.blob();
              }

              urls.push(newImageUrl);
              errors.push(false);
            } catch (err) {
              console.error(`Carousel image ${i} failed:`, err);
              urls.push("");
              errors.push(true);
            }
            setImageUrls([...urls]);
            setImageErrors([...errors]);
          }
          variant.imageUrls = urls;
          variant.imageUrl = urls[0];
          setResult(updatedScript);
          await saveScript(updatedScript);
        } else {
          // Processamento para Stories (3 variants, 1 image each)
          const urls: string[] = [];
          const errors: boolean[] = [];
          for (let i = 0; i < aiResponse.variants.length; i++) {
            const v = aiResponse.variants[i];
            try {
              if (i > 0) await new Promise(r => setTimeout(r, 2000));

              const isTexto = data.visualSubject === "texto";
              const genOpts: any = {
                hook: v.hook,
                inputSummary: data.inputSummary,
                niche: brandKit.niche,
                format: data.format,
                objective: data.objective,
                businessName: brandKit.businessName,
                visualStyle: brandKit.visualStyleDescription,
                targetAudience: brandKit.targetAudience,
                colorPalette: brandKit.colorPalette,
                toneAdjectives: brandKit.toneAdjectives,
                visualSubject: data.visualSubject,
                customVisualPrompt: data.customVisualPrompt,
                onProgress: (idx: number, p: number) => setImageProgress(prev => { const n = [...prev]; n[i] = p; return n; }),
                overlayDesign: (v as any).overlayDesign,
                fontFamily: data.fontFamily || (aiResponse.suggestedFonts as any)?.display,
                baseBlob: (i > 0 && isTexto) ? baseBlob : undefined
              };

              const newImageUrl = await generateImage(v.imagePrompt, undefined, genOpts, i);

              if (i === 0 && isTexto && !baseBlob) {
                const res = await fetch(newImageUrl);
                baseBlob = await res.blob();
              }

              urls.push(newImageUrl);
              errors.push(false);
              updatedScript.resultJson.variants[i] = { ...updatedScript.resultJson.variants[i], imageUrl: newImageUrl };
            } catch (err) {
              console.error(`Stories image ${i} failed:`, err);
              urls.push("");
              errors.push(true);
            }
            setImageUrls([...urls]);
            setImageErrors([...errors]);
          }
          setResult(updatedScript);
          await saveScript(updatedScript);
        }
      }
      else {
        setImagesLoading([false, false, false]);
        if (data.format !== "reels") setImageErrors([true, true, true]);
      }
    } catch (err: any) {
      toast({ title: "Erro ao gerar", description: err.message, variant: "destructive" });
      setLoading(false);
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado! 📋" });
  }

  async function handleDeepGenerate(idx: number) {
    if (!result || !brandKit) return;
    const v = result.resultJson.variants[idx];

    setDeepLoading(idx);
    try {
      const apiKey = groqKey;
      const content = await generateDeepContent(brandKit, v, additionalInfo, apiKey);

      const updatedResult = { ...result };
      updatedResult.resultJson.variants[idx] = {
        ...updatedResult.resultJson.variants[idx],
        detailedContent: content
      };

      setResult(updatedResult);
      await saveScript(updatedResult);
      setDialogOpen(null);
      setAdditionalInfo("");
      toast({ title: "Conteúdo expandido gerado! ✨" });
    } catch (err: any) {
      toast({ title: "Erro na expansão", description: err.message, variant: "destructive" });
    } finally {
      setDeepLoading(null);
    }
  }

  async function handleFav(scriptId: string) {
    await toggleFavorite(scriptId);
    const newFavs = await getFavoriteIds();
    setFavIds(newFavs);
    toast({ title: favIds.has(scriptId) ? "Removido dos favoritos" : "Adicionado aos favoritos ⭐" });
  }

  if (dataLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-[Space_Grotesk]">3 Variações</h2>
          <Button variant="outline" size="sm" onClick={() => { setResult(null); setImageUrls([]); setImageErrors([]); }}>Nova geração</Button>
        </div>
        {result.resultJson.variants.map((v, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardContent className="space-y-3 p-4">
                {/* Imagem gerada */}
                <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-muted/50 border border-border group">
                  {result.format === "reels" ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm p-6 text-center">
                      <Video className="h-12 w-12 text-primary mb-3 animate-pulse" />
                      <h4 className="text-xl font-bold text-white mb-2 font-[Space_Grotesk]">VÍDEO EM BREVE</h4>
                      <p className="text-sm text-white/70">Estamos preparando a ferramenta de edição de vídeos automáticos. Use o roteiro abaixo para gravar seu Reel!</p>
                    </div>
                  ) : result.format === "carousel" ? (
                    <>
                      {imagesLoading[carouselImageIdx] && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                          <div className="w-full max-w-[120px] space-y-3 text-center">
                            <Progress value={imageProgress[carouselImageIdx]} className="h-1 w-full bg-primary/10 [&>div]:bg-primary" />
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="h-3 w-3 animate-spin text-primary" />
                              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Criando Slide {carouselImageIdx + 1}...</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {imageErrors[carouselImageIdx] && !imagesLoading[carouselImageIdx] && (
                        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                          <div className="space-y-2">
                            <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/20" />
                            <p className="text-[10px] text-muted-foreground">Erro no Slide {carouselImageIdx + 1}</p>
                            <Button size="sm" variant="ghost" className="h-7 text-[10px] hover:bg-primary/10" onClick={() => handleRegenImage(carouselImageIdx)}>
                              <RefreshCw className="mr-1 h-3 w-3" /> Tentar novamente
                            </Button>
                          </div>
                        </div>
                      )}

                      {imageUrls[carouselImageIdx] && !imageErrors[carouselImageIdx] && (
                        <img
                          src={imageUrls[carouselImageIdx]}
                          alt={`${v.title} - Slide ${carouselImageIdx + 1}`}
                          className={`h-full w-full object-cover transition-all duration-700 ${imagesLoading[carouselImageIdx] ? "scale-110 blur-lg" : "scale-100 blur-0"}`}
                          onLoad={() => handleImageLoad(carouselImageIdx)}
                          onError={() => handleImageError(carouselImageIdx, imageUrls[carouselImageIdx])}
                        />
                      )}

                      {/* Navegação Carrossel */}
                      {!imagesLoading[carouselImageIdx] && imageUrls.length > 1 && (
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 z-30 pointer-events-none">
                          <Button
                            variant="secondary" size="icon"
                            className="h-8 w-8 rounded-full bg-black/40 text-white backdrop-blur-sm border-0 pointer-events-auto hover:bg-black/60"
                            disabled={carouselImageIdx === 0}
                            onClick={() => setCarouselImageIdx(prev => prev - 1)}
                          >
                            <Send className="h-4 w-4 rotate-180" />
                          </Button>
                          <Button
                            variant="secondary" size="icon"
                            className="h-8 w-8 rounded-full bg-black/40 text-white backdrop-blur-sm border-0 pointer-events-auto hover:bg-black/60"
                            disabled={carouselImageIdx === imageUrls.length - 1}
                            onClick={() => setCarouselImageIdx(prev => prev + 1)}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {/* Indicador de Lâminas */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
                        {[0, 1, 2].map((dot) => (
                          <div key={dot} className={`h-1.5 w-1.5 rounded-full transition-all ${carouselImageIdx === dot ? "bg-primary w-4" : "bg-white/40"}`} />
                        ))}
                      </div>
                    </>
                  ) : (
                    // Stories (Padrão)
                    <>
                      {imagesLoading[i] && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                          <div className="w-full max-w-[120px] space-y-3 text-center">
                            <Progress value={imageProgress[i]} className="h-1 w-full bg-primary/10 [&>div]:bg-primary" />
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="h-3 w-3 animate-spin text-primary" />
                              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Criando...</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {imageErrors[i] && !imagesLoading[i] && (
                        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                          <div className="space-y-2">
                            <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/20" />
                            <p className="text-[10px] text-muted-foreground">Erro na geração</p>
                            <Button size="sm" variant="ghost" className="h-7 text-[10px] hover:bg-primary/10" onClick={() => handleRegenImage(i)}>
                              <RefreshCw className="mr-1 h-3 w-3" /> Tentar novamente
                            </Button>
                          </div>
                        </div>
                      )}

                      {imageUrls[i] && !imageErrors[i] && (
                        <img
                          src={imageUrls[i]}
                          alt={v.title}
                          className={`h-full w-full object-cover transition-all duration-700 ${imagesLoading[i] ? "scale-110 blur-lg" : "scale-100 blur-0"}`}
                          onLoad={() => handleImageLoad(i)}
                          onError={() => handleImageError(i, imageUrls[i])}
                        />
                      )}
                    </>
                  )}

                  {/* LOGO OVERLAY */}
                  {brandKit?.logoUrls && brandKit.logoUrls.length > 0 && result.format !== "reels" && (
                    <div className="absolute top-4 left-4 w-12 h-12 pointer-events-none drop-shadow-xl z-20">
                      <img
                        src={brandKit.logoUrls[0]}
                        alt="Watermark"
                        className="w-full h-full object-contain filter brightness-110"
                      />
                    </div>
                  )}

                  {!imagesLoading[i] && !imageErrors[i] && (result.format === "carousel" ? imageUrls[carouselImageIdx] : imageUrls[i]) && (
                    <div className="absolute bottom-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <Button size="icon" variant="secondary" className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white border-0 backdrop-blur-sm" onClick={() => handleRegenImage(result.format === "carousel" ? carouselImageIdx : i)}>
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="secondary" className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white border-0 backdrop-blur-sm" onClick={() => {
                        const url = result.format === "carousel" ? imageUrls[carouselImageIdx] : imageUrls[i];
                        if (url) downloadImage(url, `soloreels-${v.title.replace(/\s+/g, "-")}${result.format === "carousel" ? `-slide-${carouselImageIdx + 1}` : ""}.png`);
                      }}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-start justify-between">
                  <h3 className="font-semibold">{v.title}</h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleFav(result.id)}>
                    <Star className={`h-4 w-4 ${favIds.has(result.id) ? "fill-primary text-primary" : ""}`} />
                  </Button>
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
                    {v.shotList.map((s, j) => <li key={j} className="text-xs">• {s}</li>)}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-1">
                  {v.hashtags.map((h) => (
                    <span key={h} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{h}</span>
                  ))}
                </div>
                {v.disclaimer && <p className="text-xs text-muted-foreground italic">⚠️ {v.disclaimer}</p>}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleCopy(`${v.hook}\n\n${v.script}\n\n${v.captionLong}\n\n${v.hashtags.join(" ")}`)}>
                    <Copy className="mr-1 h-3 w-3" /> Copiar tudo
                  </Button>
                  <Button size="sm" className="flex-1 gradient-primary border-0" onClick={() => navigate(`/app/teleprompter/${result.id}?variant=${i}`)}>
                    <Video className="mr-1 h-3 w-3" /> Teleprompter
                  </Button>
                </div>

                <div className="pt-2 border-t border-dashed">
                  {v.detailedContent ? (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="flex items-center gap-2 text-primary">
                        <FileText className="h-4 w-4" />
                        <p className="text-xs font-bold uppercase tracking-wider">Conteúdo Expandido</p>
                      </div>
                      <div className="rounded-lg bg-primary/5 border border-primary/10 p-4">
                        <p className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">{v.detailedContent}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => handleCopy(v.detailedContent!)}>
                        <Copy className="mr-1 h-3 w-3" /> Copiar conteúdo expandido
                      </Button>
                    </div>
                  ) : (
                    <Dialog open={dialogOpen === i} onOpenChange={(open) => setDialogOpen(open ? i : null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full border-primary/20 hover:bg-primary/5 text-primary gap-2">
                          <Sparkles className="h-3.5 w-3.5" /> Estudar roteiro e sugerir conteúdo completo
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Expandir Roteiro</DialogTitle>
                          <DialogDescription>
                            Nossa Inteligência Artificial fará uma pesquisa detalhada para sugerir o conteúdo completo baseado no seu roteiro e em informações extras que você fornecer.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Informações adicionais (opcional)</label>
                            <Textarea
                              placeholder="Fale mais sobre o produto, serviço ou detalhes técnicos que deseja incluir..."
                              value={additionalInfo}
                              onChange={(e) => setAdditionalInfo(e.target.value)}
                              rows={4}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDialogOpen(null)}>Cancelar</Button>
                          <Button
                            className="gradient-primary border-0"
                            onClick={() => handleDeepGenerate(i)}
                            disabled={deepLoading === i}
                          >
                            {deepLoading === i ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Gerar Conteúdo Completo
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-[Space_Grotesk]">Gerar Roteiro</h2>
          <p className="text-sm text-muted-foreground">Preencha os dados e a IA cria 3 variações com imagens.</p>
        </div>
        {isDemo && (
          <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 animate-pulse">
            <Sparkles className="mr-1 h-3.5 w-3.5" /> Modo Demo
          </Badge>
        )}
      </div>

      {isDemo && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground italic">
          💡 No teste gratuito, os roteiros serão focados no nicho de <strong>Marketing Digital</strong> da Agência Solo.
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="format" render={({ field }) => (
            <FormItem>
              <FormLabel>Formato</FormLabel>
              <div className="grid grid-cols-3 gap-2">
                {FORMATS.map((f) => (
                  <button key={f.value} type="button" onClick={() => field.onChange(f.value)}
                    className={`rounded-xl border p-3 text-center transition-all ${field.value === f.value ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "bg-card"}`}>
                    <span className="text-xl">{f.icon}</span>
                    <p className="mt-1 text-xs font-medium">{f.label}</p>
                    {f.description && (
                      <p className="mt-0.5 text-[8px] text-muted-foreground opacity-80">{f.description}</p>
                    )}
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

          <FormField control={form.control} name="visualSubject" render={({ field }) => (
            <FormItem>
              <FormLabel>Foco Visual da Imagem (Opcional)</FormLabel>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: "pessoas", label: "Pessoas/Rostos" },
                  { value: "objetos", label: "Apenas Objetos" },
                  { value: "abstrato", label: "Arte Abstrata" },
                  { value: "texto", label: "Apenas Texto" }
                ].map((s) => (
                  <button key={s.value} type="button" onClick={() => field.onChange(field.value === s.value ? undefined : s.value)}
                    className={`rounded-lg border p-2 text-center text-xs transition-all ${field.value === s.value ? "border-primary bg-primary/10 font-bold" : "bg-card text-muted-foreground hover:bg-muted"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Marque para forçar ou proibir a presença de pessoas/rostos nas imagens geradas.</p>
              <FormMessage />
            </FormItem>
          )} />

          {form.watch("visualSubject") === "texto" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4">
              <FormField control={form.control} name="fontFamily" render={({ field }) => (
                <FormItem>
                  <FormLabel>Estilo da Fonte</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma fonte premium" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Space Grotesk">Space Grotesk (Moderna)</SelectItem>
                      <SelectItem value="Montserrat">Montserrat (Geométrica)</SelectItem>
                      <SelectItem value="Playfair Display">Playfair Display (Elegante)</SelectItem>
                      <SelectItem value="Inter">Inter (Clean)</SelectItem>
                      <SelectItem value="Bebas Neue">Bebas Neue (Impacto)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground italic">Dica: Use fontes de 'Impacto' ou 'Elegante' para destacar frases curtas.</p>
                </FormItem>
              )} />
            </motion.div>
          )}

          <FormField control={form.control} name="inputSummary" render={({ field }) => (
            <FormItem>
              <FormLabel>Sobre o que é o conteúdo?</FormLabel>
              <FormControl><Textarea {...field} placeholder="Ex: Dicas de skincare para pele oleosa no verão" rows={3} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="customVisualPrompt" render={({ field }) => (
            <FormItem>
              <FormLabel>Descreva a Imagem (Opcional)</FormLabel>
              <FormControl><Textarea {...field} placeholder="Ex: Uma mulher de 30 anos segurando um notebook em um café moderno" rows={2} /></FormControl>
              <p className="text-[10px] text-muted-foreground">+ Detalhes específicos na imagem (nossa IA mesclará com sua identidade visual).</p>
              <FormMessage />
            </FormItem>
          )} />

          <Button type="submit" disabled={loading} className="w-full gradient-primary border-0 text-base font-semibold">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</> : <><Sparkles className="mr-2 h-4 w-4" /> Gerar 3 variações</>}
          </Button>
        </form>
      </Form>

      {/* Mostrar inputs manuais apenas quando env vars não estão configuradas */}
      {(!envGroqKey || !envGeminiKey) && (
        <div className="space-y-3 rounded-xl border border-dashed border-muted-foreground/30 p-4">
          <label className="text-xs font-medium text-muted-foreground">🔑 Chaves API {isDemo ? "(Demo Mode)" : ""}</label>
          <div className="space-y-2">
            {!envGroqKey && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Motor de Roteiro (Opcional)</p>
                <Input type="password" placeholder="Chave da API..." value={groqKey}
                  onChange={(e) => { setGroqKey(e.target.value); localStorage.setItem("soloreels_groq_key", e.target.value); }} />
              </div>
            )}
            {!envGeminiKey && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Motor de Imagem (Opcional)</p>
                <Input type="password" placeholder="Chave da API..." value={geminiKey}
                  onChange={(e) => { setGeminiKey(e.target.value); localStorage.setItem("soloreels_gemini_key", e.target.value); }} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
