import { supabase } from "./supabase";
import { uploadImage } from "./data-service";

let lastPollinationsCall = 0;
const POLLINATIONS_MIN_DELAY = 15500; // 15.5s safety margin

export interface ImageGenOptions {
  hook: string;
  inputSummary: string;
  niche: string;
  format: "reels" | "stories" | "carousel";
  objective: string;
  businessName?: string;
  visualStyle?: string;
  targetAudience?: string;
  colorPalette?: string[];
  toneAdjectives?: string[];
  visualSubject?: string;
  customVisualPrompt?: string;
  onProgress?: (index: number, progress: number) => void;
}

export function buildImagePrompt(opts: ImageGenOptions, basePrompt?: string): string {
  // Tradução automática de termos comuns para Inglês (IA performa muito melhor em EN)
  const translationMap: Record<string, string> = {
    'beleza': 'beauty',
    'rosto': 'face, portrait',
    'estética': 'aesthetics',
    'maquiagem': 'makeup',
    'cabelo': 'hair',
    'pele': 'skin',
    'contabilidade': 'accounting',
    'contador': 'accountant',
    'eletrônicos': 'electronics',
    'tecnologia': 'technology',
    'loja': 'store, retail',
    'comida': 'food, gourmet',
    'restaurante': 'restaurant'
  };

  const translate = (text: string) => {
    let result = text.toLowerCase();
    // Remover códigos hexadecimais e '#' que confundem a IA e quebram URLs
    result = result.replace(/#[a-fA-F0-9]{3,6}/g, '').replace(/#/g, '');

    Object.entries(translationMap).forEach(([pt, en]) => {
      result = result.replace(new RegExp(`\\b${pt}\\b`, 'g'), en);
    });
    return result.trim();
  };

  const niche = translate(opts.niche);
  const style = translate(opts.visualStyle || 'professional');

  if (basePrompt) {
    const translatedBase = translate(basePrompt);
    const baseLower = translatedBase.toLowerCase();

    let parts = [translatedBase];

    // Adicionar niche se não estiver presente
    if (!baseLower.includes(niche.toLowerCase())) {
      parts.push(niche);
    }

    // Adicionar style se não estiver presente
    if (!baseLower.includes(style.toLowerCase())) {
      parts.push(style);
    }

    // Sufixos de qualidade se não estiverem presentes
    const qualitySuffixes = ['photography', 'realistic', '8k', 'high resolution', 'lighting'];
    qualitySuffixes.forEach(suffix => {
      if (!baseLower.includes(suffix)) {
        parts.push(suffix);
      }
    });

    return parts.join(', ');
  }

  // Fallback se não houver prompt base
  const summary = translate(opts.inputSummary || 'scene');
  return `professional photography, ${style}, ${niche}, ${summary}, realistic, 8k, highly detailed`;
}

// 1. POLLINATIONS AI (Proxy via Supabase for robustness)
async function generateWithPollinations(prompt: string, index: number, onProgress?: (idx: number, p: number) => void): Promise<string> {
  // Gerenciamento de Rate Limit Global (Session-wide)
  const now = Date.now();
  const timeSinceLast = now - lastPollinationsCall;

  if (timeSinceLast < POLLINATIONS_MIN_DELAY) {
    const waitTime = POLLINATIONS_MIN_DELAY - timeSinceLast;
    console.log(`⏳ POLLINATIONS RATE LIMIT: Aguardando ${Math.round(waitTime / 1000)}s...`);

    // Feedback de progresso enquanto espera
    const steps = 10;
    for (let i = 0; i < steps; i++) {
      onProgress?.(index, Math.round((i / steps) * 90));
      await new Promise(r => setTimeout(r, waitTime / steps));
    }
  }

  lastPollinationsCall = Date.now();
  console.log(`🚀 POLLINATIONS REQUEST ${index} (Proxy):`, prompt);
  onProgress?.(index, 95);

  if (!supabase) {
    // Fallback para Direct GET se Supabase não disponível (Demo mode)
    const seed = Math.floor(now / 1000) + index + Math.floor(Math.random() * 1000);
    const cleanPrompt = encodeURIComponent(prompt.substring(0, 1000));
    const url = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=800&height=1200&model=flux&seed=${seed}&nologo=true`;
    onProgress?.(index, 100);
    return url;
  }

  // Chamada via Proxy Direto (Bypassing Supabase invoke for binary safety)
  try {
    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, provider: "pollinations" }),
    });

    if (response.ok) {
      const blob = await response.blob();
      if (blob.type.startsWith('image/')) {
        const path = `pollinations_${Date.now()}_${index}.png`;
        const persistentUrl = await uploadImage(blob, path);
        onProgress?.(index, 100);
        return persistentUrl;
      }
    }
  } catch (err) {
    console.warn("Pollinations Proxy failed, trying direct GET:", err);
  }

  // Fallback definitivo: Direct GET (No-Auth, No-Proxy)
  const seed = Math.floor(now / 1000) + index + Math.floor(Math.random() * 1000);
  const cleanPrompt = encodeURIComponent(prompt.substring(0, 300));
  const tempUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=800&height=1200&model=flux&seed=${seed}&nologo=true`;

  onProgress?.(index, 98);

  // FORCE UPLOAD TO STORAGE (Robust fallback)
  try {
    const response = await fetch(tempUrl);
    if (response.ok) {
      const blob = await response.blob();
      const path = `pollinations_direct_${Date.now()}_${index}.jpg`;
      const persistentUrl = await uploadImage(blob, path);
      onProgress?.(index, 100);
      return persistentUrl;
    }
  } catch (err) {
    console.warn("Pollinations final autosave failed:", err);
  }

  onProgress?.(index, 100);
  return tempUrl;
}

// 2. HUGGING FACE (Proxy via Supabase)
async function generateWithHF(prompt: string, index: number, onProgress?: (idx: number, p: number) => void): Promise<string> {
  console.log(`🚀 HF REQUEST ${index} (Proxy):`, prompt);
  onProgress?.(index, 20);

  if (!import.meta.env.VITE_SUPABASE_URL) {
    throw new Error("VITE_SUPABASE_URL não configurado");
  }

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, provider: "hf" }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HF Proxy error (${response.status}): ${errText}`);
  }

  const blob = await response.blob();
  console.log(`[Frontend] HF Proxy Success:`, blob.type, blob.size, "bytes");

  if (!blob.type.startsWith('image/')) {
    const text = await blob.text();
    throw new Error(`HF Proxy Error (Non-Image): ${text}`);
  }

  const path = `hf_${Date.now()}_${index}.png`;
  const persistentUrl = await uploadImage(blob, path);

  onProgress?.(index, 100);
  return persistentUrl;
}


// 3. FAL.AI (Primário Pago - Ultra Rápido)
async function generateWithFal(prompt: string, index: number, onProgress?: (idx: number, p: number) => void): Promise<string> {
  const apiKey = import.meta.env.VITE_FAL_KEY;
  if (!apiKey) throw new Error("VITE_FAL_KEY not found");

  console.log(`🚀 FAL.AI REQUEST ${index}:`, prompt);
  onProgress?.(index, 10); // Início

  const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: {
      "Authorization": `Key ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt: prompt,
      image_size: "portrait_16_9",
      num_images: 1,
      enable_safety_checker: true,
      sync_mode: true
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Fal.ai Error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const imgUrl = data.images?.[0]?.url;

  if (!imgUrl) throw new Error("Fal.ai: No image URL in response");

  // FORCE PERSISTENCE: Download and upload to Supabase
  try {
    const imgResponse = await fetch(imgUrl);
    if (imgResponse.ok) {
      const blob = await imgResponse.blob();
      const path = `fal_${Date.now()}_${index}.png`;
      const persistentUrl = await uploadImage(blob, path);
      onProgress?.(index, 100);
      console.log(`✅ FAL.AI ${index} PERSISTED:`, persistentUrl);
      return persistentUrl;
    }
  } catch (persistErr) {
    console.warn("Fal.ai persistence failed, falling back to temp URL:", persistErr);
  }

  onProgress?.(index, 100);
  console.log(`✅ FAL.AI ${index} OK (Temp URL)`);
  return imgUrl;
}

export async function generateImagePipeline(
  _originalPrompt: string,
  kit: ImageGenOptions | undefined,
  index: number = 0
): Promise<string> {
  const safeKit = kit || {
    niche: 'business',
    visualStyle: 'professional',
    colorPalette: ['#000000'],
    inputSummary: 'image',
    hook: '',
    format: 'stories',
    objective: 'engagement'
  };

  // Garantir prompt em Inglês e PERSONALIZADO com o roteiro
  const prompt = buildImagePrompt(safeKit, _originalPrompt);

  // PIPELINE INTELIGENTE: Velocidade + Custo
  try {
    // 1. FAL.AI (Tentativa Principal - Você pagou por isso)
    return await generateWithFal(prompt, index, safeKit.onProgress);
  } catch (falError: any) {
    console.warn(`⚠️ FAL.AI ${index} bloqueado/falhou, tentando HUGGING FACE:`, falError.message);

    try {
      // 2. HUGGING FACE (Rápido, Estável com Token)
      return await generateWithHF(prompt, index, safeKit.onProgress);
    } catch (hfError: any) {
      console.warn(`⚠️ HF ${index} falhou, tentando POLLINATIONS:`, hfError.message);

      try {
        // 3. POLLINATIONS (Super Rápido, Grátis, Flux Model)
        return await generateWithPollinations(prompt, index, safeKit.onProgress);
      } catch (pollError: any) {
        console.error(`❌ Pipeline falhou definitivamente no Pollinations ${index}:`, pollError.message);
        throw pollError;
      }
    }
  }
}

// Mantendo compatibilidade com Generate.tsx
export async function generateImage(
  prompt: string,
  _apiKey?: string,
  opts?: ImageGenOptions,
  index: number = 0
): Promise<string> {
  return generateImagePipeline(prompt, opts, index);
}

export async function regenerateImage(
  prompt: string,
  apiKey: string
): Promise<string> {
  const variedPrompt = `${prompt} variation ${Math.floor(Math.random() * 1000)}`;
  return generateImage(variedPrompt, apiKey);
}

export async function downloadImage(dataUri: string, filename: string): Promise<void> {
  try {
    const response = await fetch(dataUri);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error("Download failed:", err);
  }
}
