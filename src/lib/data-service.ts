import { supabase, isDemoMode } from "./supabase";
import * as demo from "./demo-store";
import type { BrandKit, SavedScript, WeeklyUsage, StylePack, SubscriptionTier } from "@/types/schema";
import { WEEKLY_LIMITS, SOLOREELS_DEMO_KIT } from "@/types/schema";

// Helper to get current user id
async function getUserId(): Promise<string | null> {
  if (isDemoMode || !supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function uploadImage(image: Blob | string, path: string): Promise<string> {
  let blob: Blob;

  if (typeof image === 'string' && image.startsWith('data:')) {
    const response = await fetch(image);
    blob = await response.blob();
  } else if (typeof image === 'string') {
    return image;
  } else {
    blob = image;
  }

  if (isDemoMode || !supabase) return typeof image === 'string' ? image : URL.createObjectURL(blob);

  const userId = await getUserId();
  if (!userId) {
    console.error("Upload error: User not authenticated");
    return typeof image === 'string' ? image : URL.createObjectURL(blob);
  }

  const finalPath = `${userId}/${path}`;

  const { data, error } = await supabase.storage
    .from("generated_images")
    .upload(finalPath, blob, {
      contentType: blob.type,
      upsert: true
    });

  if (error) {
    console.error("Storage upload error:", error);
    return typeof image === 'string' ? image : URL.createObjectURL(blob);
  }

  const { data: { publicUrl } } = supabase.storage
    .from("generated_images")
    .getPublicUrl(data.path);

  return publicUrl;
}

export const ADMIN_EMAILS = ["kalopsia3445@gmail.com", "frds3445@gmail.com"];
const TEST_EMAILS = ["relacionamento.c8negocios@gmail.com"];

export async function isUserAdmin(): Promise<boolean> {
  if (isDemoMode || !supabase) return false;
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  return !!email && ADMIN_EMAILS.includes(email);
}

export async function isDemoUser(): Promise<boolean> {
  if (await isUserAdmin()) return false;
  const profile = await getProfile();
  // Se não tem perfil ou o status é 'free', é demo
  return !profile || profile.subscription_status === 'free';
}

// ── Brand Kit ──
export async function getBrandKit(): Promise<BrandKit | null> {
  if (isDemoMode || !supabase) return demo.getBrandKit();

  const userId = await getUserId();
  if (!userId) return null;

  // Check if it's a demo user (Admin bypass included)
  if (await isDemoUser()) {
    return SOLOREELS_DEMO_KIT;
  }

  const { data, error } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    businessName: data.business_name,
    niche: data.niche,
    offer: data.offer,
    targetAudience: data.target_audience,
    city: data.city || "",
    toneAdjectives: data.tone_adjectives || [],
    forbiddenWords: data.forbidden_words || [],
    differentiators: data.differentiators || [],
    proofs: data.proofs || [],
    commonObjections: data.common_objections || [],
    ctaPreference: data.cta_preference || "",
    colorPalette: data.color_palette || [],
    logoUrls: data.logo_urls || [],
    referenceImageUrls: data.reference_image_urls || [],
    referenceVideoUrls: data.reference_video_urls || [],
    visualStyleDescription: data.visual_style_description || "",
  };
}

export async function saveBrandKit(kit: BrandKit): Promise<void> {
  if (isDemoMode || !supabase) {
    demo.saveBrandKit(kit);
    return;
  }

  const userId = await getUserId();
  if (!userId) throw new Error("Usuário não autenticado");

  // Prevent saving for demo users (admins allowed to save)
  if (await isDemoUser()) {
    throw new Error("Personalização bloqueada no plano gratuito. Faça upgrade para salvar sua marca!");
  }

  const row = {
    user_id: userId,
    business_name: kit.businessName,
    niche: kit.niche,
    offer: kit.offer,
    target_audience: kit.targetAudience,
    city: kit.city,
    tone_adjectives: kit.toneAdjectives,
    forbidden_words: kit.forbiddenWords,
    differentiators: kit.differentiators,
    proofs: kit.proofs,
    common_objections: kit.commonObjections,
    cta_preference: kit.ctaPreference,
    color_palette: kit.colorPalette,
    logo_urls: kit.logoUrls,
    reference_image_urls: kit.referenceImageUrls,
    reference_video_urls: kit.referenceVideoUrls,
    visual_style_description: kit.visualStyleDescription,
  };

  // Upsert: check if exists
  const { data: existing } = await supabase
    .from("brand_kits")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase.from("brand_kits").update(row).eq("id", existing.id);
  } else {
    await supabase.from("brand_kits").insert(row);
  }
}

