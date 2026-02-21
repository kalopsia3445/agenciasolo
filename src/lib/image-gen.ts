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
  // v4.0: Dynamic cleaner - only remove HEX codes that break APIs
  const clean = (text: string) => {
    return text
      .replace(/#[a-fA-F0-9]{3,6}/g, '')
      .replace(/#/g, '')
      .trim();
  };

  // v4.0: TRUST THE GROQ ANALYZED PROMPT COMPLETELY.
  if (basePrompt && basePrompt.length > 5) {
    return clean(basePrompt);
  }

  // Purely dynamic fallback using only brand kit fields (no hardcoded descriptors)
  const style = clean(opts.visualStyle || '');
  const colors = opts.colorPalette && opts.colorPalette.length > 0
    ? `with colors ${opts.colorPalette.filter(c => c.length > 2).join(', ')}`
    : '';
  const niche = clean(opts.niche || '');
  const summary = clean(opts.inputSummary || '');

  return `${summary}, ${niche}, ${style} style, ${colors}`.replace(/, ,/g, ',').trim();
}

/**
 * Sobrepõe texto em um blob de imagem usando Canvas API.
 * Garante perfeição ortográfica e alinhamento com branding.
 */
export async function applyTextOverlay(imageBlob: Blob | string, text: string, opts: ImageGenOptions): Promise<string | Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = typeof imageBlob === 'string' ? imageBlob : URL.createObjectURL(imageBlob);

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
        await loadGoogleFont(selectedFont);
        // CRITICAL FIX: Ensure font is REALLY loaded before drawing
        await (document as any).fonts.load(`bold 64px "${selectedFont}"`);
      } catch (e) {
        console.warn("Font load timeout or failed, using fallback:", selectedFont);
      }

      const design = opts.overlayDesign || {
        fontSizeMultiplier: 1,
        textAlign: "center",
      };

      // Shadow Polish (V3.0: Sharper and Cleaner)
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      // Estilo de Preenchimento e Borda
      const brandColor = design.colorOverride || opts.colorPalette?.[0] || "#ffffff";
      ctx.fillStyle = brandColor;
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.2; // Sharper white border
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `bold ${Math.floor(canvas.width * 0.08)}px "${selectedFont}", "Inter", sans-serif`;

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

      // BLOB FIX (v3.0): Convert to permanent dataURL to avoid garbage collection
      canvas.toBlob((blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            console.log(`[Canvas] UI Polish Render v3.0: Font=${selectedFont}, Format=dataURL`);
            resolve(dataUrl);
          };
          reader.readAsDataURL(blob);
        } else {
          reject(new Error("Canvas toBlob failed"));
        }
      }, 'image/jpeg', 0.95);
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
  let blob: Blob | string;
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
      const size = typeof blob === 'string' ? blob.length : blob.size;
      console.log(`[Frontend] Text overlay applied successfully. New size: ${size} bytes`);
    } catch (e) {
      console.warn("Falha ao aplicar overlay de texto:", e);
    }
  }

  if (skipUpload) {
    console.log(`[ImageGen] skipUpload is true, returning blob.`);
    return blob;
  }

  const isString = typeof blob === 'string';
  const type = isString ? 'image/jpeg' : (blob as Blob).type;

  if (!isString && !type.startsWith('image/')) {
    const text = await (blob as Blob).text();
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
  const prompt = buildImagePrompt({ ...safeKit, index } as any, _originalPrompt);

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
