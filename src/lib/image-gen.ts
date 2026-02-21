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
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    strokeWidth?: number;
    opacity?: number;
    letterSpacing?: number;
    textEffect?: "none" | "layered-shadow" | "glow" | "outline";
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
  // v4.0: Dynamic cleaner - removes HEX codes and redundant conjunctions
  const clean = (text: string) => {
    return text
      .replace(/#[a-fA-F0-9]{3,6}/g, '')
      .replace(/#/g, '')
      .replace(/\band\s+and\b/gi, 'and')
      .replace(/,\s*,/g, ',')
      .replace(/\s+/g, ' ')
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

      // 2. Configurações Estéticas AI-Driven (v6.0 - Hyper-Premium)
      const shadowBlur = design.shadowBlur ?? 12;
      const shadowOffsetX = design.shadowOffsetX ?? 2;
      const shadowOffsetY = design.shadowOffsetY ?? 2;
      const strokeWidth = design.strokeWidth ?? 1.5;
      const opacity = design.opacity ?? 1;
      const letterSpacing = design.letterSpacing ?? 0;
      const textEffect = design.textEffect ?? "layered-shadow";

      // Estilo de Preenchimento e Borda
      const brandColor = design.colorOverride || opts.colorPalette?.[0] || "#ffffff";
      ctx.fillStyle = brandColor;
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = strokeWidth;
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;

      ctx.textAlign = (design.textAlign as CanvasTextAlign) || "center";
      ctx.textBaseline = "middle";

      // Tipografia Dinâmica
      const fontSizeBase = Math.floor(canvas.width * 0.08);
      let fontSize = Math.floor(fontSizeBase * (design.fontSizeMultiplier || 1));

      const setFont = (size: number) => {
        ctx.font = `900 ${size}px "${selectedFont}", "Impact", sans-serif`;
        if ((ctx as any).letterSpacing !== undefined) {
          (ctx as any).letterSpacing = `${letterSpacing}px`;
        }
      };

      // 3. Sistema de Redimensionamento Automático (Auto-fit)
      const maxWidth = canvas.width * 0.9;
      const maxHeight = canvas.height * 0.7;

      let lines: string[] = [];
      const wrapText = (size: number) => {
        setFont(size);
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
      setFont(fontSize);

      // 4. Desenhar com Posicionamento Dinâmico
      const lineHeight = fontSize * 1.1;
      const totalHeight = lines.length * lineHeight;

      // Vertical offset: design.yOffset varies from -0.5 (top) to 0.5 (bottom)
      const yOffsetValue = (design.yOffset || 0) * (canvas.height * 0.8);
      let startY = (canvas.height - totalHeight) / 2 + (lineHeight / 2) + yOffsetValue;

      // Horizontal position based on textAlign
      let x = canvas.width / 2;
      if (design.textAlign === "left") x = canvas.width * 0.05;
      else if (design.textAlign === "right") x = canvas.width * 0.95;

      lines.forEach(line => {
        // v6.0 PREMIUM RENDERING PIPELINE
        ctx.save();

        // EFEITO 1: Layered Shadow (Depth)
        if (textEffect === "layered-shadow") {
          ctx.shadowColor = "rgba(0,0,0,0.4)";
          ctx.shadowBlur = shadowBlur * 1.5;
          ctx.shadowOffsetX = shadowOffsetX * 2;
          ctx.shadowOffsetY = shadowOffsetY * 2;
          ctx.strokeText(line, x, startY); // Initial depth stroke
        }

        // EFEITO 2: Hard Contrast Shadow (Legibility)
        ctx.shadowColor = "rgba(0,0,0,1)";
        ctx.shadowBlur = shadowBlur / 3;
        ctx.shadowOffsetX = shadowOffsetX;
        ctx.shadowOffsetY = shadowOffsetY;

        if (textEffect === "glow") {
          ctx.shadowColor = brandColor;
          ctx.shadowBlur = shadowBlur * 2;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }

        // Renderização Final: Stroke -> Fill
        if (textEffect === "outline") {
          // Hollow text effect - No fill, just stroke
          ctx.shadowBlur = 0;
          ctx.strokeText(line, x, startY);
        } else {
          ctx.strokeText(line, x, startY);
          ctx.fillText(line, x, startY);
        }

        ctx.restore();
        startY += lineHeight;
      });

      // BLOB FIX (v3.0): Convert to permanent dataURL to avoid garbage collection
      canvas.toBlob((blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            console.log(`[Canvas] UI Polish Render v5.0: Font=${selectedFont}, Format=dataURL`);
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