// ── Scripts ──
export async function getScripts(): Promise<SavedScript[]> {
  if (isDemoMode || !supabase) return demo.getScripts();

  const userId = await getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from("scripts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((d: any) => ({
    id: d.id,
    brandKitId: d.brand_kit_id,
    stylePackId: d.style_pack_id,
    niche: d.niche,
    platform: d.platform as "instagram",
    format: d.format as "reels" | "stories" | "carousel",
    objective: d.objective,
    inputSummary: d.input_summary,
    resultJson: d.result_json,
    createdAt: d.created_at,
    isFavorite: d.is_favorite || false,
  }));
}

export async function saveScript(script: SavedScript): Promise<void> {
  if (isDemoMode || !supabase) {
    demo.saveScript(script);
    return;
  }

  const userId = await getUserId();
  if (!userId) throw new Error("Usuário não autenticado");

  await supabase.from("scripts").upsert({
    id: script.id,
    user_id: userId,
    brand_kit_id: script.brandKitId || null,
    style_pack_id: script.stylePackId,
    niche: script.niche,
    platform: script.platform,
    format: script.format,
    objective: script.objective,
    input_summary: script.inputSummary,
    result_json: script.resultJson,
    is_favorite: false,
  });
}

export async function getScriptById(id: string): Promise<SavedScript | undefined> {
  if (isDemoMode || !supabase) return demo.getScriptById(id);

  const userId = await getUserId();
  if (!userId) return undefined;

  const { data } = await supabase
    .from("scripts")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return undefined;

  return {
    id: data.id,
    brandKitId: data.brand_kit_id,
    stylePackId: data.style_pack_id,
    niche: data.niche,
    platform: data.platform,
    format: data.format,
    objective: data.objective,
    inputSummary: data.input_summary,
    resultJson: data.result_json,
    createdAt: data.created_at,
  };
}

export async function deleteScript(id: string): Promise<void> {
  if (isDemoMode || !supabase) {
    demo.deleteScript(id);
    return;
  }

  const userId = await getUserId();
  if (!userId) return;

  await supabase.from("scripts").delete().eq("id", id).eq("user_id", userId);
}

// ── Favorites ──
export async function toggleFavorite(scriptId: string): Promise<boolean> {
  if (isDemoMode || !supabase) return demo.toggleFavorite(scriptId);

  const userId = await getUserId();
  if (!userId) return false;

  const { data } = await supabase
    .from("scripts")
    .select("is_favorite")
    .eq("id", scriptId)
    .eq("user_id", userId)
    .maybeSingle();

  const newVal = !(data?.is_favorite ?? false);
  await supabase
    .from("scripts")
    .update({ is_favorite: newVal })
    .eq("id", scriptId)
    .eq("user_id", userId);

  return newVal;
}

export async function getFavoriteIds(): Promise<Set<string>> {
  if (isDemoMode || !supabase) return demo.getFavoriteIds();

  const userId = await getUserId();
  if (!userId) return new Set();

  const { data } = await supabase
    .from("scripts")
    .select("id")
    .eq("user_id", userId)
    .eq("is_favorite", true);

  return new Set((data || []).map((d: any) => d.id));
}

