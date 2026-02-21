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
 * Carrega e VERIFICA se a fonte do Google Fonts está realmente disponível
 */
export async function loadGoogleFont(fontName: string): Promise<void> {
  console.log(`%c[v8.0 FontLoader] Requesting: ${fontName}`, "color: #007bff; font-weight: bold;");
  const family = fontName.replace(/ /g, "+");
  const id = `font-${family}`;

  if (!document.getElementById(id)) {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;700;900&display=swap`;
    document.head.appendChild(link);
  }

  // v8.0 Strict verification loop
  const start = Date.now();
  while (Date.now() - start < 5000) {
    try {
      await document.fonts.load(`900 10px "${fontName}"`);
      if (document.fonts.check(`900 10px "${fontName}"`)) {
        console.log(`%c[v8.0 FontLoader] ✅ SUCCESS: ${fontName} is ready for render.`, "color: #28a745; font-weight: bold;");
        return;
      }
    } catch (e) { /* retry */ }
    await new Promise(r => setTimeout(r, 100));
  }
  console.error(`%c[v8.0 FontLoader] ❌ TIMEOUT for ${fontName}.`, "color: #dc3545; font-weight: bold;");
}

export function buildImagePrompt(opts: ImageGenOptions, basePrompt?: string): string {
  // v9.0: ELITE AGENCY TRANSLATOR (Portuguese -> High-end English Art Direction)
  const translationMap: Record<string, string> = {
    // Subjects
    "maquininha": "sleek minimalist credit card terminal, brushed metal hardware",
    "maquininha da ton": "modern green fintech payment terminal, premium texture",
    "maquina": "professional payment hardware",
    "pagamentos": "luxury corporate finance aesthetic, wealth management style",
    "finanças": "high-end financial growth, clean corporate environment",
    "cartão": "premium graphite credit card, matte finish",
    "dinheiro": "elegant wealth symbols, minimalist financial success",

    // Styles/Colors
    "vibrant": "cinematic high-saturation, commercial studio vibrance",
    "modern": "award-winning contemporary design, ultra-modern aesthetic",
    "ton": "emerald and forest green tones, high-end fintech branding",
    "verde": "depth of emerald green and obsidian black contrast",
    "azul": "deep navy blue and silver accents",
    "escuro": "obsidian black, low-key lighting, moody minimalist",
    "limpo": "clean minimalist white space, museum lighting",
  };

  const clean = (text: string) => {
    let t = text.toLowerCase();
    // Apply internal dictionary translation
    Object.entries(translationMap).forEach(([pt, en]) => {
      const regex = new RegExp(`\\b${pt}\\b`, 'gi');
      t = t.replace(regex, en);
    });

    return t
      .replace(/#[a-fA-F0-9]{3,6}/g, '')
      .replace(/#/g, '')
      .replace(/\band\s+and\b/gi, 'and')
      .replace(/,\s*,/g, ',')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const niche = clean(opts.niche || '');
  const style = clean(opts.visualStyle || '');
  const colors = opts.colorPalette?.join(', ') || '';

  // v9.0: STRICT Elite Context Prepending
  const coreContext = `[v9.0 Art Direction] ${niche}, ${style}, palette of ${colors}. Professional product photography, 8k resolution, cinematic lighting, shot on 85mm lens.`;

  if (basePrompt && basePrompt.length > 5) {
    const customPrompt = clean(basePrompt);
    return `${coreContext}. Background: ${customPrompt}`;
  }

  const summary = clean(opts.inputSummary || '');
  return `${coreContext}. Subject: ${summary}`;
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

      // 2. Carregamento de Fonte e Configuração (v7.0)
      const selectedFont = opts.fontFamily || "Montserrat";
      await loadGoogleFont(selectedFont);

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

      // v9.0 Agency-Lux default settings (removing outer strokes for elegance)
      const brandColor = design.colorOverride || opts.colorPalette?.[0] || "#ffffff";
      ctx.fillStyle = brandColor;
      ctx.globalAlpha = opacity;

      // We ONLY use stroke for specific edge cases or explicitly if outline is selected
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = strokeWidth;
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;

      ctx.textAlign = (design.textAlign as CanvasTextAlign) || "center";
      ctx.textBaseline = "middle";

      // Tipografia Dinâmica
      const fontSizeBase = Math.floor(canvas.width * 0.08);
      let fontSize = Math.floor(fontSizeBase * (design.fontSizeMultiplier || 1));

      const setFont = (size: number) => {
        // v7.0: REMOVED "Impact" fallback to prevent "Paint-style" look.
        ctx.font = `900 ${size}px "${selectedFont}", "sans-serif"`;
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
        // v9.0 AGENCY-LUX RENDERING (Minimalist & Deep)
        ctx.save();

        if (textEffect === "layered-shadow" || textEffect === undefined) {
          // v9.0 Soft Deep Agency Shadow (Lux look)
          ctx.shadowColor = "rgba(0,0,0,0.7)";
          ctx.shadowBlur = 25;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 10;
        } else if (textEffect === "glow") {
          ctx.shadowColor = brandColor;
          ctx.shadowBlur = shadowBlur * 2;
        } else if (textEffect === "outline") {
          ctx.shadowBlur = 0;
          ctx.strokeStyle = brandColor;
          ctx.lineWidth = strokeWidth * 2;
          ctx.strokeText(line, x, startY);
          ctx.restore();
          startY += lineHeight;
          return;
        }

        // Clean Render: No stroke unless requested
        ctx.fillText(line, x, startY);

        ctx.restore();
        startY += lineHeight;
      });

      // BLOB FIX (v8.0): Always convert to dataURL and log exhaustive metadata
      canvas.toBlob((blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            console.log(`%c[v8.0 RENDER] Finalizing slide with ${selectedFont}. Size: ${Math.round(dataUrl.length / 1024)}KB`, "background: #222; color: #bada55; padding: 4px;");
            resolve(dataUrl);
          };
          reader.readAsDataURL(blob);
        } else {
          reject(new Error("Canvas toBlob failed"));
        }
      }, 'image/jpeg', 0.9);
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
