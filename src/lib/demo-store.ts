import type { BrandKit, SavedScript, StylePack } from "@/types/schema";
import { WEEKLY_LIMITS } from "@/types/schema";

const KEYS = {
  brandKit: "soloreels_brand_kit",
  scripts: "soloreels_scripts",
  favorites: "soloreels_favorites",
  dailyUsage: "soloreels_daily_usage",
  customPacks: "soloreels_custom_packs",
  onboardingDone: "soloreels_onboarding_done",
} as const;

interface DemoDailyUsage {
  date: string;
  count: number;
}

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function set(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Brand Kit ──
export function getBrandKit(): BrandKit | null {
  return get<BrandKit | null>(KEYS.brandKit, null);
}
export function saveBrandKit(kit: BrandKit) {
  set(KEYS.brandKit, kit);
}

// ── Scripts ──
export function getScripts(): SavedScript[] {
  return get<SavedScript[]>(KEYS.scripts, []);
}
export function saveScript(script: SavedScript) {
  const scripts = getScripts();
  scripts.unshift(script);
  set(KEYS.scripts, scripts);
}
export function deleteScript(id: string) {
  set(KEYS.scripts, getScripts().filter((s) => s.id !== id));
}

// ── Favorites ──
export function getFavoriteIds(): Set<string> {
  return new Set(get<string[]>(KEYS.favorites, []));
}
export function toggleFavorite(scriptId: string): boolean {
  const favs = get<string[]>(KEYS.favorites, []);
  const idx = favs.indexOf(scriptId);
  if (idx >= 0) {
    favs.splice(idx, 1);
    set(KEYS.favorites, favs);
    return false;
  } else {
    favs.push(scriptId);
    set(KEYS.favorites, favs);
    return true;
  }
}

// ── Daily Usage ──
export function getDailyUsage(): DemoDailyUsage {
  const today = new Date().toISOString().split("T")[0];
  const usage = get<DemoDailyUsage>(KEYS.dailyUsage, { date: today, count: 0 });
  if (usage.date !== today) return { date: today, count: 0 };
  return usage;
}
export function incrementUsage(): DemoDailyUsage {
  const usage = getDailyUsage();
  usage.count += 1;
  set(KEYS.dailyUsage, usage);
  return usage;
}
export function canGenerate(): boolean {
  // In demo mode, we use the free limit by default
  return getDailyUsage().count < WEEKLY_LIMITS.free;
}

// ── Custom Packs ──
export function getCustomPacks(): StylePack[] {
  return get<StylePack[]>(KEYS.customPacks, []);
}
export function saveCustomPack(pack: StylePack) {
  const packs = getCustomPacks();
  const idx = packs.findIndex((p) => p.id === pack.id);
  if (idx >= 0) packs[idx] = pack;
  else packs.push(pack);
  set(KEYS.customPacks, packs);
}
export function deleteCustomPack(id: string) {
  set(KEYS.customPacks, getCustomPacks().filter((p) => p.id !== id));
}

// ── Onboarding ──
export function isOnboardingDone(): boolean {
  return get<boolean>(KEYS.onboardingDone, false);
}
export function setOnboardingDone() {
  set(KEYS.onboardingDone, true);
}

// ── Get script by id ──
export function getScriptById(id: string): SavedScript | undefined {
  return getScripts().find((s) => s.id === id);
}