// ── Weekly Usage ──
export async function getWeeklyUsage(): Promise<WeeklyUsage> {
  const now = new Date();
  const day = now.getDay(); // 0 (Dom) a 6 (Sab)
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Ajuste para Segunda-feira
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  const weekStart = monday.toISOString().split("T")[0];

  if (isDemoMode || !supabase) return { weekStart, count: 0 };

  const userId = await getUserId();
  if (!userId) return { weekStart, count: 0 };

  const { data } = await supabase
    .from("daily_usage")
    .select("count")
    .eq("user_id", userId)
    .gte("usage_date", weekStart);

  const total = (data || []).reduce((sum, d) => sum + (d.count || 0), 0);
  return { weekStart, count: total };
}

export async function incrementUsage(): Promise<void> {
  if (isDemoMode || !supabase) return;

  const userId = await getUserId();
  const today = new Date().toISOString().split("T")[0];
  if (!userId) return;

  const { data: existing } = await supabase
    .from("daily_usage")
    .select("*")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("daily_usage")
      .update({ count: (existing.count || 0) + 1 })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("daily_usage")
      .insert({ user_id: userId, usage_date: today, count: 1 });
  }
}

// ── Profiles & Subscriptions ──
export async function getProfile() {
  if (isDemoMode || !supabase) return { subscription_status: 'free' };
  const userId = await getUserId();
  if (!userId) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  return data;
}

async function isMasterAccount(): Promise<boolean> {
  return isUserAdmin();
}

export async function canGenerate(): Promise<boolean> {
  if (await isMasterAccount()) return true;

  const { data: { user } } = await supabase!.auth.getUser();
  if (user?.email && TEST_EMAILS.includes(user.email)) return true;

  // Check subscription
  const profile = await getProfile();
  const tier = (profile?.subscription_status || "free") as SubscriptionTier;
  const limit = WEEKLY_LIMITS[tier] || WEEKLY_LIMITS.free;

  const usage = await getWeeklyUsage();
  return usage.count < limit;
}

// ── Custom Packs ──
export async function getCustomPacks(): Promise<StylePack[]> {
  if (isDemoMode || !supabase) return demo.getCustomPacks();

  const userId = await getUserId();
  if (!userId) return [];

  const { data } = await supabase
    .from("style_packs")
    .select("*")
    .eq("user_id", userId)
    .eq("is_official", false);

  return (data || []).map((d: any) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    rules: d.rules || [],
    examplePhrases: d.example_phrases || [],
    isOfficial: false,
  }));
}

export async function saveCustomPack(pack: StylePack): Promise<void> {
  if (isDemoMode || !supabase) {
    demo.saveCustomPack(pack);
    return;
  }

  const userId = await getUserId();
  if (!userId) throw new Error("Usuário não autenticado");

  const row = {
    user_id: userId,
    name: pack.name,
    description: pack.description,
    rules: pack.rules,
    example_phrases: pack.examplePhrases,
    is_official: false,
  };

  // Check if we're updating
  const { data: existing } = await supabase
    .from("style_packs")
    .select("id")
    .eq("id", pack.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase.from("style_packs").update(row).eq("id", pack.id);
  } else {
    await supabase.from("style_packs").insert(row);
  }
}

export async function deleteCustomPack(id: string): Promise<void> {
  if (isDemoMode || !supabase) {
    demo.deleteCustomPack(id);
    return;
  }

  const userId = await getUserId();
  if (!userId) return;

  await supabase.from("style_packs").delete().eq("id", id).eq("user_id", userId);
}

// ── Onboarding ──
export async function isOnboardingDone(): Promise<boolean> {
  if (isDemoMode || !supabase) return demo.isOnboardingDone();
  const kit = await getBrandKit();
  return kit !== null;
}

export async function setOnboardingDone(): Promise<void> {
  if (isDemoMode || !supabase) {
    demo.setOnboardingDone();
  }
  // With Supabase, onboarding is "done" when brand_kit exists
}
