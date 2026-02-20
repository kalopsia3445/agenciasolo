import { uploadImage } from "./data-service";

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

// 1. HUGGING FACE (Proxy via Supabase)
async function generateWithHF(prompt: string, index: number, visualSubject?: string, onProgress?: (idx: number, p: number) => void): Promise<string> {
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
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ prompt, provider: "hf", visualSubject }),
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

  // Pipeline Exclusiva: Inteligência de Modelos via Hugging Face
  return await generateWithHF(prompt, index, safeKit.visualSubject, safeKit.onProgress);
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
