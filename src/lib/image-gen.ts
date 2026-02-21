import { uploadImage } from "./data-service";

export interface ImageGenOptions {
  hook?: string; // Changed to optional
  inputSummary: string;
  niche: string;
  format: "reels" | "stories" | "carousel";
  objective: string;
  businessName?: string;
  visualStyle?: string;
  targetAudience?: string;
  colorPalette?: string[];
  toneAdjectives?: string[];
  visualSubject?: "pessoas" | "objetos" | "abstrato" | "texto"; // Updated type
  customVisualPrompt?: string;
  onProgress?: (index: number, progress: number) => void;
  overlayDesign?: {
    fontSizeMultiplier?: number;
    textAlign?: string;
    colorOverride?: string;
    yOffset?: number;
  };
  fontFamily?: string;
  baseBlob?: Blob;
  skipUpload?: boolean;
  skipOverlay?: boolean;
}

/**
 * Carrega fontes do Google Fonts dinamicamente
 */
export async function loadGoogleFont(fontName: string): Promise<void> {
  const family = fontName.replace(/ /g, "+");
  const id = `font-${family}`;
  if (document.getElementById(id)) return;

  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;700;900&display=swap`;
  document.head.appendChild(link);

  try {
    // Esperar um pouco para o browser registrar a fonte
    await document.fonts.load(`bold 10px "${fontName}"`);
  } catch (e) {
    console.warn(`Could not load font ${fontName}, fallback to sans-serif`);
  }
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

  if (opts.visualSubject === 'texto') {
    const colorContext = opts.colorPalette && opts.colorPalette.length > 0 ? translate(opts.colorPalette.join(' and ')) : 'vibrant brand colors';
    const styleContext = translate(opts.visualStyle || 'luxury minimalist');
    const customPromptParam = opts.customVisualPrompt ? `${translate(opts.customVisualPrompt)}` : '';
    const hookContext = opts.hook ? translate(opts.hook.substring(0, 50)) : '';

    return `Premium high-end marketing background, ultra-vibrant ${colorContext} palette, ${styleContext} aesthetic, abstract dynamic shapes, luxury lighting, cinematic bokeh, 8k resolution, artistic composition inspired by ${hookContext || 'modern graphics'}, no text, no words, clean background.`;
  }

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

/**
 * Sobrepõe texto em um blob de imagem usando Canvas API.
 * Garante perfeição ortográfica e alinhamento com branding.
 */
async function applyTextOverlay(imageBlob: Blob, text: string, opts: ImageGenOptions): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageBlob);

    img.onload = async () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error("Could not get canvas context"));

      // 1. Desenhar fundo
      ctx.drawImage(img, 0, 0);

      // 2. Carregamento de Fonte e Configuração
      const selectedFont = opts.fontFamily || "Montserrat";

      // Tentar garantir que a fonte está carregada (browser)
      try {
        await loadGoogleFont(selectedFont); // Using the implemented loadGoogleFont
      } catch (e) {
        console.warn("Font load failed, using fallback:", selectedFont);
      }

      const design = opts.overlayDesign || {
        fontSizeMultiplier: 1,
        textAlign: "center",
      };
      // Shadow Premium (Contraste Máximo para não ficar "feio")
      ctx.shadowColor = "rgba(0,0,0,0.95)";
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      // Estilo de Preenchimento e Borda
      const brandColor = design.colorOverride || opts.colorPalette?.[0] || "#ffffff";
      ctx.fillStyle = brandColor;
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2.5; // Borda mais nítida
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // 3. Sistema de Redimensionamento Automático (Auto-fit)
      let fontSize = Math.floor(canvas.width * 0.08 * (design.fontSizeMultiplier || 1));
      const maxWidth = canvas.width * 0.9;
      const maxHeight = canvas.height * 0.7;

      let lines: string[] = [];
      const wrapText = (size: number) => {
        ctx.font = `bold ${size}px "${selectedFont}", "Inter", sans-serif`;
        const words = text.split(" ");
        const resLines = [];
        let currentLine = "";

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && currentLine) {
            resLines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        resLines.push(currentLine);
        return resLines;
      };

      lines = wrapText(fontSize);
      while (lines.length * (fontSize * 1.2) > maxHeight && fontSize > 24) {
        fontSize -= 4;
        lines = wrapText(fontSize);
      }

      // 4. Desenhar com Centralização Absoluta
      const lineHeight = fontSize * 1.15;
      const totalHeight = lines.length * lineHeight;

      // Centralização vertical + ajuste fino de yOffset
      const verticalAdjustment = (design.yOffset || 0) * (canvas.height * 0.4);
      let startY = (canvas.height - totalHeight) / 2 + (lineHeight / 2) + verticalAdjustment;

      const x = canvas.width / 2;

      lines.forEach(line => {
        // Renderização robusta (Borda -> Sombra -> Preenchimento)
        ctx.strokeText(line, x, startY);
        ctx.fillText(line, x, startY);
        startY += lineHeight;
      });

      canvas.toBlob((blob) => {
        if (blob) {
          console.log(`[Canvas] UI Polish Render: Font=${selectedFont}, Center=OK`);
          resolve(blob);
        } else {
          reject(new Error("Canvas toBlob failed"));
        }
      }, 'image/jpeg', 0.98);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for overlay"));
    };
    img.src = url;
  });
}

// 1. NEBIUS AI STUDIO (Proxy via Supabase)
async function generateWithNebius(prompt: string, index: number, opts: ImageGenOptions): Promise<string | Blob> {
  const { visualSubject, onProgress, skipUpload, skipOverlay } = opts;
  console.log(`🚀 NEBIUS REQUEST ${index} (Proxy):`, prompt);

  if (!import.meta.env.VITE_SUPABASE_URL) {
    throw new Error("VITE_SUPABASE_URL não configurado");
  }

  // Otimização: Bypassar Nebius se já tivermos um fundo
  let blob: Blob;
  let usedModel = "black-forest-labs/flux-dev (default)";

  if (opts.baseBlob) {
    console.log(`[ImageGen] Reusing existing background blob for index ${index}`);
    blob = opts.baseBlob;
  } else {
    onProgress?.(index, 20);
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        prompt,
        provider: "nebius",
        visualSubject,
        seed: Math.floor(Math.random() * 999999999),
        colorPalette: opts.colorPalette,
        visualStyle: opts.visualStyle
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Nebius Edge Function Error: ${errorText}`);
    }

    blob = await response.blob();
    usedModel = response.headers.get("X-Used-Model") || usedModel;
  }

  // APLICAR OVERLAY SE FOR FOCO EM TEXTO (E NÃO SKIPPADO)
  if (visualSubject === 'texto' && !skipOverlay) {
    try {
      const textToShow = opts.hook || 'Solo Reels';
      console.log(`[Frontend] Applying text overlay: "${textToShow}"`);
      blob = await applyTextOverlay(blob, textToShow, opts);
      console.log(`[Frontend] Text overlay applied successfully. New size: ${blob.size} bytes`);
    } catch (e) {
      console.warn("Falha ao aplicar overlay de texto:", e);
    }
  }

  if (skipUpload) {
    console.log(`[ImageGen] skipUpload is true, returning blob.`);
    return blob;
  }

  if (!blob.type.startsWith('image/')) {
    const text = await blob.text();
    throw new Error(`Nebius Studio Error (Non-Image): ${text}`);
  }

  const path = `nebius_${Date.now()}_${index}.jpg`;
  const persistentUrl = await uploadImage(blob, path);

  onProgress?.(index, 100);
  return persistentUrl;
}

export async function generateImagePipeline(
  _originalPrompt: string,
  kit: ImageGenOptions | undefined,
  index: number = 0
): Promise<string | Blob> {
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

  // Pipeline Exclusiva: Inteligência de Modelos via Nebius AI Studio
  return await generateWithNebius(prompt, index, safeKit);
}

// Mantendo compatibilidade com Generate.tsx
export async function generateImage(
  prompt: string,
  _apiKey?: string,
  opts?: ImageGenOptions,
  index: number = 0
): Promise<string | Blob> {
  return generateImagePipeline(prompt, opts, index);
}

export async function regenerateImage(
  prompt: string,
  apiKey: string
): Promise<string | Blob> {
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
