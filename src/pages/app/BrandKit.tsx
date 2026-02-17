import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { brandKitSchema, type BrandKit } from "@/types/schema";
import { getBrandKit, saveBrandKit } from "@/lib/data-service";
import { useToast } from "@/hooks/use-toast";
import { Save, X, Loader2, Sparkles } from "lucide-react";
import { ColorPalettePicker } from "@/components/ui/color-palette-picker";
import { FileUpload, type UploadedFile } from "@/components/ui/file-upload";
import { useAuth } from "@/contexts/AuthContext";
import { analyzeBrandStyle } from "@/lib/style-analyzer";

export default function BrandKitPage() {
  const { user, profile, isDemo } = useAuth();
  const { toast } = useToast();
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});
  const [logoFiles, setLogoFiles] = useState<UploadedFile[]>([]);
  const [refImageFiles, setRefImageFiles] = useState<UploadedFile[]>([]);
  const [refVideoFiles, setRefVideoFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const isFree = isDemo;

  const form = useForm<BrandKit>({
    resolver: zodResolver(brandKitSchema),
    defaultValues: {
      businessName: "", niche: "", offer: "", targetAudience: "", city: "",
      toneAdjectives: [], forbiddenWords: [], differentiators: [], proofs: [],
      commonObjections: [], ctaPreference: "", colorPalette: [],
      logoUrls: [], referenceImageUrls: [], referenceVideoUrls: [],
      visualStyleDescription: "",
    },
  });

  useEffect(() => {
    getBrandKit().then((existing) => {
      if (existing) {
        form.reset(existing);
        // Restaurar arquivos já salvos
        if (existing.logoUrls?.length) {
          setLogoFiles(existing.logoUrls.map((url) => ({ id: crypto.randomUUID(), name: url.split("/").pop() || "logo", url, type: "image" as const })));
        }
        if (existing.referenceImageUrls?.length) {
          setRefImageFiles(existing.referenceImageUrls.map((url) => ({ id: crypto.randomUUID(), name: url.split("/").pop() || "ref", url, type: "image" as const })));
        }
        if (existing.referenceVideoUrls?.length) {
          setRefVideoFiles(existing.referenceVideoUrls.map((url) => ({ id: crypto.randomUUID(), name: url.split("/").pop() || "video", url, type: "video" as const })));
        }
      }
      setLoading(false);
    });
  }, []);

  async function handleAnalyze() {
    const allUrls = [
      ...refImageFiles.map(f => f.url),
      ...refVideoFiles.map(f => f.url)
    ];

    if (allUrls.length === 0) {
      toast({ title: "Ops!", description: "Adicione algumas imagens ou vídeos de referência primeiro.", variant: "destructive" });
      return;
    }

    console.log("DEBUG [BrandKit]: Iniciando handleAnalyze com URLs:", allUrls);
    setAnalyzing(true);
    try {
      console.log("DEBUG [BrandKit]: Chamando analyzeBrandStyle...");
      // Injetar contexto para o fallback dummy inteligente
      const brandKit = form.getValues();
      // @ts-ignore
      window.tempBrandKitContext = {
        niche: brandKit.niche,
        colorPalette: brandKit.colorPalette,
        toneAdjectives: brandKit.toneAdjectives
      };

      const result = await analyzeBrandStyle(allUrls);
      console.log("DEBUG [BrandKit]: Resultado da análise recebido:", result);

      form.setValue("visualStyleDescription", result.visualStyleDescription);
      form.setValue("colorPalette", result.colorPalette);

      // Adicionar adjetivos de tom se não existirem
      const currentTone = form.getValues("toneAdjectives");
      const newTone = Array.from(new Set([...currentTone, ...result.suggestedTone]));
      form.setValue("toneAdjectives", newTone);

      toast({ title: "Análise concluída! ✨", description: "Estilo visual e paleta de cores foram atualizados." });
    } catch (err: any) {
      toast({ title: "Erro na análise", description: err.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  }

  function addTag(field: keyof BrandKit, value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const current = form.getValues(field) as string[];
    if (!current.includes(trimmed)) form.setValue(field, [...current, trimmed] as any);
    setTagInputs((p) => ({ ...p, [field]: "" }));
  }

  function removeTag(field: keyof BrandKit, value: string) {
    const current = form.getValues(field) as string[];
    form.setValue(field, current.filter((v) => v !== value) as any);
  }

  function renderTagInput(field: keyof BrandKit, label: string, placeholder: string) {
    const values = (form.watch(field) as string[]) || [];
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">{label}</label>
        <div className="flex gap-2">
          <Input placeholder={placeholder} value={tagInputs[field] || ""}
            onChange={(e) => setTagInputs((p) => ({ ...p, [field]: e.target.value }))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(field, tagInputs[field] || ""); } }} />
          <Button type="button" variant="outline" size="sm" onClick={() => addTag(field, tagInputs[field] || "")}>+</Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1">{v}<X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(field, v)} /></Badge>
          ))}
        </div>
      </div>
    );
  }

  async function onSubmit(data: BrandKit) {
    setSaving(true);
    try {
      const logoUrls = logoFiles.length > 0 ? logoFiles.map((f) => f.url) : data.logoUrls;
      const refImgUrls = refImageFiles.length > 0 ? refImageFiles.map((f) => f.url) : data.referenceImageUrls;
      const refVidUrls = refVideoFiles.length > 0 ? refVideoFiles.map((f) => f.url) : data.referenceVideoUrls;
      await saveBrandKit({ ...data, logoUrls, referenceImageUrls: refImgUrls, referenceVideoUrls: refVidUrls });
      toast({ title: "Kit da Marca salvo! ✅" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold font-[Space_Grotesk]">Kit da Marca</h2>
        {isFree && (
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            <Sparkles className="mr-1 h-3 w-3" /> Modo Demo
          </Badge>
        )}
      </div>

      {isFree && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-sm font-bold text-primary flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Personalização Bloqueada
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Você está usando os dados oficiais da <strong>Agência Solo</strong> para testar a ferramenta.
            Para cadastrar sua própria marca e nicho, assine um plano!
          </p>
          <Button variant="outline" size="sm" className="mt-3 border-primary/30 hover:bg-primary/5 text-primary" onClick={() => window.location.href = "/app/checkout"}>
            Fazer Upgrade Agora
          </Button>
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="businessName" render={({ field }) => (
            <FormItem><FormLabel>Nome do negócio</FormLabel><FormControl><Input {...field} disabled={isFree} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="niche" render={({ field }) => (
            <FormItem><FormLabel>Nicho</FormLabel><FormControl><Input {...field} disabled={isFree} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="offer" render={({ field }) => (
            <FormItem><FormLabel>Oferta principal</FormLabel><FormControl><Input {...field} disabled={isFree} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="targetAudience" render={({ field }) => (
            <FormItem><FormLabel>Público-alvo</FormLabel><FormControl><Input {...field} disabled={isFree} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} disabled={isFree} /></FormControl><FormMessage /></FormItem>
          )} />
          <div className={isFree ? "opacity-50 pointer-events-none" : ""}>
            <ColorPalettePicker colors={form.watch("colorPalette") || []} onChange={(colors) => form.setValue("colorPalette", colors)} />
            <FileUpload files={logoFiles} onChange={setLogoFiles} accept="image/png,image/jpeg,image/webp" maxFiles={3} label="Logos da marca" description="Adicione até 3 logos (PNG ou JPG)" userId={user?.id} />
            <FileUpload files={refImageFiles} onChange={setRefImageFiles} accept="image/png,image/jpeg,image/webp" maxFiles={10} label="Imagens de referência" description="Imagens que representam o estilo visual da sua marca" userId={user?.id} />
            <FileUpload files={refVideoFiles} onChange={setRefVideoFiles} accept="video/mp4,video/quicktime,video/webm" maxFiles={5} label="Vídeos de referência" description="Vídeos curtos para a IA aprender seu estilo" userId={user?.id} />
          </div>

          {!isFree && (
            <Button
              type="button"
              variant="outline"
              className="w-full border-primary/30 hover:bg-primary/5 gap-2"
              onClick={handleAnalyze}
              disabled={analyzing}
            >
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
              {analyzing ? "Analisando referências..." : "Analisar Estilo com IA"}
            </Button>
          )}

          {isFree ? (
            <div className="space-y-4 opacity-50 pointer-events-none">
              {renderTagInput("toneAdjectives", "Tom de voz", "Ex: profissional")}
              {renderTagInput("differentiators", "Diferenciais", "Ex: 10 anos")}
              {renderTagInput("proofs", "Provas sociais", "Ex: +500 clientes")}
              {renderTagInput("commonObjections", "Objeções comuns", "Ex: É caro")}
              {renderTagInput("forbiddenWords", "Palavras proibidas", "Ex: barato")}
              <FormField control={form.control} name="ctaPreference" render={({ field }) => (
                <FormItem><FormLabel>CTA preferido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          ) : (
            <>
              {renderTagInput("toneAdjectives", "Tom de voz", "Ex: profissional")}
              {renderTagInput("differentiators", "Diferenciais", "Ex: 10 anos")}
              {renderTagInput("proofs", "Provas sociais", "Ex: +500 clientes")}
              {renderTagInput("commonObjections", "Objeções comuns", "Ex: É caro")}
              {renderTagInput("forbiddenWords", "Palavras proibidas", "Ex: barato")}
              <FormField control={form.control} name="ctaPreference" render={({ field }) => (
                <FormItem><FormLabel>CTA preferido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </>
          )}
          <FormField control={form.control} name="visualStyleDescription" render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição do estilo visual</FormLabel>
              <FormControl>
                <textarea {...field} disabled={isFree} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Ex: Fotos claras, fundo branco, tipografia moderna..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <Button type="submit" disabled={saving || isFree} className="w-full gradient-primary border-0">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isFree ? "Upgrade para Salvar" : "Salvar"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
