import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { brandKitSchema, type BrandKit } from "@/types/schema";
import { NICHES } from "@/data/niches";
import { OFFICIAL_PACKS } from "@/data/style-packs";
import { saveBrandKit, setOnboardingDone } from "@/lib/demo-store";
import { ChevronRight, ChevronLeft, X } from "lucide-react";

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedNiche, setSelectedNiche] = useState("");
  const [selectedPack, setSelectedPack] = useState("");
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});

  const form = useForm<BrandKit>({
    resolver: zodResolver(brandKitSchema),
    defaultValues: {
      businessName: "",
      niche: "",
      offer: "",
      targetAudience: "",
      city: "",
      toneAdjectives: [],
      forbiddenWords: [],
      differentiators: [],
      proofs: [],
      commonObjections: [],
      ctaPreference: "",
    },
  });

  function addTag(field: keyof BrandKit, value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const current = form.getValues(field) as string[];
    if (!current.includes(trimmed)) {
      form.setValue(field, [...current, trimmed] as any);
    }
    setTagInputs((prev) => ({ ...prev, [field]: "" }));
  }

  function removeTag(field: keyof BrandKit, value: string) {
    const current = form.getValues(field) as string[];
    form.setValue(field, current.filter((v) => v !== value) as any);
  }

  function renderTagInput(field: keyof BrandKit, label: string, placeholder: string) {
    const values = (form.getValues(field) as string[]) || [];
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">{label}</label>
        <div className="flex gap-2">
          <Input
            placeholder={placeholder}
            value={tagInputs[field] || ""}
            onChange={(e) => setTagInputs((p) => ({ ...p, [field]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(field, tagInputs[field] || "");
              }
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => addTag(field, tagInputs[field] || "")}>
            +
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1">
              {v}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(field, v)} />
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  function handleFinish(data: BrandKit) {
    saveBrandKit({ ...data, niche: selectedNiche || data.niche });
    setOnboardingDone();
    navigate("/app/generate");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "gradient-primary" : "bg-muted"}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="mb-1 text-xl font-bold font-[Space_Grotesk]">Kit da Marca</h2>
            <p className="mb-4 text-sm text-muted-foreground">Preencha os dados da sua marca para roteiros personalizados.</p>
            <Form {...form}>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <FormField control={form.control} name="businessName" render={({ field }) => (
                  <FormItem><FormLabel>Nome do negócio</FormLabel><FormControl><Input {...field} placeholder="Ex: Studio Ana Beleza" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="offer" render={({ field }) => (
                  <FormItem><FormLabel>Oferta principal</FormLabel><FormControl><Input {...field} placeholder="Ex: Design de sobrancelhas" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="targetAudience" render={({ field }) => (
                  <FormItem><FormLabel>Público-alvo</FormLabel><FormControl><Input {...field} placeholder="Ex: Mulheres 25-45 anos" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>Cidade (opcional)</FormLabel><FormControl><Input {...field} placeholder="Ex: São Paulo - SP" /></FormControl><FormMessage /></FormItem>
                )} />
                {renderTagInput("toneAdjectives", "Tom de voz (adjetivos)", "Ex: profissional, acolhedor")}
                {renderTagInput("differentiators", "Diferenciais", "Ex: 10 anos de experiência")}
                {renderTagInput("proofs", "Provas sociais", "Ex: +500 clientes atendidos")}
                {renderTagInput("commonObjections", "Objeções comuns", "Ex: É muito caro")}
                {renderTagInput("forbiddenWords", "Palavras proibidas", "Ex: barato, milagre")}
                <FormField control={form.control} name="ctaPreference" render={({ field }) => (
                  <FormItem><FormLabel>CTA preferido (opcional)</FormLabel><FormControl><Input {...field} placeholder="Ex: Agende agora pelo WhatsApp" /></FormControl><FormMessage /></FormItem>
                )} />
              </form>
            </Form>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="mb-1 text-xl font-bold font-[Space_Grotesk]">Seu nicho</h2>
            <p className="mb-4 text-sm text-muted-foreground">Selecione o nicho mais próximo do seu negócio.</p>
            <div className="grid grid-cols-2 gap-3">
              {NICHES.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { setSelectedNiche(n.id); form.setValue("niche", n.id); }}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    selectedNiche === n.id ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "bg-card hover:border-primary/50"
                  }`}
                >
                  <span className="text-2xl">{n.emoji}</span>
                  <p className="mt-1 text-sm font-medium">{n.label}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="mb-1 text-xl font-bold font-[Space_Grotesk]">Pack de Estilo</h2>
            <p className="mb-4 text-sm text-muted-foreground">Escolha o estilo padrão dos seus roteiros.</p>
            <div className="space-y-3">
              {OFFICIAL_PACKS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPack(p.id)}
                  className={`w-full rounded-xl border p-4 text-left transition-all ${
                    selectedPack === p.id ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "bg-card hover:border-primary/50"
                  }`}
                >
                  <p className="font-semibold">{p.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.description}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3 pb-4">
        {step > 0 && (
          <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
        )}
        {step < 2 ? (
          <Button className="flex-1 gradient-primary border-0" onClick={() => setStep(step + 1)}>
            Próximo <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            className="flex-1 gradient-primary border-0"
            disabled={!selectedPack}
            onClick={() => form.handleSubmit(handleFinish)()}
          >
            Começar a gerar! <Sparkles className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
