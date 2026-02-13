import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { brandKitSchema, type BrandKit } from "@/types/schema";
import { getBrandKit, saveBrandKit } from "@/lib/demo-store";
import { useToast } from "@/hooks/use-toast";
import { Save, X } from "lucide-react";
import { useState } from "react";
import { ColorPalettePicker } from "@/components/ui/color-palette-picker";
import { FileUpload, type UploadedFile } from "@/components/ui/file-upload";

export default function BrandKitPage() {
  const { toast } = useToast();
  const existing = getBrandKit();
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});
  const [logoFiles, setLogoFiles] = useState<UploadedFile[]>([]);
  const [refImageFiles, setRefImageFiles] = useState<UploadedFile[]>([]);
  const [refVideoFiles, setRefVideoFiles] = useState<UploadedFile[]>([]);

  const form = useForm<BrandKit>({
    resolver: zodResolver(brandKitSchema),
    defaultValues: existing || {
      businessName: "", niche: "", offer: "", targetAudience: "", city: "",
      toneAdjectives: [], forbiddenWords: [], differentiators: [], proofs: [],
      commonObjections: [], ctaPreference: "", colorPalette: [],
      logoUrls: [], referenceImageUrls: [], referenceVideoUrls: [],
      visualStyleDescription: "",
    },
  });

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
          <Input
            placeholder={placeholder}
            value={tagInputs[field] || ""}
            onChange={(e) => setTagInputs((p) => ({ ...p, [field]: e.target.value }))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(field, tagInputs[field] || ""); } }}
          />
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

  function onSubmit(data: BrandKit) {
    const logoUrls = logoFiles.length > 0 ? logoFiles.map((f) => f.url) : data.logoUrls;
    const refImgUrls = refImageFiles.length > 0 ? refImageFiles.map((f) => f.url) : data.referenceImageUrls;
    const refVidUrls = refVideoFiles.length > 0 ? refVideoFiles.map((f) => f.url) : data.referenceVideoUrls;

    saveBrandKit({ ...data, logoUrls, referenceImageUrls: refImgUrls, referenceVideoUrls: refVidUrls });
    toast({ title: "Kit da Marca salvo! ✅" });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-[Space_Grotesk]">Kit da Marca</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="businessName" render={({ field }) => (
            <FormItem><FormLabel>Nome do negócio</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="niche" render={({ field }) => (
            <FormItem><FormLabel>Nicho</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="offer" render={({ field }) => (
            <FormItem><FormLabel>Oferta principal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="targetAudience" render={({ field }) => (
            <FormItem><FormLabel>Público-alvo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          <ColorPalettePicker
            colors={form.watch("colorPalette") || []}
            onChange={(colors) => form.setValue("colorPalette", colors)}
          />

          <FileUpload
            files={logoFiles}
            onChange={setLogoFiles}
            accept="image/png,image/jpeg,image/webp"
            maxFiles={3}
            label="Logos da marca"
            description="Adicione até 3 logos (PNG ou JPG)"
          />

          <FileUpload
            files={refImageFiles}
            onChange={setRefImageFiles}
            accept="image/png,image/jpeg,image/webp"
            maxFiles={10}
            label="Imagens de referência"
            description="Imagens que representam o estilo visual da sua marca"
          />

          <FileUpload
            files={refVideoFiles}
            onChange={setRefVideoFiles}
            accept="video/mp4,video/quicktime,video/webm"
            maxFiles={5}
            label="Vídeos de referência"
            description="Vídeos curtos para a IA aprender seu estilo"
          />

          {renderTagInput("toneAdjectives", "Tom de voz", "Ex: profissional")}
          {renderTagInput("differentiators", "Diferenciais", "Ex: 10 anos")}
          {renderTagInput("proofs", "Provas sociais", "Ex: +500 clientes")}
          {renderTagInput("commonObjections", "Objeções comuns", "Ex: É caro")}
          {renderTagInput("forbiddenWords", "Palavras proibidas", "Ex: barato")}

          <FormField control={form.control} name="ctaPreference" render={({ field }) => (
            <FormItem><FormLabel>CTA preferido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="visualStyleDescription" render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição do estilo visual</FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Ex: Fotos claras, fundo branco, tipografia moderna..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <Button type="submit" className="w-full gradient-primary border-0"><Save className="mr-2 h-4 w-4" /> Salvar</Button>
        </form>
      </Form>
    </div>
  );
}
