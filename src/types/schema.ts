import { z } from "zod";

// ── Brand Kit ──
export const brandKitSchema = z.object({
  id: z.string().optional(),
  businessName: z.string().min(1, "Nome do negócio é obrigatório"),
  niche: z.string().min(1, "Nicho é obrigatório"),
  offer: z.string().min(1, "Oferta principal é obrigatória"),
  targetAudience: z.string().min(1, "Público-alvo é obrigatório"),
  city: z.string().optional().default(""),
  toneAdjectives: z.array(z.string()).min(1, "Adicione pelo menos 1 adjetivo de tom"),
  forbiddenWords: z.array(z.string()).default([]),
  differentiators: z.array(z.string()).default([]),
  proofs: z.array(z.string()).default([]),
  commonObjections: z.array(z.string()).default([]),
  ctaPreference: z.string().optional().default(""),
  colorPalette: z.array(z.string()).default([]),
  logoUrls: z.array(z.string()).default([]),
  referenceImageUrls: z.array(z.string()).default([]),
  referenceVideoUrls: z.array(z.string()).default([]),
  visualStyleDescription: z.string().optional().default(""),
});
export type BrandKit = z.infer<typeof brandKitSchema>;

// ── Style Pack ──
export const stylePackSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  rules: z.array(z.string()),
  examplePhrases: z.array(z.string()),
  isOfficial: z.boolean(),
});
export type StylePack = z.infer<typeof stylePackSchema>;

// ── Script Variant ──
export const scriptVariantSchema = z.object({
  title: z.string(),
  hook: z.string(),
  script: z.string(),
  teleprompterText: z.string(),
  shotList: z.array(z.string()),
  captionShort: z.string(),
  captionLong: z.string(),
  cta: z.string(),
  hashtags: z.array(z.string()),
  disclaimer: z.string(),
  imageUrl: z.string().optional(),
  imagePrompt: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  imagePrompts: z.array(z.string()).optional(),
  detailedContent: z.string().optional(),
});
export type ScriptVariant = z.infer<typeof scriptVariantSchema>;

export const aiResponseSchema = z.object({
  variants: z.array(scriptVariantSchema).min(1).max(3),
});
export type AIResponse = z.infer<typeof aiResponseSchema>;

// ── saved Script ──
export interface SavedScript {
  id: string;
  brandKitId?: string;
  stylePackId: string;
  niche: string;
  platform: "instagram";
  format: "reels" | "stories" | "carousel";
  objective: string;
  inputSummary: string;
  resultJson: AIResponse;
  createdAt: string;
  isFavorite?: boolean;
}

// ── Generation Form ──
export const generateFormSchema = z.object({
  format: z.enum(["reels", "stories", "carousel"]),
  objective: z.string().min(1, "Objetivo é obrigatório"),
  inputSummary: z.string().min(10, "Descreva o conteúdo com pelo menos 10 caracteres"),
  stylePackId: z.string().min(1, "Selecione um pack de estilo"),
});
export type GenerateFormData = z.infer<typeof generateFormSchema>;

export interface WeeklyUsage {
  weekStart: string;
  count: number;
}

export type SubscriptionTier = "free" | "basic" | "pro" | "enterprise";

export const WEEKLY_LIMITS: Record<SubscriptionTier, number> = {
  free: 1,
  basic: 3,
  pro: 6,
  enterprise: 12,
};

export const FORMATS = [
  { value: "reels" as const, label: "Reels", icon: "🎬" },
  { value: "stories" as const, label: "Stories", icon: "📱" },
  { value: "carousel" as const, label: "Carrossel", icon: "📸" },
];


export const OBJECTIVES = [
  "Atrair novos seguidores",
  "Gerar leads / contatos",
  "Vender um produto/serviço",
  "Educar / ensinar algo",
  "Criar autoridade",
  "Engajar a audiência",
  "Humanizar a marca",
  "Divulgar promoção",
];

export const SOLOREELS_DEMO_KIT: BrandKit = {
  businessName: "Agência Solo",
  niche: "Consultoria de Marketing Digital",
  offer: "Gestão estratégica de Redes Sociais e Inteligência Artificial",
  targetAudience: "Empresários, Profissionais Liberais e Criadores de Conteúdo",
  city: "Brasil",
  toneAdjectives: ["Profissional", "Inovador", "Direto", "Autoritário"],
  forbiddenWords: ["barato", "fácil", "milagre", "estou tentando"],
  differentiators: ["Pioneiros em IA para Reels", "Foco em conversão real", "Estratégia personalizada"],
  proofs: ["+100 clientes satisfeitos", "Especialistas em viralização"],
  commonObjections: ["IA tira o lado humano", "Não tenho tempo para gravar"],
  ctaPreference: "Me envie um Direct para decolar seu perfil",
  colorPalette: ["#e8501a", "#ffffff", "#0d1117"],
  logoUrls: ["/logo-agencia-solo.png"],
  visualStyleDescription: "Cores vibrantes (Laranja Solo), contraste alto, tipografia moderna e elementos que remetem à velocidade e tecnologia.",
};
