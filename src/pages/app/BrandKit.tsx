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

export default function BrandKitPage() {
  const { toast } = useToast();
  const existing = getBrandKit();
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});

  const form = useForm<BrandKit>({
    resolver: zodResolver(brandKitSchema),
    defaultValues: existing || {
      businessName: "", niche: "", offer: "", targetAudience: "", city: "",
      toneAdjectives: [], forbiddenWords: [], differentiators: [], proofs: [], commonObjections: [], ctaPreference: "",
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

  function TagInput({ field, label, placeholder }: { field: keyof BrandKit; label: string; placeholder: string }) {
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
    saveBrandKit(data);
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
          <TagInput field="toneAdjectives" label="Tom de voz" placeholder="Ex: profissional" />
          <TagInput field="differentiators" label="Diferenciais" placeholder="Ex: 10 anos" />
          <TagInput field="proofs" label="Provas sociais" placeholder="Ex: +500 clientes" />
          <TagInput field="commonObjections" label="Objeções comuns" placeholder="Ex: É caro" />
          <TagInput field="forbiddenWords" label="Palavras proibidas" placeholder="Ex: barato" />
          <FormField control={form.control} name="ctaPreference" render={({ field }) => (
            <FormItem><FormLabel>CTA preferido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <Button type="submit" className="w-full gradient-primary border-0"><Save className="mr-2 h-4 w-4" /> Salvar</Button>
        </form>
      </Form>
    </div>
  );
}
