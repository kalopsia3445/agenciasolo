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
  overlayDesign?: { // Added overlayDesign
    fontSizeMultiplier?: number;
    textAlign?: string;
    colorOverride?: string;
    yOffset?: number;
    styleType?: string;
  };
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
    const colorContext = opts.colorPalette && opts.colorPalette.length > 0 ? translate(opts.colorPalette.join(' and ')) : 'dark navy';
    const styleContext = translate(opts.visualStyle || 'simple minimalist');
    const customPromptParam = opts.customVisualPrompt ? `${translate(opts.customVisualPrompt)}` : '';

    return `High-end professional marketing background, clean minimalist aesthetic, perfect for text overlay, high contrast, ${colorContext}, ${styleContext}, atmospheric lighting, 1024x1024, highly detailed, cinematic texture${customPromptParam ? `: ${customPromptParam}` : ''}`;
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

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error("Could not get canvas context"));

      // 1. Desenhar fundo (imagem IA)
      ctx.drawImage(img, 0, 0);

      // 2. Configurar estilo do texto e design
      const design = opts.overlayDesign || {
        fontSizeMultiplier: 1,
        textAlign: "center",
        yOffset: 0,
        styleType: "modern"
      };

      const brandColor = design.colorOverride || opts.colorPalette?.[0] || "#ffffff";

      // Shadow para garantir legibilidade extrema
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      ctx.shadowBlur = 25;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Estilo de Preenchimento
      ctx.fillStyle = brandColor;

      // Estilo de Borda (Universal High-Contrast)
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";

      ctx.textAlign = design.textAlign as CanvasTextAlign;
      ctx.textBaseline = "middle";

      // Tamanho dinâmico e tipografia premium
      const baseFontSize = Math.floor(canvas.width * 0.08);
      const fontSize = Math.floor(baseFontSize * (design.fontSizeMultiplier || 1));

      // Font Stack Premium (Prioriza Space Grotesk ou Montserrat se existirem, fallback p/ Impact/Inter)
      ctx.font = `bold ${fontSize}px "Space Grotesk", "Montserrat", "Inter", "Impact", sans-serif`;

      // 3. Quebra de linha inteligente
      const words = text.split(" ");
      const lines = [];
      let currentLine = "";
      const maxWidth = canvas.width * 0.85;

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);

      // 4. Desenhar linhas com posicionamento dinâmico (yOffset)
      const lineHeight = fontSize * 1.15;
      const totalHeight = lines.length * lineHeight;

      // yOffset: -0.5 (topo) a 0.5 (base). 0 é o centro exato.
      const verticalAdjustment = (design.yOffset || 0) * canvas.height;
      let startY = (canvas.height - totalHeight) / 2 + (lineHeight / 2) + verticalAdjustment;

      // Ajuste de X baseado no Alinhamento
      let x = canvas.width / 2;
      if (design.textAlign === "left") x = canvas.width * 0.075;
      if (design.textAlign === "right") x = canvas.width * 0.925;

      lines.forEach(line => {
        // Primeiro Stroke (Borda externa robusta)
        ctx.strokeText(line, x, startY);
        // Depois o Fill (Cor vibrante da marca)
        ctx.fillText(line, x, startY);
        startY += lineHeight;
      });

      canvas.toBlob((blob) => {
        if (blob) {
          console.log(`[Canvas] Premium Text Render: Style=${design.styleType}, Text=${text.substring(0, 20)}...`);
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
async function generateWithNebius(prompt: string, index: number, opts: ImageGenOptions): Promise<string> {
  const { visualSubject, onProgress } = opts;
  console.log(`🚀 NEBIUS REQUEST ${index} (Proxy):`, prompt);
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
    body: JSON.stringify({
      prompt,
      provider: "nebius",
      visualSubject,
      seed: Math.floor(Math.random() * 999999999), // Changed seed to a random number
      colorPalette: opts.colorPalette,
      visualStyle: opts.visualStyle
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Nebius API error (${response.status}): ${errText}`);
  }

  const usedModel = response.headers.get("X-Used-Model") || "black-forest-labs/flux-dev (default)";

  console.log(`
  =========================================
  🎨 GERADORA DE IMAGEM INICIADA (NEBIUS)
  👉 Model Usado: ${usedModel}
  👉 Foco Visual: ${visualSubject || "Não especificado (Genérico)"}
  =========================================
  `);

  let blob = await response.blob();
  console.log(`[Frontend] Nebius Studio Success:`, blob.type, blob.size, "bytes");

  // APLICAR OVERLAY SE FOR FOCO EM TEXTO
  if (visualSubject === 'texto') {
    try {
      const textToShow = opts.hook || 'Solo Reels';
      console.log(`[Frontend] Applying text overlay: "${textToShow}"`);
      blob = await applyTextOverlay(blob, textToShow, opts);
      console.log(`[Frontend] Text overlay applied successfully. New size: ${blob.size} bytes`);
    } catch (e) {
      console.warn("Falha ao aplicar overlay de texto:", e);
    }
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

  // Pipeline Exclusiva: Inteligência de Modelos via Nebius AI Studio
  return await generateWithNebius(prompt, index, safeKit);
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
